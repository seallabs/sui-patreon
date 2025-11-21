/**
 * Home API Routes
 *
 * Endpoints for fetching creators for the home page.
 * Provides: recently visited, recommended, and popular creators.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { validateLimit } from '../lib/validation';
import { getFakedSubscriberCount } from '../lib/random-stats';

const router = Router();

/**
 * Type for creator response
 */
interface CreatorResponse {
  id: string;
  address: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  category: string;
  followerCount: number;
  isVerified: boolean;
  contentCount: number;
}

/**
 * GET /api/home/creators
 *
 * Get creators for home page sections
 *
 * Query params:
 * - section: "recently-visited" | "recommended" | "popular" (required)
 * - limit: number (default: 8, max: 20)
 * - userAddress: string (optional, for personalization later)
 *
 * Returns different creator lists based on section:
 * - recently-visited: Popular creators sorted by follower count
 * - recommended: Creators with most content, sorted by content count then followers
 * - popular: Creators with highest total views (sum of viewCount from their content)
 */
router.get('/creators', async (req: Request, res: Response) => {
  try {
    const { section, userAddress } = req.query;

    // Validate section parameter
    if (!section || typeof section !== 'string') {
      return res.status(400).json({
        error: 'Missing required parameter: section',
      });
    }

    const validSections = ['recently-visited', 'recommended', 'popular'];
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: `Invalid section parameter. Must be one of: ${validSections.join(', ')}`,
      });
    }

    // Validate limit (default: 8, max: 20)
    const limit = validateLimit(req.query.limit as string, 8, 20);

    let creators: CreatorResponse[] = [];

    switch (section) {
      case 'recently-visited':
        creators = await getRecentlyVisitedCreators(limit, userAddress as string);
        break;

      case 'recommended':
        creators = await getRecommendedCreators(limit, userAddress as string);
        break;

      case 'popular':
        creators = await getPopularCreators(limit, userAddress as string);
        break;
    }

    res.json(jsonResponse({ creators }));
  } catch (error) {
    console.error('Error fetching home creators:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get recently visited creators
 * Returns creators based on user's visit history, sorted by most recent visit
 * Falls back to popular creators if no userAddress provided or no visits found
 * Excludes the connected user from results
 */
async function getRecentlyVisitedCreators(
  limit: number,
  userAddress?: string
): Promise<CreatorResponse[]> {
  // If userAddress provided, fetch from visits table
  if (userAddress && typeof userAddress === 'string') {
    const visits = await prisma.visit.findMany({
      where: { userAddress },
      orderBy: { visitedAt: 'desc' },
      take: limit,
      distinct: ['creatorId'], // Ensure each creator appears only once
    });

    // If we have visits, return those creators (excluding self)
    if (visits.length > 0) {
      const creatorsWithCounts = await Promise.all(
        visits.map(async (visit) => {
          const creator = await prisma.creator.findUnique({
            where: { id: visit.creatorId },
          });

          // Skip if creator doesn't exist or is the connected user
          if (!creator || creator.address === userAddress) return null;

          const [followerCount, contentCount] = await Promise.all([
            getFollowerCount(creator.id),
            getContentCount(creator.id),
          ]);

          return {
            creator,
            followerCount,
            contentCount,
          };
        })
      );

      // Filter out null entries (deleted creators and self) and format response
      const validCreators = creatorsWithCounts.filter((c) => c !== null);
      return validCreators.map(({ creator, followerCount, contentCount }) =>
        formatCreatorResponse(creator, followerCount, contentCount)
      );
    }
  }

  // Fallback: return popular creators by follower count (excluding connected user)
  const whereClause = userAddress ? { address: { not: userAddress } } : {};
  const allCreators = await prisma.creator.findMany({
    where: whereClause,
    take: limit * 5, // Fetch more to account for filtering
    orderBy: { createdAt: 'desc' },
  });

  // Get subscriber counts for all creators
  const creatorsWithCounts = await Promise.all(
    allCreators.map(async (creator) => {
      const [followerCount, contentCount] = await Promise.all([
        getFollowerCount(creator.id),
        getContentCount(creator.id),
      ]);

      return {
        creator,
        followerCount,
        contentCount,
      };
    })
  );

  // Sort by follower count descending
  creatorsWithCounts.sort((a, b) => b.followerCount - a.followerCount);

  // Take top N and format response
  return creatorsWithCounts.slice(0, limit).map(({ creator, followerCount, contentCount }) =>
    formatCreatorResponse(creator, followerCount, contentCount)
  );
}

/**
 * Get recommended creators
 * Returns creators with most content, sorted by content count then followers
 * Excludes the connected user from results
 */
async function getRecommendedCreators(
  limit: number,
  userAddress?: string
): Promise<CreatorResponse[]> {
  // Build where clause to exclude connected user
  const whereClause = userAddress ? { address: { not: userAddress } } : {};

  // Get all creators with their content counts
  const allCreators = await prisma.creator.findMany({
    where: whereClause,
    take: limit * 5, // Fetch more to account for filtering
    orderBy: { createdAt: 'desc' },
  });

  // Get content and subscriber counts for all creators
  const creatorsWithCounts = await Promise.all(
    allCreators.map(async (creator) => {
      const [followerCount, contentCount] = await Promise.all([
        getFollowerCount(creator.id),
        getContentCount(creator.id),
      ]);

      return {
        creator,
        followerCount,
        contentCount,
      };
    })
  );

  // Sort by content count descending, then by follower count
  creatorsWithCounts.sort((a, b) => {
    if (b.contentCount !== a.contentCount) {
      return b.contentCount - a.contentCount;
    }
    return b.followerCount - a.followerCount;
  });

  // Take top N and format response
  return creatorsWithCounts.slice(0, limit).map(({ creator, followerCount, contentCount }) =>
    formatCreatorResponse(creator, followerCount, contentCount)
  );
}

/**
 * Get popular creators
 * Returns creators with highest total views (sum of viewCount from their content)
 * Excludes the connected user from results
 */
async function getPopularCreators(limit: number, userAddress?: string): Promise<CreatorResponse[]> {
  // Build where clause to exclude connected user
  const whereClause = userAddress ? { address: { not: userAddress } } : {};

  // Get all creators
  const allCreators = await prisma.creator.findMany({
    where: whereClause,
    take: limit * 5, // Fetch more to account for filtering
    orderBy: { createdAt: 'desc' },
  });

  // Get total views, follower count, and content count for each creator
  const creatorsWithStats = await Promise.all(
    allCreators.map(async (creator) => {
      const [totalViews, followerCount, contentCount] = await Promise.all([
        getTotalViews(creator.id),
        getFollowerCount(creator.id),
        getContentCount(creator.id),
      ]);

      return {
        creator,
        totalViews,
        followerCount,
        contentCount,
      };
    })
  );

  // Sort by total views descending
  creatorsWithStats.sort((a, b) => b.totalViews - a.totalViews);

  // Take top N and format response
  return creatorsWithStats.slice(0, limit).map(({ creator, followerCount, contentCount }) =>
    formatCreatorResponse(creator, followerCount, contentCount)
  );
}

/**
 * Get follower count for a creator
 * Counts active, non-expired subscriptions across all their tiers
 */
async function getFollowerCount(creatorId: string): Promise<number> {
  // Get all tiers for this creator
  const tiers = await prisma.tier.findMany({
    where: { creatorId },
    select: { id: true },
  });

  const tierIds = tiers.map((tier) => tier.id);

  if (tierIds.length === 0) {
    return 0;
  }

  // Count active, non-expired subscriptions
  const count = await prisma.subscription.count({
    where: {
      tierId: { in: tierIds },
      isActive: true,
      expiresAt: { gte: new Date() },
    },
  });

  return count;
}

/**
 * Get content count for a creator
 * Counts published (non-draft) content
 */
async function getContentCount(creatorId: string): Promise<number> {
  const count = await prisma.content.count({
    where: {
      creatorId,
      isDraft: false,
    },
  });

  return count;
}

/**
 * Get total views for a creator
 * Sums viewCount from all their content
 */
async function getTotalViews(creatorId: string): Promise<number> {
  const result = await prisma.content.aggregate({
    where: { creatorId },
    _sum: { viewCount: true },
  });

  return result._sum.viewCount || 0;
}

/**
 * Format creator response
 * Maps database creator to API response format
 */
function formatCreatorResponse(
  creator: any,
  followerCount: number,
  contentCount: number
): CreatorResponse {
  return {
    id: creator.id,
    address: creator.address,
    name: creator.name,
    bio: creator.bio,
    avatarUrl: creator.avatarUrl,
    backgroundUrl: creator.backgroundUrl,
    category: 'Creator', // Default category for now
    topic: creator.topic ?? 0, // Include topic field (default to 0 if missing)
    // TODO: Replace with actual follower count once we have enough real users
    followerCount: getFakedSubscriberCount(followerCount),
    isVerified: false, // Default false for now
    contentCount,
  };
}

export default router;
