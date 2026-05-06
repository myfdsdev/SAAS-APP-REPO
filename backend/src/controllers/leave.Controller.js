import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sendLeaveApprovalEmail } from '../utils/sendEmail.js';

const calculateDays = (start, end) => {
  const diff = Math.abs(new Date(end) - new Date(start));
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

// Create attendance + notification when leave is approved
const handleLeaveApproved = async (leave) => {
  const start = new Date(leave.start_date);
  const end = new Date(leave.end_date);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const existing = await Attendance.findOne({
      company_id: leave.company_id,
      employee_email: leave.employee_email,
      date: dateStr,
    });
    if (!existing) {
      await Attendance.create({
        company_id: leave.company_id,
        employee_id: leave.employee_id,
        employee_email: leave.employee_email,
        employee_name: leave.employee_name,
        date: dateStr,
        status: 'on_leave',
        notes: `Leave: ${leave.leave_type}`,
        has_active_session: false,
      });
    }
  }

  await Notification.create({
    company_id: leave.company_id,
    user_email: leave.employee_email,
    title: 'Leave Approved',
    message: `Your ${leave.leave_type} leave from ${leave.start_date} to ${leave.end_date} has been approved.`,
    type: 'leave_approved',
    related_id: leave._id.toString(),
  });
};

// @desc    Create leave request
export const createLeaveRequest = asyncHandler(async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  const user = req.user;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  const leave = await LeaveRequest.create({
    company_id: req.company_id,
    employee_id: user._id,
    employee_email: user.email,
    employee_name: user.full_name,
    leave_type,
    start_date,
    end_date,
    reason,
    total_days: calculateDays(start_date, end_date),
    status: 'pending',
  });

  await Notification.create({
    company_id: req.company_id,
    user_email: user.email,
    title: 'Leave Request Submitted',
    message: `Your ${leave_type} leave from ${start_date} to ${end_date} is pending approval.`,
    type: 'leave_submitted',
    related_id: leave._id.toString(),
  });

  const admins = await User.find({ company_id: req.company_id, role: 'admin' }).select('email');
  if (admins.length) {
    await Notification.insertMany(
      admins.map((admin) => ({
        company_id: req.company_id,
        user_email: admin.email,
        title: 'New Leave Request',
        message: `${user.full_name} requested ${leave_type} leave`,
        type: 'leave_submitted',
        related_id: leave._id.toString(),
      }))
    );
  }

  res.status(201).json(leave);
});

// @desc    Get my leave requests
export const getMyLeaves = asyncHandler(async (req, res) => {
  const { status, limit = 50, sort = '-createdAt' } = req.query;
  const filter = { company_id: req.company_id, employee_email: req.user.email };
  if (status) filter.status = status;
  const leaves = await LeaveRequest.find(filter).sort(sort).limit(parseInt(limit));
  res.json(leaves);
});

// @desc    Get all leave requests (admin)
export const getAllLeaves = asyncHandler(async (req, res) => {
  const { status, employee_email, leave_type, sort = '-createdAt', limit = 100, page = 1 } = req.query;
  const filter = { company_id: req.company_id };
  if (status) filter.status = status;
  if (employee_email) filter.employee_email = employee_email;
  if (leave_type) filter.leave_type = leave_type;
  if (req.user.role !== 'admin') filter.employee_email = req.user.email;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const leaves = await LeaveRequest.find(filter).sort(sort).limit(parseInt(limit)).skip(skip);
  const total = await LeaveRequest.countDocuments(filter);
  res.json({ leaves, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// @desc    Filter leave requests (base44 pattern)
export const filterLeaves = asyncHandler(async (req, res) => {
  const filter = { ...req.query, company_id: req.company_id };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;
  const sort = req.query.sort || '-createdAt';
  const limit = parseInt(req.query.limit) || 100;
  if (req.user.role !== 'admin') filter.employee_email = req.user.email;
  const leaves = await LeaveRequest.find(filter).sort(sort).limit(limit);
  res.json(leaves);
});

// @desc    Get leave by ID
export const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });
  if (req.user.role !== 'admin' && leave.employee_email !== req.user.email) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(leave);
});

