/**
 * Subscriptions API Routes
 *
 * Endpoints for querying user subscriptions.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';

const router = Router();

/**
 * GET /api/subscriptions/:address/creators
 *
 * Get list of creators that the user is subscribed to
 * Returns simplified creator info for messaging/contact selection
 *
 * @param address - Subscriber's Sui wallet address
 * @returns Array of subscribed creators with essential info
 */
router.get('/:address/creators', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Fetch all active subscriptions for the user
    const subscriptions = await prisma.subscription.findMany({
      where: {
        subscriber: address,
        isActive: true,
        expiresAt: {
          gte: new Date(), // Only include non-expired subscriptions
        },
      },
      select: {
        tierId: true,
      },
    });

    if (subscriptions.length === 0) {
      res.json(jsonResponse([]));
      return;
    }

    // Get tier IDs to fetch creators
    const tierIds = subscriptions.map((sub) => sub.tierId);

    // Fetch tiers
    const tiers = await prisma.tier.findMany({
      where: {
        id: { in: tierIds },
      },
      select: {
        id: true,
        creatorId: true,
      },
    });

    // Get unique creator IDs
    const creatorIds = [...new Set(tiers.map((tier) => tier.creatorId))];

    // Fetch creators with essential info
    const creators = await prisma.creator.findMany({
      where: {
        id: { in: creatorIds },
      },
      select: {
        address: true,
        name: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(jsonResponse(creators));
  } catch (error) {
    console.error('Error fetching subscribed creators:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/subscriptions/:address
 *
 * Get user's active subscriptions
 * Includes: tier and creator info
 *
 * @param address - Subscriber's Sui wallet address
 * @returns Array of active subscriptions
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const subscriptions = await prisma.subscription.findMany({
      where: {
        subscriber: address,
        isActive: true,
        expiresAt: {
          gte: new Date(), // Only include non-expired subscriptions
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Manually fetch tiers and creators (no relations in schema)
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        const tier = await prisma.tier.findUnique({
          where: { id: sub.tierId },
        });

        let creator = null;
        if (tier) {
          creator = await prisma.creator.findUnique({
            where: { id: tier.creatorId },
          });
        }

        return {
          ...sub,
          tier: tier ? { ...tier, creator } : null,
        };
      })
    );

    res.json(jsonResponse(subscriptionsWithDetails));
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/subscriptions/:address/creator/:creatorAddress
 *
 * Check if a user is subscribed to a specific creator
 * Returns subscription details if active
 *
 * @param address - Subscriber's Sui wallet address
 * @param creatorAddress - Creator's Sui wallet address
 * @returns {isSubscribed: boolean, subscription?: {...}}
 */
router.get('/:address/creator/:creatorAddress', async (req: Request, res: Response) => {
  try {
    const { address, creatorAddress } = req.params;

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address: creatorAddress },
    });

    if (!creator) {
      res.json(jsonResponse({
        isSubscribed: false,
      }));
      return;
    }

    // Find all active tiers for this creator
    const tiers = await prisma.tier.findMany({
      where: {
        creatorId: creator.id,
        isActive: true,
      },
    });

    if (tiers.length === 0) {
      res.json(jsonResponse({
        isSubscribed: false,
      }));
      return;
    }

    const tierIds = tiers.map((t) => t.id);

    // Find any active, non-expired subscription to any tier of this creator
    const subscription = await prisma.subscription.findFirst({
      where: {
        subscriber: address,
        isActive: true,
        expiresAt: {
          gte: new Date(), // Only include non-expired subscriptions
        },
        tierId: {
          in: tierIds,
        },
      },
      orderBy: { createdAt: 'desc' }, // Get most recent subscription if multiple exist
    });

    if (!subscription) {
      res.json(jsonResponse({
        isSubscribed: false,
      }));
      return;
    }

    // Fetch tier details for response
    const tier = tiers.find((t) => t.id === subscription.tierId);

    if (!tier) {
      res.json(jsonResponse({
        isSubscribed: false,
      }));
      return;
    }

    // Return subscription details
    res.json(jsonResponse({
      isSubscribed: true,
      subscription: {
        id: subscription.subscriptionId,
        tierId: tier.tierId,
        tierName: tier.name,
        startedAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
        isActive: subscription.isActive,
      },
    }));
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
