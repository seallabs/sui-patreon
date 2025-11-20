/**
 * Home API Routes Tests
 *
 * Tests for the home endpoint functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Home API', () => {
  let testCreators: any[] = [];
  let testContent: any[] = [];

  beforeAll(async () => {
    // Clean up test data
    await prisma.contentTier.deleteMany({
      where: {
        contentId: {
          in: (
            await prisma.content.findMany({
              where: { title: { contains: '[TEST-HOME]' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST-HOME]' } },
    });
    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_home_subscriber' } },
    });
    await prisma.tier.deleteMany({
      where: {
        creatorId: {
          in: (
            await prisma.creator.findMany({
              where: { address: { contains: 'test_home' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_home' } },
    });

    // Create test creators with different characteristics
    const creator1 = await prisma.creator.create({
      data: {
        address: '0xtest_home_creator1_0000000000000000000000000000000000000000000',
        profileId: '0xtest_home_profile1_000000000000000000000000000000000000000000',
        name: 'test-home-creator-1',
        bio: 'Popular creator with many subscribers',
        avatarUrl: 'https://example.com/avatar1.png',
        backgroundUrl: 'https://example.com/bg1.png',
      },
    });

    const creator2 = await prisma.creator.create({
      data: {
        address: '0xtest_home_creator2_0000000000000000000000000000000000000000000',
        profileId: '0xtest_home_profile2_000000000000000000000000000000000000000000',
        name: 'test-home-creator-2',
        bio: 'Creator with lots of content',
        avatarUrl: 'https://example.com/avatar2.png',
        backgroundUrl: 'https://example.com/bg2.png',
      },
    });

    const creator3 = await prisma.creator.create({
      data: {
        address: '0xtest_home_creator3_0000000000000000000000000000000000000000000',
        profileId: '0xtest_home_profile3_000000000000000000000000000000000000000000',
        name: 'test-home-creator-3',
        bio: 'Trending creator with high view count',
      },
    });

    testCreators = [creator1, creator2, creator3];

    // Create tiers for creators
    const tier1 = await prisma.tier.create({
      data: {
        tierId: '0xtest_home_tier1_00000000000000000000000000000000000000000000',
        creatorId: creator1.id,
        name: 'Basic',
        description: 'Basic tier',
        price: BigInt(5_000_000_000), // 5 SUI
      },
    });

    const tier2 = await prisma.tier.create({
      data: {
        tierId: '0xtest_home_tier2_00000000000000000000000000000000000000000000',
        creatorId: creator2.id,
        name: 'Basic',
        description: 'Basic tier',
        price: BigInt(3_000_000_000), // 3 SUI
      },
    });

    const tier3 = await prisma.tier.create({
      data: {
        tierId: '0xtest_home_tier3_00000000000000000000000000000000000000000000',
        creatorId: creator3.id,
        name: 'Basic',
        description: 'Basic tier',
        price: BigInt(2_000_000_000), // 2 SUI
      },
    });

    // Create subscriptions (creator1 has most subscribers - 5)
    for (let i = 0; i < 5; i++) {
      await prisma.subscription.create({
        data: {
          subscriptionId: `0xtest_home_sub1_${i}_000000000000000000000000000000000000000`,
          subscriber: `0xtest_home_subscriber_${i}_00000000000000000000000000000000000`,
          tierId: tier1.id,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
        },
      });
    }

    // Creator2 has 3 subscribers
    for (let i = 0; i < 3; i++) {
      await prisma.subscription.create({
        data: {
          subscriptionId: `0xtest_home_sub2_${i}_000000000000000000000000000000000000000`,
          subscriber: `0xtest_home_subscriber2_${i}_0000000000000000000000000000000000`,
          tierId: tier2.id,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
    }

    // Creator3 has 2 subscribers
    for (let i = 0; i < 2; i++) {
      await prisma.subscription.create({
        data: {
          subscriptionId: `0xtest_home_sub3_${i}_000000000000000000000000000000000000000`,
          subscriber: `0xtest_home_subscriber3_${i}_0000000000000000000000000000000000`,
          tierId: tier3.id,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });
    }

    // Create content (creator2 has most content - 6 posts)
    for (let i = 0; i < 6; i++) {
      const content = await prisma.content.create({
        data: {
          contentId: `0xtest_home_content2_${i}_0000000000000000000000000000000000000`,
          creatorId: creator2.id,
          title: `[TEST-HOME] Creator 2 Post ${i}`,
          description: 'Test content',
          contentType: 'text/markdown',
          sealedPatchId: `test_blob_2_${i}`,
          isPublic: false,
          isDraft: false,
          publishedAt: new Date(),
          viewCount: 50,
          likeCount: 10,
        },
      });
      testContent.push(content);
    }

    // Creator1 has 3 posts
    for (let i = 0; i < 3; i++) {
      const content = await prisma.content.create({
        data: {
          contentId: `0xtest_home_content1_${i}_0000000000000000000000000000000000000`,
          creatorId: creator1.id,
          title: `[TEST-HOME] Creator 1 Post ${i}`,
          description: 'Test content',
          contentType: 'video/mp4',
          sealedPatchId: `test_blob_1_${i}`,
          isPublic: false,
          isDraft: false,
          publishedAt: new Date(),
          viewCount: 100,
          likeCount: 20,
        },
      });
      testContent.push(content);
    }

    // Creator3 has 2 posts but HIGHEST total views (500 each)
    for (let i = 0; i < 2; i++) {
      const content = await prisma.content.create({
        data: {
          contentId: `0xtest_home_content3_${i}_0000000000000000000000000000000000000`,
          creatorId: creator3.id,
          title: `[TEST-HOME] Creator 3 Post ${i}`,
          description: 'Test trending content',
          contentType: 'image/png',
          sealedPatchId: `test_blob_3_${i}`,
          isPublic: true,
          isDraft: false,
          publishedAt: new Date(),
          viewCount: 500, // Highest view count per post
          likeCount: 100,
        },
      });
      testContent.push(content);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.contentTier.deleteMany({
      where: {
        contentId: { in: testContent.map((c) => c.id) },
      },
    });
    await prisma.content.deleteMany({
      where: { id: { in: testContent.map((c) => c.id) } },
    });
    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_home_subscriber' } },
    });
    await prisma.tier.deleteMany({
      where: {
        creatorId: { in: testCreators.map((c) => c.id) },
      },
    });
    await prisma.creator.deleteMany({
      where: { id: { in: testCreators.map((c) => c.id) } },
    });
  });

  it('should return 400 if section parameter is missing', async () => {
    const response = await fetch('http://localhost:3001/api/home/creators');

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.error).toContain('section');
  });

  it('should return 400 if section parameter is invalid', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=invalid'
    );

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.error).toContain('section');
  });

  it('should fetch recently-visited creators (returns popular creators)', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators).toBeDefined();
    expect(Array.isArray(data.creators)).toBe(true);
    expect(data.creators.length).toBeGreaterThan(0);

    // First creator should be the one with most followers (creator1 with 5)
    const firstCreator = data.creators[0];
    expect(firstCreator.name).toBe('test-home-creator-1');
    expect(firstCreator.followerCount).toBe(5);
    expect(firstCreator.address).toBeDefined();
    expect(firstCreator.bio).toBeDefined();
    expect(firstCreator.category).toBeDefined();
    expect(firstCreator.contentCount).toBeDefined();
    expect(typeof firstCreator.isVerified).toBe('boolean');
  });

  it('should fetch recommended creators (sorted by content count)', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recommended'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators).toBeDefined();
    expect(Array.isArray(data.creators)).toBe(true);

    // First creator should be the one with most content (creator2 with 6 posts)
    const firstCreator = data.creators[0];
    expect(firstCreator.name).toBe('test-home-creator-2');
    expect(firstCreator.contentCount).toBe(6);
  });

  it('should fetch popular creators (sorted by total views)', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=popular'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators).toBeDefined();
    expect(Array.isArray(data.creators)).toBe(true);

    // First creator should be creator3 with highest total views (2 posts * 500 = 1000)
    const firstCreator = data.creators[0];
    expect(firstCreator.name).toBe('test-home-creator-3');
    // Creator3: 2 posts * 500 views = 1000 total
    // Creator1: 3 posts * 100 views = 300 total
    // Creator2: 6 posts * 50 views = 300 total
  });

  it('should respect limit parameter', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited&limit=2'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators.length).toBeLessThanOrEqual(2);
  });

  it('should enforce maximum limit of 20', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited&limit=100'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    // Should not return more than 20 even if requested
    expect(data.creators.length).toBeLessThanOrEqual(20);
  });

  it('should use default limit of 8 when not specified', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    // Should return at most 8 results by default
    expect(data.creators.length).toBeLessThanOrEqual(8);
  });

  it('should return creators with all required fields', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited&limit=1'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators.length).toBeGreaterThan(0);

    const creator = data.creators[0];
    expect(creator).toHaveProperty('id');
    expect(creator).toHaveProperty('address');
    expect(creator).toHaveProperty('name');
    expect(creator).toHaveProperty('bio');
    expect(creator).toHaveProperty('avatarUrl');
    expect(creator).toHaveProperty('category');
    expect(creator).toHaveProperty('followerCount');
    expect(creator).toHaveProperty('isVerified');
    expect(creator).toHaveProperty('contentCount');

    expect(typeof creator.id).toBe('string');
    expect(typeof creator.address).toBe('string');
    expect(typeof creator.name).toBe('string');
    expect(typeof creator.bio).toBe('string');
    expect(typeof creator.category).toBe('string');
    expect(typeof creator.followerCount).toBe('number');
    expect(typeof creator.isVerified).toBe('boolean');
    expect(typeof creator.contentCount).toBe('number');
  });

  it('should handle empty results gracefully', async () => {
    // Delete all test data temporarily
    await prisma.content.deleteMany({
      where: { id: { in: testContent.map((c) => c.id) } },
    });
    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_home_subscriber' } },
    });
    await prisma.creator.deleteMany({
      where: { id: { in: testCreators.map((c) => c.id) } },
    });

    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=recently-visited'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    expect(data.creators).toBeDefined();
    expect(Array.isArray(data.creators)).toBe(true);
  });

  it('should exclude connected user from recently-visited creators', async () => {
    const userAddress = testCreators[0].address; // Creator 1
    const response = await fetch(
      `http://localhost:3001/api/home/creators?section=recently-visited&userAddress=${userAddress}`
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    const connectedUserInResults = data.creators.find(
      (c: any) => c.address === userAddress
    );

    // Connected user should not appear in results
    expect(connectedUserInResults).toBeUndefined();
  });

  it('should exclude connected user from recommended creators', async () => {
    const userAddress = testCreators[1].address; // Creator 2 (has most content)
    const response = await fetch(
      `http://localhost:3001/api/home/creators?section=recommended&userAddress=${userAddress}`
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    const connectedUserInResults = data.creators.find(
      (c: any) => c.address === userAddress
    );

    // Connected user should not appear in results
    expect(connectedUserInResults).toBeUndefined();

    // Should still return other creators
    expect(data.creators.length).toBeGreaterThan(0);
  });

  it('should exclude connected user from popular creators', async () => {
    const userAddress = testCreators[2].address; // Creator 3 (has most views)
    const response = await fetch(
      `http://localhost:3001/api/home/creators?section=popular&userAddress=${userAddress}`
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;
    const connectedUserInResults = data.creators.find(
      (c: any) => c.address === userAddress
    );

    // Connected user should not appear in results
    expect(connectedUserInResults).toBeUndefined();
  });

  it('should return all creators including self when userAddress is not provided', async () => {
    const response = await fetch(
      'http://localhost:3001/api/home/creators?section=popular'
    );

    expect(response.status).toBe(200);

    const data = await response.json() as any;

    // Should include all test creators when no userAddress is specified
    expect(data.creators.length).toBeGreaterThanOrEqual(3);
  });
});
