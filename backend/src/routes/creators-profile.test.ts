/**
 * Creator Profile API Tests
 *
 * Tests for GET /api/creators/:address/profile endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';

describe('Creator Profile API', () => {
  let testCreator: any;
  let testTiers: any[] = [];
  let testContent: any[] = [];

  beforeAll(async () => {
    // Clean up test data
    await prisma.contentTier.deleteMany({
      where: {
        contentId: {
          in: (
            await prisma.content.findMany({
              where: { title: { contains: '[TEST-PROFILE]' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST-PROFILE]' } },
    });
    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_profile_subscriber' } },
    });
    await prisma.tier.deleteMany({
      where: {
        creatorId: {
          in: (
            await prisma.creator.findMany({
              where: { address: { contains: 'test_profile' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_profile' } },
    });

    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: '0xtest_profile_creator_000000000000000000000000000000000000000',
        profileId: '0xtest_profile_id_00000000000000000000000000000000000000000',
        name: 'test-profile-creator.sui',
        bio: 'Test creator bio for profile testing',
        avatarUrl: 'https://example.com/avatar.png',
        backgroundUrl: 'https://example.com/background.png',
        category: 'Podcasts & shows',
        isVerified: true,
      },
    });

    // Create tiers with different prices
    const tier1 = await prisma.tier.create({
      data: {
        tierId: '0xtest_profile_tier1_0000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        name: 'Basic',
        description: 'Access to basic content\nEarly access to episodes\nMonthly Q&A',
        price: BigInt(5_000_000_000), // 5 SUI
        isActive: true,
      },
    });

    const tier2 = await prisma.tier.create({
      data: {
        tierId: '0xtest_profile_tier2_0000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        name: 'Premium',
        description: 'Everything in Basic\nExclusive content\nBehind the scenes access',
        price: BigInt(10_000_000_000), // 10 SUI
        isActive: true,
      },
    });

    const tier3 = await prisma.tier.create({
      data: {
        tierId: '0xtest_profile_tier3_0000000000000000000000000000000000000000',
        creatorId: testCreator.id,
        name: 'Inactive Tier',
        description: 'This tier should not appear',
        price: BigInt(15_000_000_000), // 15 SUI
        isActive: false, // Inactive tier
      },
    });

    testTiers = [tier1, tier2, tier3];

    // Create subscriptions for tiers
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    // Active subscriptions for tier1 (2 active, 1 expired, 1 inactive)
    await prisma.subscription.create({
      data: {
        subscriptionId: '0xtest_profile_sub1_000000000000000000000000000000000000000',
        subscriber: 'test_profile_subscriber_1',
        tierId: tier1.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      },
    });

    await prisma.subscription.create({
      data: {
        subscriptionId: '0xtest_profile_sub2_000000000000000000000000000000000000000',
        subscriber: 'test_profile_subscriber_2',
        tierId: tier1.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      },
    });

    // Expired subscription (should not count)
    await prisma.subscription.create({
      data: {
        subscriptionId: '0xtest_profile_sub3_000000000000000000000000000000000000000',
        subscriber: 'test_profile_subscriber_3',
        tierId: tier1.id,
        startsAt: pastDate,
        expiresAt: pastDate,
        isActive: true, // Active but expired
      },
    });

    // Inactive subscription (should not count)
    await prisma.subscription.create({
      data: {
        subscriptionId: '0xtest_profile_sub4_000000000000000000000000000000000000000',
        subscriber: 'test_profile_subscriber_4',
        tierId: tier1.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: false, // Not active
      },
    });

    // Active subscription for tier2 (1 active)
    await prisma.subscription.create({
      data: {
        subscriptionId: '0xtest_profile_sub5_000000000000000000000000000000000000000',
        subscriber: 'test_profile_subscriber_5',
        tierId: tier2.id,
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      },
    });

    // Create content (some published, some drafts)
    const publishedContent1 = await prisma.content.create({
      data: {
        contentId: '0xtest_profile_content1_00000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-PROFILE] Published Post 1',
        description: 'This is a published post',
        contentType: 'text/markdown',
        sealedPatchId: 'blob_id_1',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date('2025-11-15T10:00:00Z'),
        viewCount: 100,
        likeCount: 10,
      },
    });

    const publishedContent2 = await prisma.content.create({
      data: {
        contentId: '0xtest_profile_content2_00000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-PROFILE] Published Post 2',
        description: 'This is another published post',
        contentType: 'video/mp4',
        sealedPatchId: 'blob_id_2',
        previewPatchId: 'preview_blob_id_2',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date('2025-11-16T10:00:00Z'),
        viewCount: 50,
        likeCount: 5,
      },
    });

    const publishedContent3 = await prisma.content.create({
      data: {
        contentId: '0xtest_profile_content3_00000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-PROFILE] Published Post 3',
        description: 'Third published post',
        contentType: 'image/png',
        sealedPatchId: 'blob_id_3',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date('2025-11-17T10:00:00Z'),
        viewCount: 75,
        likeCount: 8,
      },
    });

    // Draft content (should not appear in recent posts)
    await prisma.content.create({
      data: {
        contentId: '0xtest_profile_content4_00000000000000000000000000000000000',
        creatorId: testCreator.id,
        title: '[TEST-PROFILE] Draft Post',
        description: 'This is a draft',
        contentType: 'text/markdown',
        sealedPatchId: 'blob_id_4',
        isPublic: false,
        isDraft: true,
        publishedAt: null,
        viewCount: 0,
        likeCount: 0,
      },
    });

    testContent = [publishedContent1, publishedContent2, publishedContent3];
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.contentTier.deleteMany({
      where: {
        contentId: {
          in: (
            await prisma.content.findMany({
              where: { title: { contains: '[TEST-PROFILE]' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.content.deleteMany({
      where: { title: { contains: '[TEST-PROFILE]' } },
    });
    await prisma.subscription.deleteMany({
      where: { subscriber: { contains: 'test_profile_subscriber' } },
    });
    await prisma.tier.deleteMany({
      where: {
        creatorId: {
          in: (
            await prisma.creator.findMany({
              where: { address: { contains: 'test_profile' } },
              select: { id: true },
            })
          ).map((c) => c.id),
        },
      },
    });
    await prisma.creator.deleteMany({
      where: { address: { contains: 'test_profile' } },
    });
  });

  describe('GET /api/creators/:address/profile', () => {
    it('should return creator profile with all data', async () => {
      const response = await request(app).get(
        `/api/creators/${testCreator.address}/profile`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('creator');
      expect(response.body).toHaveProperty('tiers');
      expect(response.body).toHaveProperty('recentPosts');

      // Validate creator data
      const { creator } = response.body;
      expect(creator.id).toBe(testCreator.id);
      expect(creator.address).toBe(testCreator.address);
      expect(creator.name).toBe(testCreator.name);
      expect(creator.bio).toBe(testCreator.bio);
      expect(creator.avatarUrl).toBe(testCreator.avatarUrl);
      expect(creator.backgroundUrl).toBe(testCreator.backgroundUrl);
      expect(creator.category).toBe(testCreator.category);
      expect(creator.isVerified).toBe(testCreator.isVerified);
      expect(creator.followerCount).toBe(3); // 2 active from tier1 + 1 active from tier2
      expect(creator.joinedDate).toBeDefined();
      expect(creator.suinsName).toBe('test-profile-creator.sui'); // Ends with .sui
    });

    it('should return correct tier data with subscriber counts', async () => {
      const response = await request(app).get(
        `/api/creators/${testCreator.address}/profile`
      );

      expect(response.status).toBe(200);
      const { tiers } = response.body;

      // Should only return active tiers
      expect(tiers).toHaveLength(2);

      // Verify tier1
      const tier1 = tiers.find((t: any) => t.name === 'Basic');
      expect(tier1).toBeDefined();
      expect(tier1.tierId).toBe(testTiers[0].tierId);
      expect(tier1.name).toBe('Basic');
      expect(tier1.description).toBe(
        'Access to basic content\nEarly access to episodes\nMonthly Q&A'
      );
      expect(tier1.price).toBe(5000); // Converted from base units to USDC (6 decimals)
      expect(tier1.benefits).toEqual([
        'Access to basic content',
        'Early access to episodes',
        'Monthly Q&A',
      ]);
      expect(tier1.subscriberCount).toBe(2); // 2 active, 1 expired, 1 inactive
      expect(tier1.isActive).toBe(true);

      // Verify tier2
      const tier2 = tiers.find((t: any) => t.name === 'Premium');
      expect(tier2).toBeDefined();
      expect(tier2.price).toBe(10000); // Converted from base units to USDC (6 decimals)
      expect(tier2.subscriberCount).toBe(1);
      expect(tier2.benefits).toEqual([
        'Everything in Basic',
        'Exclusive content',
        'Behind the scenes access',
      ]);
    });

    it('should return recent published posts', async () => {
      const response = await request(app).get(
        `/api/creators/${testCreator.address}/profile`
      );

      expect(response.status).toBe(200);
      const { recentPosts } = response.body;

      // Should return 3 published posts (not the draft)
      expect(recentPosts).toHaveLength(3);

      // Posts should be ordered by publishedAt descending
      expect(recentPosts[0].title).toBe('[TEST-PROFILE] Published Post 3');
      expect(recentPosts[1].title).toBe('[TEST-PROFILE] Published Post 2');
      expect(recentPosts[2].title).toBe('[TEST-PROFILE] Published Post 1');

      // Validate post structure
      const post = recentPosts[0];
      expect(post.id).toBeDefined();
      expect(post.title).toBeDefined();
      expect(post.description).toBeDefined();
      expect(post.contentType).toBeDefined();
      expect(post.exclusiveId).toBeDefined();
      expect(post.previewId).toBeDefined();
      expect(post.publishedAt).toBeDefined();
      expect(post.viewCount).toBeDefined();
      expect(post.likeCount).toBeDefined();
      expect(post.isPublic).toBeDefined();
      expect(typeof post.isPublic).toBe('boolean');

      // Verify patch IDs are raw values, not URLs
      expect(post.exclusiveId).toBe('blob_id_3');
      expect(post.previewId).toBeNull(); // Post 3 has no preview
      expect(post.exclusiveId).not.toContain('walrus');
      expect(post.exclusiveId).not.toContain('aggregator');

      // Verify post with preview (Published Post 2)
      const postWithPreview = recentPosts[1];
      expect(postWithPreview.exclusiveId).toBe('blob_id_2');
      expect(postWithPreview.previewId).toBe('preview_blob_id_2');
      expect(postWithPreview.previewId).not.toContain('walrus');
    });

    it('should return 404 for non-existent creator', async () => {
      const response = await request(app).get(
        '/api/creators/0xnonexistent/profile'
      );

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Creator not found');
    });

    it('should handle creator with no tiers', async () => {
      // Create creator without tiers
      const creatorNoTiers = await prisma.creator.create({
        data: {
          address:
            '0xtest_profile_creator_notiers_000000000000000000000000000000',
          profileId: '0xtest_profile_id_notiers_0000000000000000000000000000000',
          name: 'test-profile-creator-notiers',
          bio: 'Creator with no tiers',
        },
      });

      const response = await request(app).get(
        `/api/creators/${creatorNoTiers.address}/profile`
      );

      expect(response.status).toBe(200);
      expect(response.body.creator.followerCount).toBe(0);
      expect(response.body.tiers).toEqual([]);
      expect(response.body.recentPosts).toEqual([]);

      // Cleanup
      await prisma.creator.delete({ where: { id: creatorNoTiers.id } });
    });

    it('should handle creator with no published content', async () => {
      // Create creator with only draft content
      const creatorNoPosts = await prisma.creator.create({
        data: {
          address:
            '0xtest_profile_creator_noposts_000000000000000000000000000000',
          profileId: '0xtest_profile_id_noposts_0000000000000000000000000000000',
          name: 'test-profile-creator-noposts',
          bio: 'Creator with no posts',
        },
      });

      await prisma.content.create({
        data: {
          contentId:
            '0xtest_profile_content_draft_000000000000000000000000000000',
          creatorId: creatorNoPosts.id,
          title: '[TEST-PROFILE] Draft Only',
          description: 'Draft content',
          contentType: 'text/markdown',
          sealedPatchId: 'blob_draft',
          isDraft: true,
          publishedAt: null,
        },
      });

      const response = await request(app).get(
        `/api/creators/${creatorNoPosts.address}/profile`
      );

      expect(response.status).toBe(200);
      expect(response.body.recentPosts).toEqual([]);

      // Cleanup
      await prisma.content.deleteMany({ where: { creatorId: creatorNoPosts.id } });
      await prisma.creator.delete({ where: { id: creatorNoPosts.id } });
    });

    it('should not include suinsName if name does not end with .sui', async () => {
      // Create creator without .sui name
      const creatorNoSuins = await prisma.creator.create({
        data: {
          address:
            '0xtest_profile_creator_nosuins_00000000000000000000000000000',
          profileId: '0xtest_profile_id_nosuins_000000000000000000000000000000',
          name: 'test-profile-creator-nosuins',
          bio: 'Creator without SuiNS',
        },
      });

      const response = await request(app).get(
        `/api/creators/${creatorNoSuins.address}/profile`
      );

      expect(response.status).toBe(200);
      expect(response.body.creator.suinsName).toBeUndefined();

      // Cleanup
      await prisma.creator.delete({ where: { id: creatorNoSuins.id } });
    });

    it('should limit recent posts to 5', async () => {
      // Create creator with more than 5 posts
      const creatorManyPosts = await prisma.creator.create({
        data: {
          address:
            '0xtest_profile_creator_manyposts_0000000000000000000000000000',
          profileId:
            '0xtest_profile_id_manyposts_00000000000000000000000000000000',
          name: 'test-profile-creator-manyposts',
          bio: 'Creator with many posts',
        },
      });

      // Create 7 posts
      for (let i = 0; i < 7; i++) {
        await prisma.content.create({
          data: {
            contentId: `0xtest_profile_content_many_${i}_000000000000000000000000`,
            creatorId: creatorManyPosts.id,
            title: `[TEST-PROFILE] Post ${i}`,
            description: `Post ${i}`,
            contentType: 'text/markdown',
            sealedPatchId: `blob_${i}`,
            isDraft: false,
            publishedAt: new Date(`2025-11-${10 + i}T10:00:00Z`),
          },
        });
      }

      const response = await request(app).get(
        `/api/creators/${creatorManyPosts.address}/profile`
      );

      expect(response.status).toBe(200);
      expect(response.body.recentPosts).toHaveLength(5);

      // Cleanup
      await prisma.content.deleteMany({
        where: { creatorId: creatorManyPosts.id },
      });
      await prisma.creator.delete({ where: { id: creatorManyPosts.id } });
    });

    it('should use default benefits for tiers without description', async () => {
      const creatorNoBenefits = await prisma.creator.create({
        data: {
          address:
            '0xtest_profile_creator_nobenefits_000000000000000000000000000',
          profileId:
            '0xtest_profile_id_nobenefits_0000000000000000000000000000000',
          name: 'test-profile-creator-nobenefits',
          bio: 'Creator with tier without benefits',
        },
      });

      await prisma.tier.create({
        data: {
          tierId:
            '0xtest_profile_tier_nobenefits_000000000000000000000000000000',
          creatorId: creatorNoBenefits.id,
          name: 'No Benefits Tier',
          description: '', // Empty description
          price: BigInt(5_000_000_000),
          isActive: true,
        },
      });

      const response = await request(app).get(
        `/api/creators/${creatorNoBenefits.address}/profile`
      );

      expect(response.status).toBe(200);
      const { tiers } = response.body;
      expect(tiers).toHaveLength(1);
      expect(tiers[0].benefits).toEqual([
        'Access to exclusive content',
        'Support the creator',
      ]);

      // Cleanup
      await prisma.tier.deleteMany({
        where: { creatorId: creatorNoBenefits.id },
      });
      await prisma.creator.delete({ where: { id: creatorNoBenefits.id } });
    });
  });
});
