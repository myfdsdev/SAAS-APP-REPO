import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc   Receive frontend heartbeat — record real user activity
// @route  POST /api/activity/heartbeat
// @access Private
export const heartbeat = asyncHandler(async (req, res) => {
  const now = new Date();

  await User.findByIdAndUpdate(req.user._id, {
    last_activity: now,
    last_active: now,
  });

  res.json({ ok: true, timestamp: now });
});

// @desc   Returns whether the current user has an active attendance session
//         (Frontend uses this to decide whether to send heartbeats)
// @route  GET /api/activity/status
// @access Private
export const getActivityStatus = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const att = await Attendance.findOne({
    employee_email: req.user.email,
    date: today,
  }).select('has_active_session first_check_in last_check_out checkout_type');

  res.json({
    has_active_session: !!att?.has_active_session,
    last_activity: req.user.last_activity || null,
    attendance: att || null,
  });
});
