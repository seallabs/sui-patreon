/**
 * Dashboard API Routes
 *
 * Endpoints for creator dashboard statistics, activity, and content management.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { validateLimit, sanitizeSearchQuery } from '../lib/validation';
import { formatCurrency } from '../config/currency';

const router = Router();

/**
 * Response interfaces
 */
interface OverviewStats {
  totalMembers: number;
  totalRevenue: string; // In SUI
}

interface Activity {
  commentsCount: number;
  likesCount: number;
  impressionsCount: number;
}

interface RecentPost {
  id: string;
  title: string;
  mediaType: string;
  mediaUrls: string[];
  audience: 'free' | 'paid';
  createdAt: string;
  viewCount: number;
  likeCount: number;
}

interface ContentListItem {
  id: string;
  title: string;
  mediaType: string;
  mediaUrls: string[];
  audience: 'free' | 'paid';
  tierNames: string[];
  createdAt: string;
  viewCount: number;
  likeCount: number;
}

interface DashboardResponse {
  overview: OverviewStats;
  activity: Activity;
  recentPost: RecentPost | null;
  recentPosts: ContentListItem[];
  cursor: string | null;
  hasMore: boolean;
}

/**
 * GET /api/dashboard
 *
 * Get creator dashboard data
 *
 * Query params:
 * - creatorAddress: Sui wallet address (optional, defaults to MOCK_WALLET_ADDRESS)
 * - type: Filter by media type - "all" | "image" | "video" | "audio" | "text" (default: "all")
 * - tier: Filter by tier - "all" | tier ID (default: "all")
 * - time: Filter by time - "all" | "7days" | "30days" (default: "all")
 * - search: Search by title (optional)
 * - cursor: Pagination cursor (content ID to start after)
 * - limit: Number of posts to return (default: 20, max: 100)
 *
 * Returns:
 * - overview: Total members and revenue
 * - activity: Last 30 days comments, likes, impressions
 * - recentPost: Latest published content item
 * - recentPosts: Paginated list of content items
 * - cursor: Next cursor for pagination
 * - hasMore: Whether more results exist
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      creatorAddress = process.env.MOCK_WALLET_ADDRESS,
      type = 'all',
      tier = 'all',
      time = 'all',
      search,
      cursor,
    } = req.query;

    if (!creatorAddress || typeof creatorAddress !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid creatorAddress parameter',
      });
    }

    // Validate limit
    const limit = validateLimit(req.query.limit as string, 20, 100);

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address: creatorAddress },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Fetch all tiers for this creator (needed for multiple queries)
    const tiers = await prisma.tier.findMany({
      where: { creatorId: creator.id },
      select: { id: true, name: true, price: true },
    });

    const tierIds = tiers.map((t) => t.id);

    // === OVERVIEW STATS ===
    const overview = await getOverviewStats(tierIds);

    // === ACTIVITY (Last 30 days) ===
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activity = await getActivity(creator.id, thirtyDaysAgo);

    // === RECENT POST (latest published content) ===
    const recentPost = await getRecentPost(creator.id);

    // === RECENT POSTS (paginated content list) ===
    const { posts, nextCursor, hasMore } = await getRecentPosts({
      creatorId: creator.id,
      tiers,
      type: type as string,
      tier: tier as string,
      time: time as string,
      search: search as string | undefined,
      cursor: cursor as string | undefined,
      limit,
    });

    const response: DashboardResponse = {
      overview,
      activity,
      recentPost,
      recentPosts: posts,
      cursor: nextCursor,
      hasMore,
    };

    res.json(jsonResponse(response));
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * Get overview statistics
 * Counts active subscriptions and calculates total revenue
 */
