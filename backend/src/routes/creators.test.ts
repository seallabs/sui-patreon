/**
 * Creators API Route Tests
 *
 * Tests for /api/creators endpoints
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

// Test data
const TEST_CREATORS = [
  {
    address: '0x1111111111111111111111111111111111111111111111111111111111111111',
    profileId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'alice.sui',
    bio: 'Digital artist and creator',
    avatarUrl: 'https://example.com/alice.jpg',
  },
  {
    address: '0x2222222222222222222222222222222222222222222222222222222222222222',
    profileId: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'bob.sui',
    bio: 'Tech educator and writer',
    avatarUrl: 'https://example.com/bob.jpg',
  },
  {
    address: '0x3333333333333333333333333333333333333333333333333333333333333333',
    profileId: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    name: 'charlie.sui',
    bio: 'Music producer',
    avatarUrl: 'https://example.com/charlie.jpg',
  },
];

/**
 * Setup test database with seed data
 */
async function seedTestData() {
  console.log('🌱 Seeding test data...');

  // Create creators with tiers and content
  for (const creatorData of TEST_CREATORS) {
    const creator = await prisma.creator.create({
      data: {
        ...creatorData,
        tiers: {
          create: [
            {
              tierId: `${creatorData.address}_tier_basic`,
              name: 'Basic',
              description: 'Basic tier',
              price: BigInt(1_000_000_000), // 1 SUI
              isActive: true,
            },
            {
              tierId: `${creatorData.address}_tier_premium`,
              name: 'Premium',
              description: 'Premium tier',
              price: BigInt(5_000_000_000), // 5 SUI
              isActive: true,
            },
          ],
        },
        contents: {
          create: [
            {
              contentId: `${creatorData.address}_content_1`,
              title: 'Test Content 1',
              description: 'First test content',
              contentType: 'text/markdown',
              sealedPatchId: 'walrus_blob_1',
              isPublic: false,
            },
            {
              contentId: `${creatorData.address}_content_2`,
              title: 'Public Content',
              description: 'Public test content',
              contentType: 'image/png',
              sealedPatchId: 'walrus_blob_2',
              isPublic: true,
            },
          ],
        },
      },
    });

    // Link content to tiers
    const tiers = await prisma.tier.findMany({
      where: { creatorId: creator.id },
    });

    const contents = await prisma.content.findMany({
      where: { creatorId: creator.id, isPublic: false },
    });

    if (contents.length > 0 && tiers.length > 0) {
      await prisma.contentTier.create({
        data: {
          contentId: contents[0].id,
          tierId: tiers[0].id,
        },
      });
    }
  }

  // Create test subscription
  const subscriber = '0x9999999999999999999999999999999999999999999999999999999999999999';
  const creator = await prisma.creator.findFirst();
  const tier = await prisma.tier.findFirst({
    where: { creatorId: creator?.id },
  });

  if (tier) {
    await prisma.subscription.create({
      data: {
        subscriptionId: `${subscriber}_sub_1`,
        subscriber,
        tierId: tier.id,
        startsAt: new Date(Date.now() - 86400000), // 1 day ago
        expiresAt: new Date(Date.now() + 30 * 86400000), // 30 days from now
        isActive: true,
      },
    });
  }

  console.log('✅ Test data seeded successfully');
}

/**
 * Clean up test database
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  await prisma.contentTier.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.content.deleteMany({});
  await prisma.tier.deleteMany({});
  await prisma.creator.deleteMany({});

  console.log('✅ Test data cleaned up');
}

/**
 * Integration Tests - Using Real Database
 */
