/**
 * Explore API Routes
 *
 * Endpoints for discovering creators and categories.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { validateLimit } from '../lib/validation';

const router = Router();

/**
 * Category definition with metadata
 */
interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string;
  creatorCount: number;
  slug: string;
}

/**
 * Creator response for explore pages
 */
interface CreatorResponse {
  id: string;
  address: string;
  suinsName: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  category: string;
  followerCount: number;
  isVerified: boolean;
  createdAt: Date;
}

/**
 * Predefined categories with metadata
 */
const CATEGORIES: Omit<Category, 'creatorCount'>[] = [
  {
    id: 'podcasts-shows',
    name: 'Podcasts & shows',
    description: 'Audio content creators and podcasters',
    iconName: 'Mic',
    slug: 'podcasts-shows',
  },
  {
    id: 'tabletop-games',
    name: 'Tabletop games',
    description: 'Board games, RPGs, and tabletop gaming',
    iconName: 'Dices',
    slug: 'tabletop-games',
  },
  {
    id: 'music',
    name: 'Music',
    description: 'Musicians, composers, and audio artists',
    iconName: 'Music',
    slug: 'music',
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Authors, bloggers, and writers',
    iconName: 'BookOpen',
    slug: 'writing',
  },
  {
    id: 'video-film',
    name: 'Video & film',
    description: 'Video creators and filmmakers',
    iconName: 'Video',
    slug: 'video-film',
  },
  {
    id: 'visual-arts',
    name: 'Visual arts',
    description: 'Artists, illustrators, and designers',
    iconName: 'Palette',
    slug: 'visual-arts',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Game developers and gaming content',
    iconName: 'Gamepad2',
    slug: 'gaming',
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'Tech creators and developers',
    iconName: 'Code',
    slug: 'technology',
  },
];

/**
 * GET /api/explore/categories
 *
 * Get all categories with creator counts
 *
 * @returns Array of categories with metadata
 */
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    // Get creator counts for each category
    const categoriesWithCounts = await Promise.all(
      CATEGORIES.map(async (category) => {
        const count = await prisma.creator.count({
          where: { category: category.name },
        });

        return {
          ...category,
          creatorCount: count,
        };
      })
    );

    res.json(jsonResponse({ categories: categoriesWithCounts }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/explore/creators/new
 *
 * Get recently created creators (new on platform)
 *
 * Query params:
 * - limit: number (default: 12, max: 50)
 * - offset: number (default: 0)
 * - userAddress: string (optional, will be excluded from results if provided)
 *
 * @returns Array of creators sorted by creation date (newest first)
 */
router.get('/creators/new', async (req: Request, res: Response) => {
  try {
    const limit = validateLimit(req.query.limit as string, 12, 50);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const userAddress = req.query.userAddress as string | undefined;

    // Build where clause to exclude connected user if provided
    const where = userAddress
      ? { address: { not: userAddress } }
      : {};

    // Fetch recently created creators
    const creators = await prisma.creator.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    // Get total count for pagination (with same filter)
    const total = await prisma.creator.count({ where });

    // Fetch follower counts for each creator
    const creatorsWithCounts = await Promise.all(
      creators.map(async (creator) => {
        const followerCount = await getFollowerCount(creator.id);
        return formatCreatorResponse(creator, followerCount);
      })
    );

    res.json(
      jsonResponse({
        creators: creatorsWithCounts,
        pagination: {
          total,
          hasMore: offset + limit < total,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching new creators:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/explore/creators
 *
 * Get creators filtered by category
 *
 * Query params:
 * - category: string (optional, filter by category slug)
 * - limit: number (default: 12, max: 50)
 * - offset: number (default: 0)
 * - sort: "newest" | "popular" (default: "popular")
 * - userAddress: string (optional, will be excluded from results if provided)
 *
 * @returns Array of creators with pagination info
 */
router.get('/creators', async (req: Request, res: Response) => {
  try {
    const { category, sort, userAddress } = req.query;
    const limit = validateLimit(req.query.limit as string, 12, 50);
    const offset = parseInt((req.query.offset as string) || '0', 10);
    const sortBy = (sort as string) || 'popular';

    // Validate sort parameter
    if (sortBy !== 'newest' && sortBy !== 'popular') {
      return res.status(400).json({
        error: 'Invalid sort parameter. Must be "newest" or "popular"',
      });
    }

    // Build where clause
    let where: any = {};

    // Exclude connected user if userAddress is provided
    if (userAddress && typeof userAddress === 'string') {
      where.address = { not: userAddress };
    }

    // Filter by category if provided
    if (category && typeof category === 'string') {
      // Find category by slug
      const categoryDef = CATEGORIES.find((c) => c.slug === category);
      if (categoryDef) {
        where.category = categoryDef.name;
      } else {
        return res.status(400).json({
          error: 'Invalid category',
        });
      }
    }

    // Determine sort order
    const orderBy = sortBy === 'newest' ? { createdAt: 'desc' as const } : { createdAt: 'desc' as const };

    // Fetch creators
    const creators = await prisma.creator.findMany({
      where,
      take: limit * 3, // Fetch more for sorting by popularity
      skip: offset,
      orderBy,
    });

    // Get total count
    const total = await prisma.creator.count({ where });

    // Fetch follower counts and sort if needed
    const creatorsWithCounts = await Promise.all(
      creators.map(async (creator) => {
        const followerCount = await getFollowerCount(creator.id);
        return { creator, followerCount };
      })
    );

    // Sort by popularity (follower count) if requested
    if (sortBy === 'popular') {
      creatorsWithCounts.sort((a, b) => b.followerCount - a.followerCount);
    }

    // Take only the requested limit
    const limitedCreators = creatorsWithCounts.slice(0, limit);

    // Format response
    const formattedCreators = limitedCreators.map(({ creator, followerCount }) =>
      formatCreatorResponse(creator, followerCount)
    );

    res.json(
      jsonResponse({
        creators: formattedCreators,
        pagination: {
          total,
          hasMore: offset + limit < total,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching creators:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

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
 * Format creator response
 * Maps database creator to API response format
 */
function formatCreatorResponse(creator: any, followerCount: number): CreatorResponse {
  return {
    id: creator.id,
    address: creator.address,
    suinsName: creator.name || null,
    displayName: creator.name || `Creator ${creator.address.slice(0, 6)}`,
    bio: creator.bio,
    avatarUrl: creator.avatarUrl || null,
    backgroundUrl: creator.backgroundUrl || null,
    category: creator.category || 'Creator',
    followerCount,
    isVerified: creator.isVerified || false,
    createdAt: creator.createdAt instanceof Date ? creator.createdAt : new Date(creator.createdAt),
  };
}

export default router;