// @desc    Approve leave (dedicated endpoint)
export const approveLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });
  if (leave.status !== 'pending') {
    return res.status(400).json({ error: `Leave is already ${leave.status}` });
  }

  leave.status = 'approved';
  leave.approved_by = req.user.full_name;
  leave.approved_at = new Date();
  leave.reviewed_by = req.user.email;
  leave.reviewed_at = new Date();
  await leave.save();

  await handleLeaveApproved(leave);

  sendLeaveApprovalEmail(
    leave.employee_email, leave.employee_name, leave.leave_type,
    leave.start_date, leave.end_date, 'approved'
  ).catch(err => console.error('Email error:', err.message));

  res.json(leave);
});

// @desc    Reject leave (dedicated endpoint)
export const rejectLeave = asyncHandler(async (req, res) => {
  const { rejection_reason } = req.body;
  const leave = await LeaveRequest.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });
  if (leave.status !== 'pending') {
    return res.status(400).json({ error: `Leave is already ${leave.status}` });
  }

  leave.status = 'rejected';
  leave.rejection_reason = rejection_reason || 'No reason provided';
  leave.approved_by = req.user.full_name;
  leave.approved_at = new Date();
  leave.reviewed_by = req.user.email;
  leave.reviewed_at = new Date();
  await leave.save();

  await Notification.create({
    company_id: req.company_id,
    user_email: leave.employee_email,
    title: 'Leave Request Rejected',
    message: `Your ${leave.leave_type} leave was rejected. Reason: ${leave.rejection_reason}`,
    type: 'leave_rejected',
    related_id: leave._id.toString(),
  });

  sendLeaveApprovalEmail(
    leave.employee_email, leave.employee_name, leave.leave_type,
    leave.start_date, leave.end_date, 'rejected'
  ).catch(err => console.error('Email error:', err.message));

  res.json(leave);
});

// @desc    Update leave request (GENERIC — handles approve/reject via status field)
export const updateLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  const isOwner = leave.employee_email === req.user.email;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });
  if (isOwner && !isAdmin && leave.status !== 'pending') {
    return res.status(400).json({ error: 'Cannot edit approved/rejected requests' });
  }

  const wasPending = leave.status === 'pending';

  const allowedFields = isAdmin
    ? ['leave_type', 'start_date', 'end_date', 'reason', 'status',
       'reviewed_by', 'reviewed_at', 'approved_by', 'approved_at',
       'rejection_reason', 'total_days']
    : ['leave_type', 'start_date', 'end_date', 'reason'];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) leave[field] = req.body[field];
  });

  if (req.body.start_date || req.body.end_date) {
    leave.total_days = calculateDays(leave.start_date, leave.end_date);
  }

  await leave.save();

  // If admin just approved — auto-create attendance + notify
  if (isAdmin && wasPending && req.body.status === 'approved') {
    await handleLeaveApproved(leave);
  }

  if (isAdmin && wasPending && req.body.status === 'rejected') {
    await Notification.create({
      company_id: req.company_id,
      user_email: leave.employee_email,
      title: 'Leave Rejected',
      message: `Your ${leave.leave_type} leave was rejected.`,
      type: 'leave_rejected',
      related_id: leave._id.toString(),
    });
  }

  res.json(leave);
});

// @desc    Delete leave request
export const deleteLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!leave) return res.status(404).json({ error: 'Leave request not found' });

  const isOwner = leave.employee_email === req.user.email;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Access denied' });

  if (leave.status === 'approved') {
    await Attendance.deleteMany({
      company_id: req.company_id,
      employee_email: leave.employee_email,
      date: { $gte: leave.start_date, $lte: leave.end_date },
      status: 'on_leave',
    });
  }

  await leave.deleteOne();
  res.json({ message: 'Leave request deleted' });
});

// @desc    Leave stats
export const getLeaveStats = asyncHandler(async (req, res) => {
  const { employee_email } = req.query;
  const email = req.user.role === 'admin' ? employee_email || req.user.email : req.user.email;
  const leaves = await LeaveRequest.find({ company_id: req.company_id, employee_email: email });

  res.json({
    total: leaves.length,
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
    total_days_approved: leaves
      .filter((l) => l.status === 'approved')
      .reduce((sum, l) => sum + (l.total_days || 0), 0),
    by_type: {
      sick: leaves.filter((l) => l.leave_type === 'sick').length,
      casual: leaves.filter((l) => l.leave_type === 'casual').length,
      annual: leaves.filter((l) => l.leave_type === 'annual').length,
      unpaid: leaves.filter((l) => l.leave_type === 'unpaid').length,
      maternity: leaves.filter((l) => l.leave_type === 'maternity').length,
      other: leaves.filter((l) => l.leave_type === 'other').length,
    },
  });
});
