import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Helper: check if user is member of project
const checkMembership = async (companyId, userId, projectId, userRole) => {
  if (userRole === 'admin') return true;
  const member = await ProjectMember.findOne({
    company_id: companyId,
    project_id: projectId,
    user_id: userId,
  });
  return !!member;
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
export const createTask = asyncHandler(async (req, res) => {
  const { project_id, task_name, description, status, priority, assigned_to, due_date, position } = req.body;

  if (!project_id || !task_name) {
    return res.status(400).json({ error: 'project_id and task_name required' });
  }

  // Check project exists & user is member
  const project = await Project.findOne({ _id: project_id, company_id: req.company_id });
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const isMember = await checkMembership(req.company_id, req.user._id, project_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Not a project member' });

  // Auto-set position (last)
  let finalPosition = position;
  if (finalPosition === undefined) {
    const lastTask = await Task.findOne({ company_id: req.company_id, project_id }).sort('-position');
    finalPosition = lastTask ? lastTask.position + 1 : 0;
  }

  const taskData = {
    company_id: req.company_id,
    project_id,
    task_name,
    description: description || '',
    status: status || 'todo',
    priority: priority || 'medium',
    due_date,
    position: finalPosition,
    created_by: req.user._id,
  };

  // Assignment details
  if (assigned_to) {
    // Membership-based: a task can be assigned to any team member regardless
    // of which workspace they're currently active in.
    const assignee = await User.findOne({ _id: assigned_to, "workspaces.company_id": req.company_id });
    if (assignee) {
      taskData.assigned_to = assignee._id;
      taskData.assigned_to_email = assignee.email;
      taskData.assigned_to_name = assignee.full_name;
    }
  }

  const task = await Task.create(taskData);

  // Notify assignee
  if (task.assigned_to_email && task.assigned_to_email !== req.user.email) {
    await Notification.create({
      company_id: req.company_id,
      user_email: task.assigned_to_email,
      title: 'New Task Assigned',
      message: `"${task.task_name}" in project "${project.project_name}"`,
      type: 'task_assigned',
      related_id: task._id.toString(),
    });
  }

  res.status(201).json(task);
});

// @desc    Get tasks (usually filtered by project_id)
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const { project_id, status, assigned_to, priority, sort = 'position' } = req.query;

  const filter = { company_id: req.company_id };
  if (project_id) filter.project_id = project_id;
  if (status) filter.status = status;
  if (assigned_to) filter.assigned_to = assigned_to;
  if (priority) filter.priority = priority;

  // If filtering by project — verify membership
  if (project_id && req.user.role !== 'admin') {
    const isMember = await checkMembership(req.company_id, req.user._id, project_id, req.user.role);
    if (!isMember) return res.status(403).json({ error: 'Not a project member' });
  }

  // Without project_id, restrict to user's tasks
  if (!project_id && req.user.role !== 'admin') {
    const memberships = await ProjectMember.find({
      company_id: req.company_id,
      user_id: req.user._id,
    }).select('project_id');
    filter.project_id = { $in: memberships.map((m) => m.project_id) };
  }

  const tasks = await Task.find(filter).sort(sort);
  res.json(tasks);
});

// @desc    Filter tasks (base44 pattern)
// @route   GET /api/tasks/filter
// @access  Private
export const filterTasks = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  delete filter.company_id;
  filter.company_id = req.company_id;
  delete filter.sort;
  delete filter.limit;

  const tasks = await Task.find(filter)
    .sort(req.query.sort || 'position')
    .limit(parseInt(req.query.limit) || 500);

  res.json(tasks);
});

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isMember = await checkMembership(req.company_id, req.user._id, task.project_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });

  res.json(task);
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isMember = await checkMembership(req.company_id, req.user._id, task.project_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });

  const allowedFields = [
    'task_name', 'description', 'status', 'priority',
    'assigned_to', 'assigned_to_email', 'assigned_to_name',
    'due_date', 'position',
  ];
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) task[f] = req.body[f];
  });

  if (req.body.assigned_to) {
    const assignee = await User.findOne({
      _id: req.body.assigned_to,
      company_id: req.company_id,
    });
    if (!assignee) return res.status(404).json({ error: 'Assignee not found in this company' });
    task.assigned_to = assignee._id;
    task.assigned_to_email = assignee.email;
    task.assigned_to_name = assignee.full_name;
  }

  // Auto-set completed_at
  if (req.body.status === 'done' && !task.completed_at) {
    task.completed_at = new Date();
  } else if (req.body.status && req.body.status !== 'done') {
    task.completed_at = null;
  }

  await task.save();

  // Notify new assignee
  if (req.body.assigned_to_email && req.body.assigned_to_email !== req.user.email) {
    await Notification.create({
      company_id: req.company_id,
      user_email: req.body.assigned_to_email,
      title: 'Task Assigned to You',
      message: `"${task.task_name}"`,
      type: 'task_assigned',
      related_id: task._id.toString(),
    });
  }

  res.json(task);
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, company_id: req.company_id });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isMember = await checkMembership(req.company_id, req.user._id, task.project_id, req.user.role);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });

  await task.deleteOne();
  res.json({ message: 'Task deleted' });
});

// @desc    Reorder tasks (drag & drop)
// @route   PUT /api/tasks/reorder
// @access  Private
// @body    { tasks: [{ id, position, status? }] }
export const reorderTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'tasks must be an array' });
  }

  // Bulk update
  const ops = tasks.map((t) => ({
    updateOne: {
      filter: { _id: t.id, company_id: req.company_id },
      update: {
        position: t.position,
        ...(t.status && { status: t.status }),
      },
    },
  }));

  await Task.bulkWrite(ops);
  res.json({ message: 'Tasks reordered', updated: tasks.length });
});
