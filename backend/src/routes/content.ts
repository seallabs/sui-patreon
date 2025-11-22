/**
 * Content API Routes
 *
 * Endpoints for querying content and checking access permissions.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import { getAllowedTiersForContent, getAllowedTiersForContents } from '../lib/content-tiers';
import { getContentStats } from '../lib/random-stats';

const router = Router();

/**
 * GET /api/content/:contentId
 *
 * Get detailed content information for content detail page
 * Includes: content info, creator details, access control, related/popular posts
 *
 * Query params:
 * - address (optional): User's Sui wallet address for access check
 *
 * @param contentId - Content's Sui object ID
 * @returns Content detail object with creator, access status, and related content
 */
router.get('/:contentId', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { address } = req.query;

    // Try to find content by either database ID (UUID) or contentId (Sui object ID)
    let content = await prisma.content.findUnique({
      where: { contentId },
    });

    // If not found by contentId, try by database ID
    if (!content) {
      try {
        content = await prisma.content.findUnique({
          where: { id: contentId },
        });
      } catch (error) {
        // Invalid UUID format - content doesn't exist
        content = null;
      }
    }

    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
      });
    }

    // Manually fetch creator (no Prisma relations)
    const creator = await prisma.creator.findUnique({
      where: { id: content.creatorId },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found',
      });
    }

    // Check if user has access to this content
    let isSubscribed = false;

    if (address && typeof address === 'string') {
      // Fetch content tier requirements
      const contentTiers = await prisma.contentTier.findMany({
        where: { contentId: content.id },
        select: { tierId: true },
      });

      // If content is public or has no tier requirements, everyone has access
      if (content.isPublic || contentTiers.length === 0) {
        isSubscribed = true;
      } else {
        // Check for active subscription to any required tier
        const requiredTierIds = contentTiers.map(ct => ct.tierId);
        const activeSubscription = await prisma.subscription.findFirst({
          where: {
            subscriber: address,
            tierId: { in: requiredTierIds },
            isActive: true,
            startsAt: { lte: new Date() },
            expiresAt: { gte: new Date() },
          },
        });

        isSubscribed = !!activeSubscription;
      }
    } else {
      // No address provided - only public content is accessible
      isSubscribed = content.isPublic;
    }

    // Fetch related posts from the same creator (exclude current post)
    const relatedPosts = await prisma.content.findMany({
      where: {
        creatorId: content.creatorId,
        id: { not: content.id },
        isDraft: false,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        contentId: true,
        title: true,
        description: true,
        contentType: true,
        previewPatchId: true,
        publishedAt: true,
        viewCount: true,
        likeCount: true,
      },
    });

    // Fetch popular posts from the same creator (most liked/viewed)
    const popularPosts = await prisma.content.findMany({
      where: {
        creatorId: content.creatorId,
        id: { not: content.id },
        isDraft: false,
        publishedAt: { not: null },
      },
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
      ],
      take: 5,
      select: {
        id: true,
        contentId: true,
        title: true,
        description: true,
        contentType: true,
        previewPatchId: true,
        publishedAt: true,
        viewCount: true,
        likeCount: true,
      },
    });

    // Fetch allowed tiers for main content and related posts
    const allContentIds = [
      content.id,
      ...relatedPosts.map((p) => p.id),
      ...popularPosts.map((p) => p.id),
    ];
    const tiersMap = await getAllowedTiersForContents(allContentIds);

    // Build response with proper access control
    const contentStats = getContentStats(content.viewCount, content.likeCount);
    const response = {
      content: {
        id: content.id,
        contentId: content.contentId,
        title: content.title,
        description: content.description,
        contentType: content.contentType,
        previewId: content.previewPatchId,
        // For public content: always include (unencrypted)
        // For private content: only include if user has subscription
        exclusiveId: (content.isPublic || isSubscribed) ? content.sealedPatchId : null,
        isPublic: content.isPublic, // Use actual database value, not computed from subscription
        isLocked: !isSubscribed, // User's access status (for compatibility)
        viewCount: contentStats.viewCount,
        likeCount: contentStats.likeCount,
        publishedAt: content.publishedAt,
        createdAt: content.createdAt,
        allowedTiers: tiersMap.get(content.id) || [],
      },
      creator: {
        id: creator.id,
        address: creator.address,
        suinsName: creator.name.endsWith('.sui') ? creator.name : undefined,
        displayName: creator.name,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        backgroundUrl: creator.backgroundUrl,
        category: creator.category,
        isVerified: creator.isVerified,
      },
      isSubscribed,
      relatedPosts: relatedPosts.map(post => {
        const stats = getContentStats(post.viewCount, post.likeCount);
        return {
          id: post.id,
          contentId: post.contentId,
          title: post.title,
          description: post.description,
          contentType: post.contentType,
          previewId: post.previewPatchId,
          publishedAt: post.publishedAt,
          viewCount: stats.viewCount,
          likeCount: stats.likeCount,
          allowedTiers: tiersMap.get(post.id) || [],
        };
      }),
      popularPosts: popularPosts.map(post => {
        const stats = getContentStats(post.viewCount, post.likeCount);
        return {
          id: post.id,
          contentId: post.contentId,
          title: post.title,
          description: post.description,
          contentType: post.contentType,
          previewId: post.previewPatchId,
          publishedAt: post.publishedAt,
          viewCount: stats.viewCount,
          likeCount: stats.likeCount,
          allowedTiers: tiersMap.get(post.id) || [],
        };
      }),
    };

    res.json(jsonResponse(response));
  } catch (error) {
    console.error('Error fetching content:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/content/:contentId/access
 *
 * Check if user has access to content
 * Verifies active subscription to required tier
 *
 * Query params:
 * - address (required): User's Sui wallet address
 *
 * @param contentId - Content's Sui object ID
 * @returns { hasAccess: boolean, reason?: string }
 */
router.get('/:contentId/access', async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const { address } = req.query;

    // Validate address parameter
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Invalid parameters: address query parameter required',
      });
    }

    // Fetch content
    const content = await prisma.content.findUnique({
      where: { contentId },
    });

    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
      });
    }

    // Public content is accessible to everyone
    if (content.isPublic) {
      return res.json({
        hasAccess: true,
        reason: 'Content is public',
      });
    }

    // Manually fetch tier requirements (no Prisma relations)
    const contentTiers = await prisma.contentTier.findMany({
      where: { contentId: content.id },
      select: { tierId: true },
    });

    // Check if content requires specific tiers
    if (contentTiers.length === 0) {
      // No tier requirements - accessible to all
      return res.json({
        hasAccess: true,
        reason: 'No tier requirements',
      });
    }

    // Get required tier IDs
    const requiredTierIds = contentTiers.map(ct => ct.tierId);

    // Check for active subscription to any required tier
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        subscriber: address,
        tierId: {
          in: requiredTierIds,
        },
        isActive: true,
        startsAt: {
          lte: new Date(),
        },
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (activeSubscription) {
      // Manually fetch tier name (no Prisma relations)
      const tier = await prisma.tier.findUnique({
        where: { id: activeSubscription.tierId },
        select: { name: true },
      });

      return res.json({
        hasAccess: true,
        reason: `Active subscription to ${tier?.name || 'tier'}`,
      });
    }

    // No active subscription found
    res.json({
      hasAccess: false,
      reason: 'No active subscription to required tier',
    });
  } catch (error) {
    console.error('Error checking content access:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
