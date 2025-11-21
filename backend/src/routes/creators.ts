/**
 * Creators API Routes
 *
 * Endpoints for querying creators and their content.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { validateLimit, sanitizeSearchQuery, parseTopicParam, getTopicName } from '../lib/validation';
import { toStandardUnit } from '../config/currency';
import { getAllowedTiersForContents } from '../lib/content-tiers';
import { getContentStats, getFakedSubscriberCount, getFakedTierSubscriberCount } from '../lib/random-stats';

const router = Router();

/**
 * GET /api/creators/:address
 *
 * Get creator by Sui address
 * Includes: tiers, content (with tiers)
 *
 * @param address - Creator's Sui wallet address
 * @returns Creator object with relations or 404
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const creator = await prisma.creator.findUnique({
      where: { address },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Manually fetch tiers (no Prisma relations)
    const tiers = await prisma.tier.findMany({
      where: {
        creatorId: creator.id,
        isActive: true,
      },
      orderBy: { price: 'asc' },
    });

    // Manually fetch contents (no Prisma relations)
    const contents = await prisma.content.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get allowed tiers for all content items
    const contentIds = contents.map((c) => c.id);
    const tiersMap = await getAllowedTiersForContents(contentIds);

    // Fetch content tiers for each content
    const contentsWithTiers = await Promise.all(
      contents.map(async (content) => {
        const contentTiers = await prisma.contentTier.findMany({
          where: { contentId: content.id },
        });

        // Fetch tier details for each contentTier
        const contentTiersWithDetails = await Promise.all(
          contentTiers.map(async (ct) => {
            const tier = await prisma.tier.findUnique({
              where: { id: ct.tierId },
            });
            return { ...ct, tier };
          })
        );

        return {
          ...content,
          contentTiers: contentTiersWithDetails,
          allowedTiers: tiersMap.get(content.id) || [],
        };
      })
    );

    res.json(jsonResponse({ ...creator, tiers, contents: contentsWithTiers }));
  } catch (error) {
    console.error('Error fetching creator:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/creators
 *
 * Search creators by name and/or filter by topic
 *
 * Query params:
 * - query (string): Search term for creator name (case-insensitive)
 * - topic (number): Filter by topic (0-9)
 * - limit (number): Max results (default: 20, max: 100)
 *
 * @returns Array of creators with tiers and topic information
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const limit = validateLimit(req.query.limit as string);
    const topic = parseTopicParam(req.query.topic as string);

    // Build where clause
    const where: any = {};

    // Add name search if provided
    if (query) {
      where.name = {
        contains: sanitizeSearchQuery(query as string),
        mode: 'insensitive' as const,
      };
    }

    // Add topic filter if provided and valid
    if (topic !== null) {
      where.topic = topic;
    }

    const creators = await prisma.creator.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Manually fetch tiers for each creator (no Prisma relations)
    const creatorsWithTiers = await Promise.all(
      creators.map(async (creator) => {
        const tiers = await prisma.tier.findMany({
          where: {
            creatorId: creator.id,
            isActive: true,
          },
          orderBy: { price: 'asc' },
        });
        return {
          ...creator,
          topicName: getTopicName(creator.topic),
          tiers
        };
      })
    );

    res.json(jsonResponse(creatorsWithTiers));
  } catch (error) {
    console.error('Error searching creators:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/creators/:address/content
 *
 * Get all content for a creator
 *
 * @param address - Creator's Sui wallet address
 * @returns Array of content with tiers
 */
