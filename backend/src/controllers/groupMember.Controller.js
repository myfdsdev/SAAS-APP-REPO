import GroupMember from '../models/GroupMember.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get group members
// @route   GET /api/group-members?group_id=xxx
// @access  Private
export const getGroupMembers = asyncHandler(async (req, res) => {
  const { group_id, user_id, limit = 500, sort = '-createdAt' } = req.query;
  const filter = { company_id: req.company_id };
  if (group_id) filter.group_id = group_id;
  if (user_id) filter.user_id = user_id;

  const members = await GroupMember.find(filter).sort(sort).limit(parseInt(limit));
  res.json(members);
});

// @desc    Filter group members (base44 pattern)
// @route   GET /api/group-members/filter
// @access  Private
export const filterGroupMembers = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const members = await GroupMember.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 500);

  res.json(members);
});

// @desc    Add member to group
// @route   POST /api/group-members
// @access  Private
export const addGroupMember = asyncHandler(async (req, res) => {
  const { group_id, user_id, role = 'member' } = req.body;

  if (!group_id || !user_id) {
    return res.status(400).json({ error: 'group_id and user_id required' });
  }

  const group = await Group.findOne({ _id: group_id, company_id: req.company_id });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  // Membership-based lookup — let admins add coworkers to groups even if
  // those coworkers are currently active in another workspace.
  const user = await User.findOne({
    _id: user_id,
    "workspaces.company_id": req.company_id,
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Permission
  const requester = await GroupMember.findOne({
    company_id: req.company_id,
    group_id,
    user_id: req.user._id,
  });
  const canAdd =
    req.user.role === 'admin' ||
    (requester && requester.role === 'admin') ||
    group.group_type === 'public';
  if (!canAdd) return res.status(403).json({ error: 'Access denied' });

  // Duplicate check
  const existing = await GroupMember.findOne({ company_id: req.company_id, group_id, user_id });
  if (existing) return res.status(400).json({ error: 'Already a member' });

  const member = await GroupMember.create({
    company_id: req.company_id,
    group_id,
    group_name: group.group_name,
    user_id: user._id,
    user_email: user.email,
    user_name: user.full_name,
    role,
    added_by: req.user._id,
    added_by_name: req.user.full_name,
  });

  await Notification.create({
    company_id: req.company_id,
    user_email: user.email,
    title: 'Added to Group',
    message: `${req.user.full_name} added you to "${group.group_name}"`,
    type: 'added_to_group',
    related_id: group._id.toString(),
  });

  res.status(201).json(member);
});

// @desc    Remove member (or leave group)
// @route   DELETE /api/group-members/:id
// @access  Private
export const removeGroupMember = asyncHandler(async (req, res) => {
  const member = await GroupMember.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const requester = await GroupMember.findOne({
    company_id: req.company_id,
    group_id: member.group_id,
    user_id: req.user._id,
  });

  const isSelf = member.user_id.toString() === req.user._id.toString();
  const canRemove =
    req.user.role === 'admin' ||
    (requester && requester.role === 'admin') ||
    isSelf;

  if (!canRemove) return res.status(403).json({ error: 'Access denied' });

  await member.deleteOne();

  if (!isSelf) {
    await Notification.create({
      company_id: req.company_id,
      user_email: member.user_email,
      title: 'Removed from Group',
      message: `You were removed from "${member.group_name}"`,
      type: 'removed_from_group',
      related_id: member.group_id.toString(),
    });
  }

  res.json({ message: 'Member removed' });
});

// @desc    Update member role
// @route   PUT /api/group-members/:id
// @access  Private (admin)
export const updateGroupMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const member = await GroupMember.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const requester = await GroupMember.findOne({
    company_id: req.company_id,
    group_id: member.group_id,
    user_id: req.user._id,
  });
  const canEdit =
    req.user.role === 'admin' || (requester && requester.role === 'admin');
  if (!canEdit) return res.status(403).json({ error: 'Access denied' });

  member.role = role;
  await member.save();
  res.json(member);
});
