// Tests for Sui Event Indexer
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Sui Event Indexer', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await prisma.indexerCheckpoint.deleteMany({});
    await prisma.contentTier.deleteMany({});
    await prisma.content.deleteMany({});
    await prisma.subscription.deleteMany({});
    await prisma.tier.deleteMany({});
    await prisma.creator.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('IndexerCheckpoint Model', () => {
    it('should create a checkpoint', async () => {
      const checkpoint = await prisma.indexerCheckpoint.create({
        data: {
          eventType: 'ProfileCreated',
          lastEventSeq: '12345',
          lastTxDigest: '0xabc123',
        },
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint.eventType).toBe('ProfileCreated');
      expect(checkpoint.lastEventSeq).toBe('12345');
      expect(checkpoint.lastTxDigest).toBe('0xabc123');
    });

    it('should retrieve a checkpoint by event type', async () => {
      const checkpoint = await prisma.indexerCheckpoint.findUnique({
        where: { eventType: 'ProfileCreated' },
      });

      expect(checkpoint).toBeDefined();
      expect(checkpoint?.eventType).toBe('ProfileCreated');
      expect(checkpoint?.lastEventSeq).toBe('12345');
    });

    it('should update a checkpoint (upsert)', async () => {
      const checkpoint = await prisma.indexerCheckpoint.upsert({
        where: { eventType: 'ProfileCreated' },
        update: {
          lastEventSeq: '67890',
          lastTxDigest: '0xdef456',
        },
        create: {
          eventType: 'ProfileCreated',
          lastEventSeq: '67890',
          lastTxDigest: '0xdef456',
        },
      });

      expect(checkpoint.lastEventSeq).toBe('67890');
      expect(checkpoint.lastTxDigest).toBe('0xdef456');
    });

    it('should enforce unique constraint on eventType', async () => {
      try {
        await prisma.indexerCheckpoint.create({
          data: {
            eventType: 'ProfileCreated',
            lastEventSeq: '11111',
            lastTxDigest: '0xaaa111',
          },
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe('P2002'); // Prisma unique constraint violation
      }
    });
  });

  describe('Event Processing Idempotency', () => {
    it('should handle ProfileCreated event idempotently', async () => {
      const creator1 = await prisma.creator.upsert({
        where: { address: '0xcreator1' },
        update: {
          profileId: '0xprofile1',
          name: 'creator1',
        },
        create: {
          address: '0xcreator1',
          profileId: '0xprofile1',
          name: 'creator1',
          bio: '',
        },
      });

      // Process same event again
      const creator2 = await prisma.creator.upsert({
        where: { address: '0xcreator1' },
        update: {
          profileId: '0xprofile1',
          name: 'creator1',
        },
        create: {
          address: '0xcreator1',
          profileId: '0xprofile1',
          name: 'creator1',
          bio: '',
        },
      });

      expect(creator1.id).toBe(creator2.id);
      expect(creator1.address).toBe(creator2.address);
    });

    it('should handle TierCreated event idempotently', async () => {
      const creator = await prisma.creator.create({
        data: {
          address: '0xcreator2',
          profileId: '0xprofile2',
          name: 'creator2',
          bio: '',
        },
      });

      const tier1 = await prisma.tier.upsert({
        where: { tierId: '0xtier1' },
        update: {
          name: 'Basic',
          price: BigInt(1000000000),
        },
        create: {
          tierId: '0xtier1',
          creatorId: creator.id,
          name: 'Basic',
          description: 'Basic tier',
          price: BigInt(1000000000),
        },
      });

      // Process same event again
      const tier2 = await prisma.tier.upsert({
        where: { tierId: '0xtier1' },
        update: {
          name: 'Basic',
          price: BigInt(1000000000),
        },
        create: {
          tierId: '0xtier1',
          creatorId: creator.id,
          name: 'Basic',
          description: 'Basic tier',
          price: BigInt(1000000000),
        },
      });

      expect(tier1.id).toBe(tier2.id);
      expect(tier1.tierId).toBe(tier2.tierId);
    });
  });

  describe('Checkpoint-based Deduplication', () => {
    it('should skip events with sequence number <= checkpoint', async () => {
      const checkpoint = await prisma.indexerCheckpoint.create({
        data: {
          eventType: 'TierCreated',
          lastEventSeq: '100',
          lastTxDigest: '0xtx100',
        },
      });

      // Simulate checking if event should be processed
      const eventSeq1 = '99'; // Should be skipped
      const eventSeq2 = '100'; // Should be skipped
      const eventSeq3 = '101'; // Should be processed

      expect(BigInt(eventSeq1) <= BigInt(checkpoint.lastEventSeq)).toBe(true);
      expect(BigInt(eventSeq2) <= BigInt(checkpoint.lastEventSeq)).toBe(true);
      expect(BigInt(eventSeq3) <= BigInt(checkpoint.lastEventSeq)).toBe(false);
    });
  });

  describe('Database Relations', () => {
    it('should create content with tier relationships (without foreign keys)', async () => {
      const creator = await prisma.creator.create({
        data: {
          address: '0xcreator3',
          profileId: '0xprofile3',
          name: 'creator3',
          bio: '',
        },
      });

      const tier = await prisma.tier.create({
        data: {
          tierId: '0xtier2',
          creatorId: creator.id,
          name: 'Premium',
          description: 'Premium tier',
          price: BigInt(5000000000),
        },
      });

      const content = await prisma.content.create({
        data: {
          contentId: '0xcontent1',
          creatorId: creator.id,
          title: 'Test Content',
          description: 'Test description',
          contentType: 'video/mp4',
          walrusBlobId: '0xblob1',
          isPublic: false,
        },
      });

      await prisma.contentTier.create({
        data: {
          contentId: content.id,
          tierId: tier.id,
        },
      });

      // Query without using relations (no foreign keys)
      const contentTiers = await prisma.contentTier.findMany({
        where: { contentId: content.id },
      });

      expect(contentTiers).toBeDefined();
      expect(contentTiers).toHaveLength(1);
      expect(contentTiers[0].tierId).toBe(tier.id);

      // Verify tier manually
      const foundTier = await prisma.tier.findUnique({
        where: { id: contentTiers[0].tierId },
      });
      expect(foundTier?.name).toBe('Premium');
    });
  });
});
