/**
 * Messaging Channels API Routes
 *
 * Endpoints for managing messaging channel mappings between users and creators.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { isValidSuiAddress, isValidSuiObjectId } from '../lib/validation';

const router = Router();

/**
 * GET /api/messaging/channels/check/:userAddress/:creatorAddress
 *
 * Check if a channel already exists between user and creator
 * Used to enforce one-channel-per-creator constraint
 *
 * @param userAddress - User's Sui wallet address
 * @param creatorAddress - Creator's Sui wallet address
 * @returns {exists: boolean, channelId?: string}
 */
router.get('/channels/check/:userAddress/:creatorAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress, creatorAddress } = req.params;

    // Validate Sui address formats
    if (!isValidSuiAddress(userAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid userAddress format',
      });
      return;
    }

    if (!isValidSuiAddress(creatorAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid creatorAddress format',
      });
      return;
    }

    // Look up channel mapping
    const channelMapping = await prisma.channelMapping.findUnique({
      where: {
        userAddress_creatorAddress: {
          userAddress,
          creatorAddress,
        },
      },
    });

    if (!channelMapping) {
      res.json(jsonResponse({
        success: true,
        data: { exists: false },
      }));
      return;
    }

    res.json(jsonResponse({
      success: true,
      data: {
        exists: true,
        channelId: channelMapping.channelId,
      },
    }));
  } catch (error) {
    console.error('Error checking channel existence:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/messaging/channels/mapping
 *
 * Save a channel-creator mapping
 * Creates a mapping between a messaging channel and a creator-user pair
 * Validates that the user has an active subscription to the creator
 *
 * @body channelId - Sui object ID of the messaging channel
 * @body creatorAddress - Creator's Sui wallet address
 * @body userAddress - User's Sui wallet address (channel owner)
 * @returns Created channel mapping
 */
router.post('/channels/mapping', async (req: Request, res: Response) => {
  try {
    const { channelId, creatorAddress, userAddress } = req.body;

    // Validate required fields
    if (!channelId || !creatorAddress || !userAddress) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: channelId, creatorAddress, userAddress',
      });
      return;
    }

    // Validate Sui addresses and object ID format
    if (!isValidSuiObjectId(channelId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid channelId format',
      });
      return;
    }

    if (!isValidSuiAddress(creatorAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid creatorAddress format',
      });
      return;
    }

    if (!isValidSuiAddress(userAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid userAddress format',
      });
      return;
    }

    // Verify creator exists in database
    const creator = await prisma.creator.findUnique({
      where: { address: creatorAddress },
    });

    if (!creator) {
      res.status(404).json({
        success: false,
        error: 'Creator not found',
      });
      return;
    }

    // Check if user has an active subscription to this creator
    const tiers = await prisma.tier.findMany({
      where: {
        creatorId: creator.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (tiers.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Creator has no active tiers',
      });
      return;
    }

    const tierIds = tiers.map((t) => t.id);

    const subscription = await prisma.subscription.findFirst({
      where: {
        subscriber: userAddress,
        isActive: true,
        expiresAt: {
          gte: new Date(),
        },
        tierId: {
          in: tierIds,
        },
      },
    });

    if (!subscription) {
      res.status(403).json({
        success: false,
        error: 'User does not have an active subscription to this creator',
      });
      return;
    }

    // Create or update mapping (upsert behavior)
    const channelMapping = await prisma.channelMapping.upsert({
      where: {
        userAddress_creatorAddress: {
          userAddress,
          creatorAddress,
        },
      },
      update: {
        channelId,
      },
      create: {
        channelId,
        userAddress,
        creatorAddress,
      },
    });

    res.status(201).json(jsonResponse({
      success: true,
      data: channelMapping,
    }));
  } catch (error) {
    console.error('Error creating channel mapping:', error);

    // Handle unique constraint violation (duplicate channelId)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Channel ID already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/messaging/channels/user/:userAddress
 *
 * Get all channel mappings for a user with creator details
 * Returns channels with associated creator information
 *
 * @param userAddress - User's Sui wallet address
 * @returns Array of channel mappings with creator details
 */
router.get('/channels/user/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;

    // Validate Sui address format
    if (!isValidSuiAddress(userAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid userAddress format',
      });
      return;
    }

    // Fetch all channel mappings for the user
    const channelMappings = await prisma.channelMapping.findMany({
      where: { userAddress },
      orderBy: { createdAt: 'desc' },
    });

    if (channelMappings.length === 0) {
      res.json(jsonResponse({ success: true, data: [] }));
      return;
    }

    // Get creator details for each mapping
    const creatorAddresses = channelMappings.map((m) => m.creatorAddress);
    const creators = await prisma.creator.findMany({
      where: {
        address: { in: creatorAddresses },
      },
      select: {
        address: true,
        name: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        category: true,
      },
    });

    // Create a map for quick lookup
    const creatorMap = new Map(creators.map((c) => [c.address, c]));

    // Combine channel mappings with creator details
    const channelsWithCreators = channelMappings.map((mapping) => ({
      channelId: mapping.channelId,
      creatorAddress: mapping.creatorAddress,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
      creator: creatorMap.get(mapping.creatorAddress) || null,
    }));

    res.json(jsonResponse({ success: true, data: channelsWithCreators }));
  } catch (error) {
    console.error('Error fetching user channels:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
