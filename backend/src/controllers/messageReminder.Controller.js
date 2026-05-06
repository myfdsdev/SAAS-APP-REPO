import MessageReminder from '../models/MessageReminder.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get my reminders
// @route   GET /api/message-reminders
// @access  Private
export const getMyReminders = asyncHandler(async (req, res) => {
  const { is_triggered, limit = 50, sort = '-reminder_time' } = req.query;

  const filter = { company_id: req.company_id, user_id: req.user._id };
  if (is_triggered !== undefined) filter.is_triggered = is_triggered === 'true';

  const reminders = await MessageReminder.find(filter)
    .sort(sort)
    .limit(parseInt(limit));

  res.json(reminders);
});

// @desc    Filter reminders (base44 pattern)
// @route   GET /api/message-reminders/filter
// @access  Private
export const filterReminders = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  // Security: users only see their own
  if (req.user.role !== 'admin') {
    filter.user_id = req.user._id;
  }

  const reminders = await MessageReminder.find(filter)
    .sort(req.query.sort || '-reminder_time')
    .limit(parseInt(req.query.limit) || 100);

  res.json(reminders);
});

// @desc    Create reminder
// @route   POST /api/message-reminders
// @access  Private
export const createReminder = asyncHandler(async (req, res) => {
  const { message_id, message_text, reminder_time } = req.body;

  if (!message_id || !reminder_time) {
    return res.status(400).json({ error: 'message_id and reminder_time required' });
  }

  const reminder = await MessageReminder.create({
    company_id: req.company_id,
    user_id: req.user._id,
    message_id,
    message_text: message_text || '',
    reminder_time: new Date(reminder_time),
  });

  res.status(201).json(reminder);
});

// @desc    Update reminder (mark triggered, reschedule)
// @route   PUT /api/message-reminders/:id
// @access  Private
export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await MessageReminder.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

  if (reminder.user_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const allowed = ['reminder_time', 'is_triggered', 'triggered_at'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) reminder[f] = req.body[f];
  });

  await reminder.save();
  res.json(reminder);
});

// @desc    Delete reminder
// @route   DELETE /api/message-reminders/:id
// @access  Private
export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await MessageReminder.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

  if (reminder.user_id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await reminder.deleteOne();
  res.json({ message: 'Reminder deleted' });
});

// @desc    Get due reminders (for cron job / polling)
// @route   GET /api/message-reminders/due
// @access  Private
export const getDueReminders = asyncHandler(async (req, res) => {
  const now = new Date();
  const reminders = await MessageReminder.find({
    company_id: req.company_id,
    user_id: req.user._id,
    is_triggered: false,
    reminder_time: { $lte: now },
  });

  res.json(reminders);
});
