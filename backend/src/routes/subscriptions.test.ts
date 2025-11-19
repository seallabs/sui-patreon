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
});
