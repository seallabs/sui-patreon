/**
 * Tests for Explore API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';

describe('Explore API', () => {
  // Test data
  let testCreator1Id: string;
  let testCreator2Id: string;
  let testTier1Id: string;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.subscription.deleteMany({
      where: {
        subscriber: { in: ['0xtest1', '0xtest2'] },
      },
    });
    await prisma.tier.deleteMany({
      where: {
        creatorId: { in: [] }, // Will be populated after creators are created
      },
    });
    await prisma.creator.deleteMany({
      where: {
        address: { in: ['0xexploretest1', '0xexploretest2', '0xexploretest3'] },
      },
    });

    // Create test creators with different categories
    const creator1 = await prisma.creator.create({
      data: {
        address: '0xexploretest1',
        profileId: '0xprofile1',
        name: 'test-creator-music',
        bio: 'Music creator for testing',
        category: 'Music',
        isVerified: true,
        avatarUrl: 'https://example.com/avatar1.jpg',
        backgroundUrl: 'https://example.com/bg1.jpg',
      },
    });
    testCreator1Id = creator1.id;

    const creator2 = await prisma.creator.create({
      data: {
        address: '0xexploretest2',
        profileId: '0xprofile2',
        name: 'test-creator-gaming',
        bio: 'Gaming creator for testing',
        category: 'Gaming',
        isVerified: false,
        avatarUrl: 'https://example.com/avatar2.jpg',
        backgroundUrl: 'https://example.com/bg2.jpg',
      },
    });
    testCreator2Id = creator2.id;

    const creator3 = await prisma.creator.create({
      data: {
        address: '0xexploretest3',
        profileId: '0xprofile3',
        name: 'test-creator-writing',
        bio: 'Writing creator for testing',
        category: 'Writing',
        isVerified: false,
      },
    });

    // Create tiers for creators
    const tier1 = await prisma.tier.create({
      data: {
        tierId: '0xtier1',
        creatorId: testCreator1Id,
        name: 'Basic',
        description: 'Basic tier',
        price: BigInt(1000000000), // 1 SUI
        isActive: true,
      },
    });
    testTier1Id = tier1.id;

    // Create active subscriptions for creator1
    await prisma.subscription.createMany({
      data: [
        {
          subscriptionId: '0xsub1',
          subscriber: '0xtest1',
          tierId: testTier1Id,
          startsAt: new Date('2024-01-01'),
          expiresAt: new Date('2025-12-31'), // Active
          isActive: true,
        },
        {
          subscriptionId: '0xsub2',
          subscriber: '0xtest2',
          tierId: testTier1Id,
          startsAt: new Date('2024-01-01'),
          expiresAt: new Date('2025-12-31'), // Active
          isActive: true,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.subscription.deleteMany({
      where: {
        subscriber: { in: ['0xtest1', '0xtest2'] },
      },
    });
    await prisma.tier.deleteMany({
      where: {
        id: testTier1Id,
      },
    });
    await prisma.creator.deleteMany({
      where: {
        id: { in: [testCreator1Id, testCreator2Id] },
      },
    });

    await prisma.$disconnect();
  });

  describe('GET /api/explore/categories', () => {
    it('should return all categories with creator counts', async () => {
      const response = await request(app).get('/api/explore/categories').expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);

      const categories = response.body.categories;
      expect(categories.length).toBeGreaterThan(0);

      // Verify category structure
      const musicCategory = categories.find((c: any) => c.slug === 'music');
      expect(musicCategory).toBeDefined();
      expect(musicCategory).toHaveProperty('id');
      expect(musicCategory).toHaveProperty('name');
      expect(musicCategory).toHaveProperty('description');
      expect(musicCategory).toHaveProperty('iconName');
      expect(musicCategory).toHaveProperty('creatorCount');
      expect(musicCategory).toHaveProperty('slug');

      // Verify music category has at least our test creator
      expect(musicCategory.creatorCount).toBeGreaterThanOrEqual(1);
    });

    it('should include all predefined categories', async () => {
      const response = await request(app).get('/api/explore/categories').expect(200);

      const expectedSlugs = [
        'podcasts-shows',
        'tabletop-games',
        'music',
        'writing',
        'video-film',
        'visual-arts',
        'gaming',
        'technology',
      ];

      const returnedSlugs = response.body.categories.map((c: any) => c.slug);

      expectedSlugs.forEach((slug) => {
        expect(returnedSlugs).toContain(slug);
      });
    });
  });

  describe('GET /api/explore/creators/new', () => {
    it('should return recently created creators', async () => {
      const response = await request(app).get('/api/explore/creators/new').expect(200);

      expect(response.body).toHaveProperty('creators');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.creators)).toBe(true);

      const { pagination } = response.body;
      expect(pagination).toHaveProperty('total');
      expect(pagination).toHaveProperty('hasMore');
    });

    it('should respect limit parameter', async () => {
      const limit = 2;
      const response = await request(app)
        .get('/api/explore/creators/new')
        .query({ limit })
        .expect(200);

      expect(response.body.creators.length).toBeLessThanOrEqual(limit);
    });

    it('should respect offset parameter', async () => {
      const response1 = await request(app)
        .get('/api/explore/creators/new')
        .query({ limit: 1, offset: 0 })
        .expect(200);

      const response2 = await request(app)
        .get('/api/explore/creators/new')
        .query({ limit: 1, offset: 1 })
        .expect(200);

      // Different offsets should return different creators (if we have enough)
      if (response1.body.creators.length > 0 && response2.body.creators.length > 0) {
        expect(response1.body.creators[0].id).not.toBe(response2.body.creators[0].id);
      }
    });

    it('should return creators with proper structure', async () => {
      const response = await request(app).get('/api/explore/creators/new').expect(200);

      if (response.body.creators.length > 0) {
        const creator = response.body.creators[0];
        expect(creator).toHaveProperty('id');
        expect(creator).toHaveProperty('address');
        expect(creator).toHaveProperty('suinsName');
        expect(creator).toHaveProperty('displayName');
        expect(creator).toHaveProperty('bio');
        expect(creator).toHaveProperty('avatarUrl');
        expect(creator).toHaveProperty('backgroundUrl');
        expect(creator).toHaveProperty('category');
        expect(creator).toHaveProperty('followerCount');
        expect(creator).toHaveProperty('isVerified');
        expect(creator).toHaveProperty('createdAt');
      }
    });

    it('should include follower count', async () => {
      const response = await request(app).get('/api/explore/creators/new').expect(200);

      const musicCreator = response.body.creators.find(
        (c: any) => c.address === '0xexploretest1'
      );

      if (musicCreator) {
        expect(musicCreator.followerCount).toBe(2); // We created 2 subscriptions
      }
    });
  });

  describe('GET /api/explore/creators', () => {
    it('should return all creators without category filter', async () => {
      const response = await request(app).get('/api/explore/creators').expect(200);

      expect(response.body).toHaveProperty('creators');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.creators)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/explore/creators')
        .query({ category: 'music' })
        .expect(200);

      const creators = response.body.creators;
      const musicCreators = creators.filter((c: any) => c.category === 'Music');

      // All returned creators should be in Music category
      expect(musicCreators.length).toBeGreaterThanOrEqual(1);
      expect(creators.every((c: any) => c.category === 'Music')).toBe(true);
    });

    it('should reject invalid category', async () => {
      await request(app)
        .get('/api/explore/creators')
        .query({ category: 'invalid-category' })
        .expect(400);
    });

    it('should sort by newest', async () => {
      const response = await request(app)
        .get('/api/explore/creators')
        .query({ sort: 'newest' })
        .expect(200);

      const creators = response.body.creators;
      if (creators.length > 1) {
        // Verify descending order by creation date
        for (let i = 1; i < creators.length; i++) {
          const prevDate = new Date(creators[i - 1].createdAt);
          const currDate = new Date(creators[i].createdAt);

          // Verify both dates are valid
          expect(prevDate.getTime()).not.toBeNaN();
          expect(currDate.getTime()).not.toBeNaN();

          // Verify descending order
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
        }
      }
    });

    it('should sort by popular (follower count)', async () => {
      const response = await request(app)
        .get('/api/explore/creators')
        .query({ sort: 'popular' })
        .expect(200);

      const creators = response.body.creators;
      if (creators.length > 1) {
        // Verify descending order by follower count
        for (let i = 1; i < creators.length; i++) {
          expect(creators[i - 1].followerCount).toBeGreaterThanOrEqual(
            creators[i].followerCount
          );
        }
      }
    });

    it('should reject invalid sort parameter', async () => {
      await request(app)
        .get('/api/explore/creators')
        .query({ sort: 'invalid-sort' })
        .expect(400);
    });

    it('should respect limit and offset', async () => {
      const limit = 1;
      const response = await request(app)
        .get('/api/explore/creators')
        .query({ limit, offset: 0 })
        .expect(200);

      expect(response.body.creators.length).toBeLessThanOrEqual(limit);
    });

    it('should exclude connected user from creators list', async () => {
      const userAddress = '0xexploretest1'; // Music creator
      const response = await request(app)
        .get('/api/explore/creators')
        .query({ userAddress })
        .expect(200);

      const creators = response.body.creators;
      const userCreator = creators.find((c: any) => c.address === userAddress);

      // Connected user should not be in the results
      expect(userCreator).toBeUndefined();
    });

    it('should exclude connected user from new creators list', async () => {
      const userAddress = '0xexploretest2'; // Gaming creator
      const response = await request(app)
        .get('/api/explore/creators/new')
        .query({ userAddress })
        .expect(200);

      const creators = response.body.creators;
      const userCreator = creators.find((c: any) => c.address === userAddress);

      // Connected user should not be in the results
      expect(userCreator).toBeUndefined();
    });

    it('should return all creators when userAddress is not provided', async () => {
      const response = await request(app)
        .get('/api/explore/creators')
        .expect(200);

      const creators = response.body.creators;
      // Should include all test creators
      expect(creators.length).toBeGreaterThanOrEqual(3);
    });
  });
});
