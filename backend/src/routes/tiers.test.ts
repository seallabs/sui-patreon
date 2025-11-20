/**
 * Tiers API Route Tests
 *
 * Tests for /api/tiers endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

// Test data
const TEST_CREATOR = {
  address: '0x1111111111111111111111111111111111111111111111111111111111111111',
  profileId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'test-creator.sui',
  bio: 'Digital artist and creator',
  avatarUrl: 'https://example.com/alice.jpg',
  backgroundUrl: 'https://example.com/alice-bg.jpg',
};

const TEST_SUBSCRIBER = '0x9999999999999999999999999999999999999999999999999999999999999999';

/**
 * Setup test database with seed data
 */
async function seedTestData() {
  console.log('🌱 Seeding test data...');

  // Create creator
  const creator = await prisma.creator.create({
    data: TEST_CREATOR,
  });

  // Create tiers
  const basicTier = await prisma.tier.create({
    data: {
      tierId: `${TEST_CREATOR.address}_tier_basic`,
      creatorId: creator.id,
      name: 'Basic',
      description: 'Basic tier with access to standard content',
      price: BigInt(1_000_000_000), // 1 SUI
      isActive: true,
    },
  });

  const premiumTier = await prisma.tier.create({
    data: {
      tierId: `${TEST_CREATOR.address}_tier_premium`,
      creatorId: creator.id,
      name: 'Premium',
      description: 'Premium tier with exclusive content',
      price: BigInt(5_000_000_000), // 5 SUI
      isActive: true,
    },
  });

  const inactiveTier = await prisma.tier.create({
    data: {
      tierId: `${TEST_CREATOR.address}_tier_inactive`,
      creatorId: creator.id,
      name: 'Inactive',
      description: 'This tier is no longer available',
      price: BigInt(3_000_000_000), // 3 SUI
      isActive: false,
    },
  });

  // Create some subscriptions
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.subscription.createMany({
    data: [
      {
        subscriptionId: 'sub_1',
        subscriber: TEST_SUBSCRIBER,
        tierId: basicTier.id,
        startsAt: new Date(),
        expiresAt: tomorrow,
        isActive: true,
      },
      {
        subscriptionId: 'sub_2',
        subscriber: `${TEST_SUBSCRIBER}2`,
        tierId: basicTier.id,
        startsAt: new Date(),
        expiresAt: tomorrow,
        isActive: true,
      },
      {
        subscriptionId: 'sub_3',
        subscriber: `${TEST_SUBSCRIBER}3`,
        tierId: premiumTier.id,
        startsAt: new Date(),
        expiresAt: tomorrow,
        isActive: true,
      },
    ],
  });

  console.log('✅ Test data seeded');
  return { creator, basicTier, premiumTier, inactiveTier };
}

/**
 * Cleanup test database
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  await prisma.subscription.deleteMany({});
  await prisma.tier.deleteMany({});
  await prisma.creator.deleteMany({
    where: { address: TEST_CREATOR.address },
  });

  console.log('✅ Test data cleaned up');
}

describe('Tiers API', () => {
  let testData: any;

  beforeAll(async () => {
    await cleanupTestData();
    testData = await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/tiers/creator/:walletAddress', () => {
    test('should return all active tiers for a creator', async () => {
      const response = await fetch(
        `http://localhost:3001/api/tiers/creator/${TEST_CREATOR.address}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('creator');
      expect(data).toHaveProperty('tiers');

      // Should have creator info
      expect(data.creator.address).toBe(TEST_CREATOR.address);
      expect(data.creator.name).toBe(TEST_CREATOR.name);

      // Should have 2 active tiers (not including inactive)
      expect(data.tiers).toBeArrayOfSize(2);

      // Tiers should be sorted by creation date (newest first)
      expect(data.tiers[0].name).toBe('Premium');
      expect(data.tiers[1].name).toBe('Basic');

      // Should include subscriber counts
      const basicTier = data.tiers.find((t: any) => t.name === 'Basic');
      const premiumTier = data.tiers.find((t: any) => t.name === 'Premium');

      expect(basicTier.subscriberCount).toBe(2);
      expect(premiumTier.subscriberCount).toBe(1);

      // Should have all tier properties
      expect(basicTier).toHaveProperty('id');
      expect(basicTier).toHaveProperty('tierId');
      expect(basicTier).toHaveProperty('name');
      expect(basicTier).toHaveProperty('description');
      expect(basicTier).toHaveProperty('price');
      expect(basicTier).toHaveProperty('isActive');
      expect(basicTier).toHaveProperty('createdAt');
    });

    test('should include inactive tiers when requested', async () => {
      const response = await fetch(
        `http://localhost:3001/api/tiers/creator/${TEST_CREATOR.address}?includeInactive=true`
      );

      expect(response.status).toBe(200);

      const data = await response.json();

      // Should have 3 tiers (including inactive)
      expect(data.tiers).toBeArrayOfSize(3);

      const inactiveTier = data.tiers.find((t: any) => t.name === 'Inactive');
      expect(inactiveTier).toBeDefined();
      expect(inactiveTier.isActive).toBe(false);
      expect(inactiveTier.subscriberCount).toBe(0);
    });

    test('should return 404 for non-existent creator', async () => {
      const response = await fetch(
        'http://localhost:3001/api/tiers/creator/0xnonexistent'
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Creator not found');
    });

    test('should return empty tiers array for creator with no tiers', async () => {
      // Create a new creator without tiers
      const newCreator = await prisma.creator.create({
        data: {
          address: '0x5555555555555555555555555555555555555555555555555555555555555555',
          profileId: '0x5555555555555555555555555555555555555555555555555555555555555555',
          name: 'notiers.sui',
          bio: 'Creator without tiers',
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/tiers/creator/${newCreator.address}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.tiers).toBeArrayOfSize(0);

      // Cleanup
      await prisma.creator.delete({ where: { id: newCreator.id } });
    });
  });

  describe('GET /api/tiers/:tierId', () => {
    test('should return tier by tierId with creator info', async () => {
      const response = await fetch(
        `http://localhost:3001/api/tiers/${testData.basicTier.tierId}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('tierId');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('creator');
      expect(data).toHaveProperty('subscriberCount');

      expect(data.name).toBe('Basic');
      expect(data.subscriberCount).toBe(2);
      expect(data.creator.address).toBe(TEST_CREATOR.address);
    });

    test('should return 404 for non-existent tier', async () => {
      const response = await fetch(
        'http://localhost:3001/api/tiers/nonexistent_tier_id'
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Tier not found');
    });
  });
});
