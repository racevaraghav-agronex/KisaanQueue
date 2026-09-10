import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { NotificationModel } from '../models/Notification.ts';
import { authenticate, AuthRequest } from '../middleware/auth.ts';
import { dbStatus } from '../db.ts';

const router = Router();

// Ensure DB is available
const ensureDb = (_req: any, res: Response, next: () => void) => {
  res.setHeader('Content-Type', 'application/json');
  if (!dbStatus.connected) {
    res.status(503).json({ error: 'Database connection unavailable' });
    return;
  }
  next();
};

router.use(ensureDb);

/**
 * GET /api/notifications
 * Get paginated list of notifications for the authenticated user
 * Query: ?page=1&limit=20&unreadOnly=true&type=TOKEN_BOOKED
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
    const typeFilter = req.query.type as string | undefined;

    // Strict user ownership filter
    const query: any = {
      $or: [
        { userId: user._id },
        { userId: String(user._id) }
      ]
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    if (typeFilter && typeof typeFilter === 'string') {
      query.type = typeFilter;
    }

    const total = await NotificationModel.countDocuments(query);
    const unreadCount = await NotificationModel.countDocuments({
      $or: [
        { userId: user._id },
        { userId: String(user._id) }
      ],
      isRead: false
    });

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount
    });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Fast endpoint for live badge polling / counter
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const unreadCount = await NotificationModel.countDocuments({
      $or: [
        { userId: user._id },
        { userId: String(user._id) }
      ],
      isRead: false
    });

    res.json({ unreadCount });
  } catch (err: any) {
    console.error('Error fetching unread notification count:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch unread count' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Marks an individual notification as read (Strictly checks ownership)
 */
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!id) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    // Strictly find matching notification belonging to authenticated user
    const notification = await NotificationModel.findOne({
      _id: id,
      $or: [
        { userId: user._id },
        { userId: String(user._id) }
      ]
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found or unauthorized' });
      return;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: err.message || 'Failed to mark notification as read' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the user as read in bulk
 */
router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const result = await NotificationModel.updateMany(
      {
        $or: [
          { userId: user._id },
          { userId: String(user._id) }
        ],
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: (result as any)?.modifiedCount ?? 0
    });
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: err.message || 'Failed to mark all as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Deletes a notification (Farmer/User dismisses notification)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const notification = await NotificationModel.findOne({
      _id: id,
      $or: [
        { userId: user._id },
        { userId: String(user._id) }
      ]
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found or unauthorized' });
      return;
    }

    await NotificationModel.findByIdAndDelete(id);

    res.json({ message: 'Notification deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message || 'Failed to delete notification' });
  }
});

export default router;
