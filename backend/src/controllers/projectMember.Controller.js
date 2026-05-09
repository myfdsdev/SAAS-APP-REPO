import ProjectMember from '../models/ProjectMember.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Get project members
// @route   GET /api/project-members?project_id=xxx
// @access  Private
export const getProjectMembers = asyncHandler(async (req, res) => {
  const { project_id, user_id } = req.query;
  const filter = { company_id: req.company_id };
  if (project_id) filter.project_id = project_id;
  if (user_id) filter.user_id = user_id;

  const members = await ProjectMember.find(filter).sort('-createdAt');
  res.json(members);
});

// @desc    Filter project members (base44 pattern)
// @route   GET /api/project-members/filter
// @access  Private
export const filterProjectMembers = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const members = await ProjectMember.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 500);

  res.json(members);
});

// @desc    Add member to project
// @route   POST /api/project-members
// @access  Private (owner/admin)
export const addProjectMember = asyncHandler(async (req, res) => {
  const { project_id, user_id, role = 'member' } = req.body;

  if (!project_id || !user_id) {
    return res.status(400).json({ error: 'project_id and user_id required' });
  }

  const project = await Project.findOne({ _id: project_id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Membership-based — admins can add any team member to a project, regardless
  // of which workspace they're currently active in.
  const user = await User.findOne({ _id: user_id, "workspaces.company_id": req.company_id });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Permission check
  const requester = await ProjectMember.findOne({
    company_id: req.company_id,
    project_id,
    user_id: req.user._id,
  });
  const canAdd =
    req.user.role === 'admin' ||
    (requester && ['owner', 'admin'].includes(requester.role));
  if (!canAdd) return res.status(403).json({ error: 'Access denied' });

  // Prevent duplicates
  const existing = await ProjectMember.findOne({ company_id: req.company_id, project_id, user_id });
  if (existing) {
    return res.status(400).json({ error: 'User already a member' });
  }

  const member = await ProjectMember.create({
    company_id: req.company_id,
    project_id,
    project_name: project.project_name,
    user_id: user._id,
    user_email: user.email,
    user_name: user.full_name,
    role,
  });

  // Notify the new member
  await Notification.create({
    company_id: req.company_id,
    user_email: user.email,
    title: 'Added to Project',
    message: `You've been added to "${project.project_name}" by ${req.user.full_name}`,
    type: 'project_assigned',
    related_id: project._id.toString(),
  });

  res.status(201).json(member);
});

// @desc    Remove member from project
// @route   DELETE /api/project-members/:id
// @access  Private (owner/admin)
export const removeProjectMember = asyncHandler(async (req, res) => {
  const member = await ProjectMember.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  // Can't remove the owner
  if (member.role === 'owner') {
    return res.status(400).json({ error: 'Cannot remove project owner' });
  }

  const requester = await ProjectMember.findOne({
    company_id: req.company_id,
    project_id: member.project_id,
    user_id: req.user._id,
  });
  const canRemove =
    req.user.role === 'admin' ||
    (requester && ['owner', 'admin'].includes(requester.role)) ||
    member.user_id.toString() === req.user._id.toString(); // user can remove self

  if (!canRemove) return res.status(403).json({ error: 'Access denied' });

  await member.deleteOne();
  res.json({ message: 'Member removed' });
});

// @desc    Update member role
// @route   PUT /api/project-members/:id
// @access  Private (owner/admin)
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const member = await ProjectMember.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const requester = await ProjectMember.findOne({
    company_id: req.company_id,
    project_id: member.project_id,
    user_id: req.user._id,
  });
  const canEdit =
    req.user.role === 'admin' ||
    (requester && requester.role === 'owner');

  if (!canEdit) return res.status(403).json({ error: 'Access denied' });

  member.role = role;
  await member.save();

  res.json(member);
});
