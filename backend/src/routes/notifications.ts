/**
 * Notification API Routes
 *
 * Endpoints for managing notifications:
 * - GET /api/notifications - Get user's notifications
 * - POST /api/notifications/:id/read - Mark notification as read
 * - POST /api/notifications/read-all - Mark all as read
 * - GET /api/notifications/unread-count - Get unread count
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { jsonResponse } from '../lib/json-serializer';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
} from '../services/notifications';

const router = Router();

/**
 * GET /api/notifications
 *
 * Get notifications for the current user
 *
 * Query parameters:
 * - address (required): User's Sui wallet address
 * - unreadOnly (optional): Only show unread notifications
 * - limit (optional): Number of notifications to return (default: 20, max: 50)
 * - offset (optional): Pagination offset (default: 0)
 *
 * @returns Notifications with metadata
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { address, unreadOnly, limit, offset } = req.query;

    // Validate required address parameter
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Invalid parameters: address query parameter required',
      });
    }

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found for this address',
      });
    }

    // Parse query parameters
    const options = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    // Validate numeric parameters
    if (isNaN(options.limit) || options.limit < 1) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
      });
    }

    if (isNaN(options.offset) || options.offset < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter',
      });
    }

    // Get notifications
    const result = await getNotifications(creator.id, options);

    res.json(
      jsonResponse({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        total: result.total,
      })
    );
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/notifications/:id/read
 *
 * Mark a single notification as read
 *
 * Query parameters:
 * - address (required): User's Sui wallet address
 *
 * @param id - Notification database ID
 * @returns Success status
 */
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address } = req.query;

    // Validate required address parameter
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Invalid parameters: address query parameter required',
      });
    }

    // Validate notification ID
    if (!id) {
      return res.status(400).json({
        error: 'Invalid notification ID',
      });
    }

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found for this address',
      });
    }

    // Mark notification as read
    const success = await markNotificationAsRead(id, creator.id);

    if (!success) {
      return res.status(404).json({
        error: 'Notification not found or does not belong to this user',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/notifications/read-all
 *
 * Mark all notifications as read for the user
 *
 * Query parameters:
 * - address (required): User's Sui wallet address
 *
 * @returns Success status and count of notifications marked as read
 */
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    // Validate required address parameter
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Invalid parameters: address query parameter required',
      });
    }

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({
        error: 'Creator not found for this address',
      });
    }

    // Mark all notifications as read
    const count = await markAllNotificationsAsRead(creator.id);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/notifications/unread-count
 *
 * Get just the count of unread notifications (lightweight for header badge)
 *
 * Query parameters:
 * - address (required): User's Sui wallet address
 *
 * @returns Unread notification count (returns 0 if user is not a creator)
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const { address } = req.query;

    // Validate required address parameter
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Invalid parameters: address query parameter required',
      });
    }

    // Find creator by address
    const creator = await prisma.creator.findUnique({
      where: { address },
      select: { id: true },
    });

    // If user is not a creator, return 0 instead of 404
    if (!creator) {
      return res.json({
        count: 0,
      });
    }

    // Get unread count
    const count = await getUnreadCount(creator.id);

    res.json({
      count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
