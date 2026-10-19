const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification.js');
const Project = require('../models/Project.js');
const Task = require('../models/Task.js');
const authMiddleware = require('../middleware/authMiddleware.js');

const router = express.Router();

function isValidationError(error) {
  return error?.name === 'ValidationError' || error?.name === 'CastError';
}

function utcDateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function currentUtcDateKey() {
  return new Date().toISOString().slice(0, 10);
}

async function syncTaskReminders(userId) {
  const projects = await Project.find({ owner: userId }).select('_id').lean();
  const projectIds = projects.map(project => project._id);

  if (projectIds.length === 0) {
    return;
  }

  const tasks = await Task.find({
    project: { $in: projectIds },
    dueDate: { $ne: null },
    status: { $ne: 'done' }
  }).select('_id title dueDate').lean();

  const todayKey = currentUtcDateKey();

  for (const task of tasks) {
    const dueDateKey = utcDateKey(task.dueDate);

    if (!dueDateKey || dueDateKey > todayKey) {
      continue;
    }

    const isDueToday = dueDateKey === todayKey;
    const type = isDueToday ? 'due-today' : 'overdue';
    const title = isDueToday ? 'Task due today' : 'Overdue task';
    const message = isDueToday
      ? `"${task.title}" is due today.`
      : `"${task.title}" is overdue.`;
    const reminderKey = `${userId}:${type}:${task._id}:${dueDateKey}`;

    try {
      await Notification.updateOne(
        { recipient: userId, reminderKey },
        {
          $set: {
            type,
            title,
            message,
            relatedTask: task._id
          },
          $setOnInsert: {
            recipient: userId,
            reminderKey,
            read: false
          }
        },
        { upsert: true }
      );
    } catch (error) {
      // A concurrent request may have inserted the same unique reminder.
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }
}

async function getNotifications(userId) {
  await syncTaskReminders(userId);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Notification.countDocuments({ recipient: userId, read: false })
  ]);

  return { notifications, unreadCount };
}

// Retrieve the authenticated user's notifications and refresh due-date reminders.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const data = await getNotifications(req.user._id);
    return res.json(data);
  } catch (error) {
    console.error('Notification fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Retrieve the authenticated user's unread count.
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    await syncTaskReminders(req.user._id);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    });

    return res.json({ unreadCount });
  } catch (error) {
    console.error('Unread notification count failed:', error.message);
    return res.status(500).json({ message: 'Failed to fetch unread notification count' });
  }
});

// Mark all notifications belonging to the authenticated user as read.
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark-all notifications failed:', error.message);
    return res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
});

// Mark one notification as read only when it belongs to the authenticated user.
router.patch('/:id/read', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true, runValidators: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ notification });
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({ message: 'Notification data is invalid' });
    }

    console.error('Notification update failed:', error.message);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Delete one notification only when it belongs to the authenticated user.
router.delete('/:id', authMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    const deletion = await Notification.deleteOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (deletion.deletedCount !== 1) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Notification deletion failed:', error.message);
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;
