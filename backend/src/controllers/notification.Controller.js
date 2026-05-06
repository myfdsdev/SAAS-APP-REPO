import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getIO } from '../sockets/index.js';

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { is_read, type, limit = 50, page = 1 } = req.query;

  const filter = { company_id: req.company_id, user_email: req.user.email };
  if (is_read !== undefined) filter.is_read = is_read === 'true';
  if (type) filter.type = type;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const notifications = await Notification.find(filter)
    .sort('-createdAt')
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Notification.countDocuments(filter);
  const unread_count = await Notification.countDocuments({
    company_id: req.company_id,
    user_email: req.user.email,
    is_read: false,
  });

  res.json({
    notifications,
    total,
    unread_count,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
  });
});

// @desc    Get unread count only
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    company_id: req.company_id,
    user_email: req.user.email,
    is_read: false,
  });
  res.json({ unread_count: count });
});

// @desc    Filter notifications (base44 pattern)
// @route   GET /api/notifications/filter
// @access  Private
export const filterNotifications = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.limit;
  delete filter.sort;

  // Security: users can only filter their own
  if (req.user.role !== 'admin') {
    filter.user_email = req.user.email;
  }

  const sort = req.query.sort || '-createdAt';
  const limit = parseInt(req.query.limit) || 100;

  const notifications = await Notification.find(filter).sort(sort).limit(limit);
  res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    company_id: req.company_id,
  });
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  if (notification.user_email !== req.user.email) {
    return res.status(403).json({ error: 'Access denied' });
  }

  notification.is_read = true;
  notification.read_at = new Date();
  await notification.save();

  res.json(notification);
});

// @desc    Mark all as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { company_id: req.company_id, user_email: req.user.email, is_read: false },
    { is_read: true, read_at: new Date() }
  );
  res.json({ message: 'All notifications marked as read', updated: result.modifiedCount });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    company_id: req.company_id,
  });
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  if (notification.user_email !== req.user.email && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  await notification.deleteOne();
  res.json({ message: 'Notification deleted' });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/clear-read
// @access  Private
export const clearReadNotifications = asyncHandler(async (req, res) => {
  const result = await Notification.deleteMany({
    user_email: req.user.email,
    company_id: req.company_id,
    is_read: true,
  });
  res.json({ message: 'Read notifications cleared', deleted: result.deletedCount });
});

// @desc    Create a notification (internal/admin use)
// @route   POST /api/notifications
// @access  Private/Admin
export const createNotification = asyncHandler(async (req, res) => {
  const { user_email, title, message, type, related_id } = req.body;

  if (!user_email || !title || !message) {
    return res.status(400).json({ error: 'user_email, title, and message are required' });
  }

  const recipient = await User.findOne({
    company_id: req.company_id,
    email: user_email,
  }).select('_id');
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found in this company' });
  }

  const notification = await Notification.create({
    company_id: req.company_id,
    user_email,
    title,
    message,
    type: type || 'general',
    related_id: related_id || '',
  });

  // Real-time push via socket
  try {
    getIO().to(`user_${recipient._id}`).emit('new_notification', notification);
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  res.status(201).json(notification);
});

// @desc    Broadcast notification to all users (admin)
// @route   POST /api/notifications/broadcast
// @access  Private/Admin
export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, type = 'broadcast', role } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  // Filter recipients (optionally by role)
  const userFilter = role ? { company_id: req.company_id, role } : { company_id: req.company_id };
  const users = await User.find(userFilter).select('email _id');

  if (!users.length) {
    return res.status(404).json({ error: 'No users found' });
  }

  const notifications = users.map((u) => ({
    company_id: req.company_id,
    user_email: u.email,
    title,
    message,
    type,
  }));

  const created = await Notification.insertMany(notifications);

  // Socket broadcast to each user
  try {
    const io = getIO();
    users.forEach((u, i) => {
      io.to(`user_${u._id}`).emit('new_notification', created[i]);
    });
  } catch (err) {
    console.error('Broadcast socket emit failed:', err.message);
  }

  res.status(201).json({
    message: 'Broadcast sent',
    count: created.length,
  });
});
