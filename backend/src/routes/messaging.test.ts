/**
 * Tests for Messaging Channels API Routes
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('Messaging Channels API', () => {
  let testCreator: any;
  let testTier: any;
  let testSubscription: any;
  const userAddress = '0x1234567890123456789012345678901234567890123456789012345678901234';
  const creatorAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const channelId = '0x9999999999999999999999999999999999999999999999999999999999999999';
  const baseUrl = 'http://localhost:3001/api/messaging';

  beforeAll(async () => {
    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: creatorAddress,
        profileId: '0xprofile123456789012345678901234567890123456789012345678901234567890',
        name: 'testmessagingcreator',
        bio: 'Test creator for messaging tests',
        category: 'Testing',
      },
    });

    // Create test tier
    testTier = await prisma.tier.create({
      data: {
        tierId: '0xtier123456789012345678901234567890123456789012345678901234567890ab',
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
        subscriptionId: '0xsub123456789012345678901234567890123456789012345678901234567890ab',
        subscriber: userAddress,
        tierId: testTier.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.channelMapping.deleteMany({
      where: {
        OR: [
          { userAddress },
          { creatorAddress },
        ],
      },
    });

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

  describe('POST /api/messaging/channels/mapping', () => {
    it('should create a channel mapping successfully', async () => {
      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress,
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.channelId).toBe(channelId);
      expect(data.data.userAddress).toBe(userAddress);
      expect(data.data.creatorAddress).toBe(creatorAddress);
    });

    it('should update existing channel mapping (upsert)', async () => {
      const newChannelId = '0x8888888888888888888888888888888888888888888888888888888888888888';

      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: newChannelId,
          userAddress,
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.channelId).toBe(newChannelId);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress,
          // Missing creatorAddress
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid channelId format', async () => {
      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: 'invalid-channel-id',
          userAddress,
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid channelId format');
    });

    it('should return 400 for invalid userAddress format', async () => {
      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress: 'invalid-address',
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid userAddress format');
    });

    it('should return 404 for non-existent creator', async () => {
      const nonExistentCreator = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress,
          creatorAddress: nonExistentCreator,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Creator not found');
    });

    it('should return 403 for user without active subscription', async () => {
      const nonSubscriberAddress = '0x5555555555555555555555555555555555555555555555555555555555555555';

      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress: nonSubscriberAddress,
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('active subscription');
    });

    it('should return 403 for expired subscription', async () => {
      const expiredUserAddress = '0x6666666666666666666666666666666666666666666666666666666666666666';
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const expiredSub = await prisma.subscription.create({
        data: {
          subscriptionId: '0xexpiredsub123456789012345678901234567890123456789012345678901234',
          subscriber: expiredUserAddress,
          tierId: testTier.id,
          startsAt: pastDate,
          expiresAt: pastDate,
          isActive: true,
        },
      });

      const response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId,
          userAddress: expiredUserAddress,
          creatorAddress,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('active subscription');

      // Cleanup
      await prisma.subscription.delete({ where: { id: expiredSub.id } });
    });
  });

  describe('GET /api/messaging/channels/user/:userAddress', () => {
    it('should return all channel mappings for a user', async () => {
      const response = await fetch(`${baseUrl}/channels/user/${userAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      const channel = data.data[0];
      expect(channel.channelId).toBeDefined();
      expect(channel.creatorAddress).toBe(creatorAddress);
      expect(channel.creator).toBeDefined();
      expect(channel.creator.name).toBe('testmessagingcreator');
      expect(channel.creator.address).toBe(creatorAddress);
    });

    it('should return empty array for user with no channels', async () => {
      const noChannelsAddress = '0x7777777777777777777777777777777777777777777777777777777777777777';

      const response = await fetch(`${baseUrl}/channels/user/${noChannelsAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
    });

    it('should return 400 for invalid address format', async () => {
      const response = await fetch(`${baseUrl}/channels/user/invalid-address`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid userAddress format');
    });

    it('should include creator details with each channel', async () => {
      const response = await fetch(`${baseUrl}/channels/user/${userAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeGreaterThan(0);

      const channel = data.data[0];
      expect(channel.creator).toBeDefined();
      expect(channel.creator.address).toBeDefined();
      expect(channel.creator.name).toBeDefined();
      expect(channel.creator.avatarUrl).toBeDefined();
      expect(channel.creator.bio).toBeDefined();
      expect(channel.creator.isVerified).toBeDefined();
      expect(channel.creator.category).toBeDefined();
    });

    it('should return channels sorted by creation date descending', async () => {
      // Create a second creator and channel with unique addresses
      const secondCreatorAddress = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

      // Check if creator already exists and delete if so
      const existingCreator = await prisma.creator.findUnique({
        where: { address: secondCreatorAddress },
      });

      if (existingCreator) {
        // Clean up existing test data first
        await prisma.channelMapping.deleteMany({
          where: { creatorAddress: secondCreatorAddress },
        });
        await prisma.subscription.deleteMany({
          where: { tierId: { in: (await prisma.tier.findMany({ where: { creatorId: existingCreator.id } })).map(t => t.id) } },
        });
        await prisma.tier.deleteMany({
          where: { creatorId: existingCreator.id },
        });
        await prisma.creator.delete({
          where: { id: existingCreator.id },
        });
      }

      const secondCreator = await prisma.creator.create({
        data: {
          address: secondCreatorAddress,
          profileId: '0xprofile2222222222222222222222222222222222222222222222222222222222',
          name: 'secondtestcreator',
          bio: 'Second test creator',
          category: 'Testing',
        },
      });

      const secondTier = await prisma.tier.create({
        data: {
          tierId: '0xtier2222222222222222222222222222222222222222222222222222222222',
          creatorId: secondCreator.id,
          name: 'Second Tier',
          description: 'Second tier',
          price: BigInt(500000000),
          isActive: true,
        },
      });

      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const secondSubscription = await prisma.subscription.create({
        data: {
          subscriptionId: '0xsub2222222222222222222222222222222222222222222222222222222222',
          subscriber: userAddress,
          tierId: secondTier.id,
          startsAt: now,
          expiresAt: futureDate,
          isActive: true,
        },
      });

      const secondChannel = await prisma.channelMapping.create({
        data: {
          channelId: '0x7777777777777777777777777777777777777777777777777777777777777777',
          userAddress,
          creatorAddress: secondCreator.address,
        },
      });

      const response = await fetch(`${baseUrl}/channels/user/${userAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBeGreaterThanOrEqual(2);

      // Verify descending order (most recent first)
      const dates = data.data.map((c: any) => new Date(c.createdAt).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }

      // Cleanup
      await prisma.channelMapping.delete({ where: { id: secondChannel.id } });
      await prisma.subscription.delete({ where: { id: secondSubscription.id } });
      await prisma.tier.delete({ where: { id: secondTier.id } });
      await prisma.creator.delete({ where: { id: secondCreator.id } });
    });
  });

  describe('GET /api/messaging/channels/check/:userAddress/:creatorAddress', () => {
    it('should return exists: true for existing channel', async () => {
      const response = await fetch(`${baseUrl}/channels/check/${userAddress}/${creatorAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.exists).toBe(true);
      expect(data.data.channelId).toBeDefined();
    });

    it('should return exists: false for non-existent channel', async () => {
      const nonExistentUser = '0x3333333333333333333333333333333333333333333333333333333333333333';

      const response = await fetch(`${baseUrl}/channels/check/${nonExistentUser}/${creatorAddress}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.exists).toBe(false);
      expect(data.data.channelId).toBeUndefined();
    });

    it('should return 400 for invalid userAddress format', async () => {
      const response = await fetch(`${baseUrl}/channels/check/invalid-address/${creatorAddress}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid userAddress format');
    });

    it('should return 400 for invalid creatorAddress format', async () => {
      const response = await fetch(`${baseUrl}/channels/check/${userAddress}/invalid-address`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid creatorAddress format');
    });
  });

  describe('Integration - Channel lifecycle', () => {
    it('should handle complete channel lifecycle', async () => {
      // 1. Check channel doesn't exist
      let response = await fetch(`${baseUrl}/channels/check/${userAddress}/${creatorAddress}`);
      let data = await response.json();
      expect(data.data.exists).toBe(true); // Exists from previous tests

      // 2. Create channel mapping
      const newChannelId = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      response = await fetch(`${baseUrl}/channels/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: newChannelId,
          userAddress,
          creatorAddress,
        }),
      });
      data = await response.json();
      expect(data.success).toBe(true);

      // 3. Verify channel exists
      response = await fetch(`${baseUrl}/channels/check/${userAddress}/${creatorAddress}`);
      data = await response.json();
      expect(data.data.exists).toBe(true);
      expect(data.data.channelId).toBe(newChannelId);

      // 4. Verify channel appears in user's channel list
      response = await fetch(`${baseUrl}/channels/user/${userAddress}`);
      data = await response.json();
      const channel = data.data.find((c: any) => c.channelId === newChannelId);
      expect(channel).toBeDefined();
      expect(channel.creatorAddress).toBe(creatorAddress);
    });
  });
});
