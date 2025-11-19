/**
 * Dashboard API Routes Tests
 *
 * Tests for the dashboard endpoint functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Dashboard API', () => {
  let testCreator: any;
  let testTiers: any[] = [];
  let testSubscriptions: any[] = [];
  let testContent: any[] = [];

  beforeAll(async () => {
    // Clean up test data
    await cleanupTestData();

    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: '0xtest_dashboard_creator_00000000000000000000000000000000000000000',
        profileId: '0xtest_dashboard_profile_0000000000000000000000000000000000000000',
        name: 'test-dashboard-creator',
        bio: 'Test creator for dashboard',
        avatarUrl: 'https://example.com/avatar.png',
      },
    });

    // Create tiers
    const tier1 = await prisma.tier.create({
      data: {
        tierId: '0xtest_dashboard_tier1_000000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        name: 'Basic',
        description: 'Basic tier',
        price: BigInt(5_000_000_000), // 5 SUI
      },
    });

    const tier2 = await prisma.tier.create({
      data: {
        tierId: '0xtest_dashboard_tier2_000000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        name: 'Premium',
        description: 'Premium tier',
        price: BigInt(10_000_000_000), // 10 SUI
      },
    });

    testTiers = [tier1, tier2];

    // Create active subscriptions
    for (let i = 0; i < 3; i++) {
      const sub = await prisma.subscription.create({
        data: {
          subscriptionId: `0xtest_dashboard_sub1_${i}_00000000000000000000000000000000000`,
          subscriber: `0xtest_subscriber_${i}_000000000000000000000000000000000000000000`,
          tierId: tier1.id,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
        },
      });
      testSubscriptions.push(sub);
    }

    // Create 2 premium subscriptions
    for (let i = 0; i < 2; i++) {
      const sub = await prisma.subscription.create({
        data: {
          subscriptionId: `0xtest_dashboard_sub2_${i}_00000000000000000000000000000000000`,
          subscriber: `0xtest_subscriber_premium_${i}_0000000000000000000000000000000000`,
          tierId: tier2.id,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
      testSubscriptions.push(sub);
    }

    // Create visits (last 30 days)
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      await prisma.visit.create({
        data: {
          userAddress: `0xtest_visitor_${i}_00000000000000000000000000000000000000000000`,
          creatorId: testCreator.id,
          visitedAt: new Date(now - i * 24 * 60 * 60 * 1000), // Last 10 days
        },
      });
    }

    // Create old visits (over 30 days ago - should not count)
    for (let i = 0; i < 5; i++) {
      await prisma.visit.create({
        data: {
          userAddress: `0xtest_old_visitor_${i}_000000000000000000000000000000000000000`,
          creatorId: testCreator.id,
          visitedAt: new Date(now - (35 + i) * 24 * 60 * 60 * 1000), // 35+ days ago
        },
      });
    }

    // Create content (mix of public and paid)
    const content1 = await prisma.content.create({
      data: {
        contentId: '0xtest_dashboard_content1_000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-DASHBOARD] Latest Post',
        description: 'Latest test content',
        contentType: 'video/mp4',
        sealedPatchId: 'test_blob_1',
        previewPatchId: 'test_preview_1',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date(),
        viewCount: 100,
        likeCount: 20,
      },
    });
    testContent.push(content1);

    // Link to tier
    await prisma.contentTier.create({
      data: {
        contentId: content1.id,
        tierId: tier1.id,
      },
    });

    // Create more content for list testing
    const content2 = await prisma.content.create({
      data: {
        contentId: '0xtest_dashboard_content2_000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-DASHBOARD] Image Post',
        description: 'Image content',
        contentType: 'image/png',
        sealedPatchId: 'test_blob_2',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        viewCount: 50,
        likeCount: 10,
      },
    });
    testContent.push(content2);

    const content3 = await prisma.content.create({
      data: {
        contentId: '0xtest_dashboard_content3_000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-DASHBOARD] Audio Post',
        description: 'Audio content',
        contentType: 'audio/mp3',
        sealedPatchId: 'test_blob_3',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date(now - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        viewCount: 30,
        likeCount: 5,
      },
    });
    testContent.push(content3);

    // Link to premium tier
    await prisma.contentTier.create({
      data: {
        contentId: content3.id,
        tierId: tier2.id,
      },
    });

    // Create draft content (should not appear in results)
    const draft = await prisma.content.create({
      data: {
        contentId: '0xtest_dashboard_draft_0000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-DASHBOARD] Draft Post',
        description: 'Draft content',
        contentType: 'text/markdown',
        sealedPatchId: 'test_blob_draft',
        isPublic: false,
        isDraft: true,
        publishedAt: null,
        viewCount: 0,
        likeCount: 0,
      },
    });
    testContent.push(draft);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Delete in correct order to avoid foreign key issues
    await prisma.visit.deleteMany({
      where: {
        userAddress: {
          in: ['test_visitor', 'test_old_visitor'].map(
            (prefix) => `0x${prefix}_`
          ),
        },
      },
    });

    await prisma.contentTier.deleteMany({
      where: {
        contentId: {
          in: (
            await prisma.content.findMany({
              where: { title: { contains: '[TEST-DASHBOARD]' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });

    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST-DASHBOARD]' } },
    });

    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_subscriber' } },
    });

    await prisma.tier.deleteMany({
      where: {
        creatorId: {
          in: (
            await prisma.creator.findMany({
              where: { address: { contains: 'test_dashboard' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });

    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_dashboard' } },
    });
  }

  it('should return dashboard data with all sections', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;

    // Check structure
    expect(data).toHaveProperty('overview');
    expect(data).toHaveProperty('activity');
    expect(data).toHaveProperty('recentPost');
    expect(data).toHaveProperty('recentPosts');
    expect(data).toHaveProperty('cursor');
    expect(data).toHaveProperty('hasMore');

    // Check overview
    expect(data.overview.totalMembers).toBe(5); // 3 basic + 2 premium
    expect(data.overview.totalRevenue).toBe('35.00'); // (3*5) + (2*10) = 35 SUI

    // Check activity
    expect(data.activity.commentsCount).toBe(0); // Not implemented yet
    expect(data.activity.likesCount).toBe(35); // 20 + 10 + 5 = 35 (not counting draft)
    expect(data.activity.impressionsCount).toBe(10); // Only last 30 days

    // Check recent post
    expect(data.recentPost).toBeDefined();
    expect(data.recentPost.title).toBe('[TEST-DASHBOARD] Latest Post');
    expect(data.recentPost.mediaType).toBe('video');
    expect(data.recentPost.audience).toBe('paid');

    // Check recent posts list
    expect(Array.isArray(data.recentPosts)).toBe(true);
    expect(data.recentPosts.length).toBe(3); // 3 published posts (not draft)
  });

  it('should use MOCK_WALLET_ADDRESS by default', async () => {
    // Check if mock creator exists, create if not
    let mockCreator = await prisma.creator.findUnique({
      where: { address: process.env.MOCK_WALLET_ADDRESS! },
    });

    const shouldCleanup = !mockCreator;

    if (!mockCreator) {
      mockCreator = await prisma.creator.create({
        data: {
          address: process.env.MOCK_WALLET_ADDRESS!,
          profileId: '0xmock_profile_000000000000000000000000000000000000000000000000',
          name: 'mock-test-creator',
          bio: 'Mock test creator',
        },
      });
    }

    const response = await fetch('http://localhost:3001/api/dashboard');

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty('overview');

    // Cleanup only if we created it
    if (shouldCleanup && mockCreator) {
      await prisma.creator.delete({ where: { id: mockCreator.id } });
    }
  });

  it('should return 404 for non-existent creator', async () => {
    const response = await fetch(
      'http://localhost:3001/api/dashboard?creatorAddress=0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    expect(response.status).toBe(404);

    const data = (await response.json()) as any;
    expect(data.error).toContain('Creator not found');
  });

  it('should filter by media type', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&type=image`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.recentPosts.length).toBe(1);
    expect(data.recentPosts[0].mediaType).toBe('image');
  });

  it('should filter by time (7 days)', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&time=7days`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // Only content from last 7 days (latest post and image post)
    expect(data.recentPosts.length).toBe(2);
  });

  it('should filter by time (30 days)', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&time=30days`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // All published content (audio post is 10 days ago)
    expect(data.recentPosts.length).toBe(3);
  });

  it('should search by title', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&search=Image`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.recentPosts.length).toBe(1);
    expect(data.recentPosts[0].title).toContain('Image');
  });

  it('should implement cursor-based pagination', async () => {
    // First request
    const response1 = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&limit=2`
    );

    expect(response1.status).toBe(200);

    const data1 = (await response1.json()) as any;
    expect(data1.recentPosts.length).toBe(2);
    expect(data1.hasMore).toBe(true);
    expect(data1.cursor).toBeDefined();

    // Second request with cursor
    const response2 = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&limit=2&cursor=${data1.cursor}`
    );

    expect(response2.status).toBe(200);

    const data2 = (await response2.json()) as any;
    expect(data2.recentPosts.length).toBe(1); // Only 1 remaining
    expect(data2.hasMore).toBe(false);
    expect(data2.cursor).toBeNull();
  });

  it('should respect limit parameter', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&limit=1`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.recentPosts.length).toBe(1);
  });

  it('should enforce maximum limit of 100', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}&limit=200`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    // Should not return more than 100 (we only have 3 posts anyway)
    expect(data.recentPosts.length).toBeLessThanOrEqual(100);
  });

  it('should include tier names for paid content', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;

    // Find the latest post (paid content)
    const latestPost = data.recentPosts.find(
      (p: any) => p.title === '[TEST-DASHBOARD] Latest Post'
    );

    expect(latestPost).toBeDefined();
    expect(latestPost.audience).toBe('paid');
    expect(latestPost.tierNames).toContain('Basic');
  });

  it('should mark public content as free audience', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;

    // Find the image post (public content)
    const imagePost = data.recentPosts.find(
      (p: any) => p.title === '[TEST-DASHBOARD] Image Post'
    );

    expect(imagePost).toBeDefined();
    expect(imagePost.audience).toBe('free');
  });

  it('should include media URLs', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;

    const latestPost = data.recentPosts[0];
    expect(Array.isArray(latestPost.mediaUrls)).toBe(true);
    expect(latestPost.mediaUrls.length).toBeGreaterThan(0);
    expect(latestPost.mediaUrls[0]).toContain('walrus-testnet.walrus.space');
  });

  it('should not include draft posts in results', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;

    // Should not find draft post
    const draftPost = data.recentPosts.find((p: any) => p.title.includes('Draft'));
    expect(draftPost).toBeUndefined();
  });

  it('should handle creator with no content', async () => {
    const emptyCreator = await prisma.creator.create({
      data: {
        address: '0xtest_empty_creator_000000000000000000000000000000000000000000',
        profileId: '0xtest_empty_profile_00000000000000000000000000000000000000000',
        name: 'test-empty-creator',
        bio: 'Empty creator',
      },
    });

    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${emptyCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.overview.totalMembers).toBe(0);
    expect(data.overview.totalRevenue).toBe('0');
    expect(data.activity.impressionsCount).toBe(0);
    expect(data.recentPost).toBeNull();
    expect(data.recentPosts.length).toBe(0);

    // Cleanup
    await prisma.creator.delete({ where: { id: emptyCreator.id } });
  });

  it('should return posts with all required fields', async () => {
    const response = await fetch(
      `http://localhost:3001/api/dashboard?creatorAddress=${testCreator.address}`
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data.recentPosts.length).toBeGreaterThan(0);

    const post = data.recentPosts[0];
    expect(post).toHaveProperty('id');
    expect(post).toHaveProperty('title');
    expect(post).toHaveProperty('mediaType');
    expect(post).toHaveProperty('mediaUrls');
    expect(post).toHaveProperty('audience');
    expect(post).toHaveProperty('tierNames');
    expect(post).toHaveProperty('createdAt');
    expect(post).toHaveProperty('viewCount');
    expect(post).toHaveProperty('likeCount');

    expect(typeof post.id).toBe('string');
    expect(typeof post.title).toBe('string');
    expect(typeof post.mediaType).toBe('string');
    expect(Array.isArray(post.mediaUrls)).toBe(true);
    expect(['free', 'paid']).toContain(post.audience);
    expect(Array.isArray(post.tierNames)).toBe(true);
    expect(typeof post.createdAt).toBe('string');
    expect(typeof post.viewCount).toBe('number');
    expect(typeof post.likeCount).toBe('number');
  });
});