async function getOverviewStats(tierIds: string[]): Promise<OverviewStats> {
  if (tierIds.length === 0) {
    return {
      totalMembers: 0,
      totalRevenue: '0',
    };
  }

  // Count active, non-expired subscriptions
  const totalMembers = await prisma.subscription.count({
    where: {
      tierId: { in: tierIds },
      isActive: true,
      expiresAt: { gte: new Date() },
    },
  });

  // Calculate total revenue from all subscriptions (active + expired)
  // Note: In a real system, you'd track actual payments via blockchain events
  const subscriptions = await prisma.subscription.findMany({
    where: {
      tierId: { in: tierIds },
    },
    select: {
      tierId: true,
    },
  });

  // Group subscriptions by tier and calculate revenue
  const tierMap = new Map<string, bigint>();

  // First, get all tier prices
  const allTiers = await prisma.tier.findMany({
    where: { id: { in: tierIds } },
    select: { id: true, price: true },
  });

  allTiers.forEach((tier) => {
    tierMap.set(tier.id, tier.price);
  });

  // Calculate total revenue (assuming each subscription = 1 month of payment)
  let totalRevenueSmallestUnit = BigInt(0);
  for (const sub of subscriptions) {
    const tierPrice = tierMap.get(sub.tierId);
    if (tierPrice) {
      totalRevenueSmallestUnit += tierPrice;
    }
  }

  // Convert from smallest unit to standard unit (e.g., USDC base units to USDC dollars)
  const totalRevenueFormatted = formatCurrency(totalRevenueSmallestUnit, 2);

  return {
    totalMembers,
    totalRevenue: totalRevenueFormatted,
  };
}

/**
 * Get activity statistics for last 30 days
 * Counts comments (from content), likes, and impressions (from visits)
 */
async function getActivity(creatorId: string, since: Date): Promise<Activity> {
  // Get all content IDs for this creator
  const content = await prisma.content.findMany({
    where: { creatorId },
    select: { id: true, likeCount: true },
  });

  // Comments count: Sum of all comments across all content
  // Note: Comments are not yet implemented in schema, using 0 for now
  const commentsCount = 0;

  // Likes count: Sum of likeCount from all content
  const likesCount = content.reduce((sum, item) => sum + item.likeCount, 0);

  // Impressions count: Count visits since the specified date
  const impressionsCount = await prisma.visit.count({
    where: {
      creatorId,
      visitedAt: { gte: since },
    },
  });

  return {
    commentsCount,
    likesCount,
    impressionsCount,
  };
}

/**
 * Get the most recent published post
 */
async function getRecentPost(creatorId: string): Promise<RecentPost | null> {
  const content = await prisma.content.findFirst({
    where: {
      creatorId,
      isDraft: false,
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: 'desc' },
  });

  if (!content) {
    return null;
  }

  // Get tier information for this content
  const contentTiers = await prisma.contentTier.findMany({
    where: { contentId: content.id },
  });

  const mediaUrls = getMediaUrls(content.sealedPatchId, content.previewPatchId);

  return {
    id: content.id,
    title: content.title,
    mediaType: mapContentTypeToMediaType(content.contentType),
    mediaUrls,
    audience: content.isPublic || contentTiers.length === 0 ? 'free' : 'paid',
    createdAt: (content.publishedAt || content.createdAt).toISOString(),
    viewCount: content.viewCount,
    likeCount: content.likeCount,
  };
}

/**
 * Get paginated list of recent posts with filtering
 */
