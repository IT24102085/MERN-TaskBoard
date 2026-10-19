import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'tasks', label: 'My Tasks', icon: 'check' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

const PAGE_META = {
  dashboard: {
    title: 'Dashboard',
    eyebrow: 'Workspace overview',
    description: 'A clear view of your projects and team progress.'
  },
  analytics: {
    title: 'Analytics',
    eyebrow: 'Performance reports',
    description: 'Understand progress across your tasks and projects.'
  },
  projects: {
    title: 'Projects',
    eyebrow: 'Your workspace',
    description: 'Organize your work into focused project spaces.'
  },
  'project-details': {
    title: 'Project details',
    eyebrow: 'Project workspace',
    description: 'Review project progress and focus on the tasks that belong here.'
  },
  tasks: {
    title: 'My Tasks',
    eyebrow: 'Execution center',
    description: 'Plan, prioritize, and finish your most important work.'
  },
  settings: {
    title: 'Settings',
    eyebrow: 'Account preferences',
    description: 'Manage your TaskBoard session and account details.'
  }
};

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" /><path d="M3.5 9h17" /></>,
    check: <><path d="M5 12.5 9.2 17 19 6.5" /><path d="M4 4h4M16 4h4M4 20h4M16 20h4" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1A1.8 1.8 0 0 0 3.3 12a1.8 1.8 0 0 0-1.6-1.8 1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1A1.8 1.8 0 0 0 8.8 1.7a1.8 1.8 0 0 0 1.8-1.6 1.8 1.8 0 0 1 3.6 0 1.8 1.8 0 0 0 1.8 1.6 1.8 1.8 0 0 0 1.3-.7l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1A1.8 1.8 0 0 0 18.5 7c0 1 .7 1.8 1.6 1.8h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.7 3.6Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    trend: <><path d="m4 16 5-5 3 3 7-8" /><path d="M14 6h5v5" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="M8 16v-5M12 16V8M16 16V6" /></>,
    activity: <><path d="M3 12h4l2.2-6 4.2 12 2.2-6H21" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9.5h18" /></>,
    logout: <><path d="M10 17 15 12 10 7M15 12H3" /><path d="M14 4h3a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-3" /></>,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5z" /><path d="m13.5 7 3.5 3.5" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    chevron: <path d="m9 18 6-6-6-6" />
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function readStoredUser() {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
}

function formatStatus(value) {
  return value === 'in-progress' ? 'In progress' : value === 'todo' ? 'To do' : value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown';
}

