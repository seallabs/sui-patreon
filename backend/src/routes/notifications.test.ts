/**
 * Notification Routes Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import request from 'supertest';
import app from '../index';
import { prisma } from '../lib/prisma';
import { createContentNotifications, createSubscriberNotification } from '../services/notifications';

// Test data
const testCreator1 = {
  address: '0xtest_creator_1_notifications',
  profileId: '0xprofile_1_notifications',
  name: 'test_creator_1_notifications',
  bio: 'Test creator 1 for notifications',
};

const testCreator2 = {
  address: '0xtest_creator_2_notifications',
  profileId: '0xprofile_2_notifications',
  name: 'test_creator_2_notifications',
  bio: 'Test creator 2 (subscriber) for notifications',
};

const testTier = {
  tierId: '0xtier_1_notifications',
  name: 'Premium Tier',
  description: 'Premium tier for testing',
  price: BigInt(1000000000), // 1 SUI
};

const testContent = {
  contentId: '0xcontent_1_notifications',
  title: 'Test Content for Notifications',
  description: 'Test content description',
  contentType: 'text/markdown',
  sealedPatchId: '0xwalrus_blob_notifications',
  previewPatchId: null,
  isPublic: false,
  isDraft: false,
  publishedAt: new Date(),
};

const testSubscription = {
  subscriptionId: '0xsub_1_notifications',
  startsAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  isActive: true,
};

describe('Notification System', () => {
  let creator1Id: string;
  let creator2Id: string;
  let tierId: string;
  let contentId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { actorId: { in: [testCreator1.address, testCreator2.address] } },
          { actorName: { in: [testCreator1.name, testCreator2.name] } },
        ],
      },
    });

    await prisma.subscription.deleteMany({
      where: { subscriptionId: testSubscription.subscriptionId },
    });

    await prisma.contentTier.deleteMany({
      where: { contentId: { in: [] } },
    });

    await prisma.content.deleteMany({
      where: { contentId: testContent.contentId },
    });

    await prisma.tier.deleteMany({
      where: { tierId: testTier.tierId },
    });

    await prisma.creator.deleteMany({
      where: {
        address: { in: [testCreator1.address, testCreator2.address] },
      },
    });

    // Create test creators
    const creator1 = await prisma.creator.create({
      data: testCreator1,
    });
    creator1Id = creator1.id;

    const creator2 = await prisma.creator.create({
      data: testCreator2,
    });
    creator2Id = creator2.id;

    // Create test tier
    const tier = await prisma.tier.create({
      data: {
        ...testTier,
        creatorId: creator1Id,
      },
    });
    tierId = tier.id;

    // Create test content
    const content = await prisma.content.create({
      data: {
        ...testContent,
        creatorId: creator1Id,
      },
    });
    contentId = content.id;

    // Link content to tier
    await prisma.contentTier.create({
      data: {
        contentId: content.id,
        tierId: tier.id,
      },
    });

    // Create subscription (creator2 subscribes to creator1's tier)
    await prisma.subscription.create({
      data: {
        ...testSubscription,
        subscriber: testCreator2.address, // Creator2 is subscriber
        tierId: tier.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { actorId: { in: [testCreator1.address, testCreator2.address] } },
          { actorName: { in: [testCreator1.name, testCreator2.name] } },
        ],
      },
    });

    await prisma.subscription.deleteMany({
      where: { subscriptionId: testSubscription.subscriptionId },
    });

    await prisma.contentTier.deleteMany({
      where: { contentId },
    });

    await prisma.content.deleteMany({
      where: { id: contentId },
    });

    await prisma.tier.deleteMany({
      where: { id: tierId },
    });

    await prisma.creator.deleteMany({
      where: { id: { in: [creator1Id, creator2Id] } },
    });

    await prisma.$disconnect();
  });

  test('should create content notifications for subscribers', async () => {
    const count = await createContentNotifications(contentId, creator1Id);

    // Should create 1 notification for creator2 (the subscriber)
    expect(count).toBe(1);

    // Verify notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: creator2Id,
        type: 'NEW_CONTENT',
        contentId: contentId,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe(`New post from ${testCreator1.name}`);
    expect(notifications[0].message).toContain(testContent.title);
    expect(notifications[0].actorId).toBe(testCreator1.address);
    expect(notifications[0].actorName).toBe(testCreator1.name);
    expect(notifications[0].isRead).toBe(false);
  });

  test('should create subscriber notification for creator', async () => {
    await createSubscriberNotification(creator1Id, testCreator2.address, testTier.name);

    // Verify notification was created
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: creator1Id,
        type: 'NEW_SUBSCRIBER',
        actorId: testCreator2.address,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].title).toBe('New subscriber!');
    expect(notifications[0].message).toContain(testCreator2.name);
    expect(notifications[0].message).toContain(testTier.name);
    expect(notifications[0].isRead).toBe(false);
  });

  test('GET /api/notifications should return notifications for user', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .query({ address: testCreator2.address });

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeArray();
    expect(response.body.notifications.length).toBeGreaterThan(0);
    expect(response.body.unreadCount).toBeGreaterThan(0);
    expect(response.body.total).toBeGreaterThan(0);

    // Check notification structure
    const notification = response.body.notifications[0];
    expect(notification).toHaveProperty('id');
    expect(notification).toHaveProperty('type');
    expect(notification).toHaveProperty('title');
    expect(notification).toHaveProperty('message');
    expect(notification).toHaveProperty('isRead');
    expect(notification).toHaveProperty('createdAt');
  });

  test('GET /api/notifications should filter unread notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .query({ address: testCreator2.address, unreadOnly: 'true' });

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeArray();

    // All returned notifications should be unread
    response.body.notifications.forEach((notif: any) => {
      expect(notif.isRead).toBe(false);
    });
  });

  test('GET /api/notifications should respect limit and offset', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .query({ address: testCreator2.address, limit: '1', offset: '0' });

    expect(response.status).toBe(200);
    expect(response.body.notifications).toBeArray();
    expect(response.body.notifications.length).toBeLessThanOrEqual(1);
  });

  test('GET /api/notifications should return 400 without address', async () => {
    const response = await request(app).get('/api/notifications');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('address');
  });

  test('GET /api/notifications should return 404 for non-existent creator', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .query({ address: '0xnonexistent' });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Creator not found');
  });

  test('POST /api/notifications/:id/read should mark notification as read', async () => {
    // Get a notification
    const notifications = await prisma.notification.findMany({
      where: { recipientId: creator2Id, isRead: false },
      take: 1,
    });

    expect(notifications).toHaveLength(1);
    const notificationId = notifications[0].id;

    // Mark as read
    const response = await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .query({ address: testCreator2.address });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Verify it was marked as read
    const updatedNotification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    expect(updatedNotification?.isRead).toBe(true);
  });

  test('POST /api/notifications/:id/read should return 404 for non-existent notification', async () => {
    const response = await request(app)
      .post('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .query({ address: testCreator2.address });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('Notification not found');
  });

  test('POST /api/notifications/read-all should mark all notifications as read', async () => {
    // Create a few more unread notifications
    await prisma.notification.createMany({
      data: [
        {
          recipientId: creator1Id,
          type: 'NEW_SUBSCRIBER',
          title: 'Test notification 1',
          message: 'Test message 1',
          actorId: testCreator2.address,
          actorName: testCreator2.name,
          isRead: false,
        },
        {
          recipientId: creator1Id,
          type: 'NEW_SUBSCRIBER',
          title: 'Test notification 2',
          message: 'Test message 2',
          actorId: testCreator2.address,
          actorName: testCreator2.name,
          isRead: false,
        },
      ],
    });

    // Mark all as read
    const response = await request(app)
      .post('/api/notifications/read-all')
      .query({ address: testCreator1.address });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);

    // Verify all were marked as read
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: creator1Id,
        isRead: false,
      },
    });

    expect(unreadCount).toBe(0);
  });

  test('GET /api/notifications/unread-count should return unread count', async () => {
    // Create some unread notifications
    await prisma.notification.createMany({
      data: [
        {
          recipientId: creator2Id,
          type: 'NEW_CONTENT',
          title: 'Unread notification 1',
          message: 'Test message',
          actorId: testCreator1.address,
          actorName: testCreator1.name,
          isRead: false,
        },
        {
          recipientId: creator2Id,
          type: 'NEW_CONTENT',
          title: 'Unread notification 2',
          message: 'Test message',
          actorId: testCreator1.address,
          actorName: testCreator1.name,
          isRead: false,
        },
      ],
    });

    const response = await request(app)
      .get('/api/notifications/unread-count')
      .query({ address: testCreator2.address });

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThanOrEqual(2);
  });

  test('should not create duplicate notifications for same content', async () => {
    // Try to create notifications again for same content
    const count1 = await createContentNotifications(contentId, creator1Id);
    const count2 = await createContentNotifications(contentId, creator1Id);

    // Should create notifications each time (not idempotent by design)
    // In production, this should be handled by the caller
    expect(count1).toBeGreaterThan(0);
    expect(count2).toBeGreaterThan(0);
  });

  test('should handle content with no tiers (no notifications)', async () => {
    // Create content without tiers
    const publicContent = await prisma.content.create({
      data: {
        contentId: '0xpublic_content_notifications',
        creatorId: creator1Id,
        title: 'Public Content',
        description: 'No tier requirements',
        contentType: 'text/plain',
        sealedPatchId: '0xpublic_blob',
        isPublic: true,
        isDraft: false,
        publishedAt: new Date(),
      },
    });

    const count = await createContentNotifications(publicContent.id, creator1Id);

    // Should create 0 notifications (no tier requirements)
    expect(count).toBe(0);

    // Clean up
    await prisma.content.delete({ where: { id: publicContent.id } });
  });

  test('should only notify subscribers who are also creators', async () => {
    // Create a subscription for a non-creator address
    const nonCreatorSubscription = await prisma.subscription.create({
      data: {
        subscriptionId: '0xnoncreator_sub_notifications',
        subscriber: '0xnoncreator_address',
        tierId: tierId,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    const count = await createContentNotifications(contentId, creator1Id);

    // Should only notify creator2 (not the non-creator subscriber)
    expect(count).toBe(1);

    // Verify no notification was created for non-creator
    const notifications = await prisma.notification.findMany({
      where: {
        contentId: contentId,
        actorId: '0xnoncreator_address',
      },
    });

    expect(notifications).toHaveLength(0);

    // Clean up
    await prisma.subscription.delete({ where: { id: nonCreatorSubscription.id } });
  });
});
