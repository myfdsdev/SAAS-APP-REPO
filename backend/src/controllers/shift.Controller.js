import Shift from '../models/Shift.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const requireAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can manage shifts' });
    return false;
  }
  return true;
};

// @desc    List all shifts
// @route   GET /api/shifts
// @access  Authenticated
export const listShifts = asyncHandler(async (req, res) => {
  const shifts = await Shift.find({ company_id: req.company_id }).sort({ createdAt: 1 });
  res.json(shifts);
});

// @desc    Create shift
// @route   POST /api/shifts
// @access  Admin
export const createShift = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { name, start_time, end_time } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time and end_time are required' });
  }

  const shift = await Shift.create({
    company_id: req.company_id,
    name: name.trim(),
    start_time,
    end_time,
    created_by: req.user.email,
  });

  res.status(201).json(shift);
});

// @desc    Update shift
// @route   PUT /api/shifts/:id
// @access  Admin
export const updateShift = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const shift = await Shift.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  const { name, start_time, end_time } = req.body;
  if (name !== undefined) shift.name = name.trim();
  if (start_time !== undefined) shift.start_time = start_time;
  if (end_time !== undefined) shift.end_time = end_time;
  await shift.save();

  res.json(shift);
});

// @desc    Delete shift (also unassigns from any user)
// @route   DELETE /api/shifts/:id
// @access  Admin
export const deleteShift = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const shift = await Shift.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!shift) return res.status(404).json({ error: 'Shift not found' });

  await User.updateMany(
    { company_id: req.company_id, shift_id: shift._id },
    { $set: { shift_id: null } },
  );
  await shift.deleteOne();

  res.json({ success: true });
});

// @desc    Assign shift to a user (or unassign with shift_id=null)
// @route   PUT /api/shifts/assign/:userId
// @access  Admin
export const assignShiftToUser = asyncHandler(async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const { shift_id } = req.body;
  const user = await User.findOne({ _id: req.params.userId, "workspaces.company_id": req.company_id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (shift_id) {
    const shift = await Shift.findOne({ _id: shift_id, company_id: req.company_id });
    if (!shift) return res.status(404).json({ error: 'Shift not found' });
    user.shift_id = shift._id;
  } else {
    user.shift_id = null;
  }

  await user.save();
  const populated = await User.findById(user._id).populate('shift_id');
  res.json(populated);
});
