import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Create project
// @route   POST /api/projects
export const createProject = asyncHandler(async (req, res) => {
  const {
    project_name,
    description,
    priority,
    start_date,
    end_date,
    color,
    enabled_columns,
    members = [],
  } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const project = await Project.create({
    company_id: req.company_id,
    project_name,
    description: description || '',
    created_by: req.user._id,
    created_by_name: req.user.full_name,
    priority: priority || 'medium',
    start_date,
    end_date,
    color: color || '#3B82F6',
    enabled_columns: Array.isArray(enabled_columns) && enabled_columns.length
      ? enabled_columns
      : ['owner', 'status', 'due_date', 'priority', 'notes'],
  });

  // Creator auto-added as owner
  await ProjectMember.create({
    company_id: req.company_id,
    project_id: project._id,
    project_name: project.project_name,
    user_id: req.user._id,
    user_email: req.user.email,
    user_name: req.user.full_name,
    role: 'owner',
  });

  // Additional members
  if (members.length) {
    const memberIds = members
      .filter((m) => m.user_email !== req.user.email)
      .map((m) => m.user_id)
      .filter(Boolean);
    const companyUsers = await User.find({
      company_id: req.company_id,
      _id: { $in: memberIds },
    }).select('_id email full_name');
    const companyUserById = new Map(companyUsers.map((u) => [u._id.toString(), u]));

    const memberDocs = members
      .filter((m) => m.user_email !== req.user.email) // don't duplicate creator
      .filter((m) => companyUserById.has(String(m.user_id)))
      .map((m) => ({
        company_id: req.company_id,
        project_id: project._id,
        project_name: project.project_name,
        user_id: companyUserById.get(String(m.user_id))._id,
        user_email: companyUserById.get(String(m.user_id)).email,
        user_name: companyUserById.get(String(m.user_id)).full_name,
        role: m.role || 'member',
      }));
    if (memberDocs.length) {
      await ProjectMember.insertMany(memberDocs);

      await Notification.insertMany(
        memberDocs.map((m) => ({
          company_id: req.company_id,
          user_email: m.user_email,
          title: 'Added to Project',
          message: `You've been added to "${project.project_name}"`,
          type: 'project_assigned',
          related_id: project._id.toString(),
        }))
      );
    }
  }

  res.status(201).json(project);
});

// @desc    Get all projects
// @route   GET /api/projects
export const getAllProjects = asyncHandler(async (req, res) => {
  const { is_archived, status, sort = '-createdAt' } = req.query;

  const filter = { company_id: req.company_id };
  if (is_archived !== undefined) filter.is_archived = is_archived === 'true';
  if (status) filter.status = status;

  // Non-admin: restrict to member projects
  if (req.user.role !== 'admin') {
    const memberships = await ProjectMember.find({
      company_id: req.company_id,
      user_id: req.user._id,
    }).select('project_id');
    filter._id = { $in: memberships.map((m) => m.project_id) };
  }

  const projects = await Project.find(filter).sort(sort);
  res.json(projects);
});

// @desc    Filter projects (base44 pattern)
// @route   GET /api/projects/filter
export const filterProjects = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  // Convert boolean strings
  if (filter.is_archived !== undefined) {
    filter.is_archived = filter.is_archived === 'true';
  }

  // Non-admin: restrict to member projects
  if (req.user.role !== 'admin') {
    const memberships = await ProjectMember.find({
      company_id: req.company_id,
      user_id: req.user._id,
    }).select('project_id');
    const memberProjectIds = memberships.map((m) => m.project_id.toString());

    if (filter._id) {
      // Specific project requested — check membership
      const requestedId = filter._id.toString();
      if (!memberProjectIds.includes(requestedId)) {
        return res.json([]);
      }
    } else {
      filter._id = { $in: memberProjectIds };
    }
  }

  const projects = await Project.find(filter)
    .sort(req.query.sort || '-createdAt')
    .limit(parseInt(req.query.limit) || 100);

  res.json(projects);
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin') {
    const isMember = await ProjectMember.findOne({
      project_id: project._id,
      company_id: req.company_id,
      user_id: req.user._id,
    });
    if (!isMember) return res.status(403).json({ error: 'Access denied' });
  }

  res.json(project);
});

// @desc    Update project
// @route   PUT /api/projects/:id
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const member = await ProjectMember.findOne({
    project_id: project._id,
    company_id: req.company_id,
    user_id: req.user._id,
  });
  const isCreator = project.created_by.toString() === req.user._id.toString();
  const canEdit =
    req.user.role === 'admin' ||
    isCreator ||
    (member && ['owner', 'admin'].includes(member.role));

  if (!canEdit) return res.status(403).json({ error: 'Access denied' });

  const allowedFields = [
    'project_name', 'description', 'status', 'priority',
    'start_date', 'end_date', 'is_archived', 'color',
    'notes', 'enabled_columns',
  ];
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) project[f] = req.body[f];
  });

  await project.save();

  // Keep project_name denormalized on ProjectMember up-to-date
  if (req.body.project_name) {
    await ProjectMember.updateMany(
      { company_id: req.company_id, project_id: project._id },
      { project_name: project.project_name }
    );
  }

  res.json(project);
});

// @desc    Delete project (cascades tasks + members)
// @route   DELETE /api/projects/:id
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const member = await ProjectMember.findOne({
    project_id: project._id,
    company_id: req.company_id,
    user_id: req.user._id,
  });
  const isCreator = project.created_by.toString() === req.user._id.toString();
  const canDelete =
    req.user.role === 'admin' ||
    isCreator ||
    (member && member.role === 'owner');

  if (!canDelete) return res.status(403).json({ error: 'Access denied' });

  // Cascade delete — backend handles everything
  await Task.deleteMany({ company_id: req.company_id, project_id: project._id });
  await ProjectMember.deleteMany({ company_id: req.company_id, project_id: project._id });
  await project.deleteOne();

  res.json({ message: 'Project and all related data deleted' });
});

// @desc    Archive/unarchive project
// @route   PATCH /api/projects/:id/archive
export const toggleArchive = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const member = await ProjectMember.findOne({
    company_id: req.company_id,
    project_id: project._id,
    user_id: req.user._id,
  });
  const isCreator = project.created_by.toString() === req.user._id.toString();
  const canEdit =
    req.user.role === 'admin' ||
    isCreator ||
    (member && ['owner', 'admin'].includes(member.role));

  if (!canEdit) return res.status(403).json({ error: 'Access denied' });

  project.is_archived = !project.is_archived;
  await project.save();

  res.json(project);
});
