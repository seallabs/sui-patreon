/**
 * Visits API Routes Tests
 *
 * Tests for visit tracking functionality following TDD principles.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Visits API', () => {
  let testCreator1: any;
  let testCreator2: any;
  let testCreator3: any;
  const testUserAddress = '0xtest_user_visits_00000000000000000000000000000000000000000000000000';

  beforeAll(async () => {
    // Clean up test data
    await prisma.visit.deleteMany({
      where: { userAddress: { contains: 'test_user_visits' } },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_visit_creator' } },
    });

    // Create test creators
    testCreator1 = await prisma.creator.create({
      data: {
        address: '0xtest_visit_creator1_000000000000000000000000000000000000000000000',
        profileId: '0xtest_visit_profile1_00000000000000000000000000000000000000000000',
        name: 'test-visit-creator-1',
        bio: 'First test creator',
        avatarUrl: 'https://example.com/avatar1.png',
        backgroundUrl: 'https://example.com/bg1.png',
      },
    });

    testCreator2 = await prisma.creator.create({
      data: {
        address: '0xtest_visit_creator2_000000000000000000000000000000000000000000000',
        profileId: '0xtest_visit_profile2_00000000000000000000000000000000000000000000',
        name: 'test-visit-creator-2',
        bio: 'Second test creator',
        avatarUrl: null,
        backgroundUrl: null,
      },
    });

    testCreator3 = await prisma.creator.create({
      data: {
        address: '0xtest_visit_creator3_000000000000000000000000000000000000000000000',
        profileId: '0xtest_visit_profile3_00000000000000000000000000000000000000000000',
        name: 'test-visit-creator-3',
        bio: 'Third test creator',
        avatarUrl: 'https://example.com/avatar3.png',
        backgroundUrl: 'https://example.com/bg3.png',
      },
    });

    // Create some test content for follower/content counts
    await prisma.content.create({
      data: {
        contentId: '0xtest_visit_content1_0000000000000000000000000000000000000000000',
        creatorId: testCreator1.id,
        title: '[TEST] Visit Content 1',
        description: 'Test content',
        contentType: 'text/markdown',
        sealedPatchId: 'test_blob_1',
        isDraft: false,
        publishedAt: new Date(),
      },
    });

    await prisma.content.create({
      data: {
        contentId: '0xtest_visit_content2_0000000000000000000000000000000000000000000',
        creatorId: testCreator1.id,
        title: '[TEST] Visit Content 2',
        description: 'Test content',
        contentType: 'text/markdown',
        sealedPatchId: 'test_blob_2',
        isDraft: false,
        publishedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST] Visit' } },
    });
    await prisma.visit.deleteMany({
      where: { userAddress: { contains: 'test_user_visits' } },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_visit_creator' } },
    });
  });

  describe('POST /api/visits', () => {
    it('should track a new visit to a creator profile', async () => {
      const response = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: testCreator1.address,
          userAddress: testUserAddress,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.visitId).toBeDefined();
      expect(typeof data.visitId).toBe('string');
    });

    it('should track visit without userAddress (generate session ID)', async () => {
      const response = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: testCreator2.address,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.visitId).toBeDefined();
    });

    it('should update visit timestamp if user visited same creator in last 24h', async () => {
      // First visit
      const response1 = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: testCreator1.address,
          userAddress: `${testUserAddress}_dedup`,
        }),
      });

      const data1 = await response1.json();
      const firstVisitId = data1.visitId;

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second visit to same creator
      const response2 = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: testCreator1.address,
          userAddress: `${testUserAddress}_dedup`,
        }),
      });

      const data2 = await response2.json();
      const secondVisitId = data2.visitId;

      // Should return same visit ID (updated, not created)
      expect(secondVisitId).toBe(firstVisitId);
    });

    it('should return 400 if creatorAddress is missing', async () => {
      const response = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: testUserAddress,
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 404 if creator does not exist', async () => {
      const response = await fetch('http://localhost:3001/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: '0xnonexistent000000000000000000000000000000000000000000000000000000',
          userAddress: testUserAddress,
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('Creator not found');
    });
  });

  describe('GET /api/visits/recent/:userAddress', () => {
    // Note: Bun's test runner doesn't support nested beforeAll properly
    // So we'll create test data in the first test and reuse it

    it('should fetch recently visited creators for a user', async () => {
      // Create visits with different timestamps
      const now = new Date();

      await prisma.visit.create({
        data: {
          userAddress: `${testUserAddress}_recent`,
          creatorId: testCreator1.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 5), // 5 minutes ago
        },
      });

      await prisma.visit.create({
        data: {
          userAddress: `${testUserAddress}_recent`,
          creatorId: testCreator2.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
        },
      });

      await prisma.visit.create({
        data: {
          userAddress: `${testUserAddress}_recent`,
          creatorId: testCreator3.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/visits/recent/${testUserAddress}_recent`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.visits).toBeDefined();
      expect(Array.isArray(data.visits)).toBe(true);
      expect(data.visits.length).toBeGreaterThan(0);
    });

    it('should return visits sorted by most recent first', async () => {
      // Create visits with different timestamps for this specific test
      const now = new Date();
      const testUser = `${testUserAddress}_sorted`;

      await prisma.visit.create({
        data: {
          userAddress: testUser,
          creatorId: testCreator1.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 5), // 5 minutes ago
        },
      });

      await prisma.visit.create({
        data: {
          userAddress: testUser,
          creatorId: testCreator2.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
        },
      });

      await prisma.visit.create({
        data: {
          userAddress: testUser,
          creatorId: testCreator3.id,
          visitedAt: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/visits/recent/${testUser}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify visits are sorted by most recent
      for (let i = 1; i < data.visits.length; i++) {
        const prevDate = new Date(data.visits[i - 1].visitedAt);
        const currDate = new Date(data.visits[i].visitedAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it('should include creator details in response', async () => {
      // Create a visit for this test
      const testUser = `${testUserAddress}_details`;

      await prisma.visit.create({
        data: {
          userAddress: testUser,
          creatorId: testCreator1.id,
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/visits/recent/${testUser}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      const visit = data.visits[0];

      expect(visit.visitId).toBeDefined();
      expect(visit.visitedAt).toBeDefined();
      expect(visit.creator).toBeDefined();
      expect(visit.creator.id).toBeDefined();
      expect(visit.creator.address).toBeDefined();
      expect(visit.creator.name).toBeDefined();
      expect(visit.creator.bio).toBeDefined();
      expect(visit.creator.followerCount).toBeDefined();
      expect(visit.creator.contentCount).toBeDefined();
      expect(typeof visit.creator.followerCount).toBe('number');
      expect(typeof visit.creator.contentCount).toBe('number');
    });

    it('should respect limit parameter (default 10, max 50)', async () => {
      // Create multiple visits for this test
      const testUser = `${testUserAddress}_limit`;

      for (let i = 0; i < 5; i++) {
        await prisma.visit.create({
          data: {
            userAddress: testUser,
            creatorId: i < 3 ? testCreator1.id : testCreator2.id,
          },
        });
      }

      const response = await fetch(
        `http://localhost:3001/api/visits/recent/${testUser}?limit=2`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.visits.length).toBeLessThanOrEqual(2);
    });

    it('should enforce max limit of 50', async () => {
      // Create a visit for this test
      const testUser = `${testUserAddress}_maxlimit`;

      await prisma.visit.create({
        data: {
          userAddress: testUser,
          creatorId: testCreator1.id,
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/visits/recent/${testUser}?limit=100`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.visits.length).toBeLessThanOrEqual(50);
    });

    it('should return empty array if user has no visits', async () => {
      const response = await fetch(
        'http://localhost:3001/api/visits/recent/0xnever_visited_00000000000000000000000000000000000000000000000000'
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.visits).toBeDefined();
      expect(Array.isArray(data.visits)).toBe(true);
      expect(data.visits.length).toBe(0);
    });
  });
});
