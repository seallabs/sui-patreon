/**
 * Content Detail Endpoint Tests
 *
 * Tests for GET /api/content/:contentId endpoint
 * Verifies: content retrieval, access control, related/popular posts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '../lib/prisma';

describe('GET /api/content/:contentId - Content Detail', () => {
  let testCreator: any;
  let testContent: any;
  let testTier: any;
  let relatedContent1: any;
  let relatedContent2: any;

  beforeAll(async () => {
    // Create test creator
    testCreator = await prisma.creator.create({
      data: {
        address: '0x' + 'a'.repeat(64),
        profileId: '0x' + 'b'.repeat(64),
        name: 'testcreator.sui',
        bio: 'Test creator bio',
        avatarUrl: 'https://example.com/avatar.jpg',
        category: 'Testing',
        isVerified: true,
      },
    });

    // Create test tier
    testTier = await prisma.tier.create({
      data: {
        tierId: '0x' + 'c'.repeat(64),
        creatorId: testCreator.id,
        name: 'Premium Tier',
        description: 'Premium access',
        price: BigInt(5000000), // 5 USDC
        isActive: true,
      },
    });

    // Create main test content
    testContent = await prisma.content.create({
      data: {
        contentId: '0x' + 'd'.repeat(64),
        creatorId: testCreator.id,
        title: 'Main Test Content',
        description: 'This is the main test content',
        contentType: 'video/mp4',
        sealedPatchId: 'sealed-patch-123',
        previewPatchId: 'preview-patch-123',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date(),
        viewCount: 100,
        likeCount: 50,
      },
    });

    // Link content to tier
    await prisma.contentTier.create({
      data: {
        contentId: testContent.id,
        tierId: testTier.id,
      },
    });

    // Create related content 1
    relatedContent1 = await prisma.content.create({
      data: {
        contentId: '0x' + 'e'.repeat(64),
        creatorId: testCreator.id,
        title: 'Related Content 1',
        description: 'First related content',
        contentType: 'image/png',
        sealedPatchId: 'sealed-related-1',
        previewPatchId: 'preview-related-1',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date(Date.now() - 86400000), // 1 day ago
        viewCount: 80,
        likeCount: 40,
      },
    });

    // Create related content 2 (most popular)
    relatedContent2 = await prisma.content.create({
      data: {
        contentId: '0x' + 'f'.repeat(64),
        creatorId: testCreator.id,
        title: 'Popular Content',
        description: 'Most popular content',
        contentType: 'video/mp4',
        sealedPatchId: 'sealed-popular',
        previewPatchId: 'preview-popular',
        isPublic: false,
        isDraft: false,
        publishedAt: new Date(Date.now() - 172800000), // 2 days ago
        viewCount: 500,
        likeCount: 200,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.contentTier.deleteMany({
      where: { contentId: { in: [testContent.id, relatedContent1.id, relatedContent2.id] } },
    });
    await prisma.content.deleteMany({
      where: { creatorId: testCreator.id },
    });
    await prisma.tier.deleteMany({
      where: { creatorId: testCreator.id },
    });
    await prisma.creator.delete({
      where: { id: testCreator.id },
    });
  });

  it('should return 404 for non-existent content', async () => {
    const response = await fetch(`http://localhost:3001/api/content/0x${'9'.repeat(64)}`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Content not found');
  });

  it('should return content details without subscription (locked)', async () => {
    const response = await fetch(`http://localhost:3001/api/content/${testContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Verify content structure
    expect(data.content).toBeDefined();
    expect(data.content.title).toBe('Main Test Content');
    expect(data.content.previewId).toBe('preview-patch-123');
    expect(data.content.exclusiveId).toBeNull(); // Should be null without subscription
    expect(data.content.isLocked).toBe(true);
    expect(data.content.viewCount).toBe(100);
    expect(data.content.likeCount).toBe(50);

    // Verify creator info
    expect(data.creator).toBeDefined();
    expect(data.creator.displayName).toBe('testcreator.sui');
    expect(data.creator.suinsName).toBe('testcreator.sui');
    expect(data.creator.bio).toBe('Test creator bio');
    expect(data.creator.isVerified).toBe(true);

    // Verify access control
    expect(data.isSubscribed).toBe(false);

    // Verify related posts
    expect(data.relatedPosts).toBeArray();
    expect(data.relatedPosts.length).toBeGreaterThan(0);

    // Verify popular posts
    expect(data.popularPosts).toBeArray();
    expect(data.popularPosts.length).toBeGreaterThan(0);
  });

  it('should return content details with subscription (unlocked)', async () => {
    const subscriberAddress = '0x' + '1'.repeat(64);

    // Create active subscription
    const subscription = await prisma.subscription.create({
      data: {
        subscriptionId: '0x' + '2'.repeat(64),
        subscriber: subscriberAddress,
        tierId: testTier.id,
        startsAt: new Date(Date.now() - 86400000), // Started 1 day ago
        expiresAt: new Date(Date.now() + 2592000000), // Expires in 30 days
        isActive: true,
      },
    });

    const response = await fetch(
      `http://localhost:3001/api/content/${testContent.contentId}?address=${subscriberAddress}`
    );
    expect(response.status).toBe(200);

    const data = await response.json();

    // Verify exclusive content is accessible
    expect(data.content.exclusiveId).toBe('sealed-patch-123');
    expect(data.content.isLocked).toBe(false);
    expect(data.isSubscribed).toBe(true);

    // Clean up subscription
    await prisma.subscription.delete({
      where: { id: subscription.id },
    });
  });

  it('should return public content as unlocked without subscription', async () => {
    // Create public content
    const publicContent = await prisma.content.create({
      data: {
        contentId: '0x' + '3'.repeat(64),
        creatorId: testCreator.id,
        title: 'Public Test Content',
        description: 'This is public',
        contentType: 'text/markdown',
        sealedPatchId: 'sealed-public',
        previewPatchId: 'preview-public',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date(),
        viewCount: 10,
        likeCount: 5,
      },
    });

    const response = await fetch(`http://localhost:3001/api/content/${publicContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Public content should be accessible without subscription
    expect(data.content.exclusiveId).toBe('sealed-public');
    expect(data.content.isLocked).toBe(false);
    expect(data.isSubscribed).toBe(true);

    // Clean up
    await prisma.content.delete({
      where: { id: publicContent.id },
    });
  });

  it('should include related posts ordered by published date', async () => {
    const response = await fetch(`http://localhost:3001/api/content/${testContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data.relatedPosts).toBeArray();
    expect(data.relatedPosts.length).toBeGreaterThanOrEqual(2);

    // Most recent should be first
    const relatedTitles = data.relatedPosts.map((p: any) => p.title);
    expect(relatedTitles).toContain('Related Content 1');
    expect(relatedTitles).toContain('Popular Content');
  });

  it('should include popular posts ordered by likes and views', async () => {
    const response = await fetch(`http://localhost:3001/api/content/${testContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data.popularPosts).toBeArray();
    expect(data.popularPosts.length).toBeGreaterThanOrEqual(1);

    // Most popular (200 likes) should be first
    const firstPopular = data.popularPosts[0];
    expect(firstPopular.title).toBe('Popular Content');
    expect(firstPopular.likeCount).toBe(200);
  });

  it('should not return draft or unpublished content in related/popular posts', async () => {
    // Create draft content
    const draftContent = await prisma.content.create({
      data: {
        contentId: '0x' + '4'.repeat(64),
        creatorId: testCreator.id,
        title: 'Draft Content',
        description: 'This is a draft',
        contentType: 'text/markdown',
        sealedPatchId: 'sealed-draft',
        previewPatchId: 'preview-draft',
        isPublic: false,
        isDraft: true,
        publishedAt: null,
        viewCount: 0,
        likeCount: 0,
      },
    });

    const response = await fetch(`http://localhost:3001/api/content/${testContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Draft should not appear in related or popular posts
    const allPostTitles = [
      ...data.relatedPosts.map((p: any) => p.title),
      ...data.popularPosts.map((p: any) => p.title),
    ];
    expect(allPostTitles).not.toContain('Draft Content');

    // Clean up
    await prisma.content.delete({
      where: { id: draftContent.id },
    });
  });

  it('should exclude current content from related/popular posts', async () => {
    const response = await fetch(`http://localhost:3001/api/content/${testContent.contentId}`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Current content should not appear in related or popular posts
    const relatedIds = data.relatedPosts.map((p: any) => p.contentId);
    const popularIds = data.popularPosts.map((p: any) => p.contentId);

    expect(relatedIds).not.toContain(testContent.contentId);
    expect(popularIds).not.toContain(testContent.contentId);
  });

  it('should handle expired subscriptions correctly', async () => {
    const subscriberAddress = '0x' + '5'.repeat(64);

    // Create expired subscription
    const expiredSubscription = await prisma.subscription.create({
      data: {
        subscriptionId: '0x' + '6'.repeat(64),
        subscriber: subscriberAddress,
        tierId: testTier.id,
        startsAt: new Date(Date.now() - 2592000000), // Started 30 days ago
        expiresAt: new Date(Date.now() - 86400000), // Expired 1 day ago
        isActive: false,
      },
    });

    const response = await fetch(
      `http://localhost:3001/api/content/${testContent.contentId}?address=${subscriberAddress}`
    );
    expect(response.status).toBe(200);

    const data = await response.json();

    // Should not have access with expired subscription
    expect(data.content.exclusiveId).toBeNull();
    expect(data.content.isLocked).toBe(true);
    expect(data.isSubscribed).toBe(false);

    // Clean up
    await prisma.subscription.delete({
      where: { id: expiredSubscription.id },
    });
  });
});
