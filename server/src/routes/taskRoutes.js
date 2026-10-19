const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task.js');
const Project = require('../models/Project.js');
const User = require('../models/User.js');
const Notification = require('../models/Notification.js');
const authMiddleware = require('../middleware/authMiddleware.js');
const { createNotificationSafely } = require('../services/notificationService.js');

const router = express.Router();
const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['todo', 'in-progress', 'done'];

function isValidationError(error) {
  return error?.name === 'ValidationError' || error?.name === 'CastError';
}

async function resolveAssignee(assignedTo, ownerId) {
  if (assignedTo === undefined || assignedTo === null || assignedTo === '') {
    return { user: null };
  }

  const user = await User.findById(assignedTo).select('_id name email');

  if (!user) {
    return { error: 'Assignee not found', status: 404 };
  }

  if (String(user._id) !== String(ownerId)) {
    return {
      error: 'This user is not eligible for tasks in your projects',
      status: 403
    };
  }

  return { user };
}

function normalizeDueDate(value) {
  if (value === undefined || value === null || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Due date must use the YYYY-MM-DD format' };
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return { error: 'Due date is invalid' };
  }

  return { value: date };
}

function validateTaskFields({ title, description, project, assignedTo, priority, status, dueDate }, { requireTitleAndProject = false } = {}) {
  if (requireTitleAndProject && (typeof title !== 'string' || !title.trim() || !project)) {
    return 'Task title and project are required';
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return 'Task title cannot be empty';
  }

  if (title !== undefined && title.trim().length > 200) {
    return 'Task title must be 200 characters or fewer';
  }

  if (description !== undefined && typeof description !== 'string') {
    return 'Task description must be text';
  }

  if (description !== undefined && description.length > 5000) {
    return 'Task description must be 5000 characters or fewer';
  }

  if (project !== undefined && !mongoose.isValidObjectId(project)) {
    return 'Invalid project ID';
  }

  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== '' && !mongoose.isValidObjectId(assignedTo)) {
    return 'Invalid assignee ID';
  }

  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) {
    return 'Task priority is invalid';
  }

  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    return 'Task status is invalid';
  }

  const dueDateResult = normalizeDueDate(dueDate);
  if (dueDateResult.error) {
    return dueDateResult.error;
  }

  return null;
}

// Create a task in a project owned by the authenticated user
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, project, assignedTo, priority, status, dueDate } = req.body || {};
  const validationMessage = validateTaskFields(
    { title, description, project, assignedTo, priority, status, dueDate },
    { requireTitleAndProject: true }
  );

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  const normalizedDueDate = normalizeDueDate(dueDate).value;

  try {
    const projectExists = await Project.findOne({
      _id: project,
      owner: req.user._id
    });

    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const assigneeResult = await resolveAssignee(assignedTo, req.user._id);
    if (assigneeResult.error) {
      return res.status(assigneeResult.status).json({ message: assigneeResult.error });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      project,
      assignedTo: assigneeResult.user?._id || null,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate: normalizedDueDate,
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email');

    await createNotificationSafely({
      recipient: req.user._id,
      type: 'task-created',
      title: 'Task Created',
      message: `Your task '${task.title}' was created successfully.`,
      relatedTask: task._id,
      dedupeKey: `event:task-created:${task._id}`
    });

    if (assigneeResult.user) {
      await createNotificationSafely({
        recipient: assigneeResult.user._id,
        type: 'task-assigned',
        title: 'Task Assigned',
        message: `You were assigned to the task '${task.title}'.`,
        relatedTask: task._id,
        dedupeKey: `event:task-assigned:${task._id}:${assigneeResult.user._id}`
      });
    }

    return res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({ message: 'Task data is invalid' });
    }

    console.error('Task creation failed:', error.message);
    return res.status(500).json({ message: 'Failed to create task' });
  }
});

