import express from 'express';
import {
  getMyNotifications,
  getUnreadCount,
  filterNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  createNotification,
  broadcastNotification,
} from '../controllers/notification.Controller.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { requireCompany } from '../middleware/tenantScope.js';

const router = express.Router();

router.use(protect, requireCompany);

// Specific routes FIRST
router.get('/unread-count', getUnreadCount);
router.get('/filter', filterNotifications);
router.put('/mark-all-read', markAllAsRead);
router.delete('/clear-read', clearReadNotifications);

// Admin
router.post('/', adminOnly, createNotification);
router.post('/broadcast', adminOnly, broadcastNotification);

// Item-level
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

// General
router.get('/', getMyNotifications);

export default router;