router.get('/:address/content', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // First verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Fetch content
    const content = await prisma.content.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get allowed tiers for all content items
    const contentIds = content.map((c) => c.id);
    const tiersMap = await getAllowedTiersForContents(contentIds);

    // Manually fetch contentTiers for each content (no Prisma relations)
    const contentWithTiers = await Promise.all(
      content.map(async (item) => {
        const contentTiers = await prisma.contentTier.findMany({
          where: { contentId: item.id },
        });

        // Fetch tier details for each contentTier
        const contentTiersWithDetails = await Promise.all(
          contentTiers.map(async (ct) => {
            const tier = await prisma.tier.findUnique({
              where: { id: ct.tierId },
            });
            return { ...ct, tier };
          })
        );

        return {
          ...item,
          contentTiers: contentTiersWithDetails,
          allowedTiers: tiersMap.get(item.id) || [],
        };
      })
    );

    res.json(jsonResponse(contentWithTiers));
  } catch (error) {
    console.error('Error fetching creator content:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/creators/:address/subscribers
 *
 * Get all subscribers for a creator
 * Returns active subscriptions across all tiers
 *
 * @param address - Creator's Sui wallet address
 * @returns Array of subscriptions with subscriber and tier info
 */
router.get('/:address/subscribers', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // First verify creator exists and get their ID
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Fetch all tiers for this creator
    const tiers = await prisma.tier.findMany({
      where: { creatorId: creator.id },
      select: { id: true },
    });

    const tierIds = tiers.map((tier) => tier.id);

    // Fetch all active subscriptions for these tiers
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tierId: { in: tierIds },
        isActive: true,
        expiresAt: {
          gte: new Date(), // Only include non-expired subscriptions
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Manually fetch tier for each subscription (no Prisma relations)
    const subscriptionsWithTiers = await Promise.all(
      subscriptions.map(async (subscription) => {
        const tier = await prisma.tier.findUnique({
          where: { id: subscription.tierId },
        });
        return { ...subscription, tier };
      })
    );

    res.json(jsonResponse(subscriptionsWithTiers));
  } catch (error) {
    console.error('Error fetching creator subscribers:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/creators/:address/profile
 *
 * Get creator profile page data for fans
 * Includes: creator info, tiers with subscriber counts, recent posts
 *
 * @param address - Creator's Sui wallet address
 * @returns Creator profile data or 404
 */
router.get('/:address/profile', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Fetch creator
    const creator = await prisma.creator.findUnique({
      where: { address },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Fetch all tiers for this creator
    const tiers = await prisma.tier.findMany({
      where: {
        creatorId: creator.id,
        isActive: true,
      },
      orderBy: { price: 'asc' },
    });

    const tierIds = tiers.map((tier) => tier.id);

    // Calculate follower count (total active subscriptions across all tiers)
    const actualFollowerCount = await prisma.subscription.count({
      where: {
        tierId: { in: tierIds },
        isActive: true,
        expiresAt: { gte: new Date() },
      },
    });

    // Calculate subscriber count for each tier
    const tiersWithCounts = await Promise.all(
      tiers.map(async (tier) => {
        const actualSubCount = await prisma.subscription.count({
          where: {
            tierId: tier.id,
            isActive: true,
            expiresAt: { gte: new Date() },
          },
        });

        // Parse benefits from description or use defaults
        const benefits = parseBenefits(tier.description);

        // Convert price from smallest unit to standard unit
        const priceInStandardUnit = toStandardUnit(tier.price);

        return {
          id: tier.id,
          tierId: tier.tierId,
          name: tier.name,
          description: tier.description,
          price: priceInStandardUnit,
          benefits,
          // TODO: Replace with actual subscriber count once we have enough real users
          subscriberCount: getFakedTierSubscriberCount(actualSubCount),
          isActive: tier.isActive,
        };
      })
    );

    // Fetch recent published posts (limit 5)
    const recentPosts = await prisma.content.findMany({
      where: {
        creatorId: creator.id,
        isDraft: false,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    // Get allowed tiers for all content items
    const contentIds = recentPosts.map((p) => p.id);
    const tiersMap = await getAllowedTiersForContents(contentIds);

    // Format posts response
    const formattedPosts = recentPosts.map((post) => {
      const stats = getContentStats(post.viewCount, post.likeCount);
      return {
        id: post.id,
        title: post.title,
        description: post.description,
        contentType: post.contentType,
        exclusiveId: post.sealedPatchId,
        previewId: post.previewPatchId,
        publishedAt: post.publishedAt,
        viewCount: stats.viewCount,
        likeCount: stats.likeCount,
        isPublic: post.isPublic,
        allowedTiers: tiersMap.get(post.id) || [],
      };
    });

    // Determine if creator has SuiNS name
    const suinsName = creator.name.endsWith('.sui') ? creator.name : undefined;

    // Build creator response
    const creatorProfile = {
      id: creator.id,
      address: creator.address,
      name: creator.name,
      bio: creator.bio,
      avatarUrl: creator.avatarUrl,
      backgroundUrl: creator.backgroundUrl,
      // TODO: Replace with actual follower count once we have enough real users
      followerCount: getFakedSubscriberCount(actualFollowerCount),
      joinedDate: creator.createdAt,
      category: creator.category,
      topic: creator.topic,
      topicName: getTopicName(creator.topic),
      isVerified: creator.isVerified,
      ...(suinsName && { suinsName }),
    };

    res.json(
      jsonResponse({
        creator: creatorProfile,
        tiers: tiersWithCounts,
        recentPosts: formattedPosts,
      })
    );
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Parse benefits from tier description
 * Splits by newlines and filters empty lines
 * Returns default benefits if description is empty
 */
function parseBenefits(description: string): string[] {
  if (!description || description.trim() === '') {
    return ['Access to exclusive content', 'Support the creator'];
  }

  return description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default router;