// Get tasks only from projects owned by the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).select('_id');
    const projectIds = projects.map(item => item._id);
    const tasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return res.json({ tasks });
  } catch (error) {
    console.error('Task fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get one task only when its project belongs to the authenticated user
router.get('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }

  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email');

    if (!task || !task.project) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectExists = await Project.findOne({
      _id: task.project._id,
      owner: req.user._id
    });

    if (!projectExists) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ task });
  } catch (error) {
    console.error('Task lookup failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Update a task only when its project belongs to the authenticated user
router.put('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }

  const body = req.body || {};
  const { title, description, assignedTo, priority, status, dueDate } = body;
  const validationMessage = validateTaskFields({ title, description, assignedTo, priority, status, dueDate });

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectExists = await Project.findOne({
      _id: task.project,
      owner: req.user._id
    });

    if (!projectExists) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const wasDone = task.status === 'done';
    const previousAssigneeId = task.assignedTo ? String(task.assignedTo) : null;
    const assigneeWasProvided = Object.prototype.hasOwnProperty.call(body, 'assignedTo');
    let assigneeResult = { user: null };

    if (assigneeWasProvided) {
      assigneeResult = await resolveAssignee(assignedTo, req.user._id);
      if (assigneeResult.error) {
        return res.status(assigneeResult.status).json({ message: assigneeResult.error });
      }
    }

    const allowedFields = ['title', 'description', 'priority', 'status', 'dueDate'];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        task[field] = field === 'title'
          ? body[field].trim()
          : field === 'dueDate'
            ? normalizeDueDate(body[field]).value
            : body[field];
      }
    });

    if (assigneeWasProvided) {
      task.assignedTo = assigneeResult.user?._id || null;
    }

    if (body.status !== undefined || body.dueDate !== undefined) {
      await Notification.deleteMany({
        recipient: req.user._id,
        relatedTask: task._id,
        type: { $in: ['due-today', 'overdue'] }
      });
    }

    await task.save();

    await task.populate('assignedTo', 'name email');

    const updateVersion = task.updatedAt?.toISOString?.() || task.updatedAt;
    await createNotificationSafely({
      recipient: req.user._id,
      type: 'task-updated',
      title: 'Task Updated',
      message: `Your task '${task.title}' was updated successfully.`,
      relatedTask: task._id,
      dedupeKey: `event:task-updated:${task._id}:${updateVersion}`
    });

    if (!wasDone && task.status === 'done') {
      await createNotificationSafely({
        recipient: req.user._id,
        type: 'task-completed',
        title: 'Task Completed',
        message: `Your task '${task.title}' was completed successfully.`,
        relatedTask: task._id,
        dedupeKey: `event:task-completed:${task._id}:${updateVersion}`
      });
    }

    const currentAssigneeId = task.assignedTo ? String(task.assignedTo._id || task.assignedTo) : null;
    if (assigneeWasProvided && currentAssigneeId !== previousAssigneeId && task.assignedTo) {
      await createNotificationSafely({
        recipient: task.assignedTo._id || task.assignedTo,
        type: 'task-assigned',
        title: 'Task Assigned',
        message: `You were assigned to the task '${task.title}'.`,
        relatedTask: task._id,
        dedupeKey: `event:task-assigned:${task._id}:${currentAssigneeId}:${updateVersion}`
      });
    }

    return res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({ message: 'Task data is invalid' });
    }

    console.error('Task update failed:', error.message);
    return res.status(500).json({ message: 'Failed to update task' });
  }
});

// Delete a task only when its project belongs to the authenticated user
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid task ID' });
  }

  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const projectExists = await Project.findOne({
      _id: task.project,
      owner: req.user._id
    });

    if (!projectExists) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Notification.deleteMany({
      recipient: req.user._id,
      relatedTask: task._id
    });
    await task.deleteOne();

    await createNotificationSafely({
      recipient: req.user._id,
      type: 'task-deleted',
      title: 'Task Deleted',
      message: `Your task '${task.title}' was deleted successfully.`,
      relatedTask: task._id,
      dedupeKey: `event:task-deleted:${task._id}`
    });

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Task deletion failed:', error.message);
    return res.status(500).json({ message: 'Failed to delete task' });
  }
});

module.exports = router;