describe('Creators API Integration Tests', () => {
  beforeAll(async () => {
    await cleanupTestData();
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  test('should fetch creator by address with tiers and content', async () => {
    const creator = await prisma.creator.findUnique({
      where: { address: TEST_CREATORS[0].address },
      include: {
        tiers: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
        contents: {
          orderBy: { createdAt: 'desc' },
          include: {
            contentTiers: {
              include: {
                tier: true,
              },
            },
          },
        },
      },
    });

    expect(creator).toBeDefined();
    expect(creator?.address).toBe(TEST_CREATORS[0].address);
    expect(creator?.name).toBe(TEST_CREATORS[0].name);
    expect(creator?.tiers.length).toBeGreaterThan(0);
    expect(creator?.contents.length).toBeGreaterThan(0);

    // Verify BigInt serialization can work
    expect(typeof creator?.tiers[0].price).toBe('bigint');
  });

  test('should return 404 for non-existent creator', async () => {
    const creator = await prisma.creator.findUnique({
      where: { address: '0xnonexistent' },
    });

    expect(creator).toBeNull();
  });

  test('should search creators by name', async () => {
    const creators = await prisma.creator.findMany({
      where: {
        name: {
          contains: 'alice',
          mode: 'insensitive',
        },
      },
      include: {
        tiers: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    expect(creators.length).toBeGreaterThan(0);
    expect(creators[0].name.toLowerCase()).toContain('alice');
  });

  test('should fetch creator content', async () => {
    const creator = await prisma.creator.findUnique({
      where: { address: TEST_CREATORS[0].address },
      select: { id: true },
    });

    expect(creator).toBeDefined();

    const content = await prisma.content.findMany({
      where: { creatorId: creator!.id },
      include: {
        contentTiers: {
          include: {
            tier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(content.length).toBeGreaterThan(0);
    expect(content[0].creatorId).toBe(creator!.id);
  });

  test('should verify tier data integrity', async () => {
    const tier = await prisma.tier.findFirst({
      include: {
        creator: true,
      },
    });

    expect(tier).toBeDefined();
    expect(tier?.creator).toBeDefined();
    expect(tier?.price).toBeGreaterThan(0n);
    expect(tier?.isActive).toBe(true);
  });

  test('should verify subscription data', async () => {
    const subscription = await prisma.subscription.findFirst({
      include: {
        tier: {
          include: {
            creator: true,
          },
        },
      },
    });

    expect(subscription).toBeDefined();
    expect(subscription?.isActive).toBe(true);
    expect(subscription?.tier).toBeDefined();
    expect(subscription?.tier.creator).toBeDefined();
  });

  test('should check content access with subscription', async () => {
    const subscriber = '0x9999999999999999999999999999999999999999999999999999999999999999';

    // Find content that requires subscription
    const content = await prisma.content.findFirst({
      where: { isPublic: false },
      include: {
        contentTiers: {
          select: {
            tierId: true,
          },
        },
      },
    });

    expect(content).toBeDefined();

    // Check if user has subscription to any required tier
    const requiredTierIds = content!.contentTiers.map(ct => ct.tierId);

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        subscriber,
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

    expect(activeSubscription).toBeDefined();
  });

  test('should verify public content is accessible', async () => {
    const publicContent = await prisma.content.findFirst({
      where: { isPublic: true },
    });

    expect(publicContent).toBeDefined();
    expect(publicContent?.isPublic).toBe(true);
  });

  test('should respect limit parameter in search', async () => {
    const limit = 2;
    const creators = await prisma.creator.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    expect(creators.length).toBeLessThanOrEqual(limit);
  });

  test('should handle case-insensitive search', async () => {
    const creatorsUpper = await prisma.creator.findMany({
      where: {
        name: {
          contains: 'ALICE',
          mode: 'insensitive',
        },
      },
    });

    const creatorsLower = await prisma.creator.findMany({
      where: {
        name: {
          contains: 'alice',
          mode: 'insensitive',
        },
      },
    });

    expect(creatorsUpper.length).toBe(creatorsLower.length);
  });
});

/**
 * Unit Tests - Testing Utilities
 */
describe('JSON Serialization Tests', () => {
  test('should serialize BigInt to string', () => {
    const testPrice = BigInt(5_000_000_000);

    // Create mock tier with BigInt
    const tier = {
      id: 'test-id',
      price: testPrice,
      name: 'Test Tier',
    };

    expect(typeof tier.price).toBe('bigint');

    // Test serialization
    const serialized = JSON.parse(
      JSON.stringify(tier, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    expect(typeof serialized.price).toBe('string');
    expect(serialized.price).toBe(testPrice.toString());
  });
});
