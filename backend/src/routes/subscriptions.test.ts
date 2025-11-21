/**
 * Tests for Subscriptions API Routes
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Subscriptions API', () => {
  let testCreator: any;
  let testTier: any;
  let testSubscription: any;
  const subscriberAddress = '0xsubscriber123';
  const creatorAddress = '0xcreator456';

  beforeAll(async () => {
    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: creatorAddress,
        profileId: '0xprofile123',
        name: 'testcreator',
        bio: 'Test creator for subscription tests',
        category: 'Testing',
      },
    });

    // Create test tier
    testTier = await prisma.tier.create({
      data: {
        tierId: '0xtier123',
        creatorId: testCreator.id,
        name: 'Premium Tier',
        description: 'Premium subscription tier',
        price: BigInt(1000000000), // 1 SUI
        isActive: true,
      },
    });

    // Create test subscription
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    testSubscription = await prisma.subscription.create({
      data: {
        subscriptionId: '0xsubscription123',
        subscriber: subscriberAddress,
        tierId: testTier.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testSubscription) {
      await prisma.subscription.delete({ where: { id: testSubscription.id } });
    }
    if (testTier) {
      await prisma.tier.delete({ where: { id: testTier.id } });
    }
    if (testCreator) {
      await prisma.creator.delete({ where: { id: testCreator.id } });
    }
  });

  describe('GET /api/subscriptions/:address/creator/:creatorAddress', () => {
    it('should return isSubscribed: true for active subscription', async () => {
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creator/${creatorAddress}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isSubscribed).toBe(true);
      expect(data.subscription).toBeDefined();
      expect(data.subscription.tierId).toBe(testTier.tierId);
      expect(data.subscription.tierName).toBe('Premium Tier');
      expect(data.subscription.isActive).toBe(true);
    });

    it('should return isSubscribed: false for non-subscribed user', async () => {
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/0xnonsub/creator/${creatorAddress}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isSubscribed).toBe(false);
      expect(data.subscription).toBeUndefined();
    });

    it('should return isSubscribed: false for non-existent creator', async () => {
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creator/0xnonexistent`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isSubscribed).toBe(false);
      expect(data.subscription).toBeUndefined();
    });

    it('should return isSubscribed: false for expired subscription', async () => {
      // Create expired subscription
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const expiredSub = await prisma.subscription.create({
        data: {
          subscriptionId: '0xexpired123',
          subscriber: '0xexpireduser',
          tierId: testTier.id,
          startsAt: pastDate,
          expiresAt: pastDate,
          isActive: true,
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/subscriptions/0xexpireduser/creator/${creatorAddress}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isSubscribed).toBe(false);

      // Cleanup
      await prisma.subscription.delete({ where: { id: expiredSub.id } });
    });

    it('should return isSubscribed: false for inactive subscription', async () => {
      // Create inactive subscription
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const inactiveSub = await prisma.subscription.create({
        data: {
          subscriptionId: '0xinactive123',
          subscriber: '0xinactiveuser',
          tierId: testTier.id,
          startsAt: new Date(),
          expiresAt: futureDate,
          isActive: false,
        },
      });

      const response = await fetch(
        `http://localhost:3001/api/subscriptions/0xinactiveuser/creator/${creatorAddress}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isSubscribed).toBe(false);

      // Cleanup
      await prisma.subscription.delete({ where: { id: inactiveSub.id } });
    });
  });

  describe('GET /api/subscriptions/:address', () => {
    it('should return all active subscriptions for a user', async () => {
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].subscriber).toBe(subscriberAddress);
      expect(data[0].tier).toBeDefined();
      expect(data[0].tier.creator).toBeDefined();
    });

    it('should return empty array for user with no subscriptions', async () => {
      const response = await fetch(
        'http://localhost:3001/api/subscriptions/0xnosubs'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe('GET /api/subscriptions/:address/creators', () => {
    it('should return list of subscribed creators', async () => {
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creators`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Verify creator info structure
      const creator = data[0];
      expect(creator.address).toBeDefined();
      expect(creator.name).toBeDefined();
      expect(creator.address).toBe(creatorAddress);
      expect(creator.name).toBe('testcreator');

      // Verify only essential fields are included
      expect(creator).toHaveProperty('avatarUrl');
      expect(creator).toHaveProperty('bio');
      expect(creator).toHaveProperty('isVerified');
      expect(creator).toHaveProperty('category');

      // Verify no sensitive fields
      expect(creator).not.toHaveProperty('id');
      expect(creator).not.toHaveProperty('profileId');
    });

    it('should return empty array for user with no subscriptions', async () => {
      const response = await fetch(
        'http://localhost:3001/api/subscriptions/0xnosubs/creators'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should deduplicate creators when user has multiple tier subscriptions', async () => {
      // Create a second tier for the same creator
      const secondTier = await prisma.tier.create({
        data: {
          tierId: '0xtier456',
          creatorId: testCreator.id,
          name: 'Basic Tier',
          description: 'Basic subscription tier',
          price: BigInt(500000000), // 0.5 SUI
          isActive: true,
        },
      });

      // Create subscription to the second tier
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const secondSubscription = await prisma.subscription.create({
        data: {
          subscriptionId: '0xsubscription456',
          subscriber: subscriberAddress,
          tierId: secondTier.id,
          startsAt: now,
          expiresAt: futureDate,
          isActive: true,
        },
      });

      // Fetch creators
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creators`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1); // Should still be 1 creator despite 2 subscriptions
      expect(data[0].address).toBe(creatorAddress);

      // Cleanup
      await prisma.subscription.delete({ where: { id: secondSubscription.id } });
      await prisma.tier.delete({ where: { id: secondTier.id } });
    });

    it('should not return creators from expired subscriptions', async () => {
      // Create expired subscription to a different creator
      const expiredCreator = await prisma.creator.create({
        data: {
          address: '0xexpiredcreator',
          profileId: '0xexpiredprofile',
          name: 'expiredcreator',
          bio: 'Expired creator',
          category: 'Testing',
        },
      });

      const expiredTier = await prisma.tier.create({
        data: {
          tierId: '0xexpiredtier',
          creatorId: expiredCreator.id,
          name: 'Expired Tier',
          description: 'Expired tier',
          price: BigInt(1000000000),
          isActive: true,
        },
      });

      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const expiredSub = await prisma.subscription.create({
        data: {
          subscriptionId: '0xexpiredsub',
          subscriber: subscriberAddress,
          tierId: expiredTier.id,
          startsAt: pastDate,
          expiresAt: pastDate,
          isActive: true,
        },
      });

      // Fetch creators
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creators`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      // Should only include active creator, not expired one
      const creatorAddresses = data.map((c: any) => c.address);
      expect(creatorAddresses).toContain(creatorAddress);
      expect(creatorAddresses).not.toContain('0xexpiredcreator');

      // Cleanup
      await prisma.subscription.delete({ where: { id: expiredSub.id } });
      await prisma.tier.delete({ where: { id: expiredTier.id } });
      await prisma.creator.delete({ where: { id: expiredCreator.id } });
    });

    it('should return creators sorted alphabetically by name', async () => {
      // Create two more creators with different names
      const creatorB = await prisma.creator.create({
        data: {
          address: '0xcreatorB',
          profileId: '0xprofileB',
          name: 'zcreator',
          bio: 'Creator B',
          category: 'Testing',
        },
      });

      const creatorC = await prisma.creator.create({
        data: {
          address: '0xcreatorC',
          profileId: '0xprofileC',
          name: 'acreator',
          bio: 'Creator C',
          category: 'Testing',
        },
      });

      const tierB = await prisma.tier.create({
        data: {
          tierId: '0xtierB',
          creatorId: creatorB.id,
          name: 'Tier B',
          description: 'Tier B',
          price: BigInt(1000000000),
          isActive: true,
        },
      });

      const tierC = await prisma.tier.create({
        data: {
          tierId: '0xtierC',
          creatorId: creatorC.id,
          name: 'Tier C',
          description: 'Tier C',
          price: BigInt(1000000000),
          isActive: true,
        },
      });

      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subB = await prisma.subscription.create({
        data: {
          subscriptionId: '0xsubB',
          subscriber: subscriberAddress,
          tierId: tierB.id,
          startsAt: now,
          expiresAt: futureDate,
          isActive: true,
        },
      });

      const subC = await prisma.subscription.create({
        data: {
          subscriptionId: '0xsubC',
          subscriber: subscriberAddress,
          tierId: tierC.id,
          startsAt: now,
          expiresAt: futureDate,
          isActive: true,
        },
      });

      // Fetch creators
      const response = await fetch(
        `http://localhost:3001/api/subscriptions/${subscriberAddress}/creators`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);

      // Verify alphabetical order
      expect(data[0].name).toBe('acreator');
      expect(data[1].name).toBe('testcreator');
      expect(data[2].name).toBe('zcreator');

      // Cleanup
      await prisma.subscription.delete({ where: { id: subB.id } });
      await prisma.subscription.delete({ where: { id: subC.id } });
      await prisma.tier.delete({ where: { id: tierB.id } });
      await prisma.tier.delete({ where: { id: tierC.id } });
      await prisma.creator.delete({ where: { id: creatorB.id } });
      await prisma.creator.delete({ where: { id: creatorC.id } });
    });
  });
});