async function getRecentPosts(params: {
  creatorId: string;
  tiers: Array<{ id: string; name: string; price: bigint }>;
  type: string;
  tier: string;
  time: string;
  search?: string;
  cursor?: string;
  limit: number;
}): Promise<{ posts: ContentListItem[]; nextCursor: string | null; hasMore: boolean }> {
  const { creatorId, tiers, type, tier, time, search, cursor, limit } = params;

  // Build where clause
  const whereClause: any = {
    creatorId,
    isDraft: false,
    publishedAt: { not: null },
  };

  // Cursor-based pagination (cursor is the publishedAt timestamp of the last item)
  if (cursor) {
    // Cursor format: ISO timestamp from publishedAt
    try {
      const cursorDate = new Date(cursor);
      whereClause.publishedAt = { lt: cursorDate };
    } catch (error) {
      // Invalid cursor, ignore it
      console.error('Invalid cursor format:', cursor);
    }
  }

  // Type filtering
  if (type !== 'all') {
    const typeMap: Record<string, string> = {
      video: 'video/',
      audio: 'audio/',
      image: 'image/',
      text: 'text/',
    };

    const prefix = typeMap[type.toLowerCase()];
    if (prefix) {
      whereClause.contentType = { startsWith: prefix };
    }
  }

  // Time filtering
  if (time !== 'all') {
    const now = Date.now();
    const timeMap: Record<string, number> = {
      '7days': 7 * 24 * 60 * 60 * 1000,
      '30days': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeMap[time];
    if (duration) {
      whereClause.publishedAt = { gte: new Date(now - duration) };
    }
  }

  // Search filtering
  if (search && typeof search === 'string') {
    whereClause.title = {
      contains: sanitizeSearchQuery(search),
      mode: 'insensitive' as const,
    };
  }

  // For tier filtering, we need to fetch more items than the limit to account for filtering
  // Use a multiplier of 3x to reduce chances of under-fetching
  const fetchLimit = tier !== 'all' ? limit * 3 : limit + 1;

  // Fetch content items
  const content = await prisma.content.findMany({
    where: whereClause,
    orderBy: { publishedAt: 'desc' },
    take: fetchLimit,
  });

  // Fetch tier information for all content items
  const contentIds = content.map((c) => c.id);
  const allContentTiers = await prisma.contentTier.findMany({
    where: { contentId: { in: contentIds } },
  });

  // Group contentTiers by contentId
  const tiersByContentId = new Map<string, string[]>();
  for (const ct of allContentTiers) {
    if (!tiersByContentId.has(ct.contentId)) {
      tiersByContentId.set(ct.contentId, []);
    }
    tiersByContentId.get(ct.contentId)!.push(ct.tierId);
  }

  // Build tier ID to name map
  const tierMap = new Map<string, string>();
  tiers.forEach((t) => {
    tierMap.set(t.id, t.name);
  });

  // Map content to response format and apply tier filtering
  const allPosts: ContentListItem[] = [];

  for (const item of content) {
    const itemTierIds = tiersByContentId.get(item.id) || [];

    // Tier filtering: Skip if tier filter is specified and doesn't match
    if (tier !== 'all' && !itemTierIds.includes(tier)) {
      continue;
    }

    const tierNames = itemTierIds.map((tid) => tierMap.get(tid) || 'Unknown');
    const mediaUrls = getMediaUrls(item.sealedPatchId, item.previewPatchId);

    allPosts.push({
      id: item.id,
      title: item.title,
      mediaType: mapContentTypeToMediaType(item.contentType),
      mediaUrls,
      audience: item.isPublic || itemTierIds.length === 0 ? 'free' : 'paid',
      tierNames,
      createdAt: (item.publishedAt || item.createdAt).toISOString(),
      viewCount: item.viewCount,
      likeCount: item.likeCount,
    });
  }

  // Apply limit and check if there are more results
  const hasMore = allPosts.length > limit;
  const posts = hasMore ? allPosts.slice(0, limit) : allPosts;

  // Next cursor is the createdAt timestamp of the last returned post (ISO string)
  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].createdAt : null;

  return {
    posts,
    nextCursor,
    hasMore,
  };
}

/**
 * Map MIME content type to media type
 */
function mapContentTypeToMediaType(contentType: string): string {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('image/')) return 'image';
  return 'text';
}

/**
 * Get media URLs from Walrus patch IDs
 */
function getMediaUrls(sealedPatchId: string, previewPatchId: string | null): string[] {
  const baseUrl = 'https://aggregator.walrus-testnet.walrus.space/v1';
  const urls: string[] = [];

  if (previewPatchId) {
    urls.push(`${baseUrl}/${previewPatchId}`);
  }

  urls.push(`${baseUrl}/${sealedPatchId}`);

  return urls;
}

export default router;
