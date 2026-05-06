import AttendanceSession from '../models/AttendanceSession.js';
import Attendance from '../models/Attendance.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Start a session (check-in mid-day, re-entry)
// @route   POST /api/attendance-sessions
// @access  Private
export const startSession = asyncHandler(async (req, res) => {
  const { attendance_id, location } = req.body;

  if (!attendance_id) {
    return res.status(400).json({ error: 'attendance_id required' });
  }

  const attendance = await Attendance.findOne({ _id: attendance_id, company_id: req.company_id });
  if (!attendance) return res.status(404).json({ error: 'Attendance not found' });

  // Check for active session
  const active = await AttendanceSession.findOne({
    company_id: req.company_id,
    attendance_id,
    check_out: { $exists: false },
  });
  if (active) {
    return res.status(400).json({ error: 'Active session already exists' });
  }

  const session = await AttendanceSession.create({
    company_id: req.company_id,
    attendance_id,
    employee_email: attendance.employee_email,
    date: attendance.date,
    check_in: new Date(),
    location: location || '',
  });

  // Mark attendance as active
  attendance.has_active_session = true;
  await attendance.save();

  res.status(201).json(session);
});

// @desc    End a session
// @route   PUT /api/attendance-sessions/:id/end
// @access  Private
export const endSession = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.check_out) {
    return res.status(400).json({ error: 'Session already ended' });
  }

  const now = new Date();
  session.check_out = now;
  session.duration_minutes = Math.round((now - session.check_in) / (1000 * 60));
  await session.save();

  // Update attendance total work_hours
  const attendance = await Attendance.findOne({
    _id: session.attendance_id,
    company_id: req.company_id,
  });
  if (attendance) {
    const allSessions = await AttendanceSession.find({
      company_id: req.company_id,
      attendance_id: session.attendance_id,
      check_out: { $exists: true },
    });
    const totalMinutes = allSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    attendance.work_hours = parseFloat((totalMinutes / 60).toFixed(2));
    attendance.has_active_session = false;
    attendance.last_check_out = now;
    await attendance.save();
  }

  res.json(session);
});

// @desc    Get sessions
// @route   GET /api/attendance-sessions
// @access  Private
export const getSessions = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  // Non-admin: only own
  if (req.user.role !== 'admin') {
    filter.employee_email = req.user.email;
  }

  const sessions = await AttendanceSession.find(filter)
    .sort(req.query.sort || '-check_in')
    .limit(parseInt(req.query.limit) || 100);

  res.json(sessions);
});

// @desc    Filter sessions (base44 pattern)
// @route   GET /api/attendance-sessions/filter
// @access  Private
export const filterSessions = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  if (req.user.role !== 'admin') {
    filter.employee_email = req.user.email;
  }

  const sessions = await AttendanceSession.find(filter)
    .sort(req.query.sort || '-check_in')
    .limit(parseInt(req.query.limit) || 100);

  res.json(sessions);
});

// @desc    Get session by ID
// @route   GET /api/attendance-sessions/:id
// @access  Private
export const getSessionById = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// @desc    Update session (admin - manual edit)
// @route   PUT /api/attendance-sessions/:id
// @access  Private/Admin
export const updateSession = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findOneAndUpdate(
    { _id: req.params.id, company_id: req.company_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Recalc duration if both times present
  if (session.check_in && session.check_out) {
    session.duration_minutes = Math.round(
      (new Date(session.check_out) - new Date(session.check_in)) / (1000 * 60)
    );
    await session.save();
  }

  res.json(session);
});

// @desc    Delete session (admin)
// @route   DELETE /api/attendance-sessions/:id
// @access  Private/Admin
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findOneAndDelete({
    _id: req.params.id,
    company_id: req.company_id,
  });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ message: 'Session deleted' });
});
