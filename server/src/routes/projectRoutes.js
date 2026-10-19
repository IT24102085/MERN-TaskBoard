const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project.js');
const Task = require('../models/Task.js');
const Notification = require('../models/Notification.js');
const authMiddleware = require('../middleware/authMiddleware.js');
const { createNotificationSafely } = require('../services/notificationService.js');

const router = express.Router();
const PROJECT_STATUSES = ['active', 'completed', 'on-hold'];

function isValidationError(error) {
  return error?.name === 'ValidationError' || error?.name === 'CastError';
}

function isValidStatus(status) {
  return PROJECT_STATUSES.includes(status);
}

function supportsTransactions() {
  const topologyType = mongoose.connection.getClient()?.topology?.description?.type;
  return ['ReplicaSetWithPrimary', 'ReplicaSetNoPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
}

async function deleteProjectWithTransaction(projectId, ownerId) {
  const session = await mongoose.startSession();
  let projectFound = false;

  try {
    await session.withTransaction(async () => {
      const project = await Project.findOne({
        _id: projectId,
        owner: ownerId
      }).session(session);

      if (!project) {
        return;
      }

      projectFound = true;
      const taskIds = await Task.find({ project: project._id })
        .select('_id')
        .session(session)
        .lean();
      await Notification.deleteMany({
        recipient: ownerId,
        relatedTask: { $in: taskIds.map(task => task._id) }
      }).session(session);
      await Task.deleteMany({ project: project._id }).session(session);
      await Project.deleteOne({ _id: project._id, owner: ownerId }).session(session);
    });

    return projectFound;
  } finally {
    await session.endSession();
  }
}

async function deleteProjectWithoutTransaction(projectId, ownerId) {
  const project = await Project.findOne({
    _id: projectId,
    owner: ownerId
  });

  if (!project) {
    return false;
  }

  // On standalone MongoDB, clean up tasks first so a failed cleanup never leaves
  // orphaned tasks pointing to a deleted project. A later retry can finish cleanup.
  const taskIds = await Task.find({ project: project._id }).select('_id').lean();
  await Notification.deleteMany({
    recipient: ownerId,
    relatedTask: { $in: taskIds.map(task => task._id) }
  });
  await Task.deleteMany({ project: project._id });
  const deletion = await Project.deleteOne({ _id: project._id, owner: ownerId });

  if (deletion.deletedCount !== 1) {
    throw new Error('Project deletion did not complete');
  }

  return true;
}

function validateProjectFields({ name, description, status }, { requireName = false } = {}) {
  if (requireName && (typeof name !== 'string' || !name.trim())) {
    return 'Project name is required';
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return 'Project name cannot be empty';
  }

  if (name !== undefined && name.trim().length > 200) {
    return 'Project name must be 200 characters or fewer';
  }

  if (description !== undefined && typeof description !== 'string') {
    return 'Project description must be text';
  }

  if (description !== undefined && description.length > 2000) {
    return 'Project description must be 2000 characters or fewer';
  }

  if (status !== undefined && !isValidStatus(status)) {
    return 'Project status is invalid';
  }

  return null;
}

// Create a project
router.post('/', authMiddleware, async (req, res) => {
  const { name, description, status } = req.body || {};
  const projectStatus = status === undefined ? 'active' : status;
  const validationMessage = validateProjectFields(
    { name, description, status: projectStatus },
    { requireName: true }
  );

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    const project = await Project.create({
      name: name.trim(),
      description: description || '',
      status: projectStatus,
      owner: req.user._id
    });

    await createNotificationSafely({
      recipient: req.user._id,
      type: 'project-created',
      title: 'Project Created',
      message: `Your project '${project.name}' was created successfully.`,
      dedupeKey: `event:project-created:${project._id}`
    });

    return res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({ message: 'Project data is invalid' });
    }

    console.error('Project creation failed:', error.message);
    return res.status(500).json({ message: 'Failed to create project' });
  }
});

// Get all projects owned by the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.json({ projects });
  } catch (error) {
    console.error('Project fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get one project owned by the authenticated user
router.get('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json({ project });
  } catch (error) {
    console.error('Project lookup failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Update a project owned by the authenticated user
router.put('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  const { name, description, status } = req.body || {};
  const validationMessage = validateProjectFields({ name, description, status });

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  const updates = {};

  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'At least one project field is required' });
  }

  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await createNotificationSafely({
      recipient: req.user._id,
      type: 'project-updated',
      title: 'Project Updated',
      message: `Your project '${project.name}' was updated successfully.`,
      dedupeKey: `event:project-updated:${project._id}:${project.updatedAt?.toISOString?.() || project.updatedAt}`
    });

    return res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({ message: 'Project data is invalid' });
    }

    console.error('Project update failed:', error.message);
    return res.status(500).json({ message: 'Failed to update project' });
  }
});

// Delete a project owned by the authenticated user and its associated tasks
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id
    }).select('name');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const deleted = supportsTransactions()
      ? await deleteProjectWithTransaction(req.params.id, req.user._id)
      : await deleteProjectWithoutTransaction(req.params.id, req.user._id);

    if (!deleted) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await createNotificationSafely({
      recipient: req.user._id,
      type: 'project-deleted',
      title: 'Project Deleted',
      message: `Your project '${project.name}' was deleted successfully.`,
      dedupeKey: `event:project-deleted:${project._id}`
    });

    return res.json({
      message: 'Project and its tasks deleted successfully'
    });
  } catch (error) {
    console.error('Project deletion failed:', error.message);
    return res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