function statusClass(value) {
  return String(value || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

function assigneeIdOf(task) {
  if (typeof task?.assignedTo === 'object') {
    return task.assignedTo?._id || '';
  }

  return task?.assignedTo || '';
}

function assigneeNameOf(task) {
  if (typeof task?.assignedTo === 'object') {
    return task.assignedTo?.name || task.assignedTo?.email || 'Unassigned';
  }

  return task?.assignedTo ? 'Assigned user' : 'Unassigned';
}

function getInitials(user) {
  const value = user?.name || user?.email || 'User';
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

function toDateInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function getDueDateInfo(value, status) {
  if (!value) {
    return { label: 'No due date', className: 'due-date-none' };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { label: 'Due date unavailable', className: 'due-date-invalid' };
  }

  const dueDateKey = date.toISOString().slice(0, 10);
  const today = new Date();
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const label = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);

  if (dueDateKey < todayKey && status !== 'done') {
    return { label: `Overdue · ${label}`, className: 'due-date-overdue' };
  }

  if (dueDateKey === todayKey) {
    return { label: 'Due today', className: 'due-date-today' };
  }

  return { label, className: 'due-date-upcoming' };
}

function DueDate({ value, status }) {
  const dueDate = getDueDateInfo(value, status);

  return (
    <span className={`task-due-date ${dueDate.className}`}>
      <Icon name="calendar" size={13} />
      {dueDate.label}
    </span>
  );
}

function formatNotificationDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(readStoredUser);
  const [authMode, setAuthMode] = useState('login');
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState('active');
  const [selectedProject, setSelectedProject] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [editingTask, setEditingTask] = useState(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [eligibleUsersLoading, setEligibleUsersLoading] = useState(false);
  const [eligibleUsersError, setEligibleUsersError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');
  const [analyticsProject, setAnalyticsProject] = useState('');

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) {
      setProjects([]);
      setTasks([]);
      return;
    }

    setLoading(true);

    try {
      const [projectData, taskData] = await Promise.all([
        request('/projects'),
        request('/tasks')
      ]);

      setProjects(projectData.projects || []);
      setTasks(taskData.tasks || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const data = await request('/notifications');
      setNotifications(data.notifications || []);
      setUnreadNotificationCount(data.unreadCount || 0);
    } catch (error) {
      setMessage(error.message);
    }
  }, [request, token]);

  const loadEligibleUsers = useCallback(async () => {
    if (!token) {
      setEligibleUsers([]);
      setEligibleUsersError('');
      return;
    }

    setEligibleUsersLoading(true);
    setEligibleUsersError('');

    try {
      const data = await request('/users/eligible-assignees');
      setEligibleUsers(data.users || []);
    } catch (error) {
      setEligibleUsersError(error.message);
    } finally {
      setEligibleUsersLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    loadEligibleUsers();
  }, [loadEligibleUsers]);

  const loadAnalytics = useCallback(async () => {
    if (!token) {
      setAnalytics(null);
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError('');

    const params = new URLSearchParams();
    if (analyticsFrom) params.set('from', analyticsFrom);
    if (analyticsTo) params.set('to', analyticsTo);
    if (analyticsProject) params.set('projectId', analyticsProject);

    try {
      const query = params.toString();
      const data = await request(`/analytics${query ? `?${query}` : ''}`);
      setAnalytics(data);
    } catch (error) {
      setAnalyticsError(error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFrom, analyticsProject, analyticsTo, request, token]);

  useEffect(() => {
    if (activeView === 'analytics') {
      loadAnalytics();
    }
  }, [activeView, loadAnalytics]);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }

    const closeOnOutsideClick = event => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [notificationsOpen]);

  const inProgressCount = useMemo(
    () => tasks.filter(task => task.status === 'in-progress').length,
    [tasks]
  );

  const completedCount = useMemo(
    () => tasks.filter(task => task.status === 'done').length,
    [tasks]
  );

  const projectIdOf = task => (
    typeof task.project === 'object' ? task.project?._id : task.project
  );

  const projectNameOf = task => {
    if (typeof task.project === 'object') {
      return task.project?.name || 'Unknown project';
    }

    return projects.find(project => project._id === task.project)?.name || 'Unknown project';
  };

  const selectedProjectDetails = projects.find(project => project._id === selectedProjectId);
  const selectedProjectTasks = tasks.filter(task => projectIdOf(task) === selectedProjectId);
  const assigneeOptions = useMemo(() => {
    const options = [...eligibleUsers];
    const editingAssignee = editingTask?.assignedTo;

    if (editingAssignee && typeof editingAssignee === 'object' && editingAssignee._id && !options.some(userOption => userOption._id === editingAssignee._id)) {
      options.push({
        _id: editingAssignee._id,
        name: editingAssignee.name,
        email: editingAssignee.email,
        legacy: true
      });
    }

    return options;
  }, [editingTask, eligibleUsers]);
  const hasTaskFilters = taskSearch.trim() !== '' || taskStatusFilter !== 'all' || taskPriorityFilter !== 'all';
  const filteredTasks = useMemo(() => {
    const normalizedSearch = taskSearch.trim().toLowerCase();

    return tasks.filter(task => {
      const matchesTitle = !normalizedSearch || String(task.title || '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
      const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;

      return matchesTitle && matchesStatus && matchesPriority;
    });
  }, [taskPriorityFilter, taskSearch, taskStatusFilter, tasks]);

  const clearTaskFilters = () => {
    setTaskSearch('');
    setTaskStatusFilter('all');
    setTaskPriorityFilter('all');
  };

  const clearAnalyticsFilters = () => {
    setAnalyticsFrom('');
    setAnalyticsTo('');
    setAnalyticsProject('');
  };

  const exportAnalyticsCsv = () => {
    if (!analytics) {
      return;
    }

    const metrics = analytics.metrics || {};
    const rows = [
      ['TaskBoard Analytics Report'],
      ['Report date field', 'Task creation date'],
      ['From', analytics.filters?.from || 'All dates'],
      ['To', analytics.filters?.to || 'All dates'],
      ['Project', analytics.projects?.find(project => String(project.id) === analytics.filters?.projectId)?.name || 'All projects'],
      [],
      ['Metric', 'Value'],
      ['Total tasks', metrics.totalTasks || 0],
      ['Completed tasks', metrics.completedTasks || 0],
      ['To do tasks', metrics.todoTasks || 0],
      ['In progress tasks', metrics.inProgressTasks || 0],
      ['Overdue tasks', metrics.overdueTasks || 0],
      ['Completion percentage', `${metrics.completionPercentage || 0}%`],
      [],
      ['Task title', 'Project', 'Assignee', 'Status', 'Priority', 'Due date', 'Created date'],
      ...(analytics.records || []).map(record => [
        record.title,
        record.projectName,
        record.assigneeName || 'Unassigned',
        formatStatus(record.status),
        formatStatus(record.priority),
        record.dueDate ? new Date(record.dueDate).toISOString().slice(0, 10) : '',
        record.createdAt ? new Date(record.createdAt).toISOString() : ''
      ])
    ];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taskboard-analytics.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setProjects([]);
    setTasks([]);
    setEligibleUsers([]);
    setEligibleUsersError('');
    setNotifications([]);
    setUnreadNotificationCount(0);
    setNotificationsOpen(false);
    setEditingTask(null);
    setEditingProject(null);
    setSelectedProjectId(null);
    clearTaskFilters();
    setActiveView('dashboard');
  };

  const markNotificationRead = async notificationId => {
    const notification = notifications.find(item => item._id === notificationId);

    if (!notification || notification.read) {
      return;
    }

    try {
      await request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotifications(current => current.map(item => (
        item._id === notificationId ? { ...item, read: true } : item
      )));
      setUnreadNotificationCount(current => Math.max(0, current - 1));
    } catch (error) {
      setMessage(error.message);
    }
  };

  const markAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    try {
      await request('/notifications/read-all', { method: 'PATCH' });
      setNotifications(current => current.map(item => ({ ...item, read: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteNotification = async notificationId => {
    try {
      const notification = notifications.find(item => item._id === notificationId);
      await request(`/notifications/${notificationId}`, { method: 'DELETE' });
      setNotifications(current => current.filter(item => item._id !== notificationId));
      if (notification && !notification.read) {
        setUnreadNotificationCount(current => Math.max(0, current - 1));
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAuth = async event => {
    event.preventDefault();
    setAuthLoading(true);
    setMessage('');

    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    const body = authMode === 'register'
      ? { name, email, password }
      : { email, password };

    try {
      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (authMode === 'register') {
        setAuthMode('login');
        setPassword('');
        setMessage(`${data.message || 'Registration successful'}. Please log in.`);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveView('dashboard');
        setPassword('');
        setMessage(data.message || 'Login successful');
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setMessage('You have been logged out.');
  };

  const createProject = async event => {
    event.preventDefault();
    setMessage('');

    try {
      await request('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription
        })
      });

      setProjectName('');
      setProjectDescription('');
      setMessage('Project created successfully.');
      await loadData();
      await loadNotifications();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEditProject = project => {
    setEditingProject(project);
    setProjectName(project.name || '');
    setProjectDescription(project.description || '');
    setProjectStatus(project.status || 'active');
    setActiveView('projects');
    setMessage('');
    window.setTimeout(() => document.getElementById('project-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const cancelProjectEdit = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    setProjectStatus('active');
    setMessage('Project editing cancelled.');
  };

  const saveProject = async event => {
    event.preventDefault();
    setMessage('');

    try {
      await request(`/projects/${editingProject._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          status: projectStatus
        })
      });

      setEditingProject(null);
      setProjectName('');
      setProjectDescription('');
      setProjectStatus('active');
      setMessage('Project updated successfully.');
      await loadData();
      await loadNotifications();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openProjectDetails = project => {
    setSelectedProjectId(project._id);
    setEditingProject(null);
    setActiveView('project-details');
    setSidebarOpen(false);
    setMessage('');
  };

  const createTaskForProject = projectId => {
    resetTaskForm(projectId);
    setActiveView('tasks');
    setSidebarOpen(false);
    setMessage('New task will be added to this project.');
  };

  const deleteProject = async project => {
    const associatedTaskCount = tasks.filter(task => projectIdOf(task) === project._id).length;
    const taskMessage = associatedTaskCount > 0
      ? ` This will also permanently delete ${associatedTaskCount} associated task${associatedTaskCount === 1 ? '' : 's'}.`
      : '';

    if (!window.confirm(`Delete "${project.name}"?${taskMessage} This action cannot be undone.`)) {
      return;
    }

    try {
      await request(`/projects/${project._id}`, { method: 'DELETE' });
      setEditingProject(null);
      setSelectedProjectId(null);
      setMessage(`Project "${project.name}" and its associated tasks were deleted.`);
      setActiveView('projects');
      await loadData();
      await loadNotifications();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const resetTaskForm = (projectId = '') => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskDueDate('');
    setSelectedAssignee('');
    setSelectedProject(projectId);
    setTaskPriority('medium');
    setTaskStatus('todo');
  };

  const saveTask = async event => {
    event.preventDefault();
    setMessage('');

    const originalAssigneeId = editingTask ? assigneeIdOf(editingTask) : '';
    const preservingLegacyAssignee = Boolean(
      editingTask
      && selectedAssignee
      && selectedAssignee === originalAssigneeId
      && !eligibleUsers.some(userOption => userOption._id === selectedAssignee)
    );
    const body = {
      title: taskTitle,
      description: taskDescription,
      project: selectedProject,
      dueDate: taskDueDate || null,
      priority: taskPriority,
      status: taskStatus,
      ...(preservingLegacyAssignee ? {} : { assignedTo: selectedAssignee || null })
    };

    try {
      if (editingTask) {
        await request(`/tasks/${editingTask._id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
        setMessage('Task updated successfully.');
      } else {
        await request('/tasks', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        setMessage('Task created successfully.');
      }

      resetTaskForm();
      await loadData();
      await loadNotifications();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEdit = task => {
    setActiveView('tasks');
    setEditingTask(task);
    setTaskTitle(task.title || '');
    setTaskDescription(task.description || '');
    setTaskDueDate(toDateInputValue(task.dueDate));
    setSelectedAssignee(assigneeIdOf(task));
    setSelectedProject(projectIdOf(task) || '');
    setTaskPriority(task.priority || 'medium');
    setTaskStatus(task.status || 'todo');
    setMessage('');
    window.setTimeout(() => document.getElementById('task-form')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const cancelEdit = () => {
    resetTaskForm();
    setMessage('Task editing cancelled.');
  };

  const deleteTask = async taskId => {
    if (!window.confirm('Delete this task?')) {
      return;
    }

    try {
      await request(`/tasks/${taskId}`, { method: 'DELETE' });
      setMessage('Task deleted successfully.');
      await loadData();
      await loadNotifications();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const currentPage = PAGE_META[activeView];
  const displayName = user?.name || user?.email || 'Workspace member';
  const initials = getInitials(user);

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />
        <section className="auth-card">
          <div className="auth-brand">
            <span className="logo-mark"><Icon name="grid" size={19} /></span>
            <span>Task<span>Board</span></span>
          </div>
          <div className="auth-heading">
            <span className="eyebrow">Your work, in focus</span>
            <h1>{authMode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
            <p>{authMode === 'login' ? 'Sign in to pick up where you left off.' : 'Start organizing your projects and tasks today.'}</p>
          </div>

          <div className="auth-tabs">
            <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
            <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Create account</button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authMode === 'register' && (
              <label htmlFor="auth-name">
                Full name
                <input id="auth-name" type="text" value={name} onChange={event => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" required />
              </label>
            )}

            <label htmlFor="auth-email">
              Email address
              <input id="auth-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>

            <label htmlFor="auth-password">
              Password
              <input id="auth-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={authMode === 'register' ? 'At least 6 characters' : 'Enter your password'} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength={authMode === 'register' ? 6 : undefined} required />
            </label>

            <button type="submit" className="primary-button auth-submit" disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign in to TaskBoard' : 'Create account'}
              {!authLoading && <Icon name="arrow" size={17} />}
            </button>
          </form>
          {message && <p className="status-message" role="status">{message}</p>}
          <p className="auth-footnote">A focused workspace for meaningful progress.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="logo-mark"><Icon name="grid" size={19} /></span>
            <span>Task<span>Board</span></span>
          </div>
          <button type="button" className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>

        <div className="sidebar-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map(item => (
            <button
              type="button"
              key={item.id}
              className={`nav-link ${activeView === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveView(item.id);
                setSidebarOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'tasks' && tasks.length > 0 && <span className="nav-count">{tasks.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Icon name="activity" size={17} /></span>
            <div>
              <strong>Keep momentum</strong>
              <p>Small wins add up.</p>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={logout}>
            <Icon name="logout" />
            <span>Sign out</span>
          </button>
          <div className="sidebar-version">TaskBoard workspace</div>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-main">
            <button type="button" className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Icon name="menu" />
            </button>
            <div>
              <span className="page-eyebrow">{currentPage.eyebrow}</span>
              <h1>{currentPage.title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="notification-wrap" ref={notificationsRef}>
              <button type="button" className="icon-button notification-button" onClick={() => { setNotificationsOpen(current => !current); if (!notificationsOpen) loadNotifications(); }} aria-label="Notifications" aria-expanded={notificationsOpen}>
                <Icon name="bell" />
                {unreadNotificationCount > 0 && <span className="notification-count">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
              </button>
              {notificationsOpen && (
                <section className="notification-panel" aria-label="Notifications">
                  <div className="notification-panel-header">
                    <div>
                      <span className="panel-kicker">Your updates</span>
                      <h2>Notifications</h2>
                    </div>
                    {unreadNotificationCount > 0 && <button type="button" className="text-button" onClick={markAllNotificationsRead}>Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      <span className="notification-empty-icon"><Icon name="bell" size={18} /></span>
                      <strong>You’re all caught up</strong>
                      <span>No task reminders right now.</span>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map(notification => (
                        <article className={`notification-item ${notification.read ? '' : 'unread'}`} key={notification._id}>
                          <span className="notification-status-dot" />
                          <div className="notification-item-content">
                            <div className="notification-item-top">
                              <strong>{notification.title}</strong>
                              <time dateTime={notification.createdAt}>{formatNotificationDate(notification.createdAt)}</time>
                            </div>
                            <p>{notification.message}</p>
                            <div className="notification-item-actions">
                              {!notification.read && <button type="button" className="notification-action" onClick={() => markNotificationRead(notification._id)}>Mark as read</button>}
                              <button type="button" className="notification-delete" onClick={() => deleteNotification(notification._id)} aria-label={`Delete notification: ${notification.title}`}><Icon name="trash" size={14} /></button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
            <div className="topbar-divider" />
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <span className="user-chip-copy">
                <strong>{displayName}</strong>
                <small>Workspace member</small>
              </span>
              <Icon name="chevron" size={15} />
            </div>
          </div>
        </header>

        <main className="content-area">
          <div className="content-intro">
            <div>
              <h2>{activeView === 'dashboard' ? `Good to see you, ${displayName.split(' ')[0]}` : currentPage.title}</h2>
              <p>{currentPage.description}</p>
            </div>
            {activeView === 'dashboard' && (
              <button type="button" className="primary-button" onClick={() => setActiveView('tasks')}>
                <Icon name="plus" size={17} />
                New task
              </button>
            )}
          </div>

          {message && (
            <div className="flash-message" role="status">
              <span className="flash-icon"><Icon name="activity" size={16} /></span>
              <span>{message}</span>
              <button type="button" className="flash-close" onClick={() => setMessage('')} aria-label="Dismiss message"><Icon name="close" size={15} /></button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <>
              <section className="stats-grid">
                <article className="stat-card stat-purple">
                  <div className="stat-card-top"><span className="stat-icon"><Icon name="folder" /></span><span className="stat-trend"><Icon name="trend" size={14} /></span></div>
                  <span className="stat-label">Total projects</span>
                  <strong>{projects.length}</strong>
                  <span className="stat-caption">Across your workspace</span>
                </article>
                <article className="stat-card stat-blue">
                  <div className="stat-card-top"><span className="stat-icon"><Icon name="check" /></span><span className="stat-trend"><Icon name="trend" size={14} /></span></div>
                  <span className="stat-label">Total tasks</span>
                  <strong>{tasks.length}</strong>
                  <span className="stat-caption">Everything on your plate</span>
                </article>
                <article className="stat-card stat-amber">
                  <div className="stat-card-top"><span className="stat-icon"><Icon name="activity" /></span><span className="stat-trend"><Icon name="trend" size={14} /></span></div>
                  <span className="stat-label">In progress</span>
                  <strong>{inProgressCount}</strong>
                  <span className="stat-caption">Currently moving forward</span>
                </article>
                <article className="stat-card stat-green">
                  <div className="stat-card-top"><span className="stat-icon"><Icon name="check" /></span><span className="stat-trend"><Icon name="trend" size={14} /></span></div>
                  <span className="stat-label">Completed</span>
                  <strong>{completedCount}</strong>
                  <span className="stat-caption">Finished tasks</span>
                </article>
              </section>

              <div className="dashboard-grid">
                <section className="panel overview-panel">
                  <div className="panel-heading">
                    <div><span className="panel-kicker">Portfolio</span><h3>Project overview</h3></div>
                    <button type="button" className="text-button" onClick={() => setActiveView('projects')}>View all <Icon name="arrow" size={15} /></button>
                  </div>
                  {loading ? <div className="empty-state"><span className="loader" />Loading projects...</div> : projects.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon"><Icon name="folder" /></span><strong>No projects yet</strong><span>Create your first project to get started.</span><button type="button" className="text-button" onClick={() => setActiveView('projects')}>Create a project <Icon name="arrow" size={15} /></button></div>
                  ) : (
                    <div className="overview-projects">
                      {projects.slice(0, 4).map(project => (
                        <div className="overview-project" key={project._id}>
                          <span className="project-color" />
                          <div className="overview-project-copy"><strong>{project.name}</strong><span>{tasks.filter(task => projectIdOf(task) === project._id).length} tasks</span></div>
                          <span className={`status-badge status-${statusClass(project.status)}`}>{formatStatus(project.status)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div><span className="panel-kicker">Your queue</span><h3>Recent tasks</h3></div>
                    <button type="button" className="text-button" onClick={() => setActiveView('tasks')}>Open tasks <Icon name="arrow" size={15} /></button>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="empty-state compact"><span className="empty-icon"><Icon name="check" /></span><strong>Your task list is clear</strong><span>New tasks will appear here.</span></div>
                  ) : (
                    <div className="recent-task-list">
                      {tasks.slice(0, 4).map(task => (
                        <div className="recent-task" key={task._id}>
                          <span className={`task-dot priority-${statusClass(task.priority)}`} />
                          <div className="recent-task-copy"><strong>{task.title}</strong><span>{projectNameOf(task)} · {assigneeNameOf(task)}</span></div>
                          <span className={`status-badge status-${statusClass(task.status)}`}>{formatStatus(task.status)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {activeView === 'analytics' && (
            <section className="page-section analytics-page">
              <section className="panel analytics-controls">
                <div className="panel-heading">
                  <div>
                    <span className="panel-kicker">Build a focused report</span>
                    <h3>Report filters</h3>
                  </div>
                  <span className="panel-icon"><Icon name="chart" /></span>
                </div>
                <div className="analytics-filter-grid">
                  <label htmlFor="analytics-from">Created from<input id="analytics-from" type="date" value={analyticsFrom} onChange={event => setAnalyticsFrom(event.target.value)} /></label>
                  <label htmlFor="analytics-to">Created to<input id="analytics-to" type="date" value={analyticsTo} onChange={event => setAnalyticsTo(event.target.value)} /></label>
                  <label htmlFor="analytics-project">Project<select id="analytics-project" value={analyticsProject} onChange={event => setAnalyticsProject(event.target.value)}><option value="">All projects</option>{projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
                </div>
                <div className="analytics-control-footer">
                  <span>Report range uses task creation date.</span>
                  <div className="analytics-control-actions">
                    <button type="button" className="text-button" onClick={clearAnalyticsFilters} disabled={!analyticsFrom && !analyticsTo && !analyticsProject}>Clear filters</button>
                    <button type="button" className="secondary-button" onClick={loadAnalytics} disabled={analyticsLoading}><Icon name="trend" size={15} />Refresh</button>
                    <button type="button" className="primary-button" onClick={exportAnalyticsCsv} disabled={!analytics || analyticsLoading}><Icon name="arrow" size={15} />Export CSV</button>
                  </div>
                </div>
              </section>

              {analyticsLoading ? (
                <section className="panel analytics-state"><div className="empty-state"><span className="loader" />Preparing your report...</div></section>
              ) : analyticsError ? (
                <section className="panel analytics-state"><div className="empty-state"><span className="empty-icon"><Icon name="activity" /></span><strong>Analytics could not load</strong><span>{analyticsError}</span><button type="button" className="text-button" onClick={loadAnalytics}>Try again <Icon name="arrow" size={15} /></button></div></section>
              ) : !analytics ? (
                <section className="panel analytics-state"><div className="empty-state"><span className="empty-icon"><Icon name="chart" /></span><strong>No report selected</strong><span>Choose filters or refresh to generate your analytics.</span></div></section>
              ) : (
                <>
                  <section className="analytics-summary-grid">
                    <article className="analytics-stat-card"><span className="analytics-stat-icon"><Icon name="check" /></span><span>Total tasks</span><strong>{analytics.metrics.totalTasks}</strong></article>
                    <article className="analytics-stat-card"><span className="analytics-stat-icon"><Icon name="trend" /></span><span>Completed</span><strong>{analytics.metrics.completedTasks}</strong></article>
                    <article className="analytics-stat-card"><span className="analytics-stat-icon"><Icon name="activity" /></span><span>In progress</span><strong>{analytics.metrics.inProgressTasks}</strong></article>
                    <article className="analytics-stat-card"><span className="analytics-stat-icon"><Icon name="calendar" /></span><span>Overdue</span><strong>{analytics.metrics.overdueTasks}</strong></article>
                    <article className="analytics-stat-card analytics-rate-card"><span className="analytics-stat-icon"><Icon name="chart" /></span><span>Completion rate</span><strong>{analytics.metrics.completionPercentage}%</strong></article>
                  </section>

                  <div className="analytics-chart-grid">
                    <section className="panel analytics-panel">
                      <div className="panel-heading"><div><span className="panel-kicker">Workflow</span><h3>Task status</h3></div><span className="heading-count">{analytics.metrics.totalTasks}</span></div>
                      {analytics.metrics.totalTasks === 0 ? <div className="analytics-empty-chart">No tasks match the selected filters.</div> : <div className="analytics-bars">{Object.entries(analytics.byStatus || {}).map(([key, count]) => <div className="analytics-bar-row" key={key}><div className="analytics-bar-label"><span>{formatStatus(key)}</span><strong>{count}</strong></div><div className="analytics-bar-track"><span style={{ width: `${Math.max((count / Math.max(analytics.metrics.totalTasks, 1)) * 100, count > 0 ? 4 : 0)}%` }} /></div></div>)}</div>}
                    </section>

                    <section className="panel analytics-panel">
                      <div className="panel-heading"><div><span className="panel-kicker">Workload mix</span><h3>Task priority</h3></div><span className="heading-count">{analytics.metrics.totalTasks}</span></div>
                      {analytics.metrics.totalTasks === 0 ? <div className="analytics-empty-chart">No priority data is available yet.</div> : <div className="analytics-bars">{Object.entries(analytics.byPriority || {}).map(([key, count]) => <div className="analytics-bar-row" key={key}><div className="analytics-bar-label"><span>{formatStatus(key)} priority</span><strong>{count}</strong></div><div className="analytics-bar-track"><span className={`priority-bar priority-${key}`} style={{ width: `${Math.max((count / Math.max(analytics.metrics.totalTasks, 1)) * 100, count > 0 ? 4 : 0)}%` }} /></div></div>)}</div>}
                    </section>

                    <section className="panel analytics-panel analytics-project-panel">
                      <div className="panel-heading"><div><span className="panel-kicker">Portfolio health</span><h3>Project progress</h3></div><span className="heading-count">{analytics.projects?.length || 0}</span></div>
                      {analytics.projects?.length ? <div className="analytics-project-list">{analytics.projects.map(project => <div className="analytics-project-row" key={project.id}><div className="analytics-project-heading"><div><strong>{project.name}</strong><span>{project.completedTasks} of {project.totalTasks} tasks completed</span></div><strong>{project.completionPercentage}%</strong></div><div className="analytics-bar-track"><span style={{ width: `${project.completionPercentage}%` }} /></div></div>)}</div> : <div className="analytics-empty-chart">No projects match the selected filters.</div>}
                    </section>
                  </div>

                  <section className="panel analytics-records-panel">
                    <div className="panel-heading"><div><span className="panel-kicker">Filtered data</span><h3>Task records <span className="heading-count">{analytics.records?.length || 0}</span></h3></div></div>
                    {analytics.records?.length ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due date</th><th>Created</th></tr></thead><tbody>{analytics.records.map(record => <tr key={record.id}><td>{record.title}</td><td>{record.projectName}</td><td>{record.assigneeName || 'Unassigned'}</td><td><span className={`status-badge status-${statusClass(record.status)}`}>{formatStatus(record.status)}</span></td><td><span className={`priority-badge priority-${statusClass(record.priority)}`}>{formatStatus(record.priority)}</span></td><td>{record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '—'}</td><td>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <div className="analytics-empty-chart">No task records match the selected filters.</div>}
                  </section>
                </>
              )}
            </section>
          )}

          {activeView === 'projects' && (
            <section className="page-section">
              <div className="project-layout">
                <section className="panel create-panel">
                  <div className="panel-heading"><div><span className="panel-kicker">{editingProject ? 'Make an update' : 'Start something new'}</span><h3>{editingProject ? 'Edit project' : 'Create a project'}</h3></div><span className="panel-icon"><Icon name={editingProject ? 'edit' : 'plus'} /></span></div>
                  <form id="project-form" onSubmit={editingProject ? saveProject : createProject} className="dashboard-form">
                    <label htmlFor="projectName">Project name<input id="projectName" value={projectName} onChange={event => setProjectName(event.target.value)} placeholder="Website redesign" required /></label>
                    <label htmlFor="projectDescription">Description<textarea id="projectDescription" value={projectDescription} onChange={event => setProjectDescription(event.target.value)} placeholder="What are you working toward?" rows="4" /></label>
                    {editingProject && <label htmlFor="projectStatus">Status<select id="projectStatus" value={projectStatus} onChange={event => setProjectStatus(event.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="on-hold">On hold</option></select></label>}
                    <div className="form-actions"><button type="submit" className="primary-button"><Icon name={editingProject ? 'check' : 'plus'} size={17} />{editingProject ? 'Save changes' : 'Create project'}</button>{editingProject && <button type="button" className="secondary-button" onClick={cancelProjectEdit}>Cancel</button>}</div>
                  </form>
                </section>

                <section className="panel project-library">
                  <div className="panel-heading"><div><span className="panel-kicker">Portfolio</span><h3>All projects <span className="heading-count">{projects.length}</span></h3></div><button type="button" className="icon-button refresh-button" onClick={loadData} disabled={loading} aria-label="Refresh projects"><Icon name="trend" /></button></div>
                  {loading ? <div className="empty-state"><span className="loader" />Loading projects...</div> : projects.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="folder" /></span><strong>No projects created</strong><span>Your projects will show up here.</span></div> : (
                    <div className="projects-grid">
                      {projects.map(project => (
                        <article className="project-card" key={project._id}>
                          <div className="project-card-top"><span className="project-card-icon"><Icon name="folder" size={18} /></span><span className={`status-badge status-${statusClass(project.status)}`}>{formatStatus(project.status)}</span></div>
                          <h4>{project.name}</h4>
                          <p>{project.description || 'No description provided.'}</p>
                          <div className="project-card-footer"><span><Icon name="check" size={15} />{tasks.filter(task => projectIdOf(task) === project._id).length} tasks</span><span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Active'}</span></div>
                          <div className="project-card-actions"><button type="button" className="text-button" onClick={() => openProjectDetails(project)}>View details <Icon name="arrow" size={14} /></button><div><button type="button" className="icon-button small-icon" onClick={() => startEditProject(project)} aria-label={`Edit ${project.name}`}><Icon name="edit" size={15} /></button><button type="button" className="icon-button small-icon danger-icon" onClick={() => deleteProject(project)} aria-label={`Delete ${project.name}`}><Icon name="trash" size={15} /></button></div></div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}

          {activeView === 'project-details' && (
            selectedProjectDetails ? (
              <section className="page-section project-details-page">
                <button type="button" className="back-button" onClick={() => setActiveView('projects')}><Icon name="chevron" size={15} />Back to projects</button>
                <section className="panel project-detail-hero">
                  <div className="project-detail-main">
                    <span className="project-detail-icon"><Icon name="folder" size={23} /></span>
                    <div>
                      <div className="detail-title-row"><h2>{selectedProjectDetails.name}</h2><span className={`status-badge status-${statusClass(selectedProjectDetails.status)}`}>{formatStatus(selectedProjectDetails.status)}</span></div>
                      <p>{selectedProjectDetails.description || 'No description provided for this project.'}</p>
                    </div>
                  </div>
                  <div className="project-detail-actions"><button type="button" className="secondary-button" onClick={() => startEditProject(selectedProjectDetails)}><Icon name="edit" size={15} />Edit project</button><button type="button" className="secondary-button danger-button" onClick={() => deleteProject(selectedProjectDetails)}><Icon name="trash" size={15} />Delete</button><button type="button" className="primary-button" onClick={() => createTaskForProject(selectedProjectDetails._id)}><Icon name="plus" size={16} />Create task</button></div>
                  <div className="detail-metrics"><div><strong>{selectedProjectTasks.length}</strong><span>Total tasks</span></div><div><strong>{selectedProjectTasks.filter(task => task.status === 'in-progress').length}</strong><span>In progress</span></div><div><strong>{selectedProjectTasks.filter(task => task.status === 'done').length}</strong><span>Completed</span></div><div><strong>{selectedProjectDetails.createdAt ? new Date(selectedProjectDetails.createdAt).toLocaleDateString() : '—'}</strong><span>Created</span></div></div>
                </section>

                <section className="panel detail-task-panel">
                  <div className="panel-heading"><div><span className="panel-kicker">Project queue</span><h3>Tasks in this project <span className="heading-count">{selectedProjectTasks.length}</span></h3></div><button type="button" className="text-button" onClick={() => createTaskForProject(selectedProjectDetails._id)}><Icon name="plus" size={15} />Add task</button></div>
                  {selectedProjectTasks.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><strong>No tasks in this project</strong><span>Create the first task and keep the project moving.</span><button type="button" className="text-button" onClick={() => createTaskForProject(selectedProjectDetails._id)}>Create a task <Icon name="arrow" size={15} /></button></div> : (
                    <div className="task-list">
                      {selectedProjectTasks.map(task => (
                        <article className="task-card" key={task._id}>
                          <div className="task-card-main"><span className={`task-check status-dot-${statusClass(task.status)}`} /><div><h4>{task.title}</h4><p>{task.description || 'No description provided.'}</p><span className="task-project"><Icon name="folder" size={13} />{selectedProjectDetails.name}</span><span className="task-assignee"><Icon name="user" size={13} />{assigneeNameOf(task)}</span><DueDate value={task.dueDate} status={task.status} /></div></div>
                          <div className="task-card-side"><span className={`priority-badge priority-${statusClass(task.priority)}`}>{formatStatus(task.priority)} priority</span><span className={`status-badge status-${statusClass(task.status)}`}>{formatStatus(task.status)}</span><div className="task-actions"><button type="button" className="icon-button small-icon" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`}><Icon name="edit" size={15} /></button><button type="button" className="icon-button small-icon danger-icon" onClick={() => deleteTask(task._id)} aria-label={`Delete ${task.title}`}><Icon name="trash" size={15} /></button></div></div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </section>
            ) : (
              <section className="panel empty-details"><div className="empty-state"><span className="empty-icon"><Icon name="folder" /></span><strong>Project not found</strong><span>Return to your project list to choose another project.</span><button type="button" className="text-button" onClick={() => setActiveView('projects')}>Back to projects <Icon name="arrow" size={15} /></button></div></section>
            )
          )}

          {activeView === 'tasks' && (
            <section className="page-section">
              <div className="task-layout">
                <section className="panel task-editor">
                  <div className="panel-heading"><div><span className="panel-kicker">{editingTask ? 'Make an update' : 'Add to your queue'}</span><h3>{editingTask ? 'Edit task' : 'Create a task'}</h3></div><span className="panel-icon"><Icon name={editingTask ? 'edit' : 'plus'} /></span></div>
                  {projects.length === 0 ? <div className="empty-state compact"><span className="empty-icon"><Icon name="folder" /></span><strong>Create a project first</strong><span>Tasks belong to a project workspace.</span><button type="button" className="text-button" onClick={() => setActiveView('projects')}>Go to projects <Icon name="arrow" size={15} /></button></div> : (
                    <form id="task-form" onSubmit={saveTask} className="dashboard-form">
                      <label htmlFor="taskTitle">Task title<input id="taskTitle" value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="What needs to get done?" required /></label>
                      <label htmlFor="taskDescription">Description<textarea id="taskDescription" value={taskDescription} onChange={event => setTaskDescription(event.target.value)} placeholder="Add useful context" rows="3" /></label>
                      <label htmlFor="taskDueDate">Due date<input id="taskDueDate" type="date" value={taskDueDate} onChange={event => setTaskDueDate(event.target.value)} /></label>
                      <label htmlFor="selectedProject">Project<select id="selectedProject" value={selectedProject} onChange={event => setSelectedProject(event.target.value)} required><option value="">Select a project</option>{projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}</select></label>
                      <label htmlFor="task-assignee">Assign to<select id="task-assignee" value={selectedAssignee} onChange={event => setSelectedAssignee(event.target.value)} disabled={eligibleUsersLoading}><option value="">Unassigned</option>{assigneeOptions.map(userOption => <option key={userOption._id} value={userOption._id}>{userOption.name || userOption.email}{userOption.legacy ? ' (current assignment)' : ''}</option>)}</select>{eligibleUsersLoading && <small className="field-hint">Loading eligible users...</small>}{eligibleUsersError && <small className="field-error">{eligibleUsersError} <button type="button" className="inline-retry" onClick={loadEligibleUsers}>Retry</button></small>}{!eligibleUsersLoading && !eligibleUsersError && assigneeOptions.length === 0 && <small className="field-hint">No eligible users are available. Tasks can remain unassigned.</small>}</label>
                      <div className="form-row"><label htmlFor="taskPriority">Priority<select id="taskPriority" value={taskPriority} onChange={event => setTaskPriority(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label htmlFor="taskStatus">Status<select id="taskStatus" value={taskStatus} onChange={event => setTaskStatus(event.target.value)}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Completed</option></select></label></div>
                      <div className="form-actions"><button type="submit" className="primary-button">{editingTask ? <Icon name="check" size={17} /> : <Icon name="plus" size={17} />}{editingTask ? 'Save changes' : 'Create task'}</button>{editingTask && <button type="button" className="secondary-button" onClick={cancelEdit}>Cancel</button>}</div>
                    </form>
                  )}
                </section>

                <section className="panel task-list-panel">
                  <div className="panel-heading"><div><span className="panel-kicker">Everything assigned to you</span><h3>My tasks <span className="heading-count">{hasTaskFilters ? `${filteredTasks.length}/${tasks.length}` : tasks.length}</span></h3></div><button type="button" className="icon-button refresh-button" onClick={loadData} disabled={loading} aria-label="Refresh tasks"><Icon name="trend" /></button></div>
                  <div className="task-filters" role="search" aria-label="Filter tasks">
                    <label className="task-filter-field" htmlFor="task-search">
                      <span>Search by title</span>
                      <input id="task-search" type="search" value={taskSearch} onChange={event => setTaskSearch(event.target.value)} placeholder="Search tasks..." />
                    </label>
                    <label className="task-filter-field" htmlFor="task-status-filter">
                      <span>Status</span>
                      <select id="task-status-filter" value={taskStatusFilter} onChange={event => setTaskStatusFilter(event.target.value)}>
                        <option value="all">All statuses</option>
                        <option value="todo">To do</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </label>
                    <label className="task-filter-field" htmlFor="task-priority-filter">
                      <span>Priority</span>
                      <select id="task-priority-filter" value={taskPriorityFilter} onChange={event => setTaskPriorityFilter(event.target.value)}>
                        <option value="all">All priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                  {loading ? <div className="empty-state"><span className="loader" />Loading tasks...</div> : tasks.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><strong>No tasks yet</strong><span>Create a task to start making progress.</span></div> : (
                    filteredTasks.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="check" /></span><strong>No matching tasks</strong><span>Try a different title, status, or priority filter.</span><button type="button" className="text-button" onClick={clearTaskFilters}>Clear filters <Icon name="arrow" size={15} /></button></div> : (
                      <div className="task-list">
                        {filteredTasks.map(task => (
                        <article className="task-card" key={task._id}>
                          <div className="task-card-main"><span className={`task-check status-dot-${statusClass(task.status)}`} /> <div><h4>{task.title}</h4><p>{task.description || 'No description provided.'}</p><span className="task-project"><Icon name="folder" size={13} />{projectNameOf(task)}</span><span className="task-assignee"><Icon name="user" size={13} />{assigneeNameOf(task)}</span><DueDate value={task.dueDate} status={task.status} /></div></div>
                          <div className="task-card-side"><span className={`priority-badge priority-${statusClass(task.priority)}`}>{formatStatus(task.priority)} priority</span><span className={`status-badge status-${statusClass(task.status)}`}>{formatStatus(task.status)}</span><div className="task-actions"><button type="button" className="icon-button small-icon" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`}><Icon name="edit" size={15} /></button><button type="button" className="icon-button small-icon danger-icon" onClick={() => deleteTask(task._id)} aria-label={`Delete ${task.title}`}><Icon name="trash" size={15} /></button></div></div>
                        </article>
                        ))}
                      </div>
                    )
                  )}
                </section>
              </div>
            </section>
          )}

          {activeView === 'settings' && (
            <section className="page-section settings-section">
              <section className="panel settings-panel">
                <div className="panel-heading"><div><span className="panel-kicker">Profile</span><h3>Account details</h3></div><span className="panel-icon"><Icon name="settings" /></span></div>
                <div className="account-card"><span className="account-avatar">{initials}</span><div><strong>{displayName}</strong><span>{user?.email || 'Authenticated workspace member'}</span></div></div>
                <div className="settings-divider" />
                <div className="setting-row"><div><strong>Authentication</strong><span>Your session is secured with a JWT token.</span></div><span className="connection-badge"><span />Active</span></div>
                <div className="setting-row"><div><strong>API connection</strong><span>Connected to the TaskBoard workspace services.</span></div><span className="connection-badge"><span />Ready</span></div>
                <button type="button" className="secondary-button logout-button" onClick={logout}><Icon name="logout" size={16} />Sign out of TaskBoard</button>
              </section>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
