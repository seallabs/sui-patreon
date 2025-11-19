/**
 * Library API Routes
 *
 * Endpoints for fetching creator's library content (posts, drafts, collections).
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { validateLimit, sanitizeSearchQuery } from '../lib/validation';
import { toStandardUnit } from '../config/currency';
import { getAllowedTiersForContents } from '../lib/content-tiers';

const router = Router();

/**
 * Map MIME type to post type
 */
function mapContentTypeToPostType(contentType: string): 'text' | 'video' | 'audio' | 'image' {
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('image/')) return 'image';
  return 'text';
}

/**
 * GET /api/library/:creatorAddress
 *
 * Get library posts for a creator with filtering, sorting, and pagination
 *
 * Query params:
 * - tab: "posts" | "collections" | "drafts" (default: "posts")
 * - search: string (optional, filters by title)
 * - filter: string (optional, filters by post type or tier access)
 * - sortBy: "date" | "title" (default: "date")
 * - sortOrder: "asc" | "desc" (default: "desc")
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 *
 * @param creatorAddress - Creator's Sui wallet address
 * @returns Library posts with pagination metadata
 */
router.get('/:creatorAddress', async (req: Request, res: Response) => {
  try {
    const { creatorAddress } = req.params;
    const {
      tab = 'posts',
      search,
      filter,
      sortBy = 'date',
      sortOrder = 'desc',
      page = '1',
    } = req.query;

    // Validate limit
    const limit = validateLimit(req.query.limit as string, 20, 100);

    // Parse page number
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const skip = (pageNum - 1) * limit;

    // First verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { address: creatorAddress },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Build where clause based on tab
    const whereClause: any = {
      creatorId: creator.id,
    };

    // Tab filtering
    if (tab === 'drafts') {
      whereClause.isDraft = true;
    } else if (tab === 'posts') {
      whereClause.isDraft = false;
    }
    // Note: collections not implemented yet, will return empty for that tab

    // Search filtering
    if (search && typeof search === 'string') {
      whereClause.title = {
        contains: sanitizeSearchQuery(search),
        mode: 'insensitive' as const,
      };
    }

    // Type filtering (from filter param)
    if (filter && typeof filter === 'string') {
      const filterLower = filter.toLowerCase();
      if (['video', 'audio', 'image', 'text'].some(type => filterLower.includes(type))) {
        // Map filter to MIME type pattern
        if (filterLower.includes('video')) {
          whereClause.contentType = { startsWith: 'video/' };
        } else if (filterLower.includes('audio')) {
          whereClause.contentType = { startsWith: 'audio/' };
        } else if (filterLower.includes('image')) {
          whereClause.contentType = { startsWith: 'image/' };
        } else if (filterLower.includes('text')) {
          whereClause.contentType = { startsWith: 'text/' };
        }
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else {
      // Sort by date - use publishedAt for published posts, createdAt for drafts
      orderBy.publishedAt = sortOrder;
    }

    // Return empty results for collections tab (not implemented yet)
    if (tab === 'collections') {
      return res.json(
        jsonResponse({
          posts: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          },
        })
      );
    }

    // Execute query with pagination
    const [content, totalCount] = await Promise.all([
      prisma.content.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.content.count({ where: whereClause }),
    ]);

    // Get allowed tiers for all content items
    const contentIds = content.map((c) => c.id);
    const tiersMap = await getAllowedTiersForContents(contentIds);

    // Manually fetch contentTiers for each content (no Prisma relations)
    const contentWithTiers = await Promise.all(
      content.map(async (item) => {
        const contentTiers = await prisma.contentTier.findMany({
          where: { contentId: item.id },
        });

        // Fetch tier details
        const tiersWithDetails = await Promise.all(
          contentTiers.map(async (ct) => {
            const tier = await prisma.tier.findUnique({
              where: { id: ct.tierId },
              select: { id: true, name: true, price: true },
            });
            return { ...ct, tier };
          })
        );

        return { ...item, contentTiers: tiersWithDetails };
      })
    );

    // Map database records to LibraryPost format
    const posts = contentWithTiers.map(item => ({
      id: item.id,
      title: item.title,
      publishDate: item.publishedAt || item.createdAt,
      tierAccess: item.isPublic
        ? 'Public'
        : item.contentTiers.length > 0
        ? 'Paid'
        : 'Public',
      price: item.contentTiers.length > 0 && item.contentTiers[0].tier
        ? toStandardUnit(item.contentTiers[0].tier.price)
        : undefined,
      postType: mapContentTypeToPostType(item.contentType),
      thumbnailUrl: item.previewPatchId
        ? `https://aggregator.walrus-testnet.walrus.space/v1/blobs/by-quilt-patch-id/${item.previewPatchId}`
        : undefined,
      isDraft: item.isDraft,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      allowedTiers: tiersMap.get(item.id) || [],
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    res.json(
      jsonResponse({
        posts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      })
    );
  } catch (error) {
    console.error('Error fetching library posts:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
