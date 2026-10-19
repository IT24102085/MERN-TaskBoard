const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project.js');
const Task = require('../models/Task.js');
const authMiddleware = require('../middleware/authMiddleware.js');

const router = express.Router();
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateQuery(value, fieldName) {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${fieldName} must use the YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} is invalid`);
  }

  return date;
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addUtcDay(date) {
  const nextDay = new Date(date);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay;
}

router.get('/', authMiddleware, async (req, res) => {
  let fromDate;
  let toDate;

  try {
    fromDate = parseDateQuery(req.query.from, 'from');
    toDate = parseDateQuery(req.query.to, 'to');
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: 'from must be before or equal to to' });
  }

  const projectId = req.query.projectId;
  if (projectId !== undefined && (typeof projectId !== 'string' || !mongoose.isValidObjectId(projectId))) {
    return res.status(400).json({ message: 'Invalid project ID' });
  }

  try {
    const projects = await Project.find({ owner: req.user._id })
      .select('_id name status')
      .sort({ createdAt: -1 })
      .lean();
    const ownedProjectIds = projects.map(project => project._id);

    if (projectId && !projects.some(project => String(project._id) === projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const taskQuery = {
      project: projectId ? projectId : { $in: ownedProjectIds }
    };
    const createdAt = {};

    if (fromDate) {
      createdAt.$gte = fromDate;
    }

    if (toDate) {
      createdAt.$lt = addUtcDay(toDate);
    }

    if (Object.keys(createdAt).length > 0) {
      taskQuery.createdAt = createdAt;
    }

    const tasks = await Task.find(taskQuery)
      .select('title project assignedTo status priority dueDate createdAt')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    const projectMap = new Map(projects.map(project => [String(project._id), project]));
    const statusCounts = { todo: 0, 'in-progress': 0, done: 0 };
    const priorityCounts = { low: 0, medium: 0, high: 0 };
    const projectStats = new Map();

    projects
      .filter(project => !projectId || String(project._id) === projectId)
      .forEach(project => {
        projectStats.set(String(project._id), {
          id: project._id,
          name: project.name,
          status: project.status,
          totalTasks: 0,
          completedTasks: 0,
          completionPercentage: 0
        });
      });

    const todayStart = startOfTodayUtc();
    let completedTasks = 0;
    let overdueTasks = 0;

    const records = tasks.map(task => {
      const project = projectMap.get(String(task.project));
      const projectStat = projectStats.get(String(task.project));

      if (statusCounts[task.status] !== undefined) {
        statusCounts[task.status] += 1;
      }

      if (priorityCounts[task.priority] !== undefined) {
        priorityCounts[task.priority] += 1;
      }

      if (task.status === 'done') {
        completedTasks += 1;
      }

      if (task.dueDate && task.status !== 'done' && new Date(task.dueDate) < todayStart) {
        overdueTasks += 1;
      }

      if (projectStat) {
        projectStat.totalTasks += 1;
        if (task.status === 'done') {
          projectStat.completedTasks += 1;
        }
      }

      return {
        id: task._id,
        title: task.title,
        project: project?._id || task.project,
        projectName: project?.name || 'Unknown project',
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo?._id || null,
        assigneeName: task.assignedTo?.name || task.assignedTo?.email || 'Unassigned',
        dueDate: task.dueDate || null,
        createdAt: task.createdAt
      };
    });

    const projectProgress = Array.from(projectStats.values()).map(project => ({
      ...project,
      completionPercentage: project.totalTasks === 0
        ? 0
        : Math.round((project.completedTasks / project.totalTasks) * 100)
    }));
    const totalTasks = tasks.length;

    return res.json({
      filters: {
        dateField: 'createdAt',
        from: req.query.from || null,
        to: req.query.to || null,
        projectId: projectId || null
      },
      metrics: {
        totalTasks,
        completedTasks,
        todoTasks: statusCounts.todo,
        inProgressTasks: statusCounts['in-progress'],
        overdueTasks,
        completionPercentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
      },
      byStatus: statusCounts,
      byPriority: priorityCounts,
      projects: projectProgress,
      records
    });
  } catch (error) {
    console.error('Analytics fetch failed:', error.message);
    return res.status(500).json({ message: 'Failed to generate analytics' });
  }
});

module.exports = router;
