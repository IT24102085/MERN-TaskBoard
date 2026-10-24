
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');

const dotenv = require('dotenv');
const localEnvResult = dotenv.config({
  path: path.resolve(__dirname, '../.env.local')
});
const envResult = dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

if ((localEnvResult.error && localEnvResult.error.code !== 'ENOENT') || (envResult.error && envResult.error.code !== 'ENOENT')) {
  console.error('Unable to load server environment configuration');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = Number(process.env.PORT || 5000);

function getMongoUri() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing');
  }

  let uri;
  try {
    uri = new URL(MONGODB_URI);
  } catch {
    throw new Error('MONGODB_URI is not a valid MongoDB connection string');
  }

  if (uri.protocol === 'mongodb:') {
    if (!uri.hostname) {
      throw new Error('MONGODB_URI must include a MongoDB hostname');
    }

    if (!uri.pathname || uri.pathname === '/') {
      uri.pathname = '/taskboard';
    }

    return uri.toString();
  }

  if (uri.protocol !== 'mongodb+srv:') {
    throw new Error('MONGODB_URI must use mongodb:// for local MongoDB or mongodb+srv:// for MongoDB Atlas');
  }

  if (!uri.hostname || !uri.hostname.endsWith('.mongodb.net')) {
    throw new Error('MONGODB_URI must use the MongoDB Atlas cluster hostname');
  }

  if (!uri.username || !uri.password) {
    throw new Error('MONGODB_URI must include the Atlas database username and password');
  }

  if (!uri.pathname || uri.pathname === '/') {
    uri.pathname = '/taskboard';
    console.warn('MONGODB_URI has no database name; using the taskboard database');
  }

  return uri.toString();
}

if (!JWT_SECRET || !Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  console.error('Missing required server environment configuration');
  process.exit(1);
}

let mongoUri;
try {
  mongoUri = getMongoUri();
} catch (error) {
  console.error(`Invalid server environment configuration: ${error.message}`);
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes.js');
const projectRoutes = require('./routes/projectRoutes.js');
const taskRoutes = require('./routes/taskRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');
const analyticsRoutes = require('./routes/analyticsRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

const app = express();
let httpServer;
let isReady = false;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const authRateLimitWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);
const authLockoutMs = Number(process.env.AUTH_LOCKOUT_MS || 15 * 60 * 1000);
const authLockoutFailures = Number(process.env.AUTH_LOCKOUT_FAILURES || 5);

if (!Number.isFinite(authRateLimitWindowMs) || authRateLimitWindowMs <= 0 || !Number.isInteger(authRateLimitMax) || authRateLimitMax <= 0 || !Number.isFinite(authLockoutMs) || authLockoutMs <= 0 || !Number.isInteger(authLockoutFailures) || authLockoutFailures <= 0) {
  console.error('Invalid authentication rate-limit configuration');
  process.exit(1);
}

const authRateLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  limit: authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many authentication attempts. Please try again later.'
    });
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin));
  }
}));
app.use(express.json({ limit: '100kb' }));

// Railway and other deployment platforms use this endpoint to determine readiness.
// The API is only ready after MongoDB has connected successfully.
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  if (!isReady || !databaseReady) {
    return res.status(503).json({
      status: 'not_ready',
      database: 'disconnected'
    });
  }

  return res.status(200).json({
    status: 'ok',
    database: 'connected'
  });
});

// API Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'MERN TaskBoard API is running!'
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON' });
  }

  console.error('Unhandled server error:', error?.message || error);
  return res.status(500).json({ message: 'Internal server error' });
});

// Server configuration
function getMongoConnectionFailureMessage(error) {
  const code = String(error?.code || '');
  const codeName = String(error?.codeName || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (
    code === '18' ||
    codeName.includes('authenticationfailed') ||
    /bad auth|authentication failed|authenticationfailed/.test(message)
  ) {
    return 'MongoDB authentication failed. Verify the Atlas database username/password, URL-encode reserved characters in each credential, and confirm the user has access to the taskboard database.';
  }

  if (error?.name === 'MongoParseError' || /invalid scheme|uri malformed|must be a string/.test(message)) {
    return 'MongoDB connection configuration is invalid. Use a mongodb:// or mongodb+srv:// connection string with a database name.';
  }

  if (/querysrv|enotfound|dns|srv record/.test(message)) {
    return 'MongoDB hostname could not be resolved. Verify the database hostname and Railway network access.';
  }

  if (/timed out|timeout|server selection/.test(message)) {
    return 'MongoDB connection timed out. Verify that the database service is running and reachable from Railway.';
  }

  if (/econnrefused|econnreset|network/.test(message)) {
    return 'MongoDB network connection failed. Verify the database service and Railway network configuration.';
  }

  return 'MongoDB connection failed. Verify the database service status, credentials, network access, and environment configuration.';
}

// Start server
async function startServer() {
  httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });

  httpServer.on('error', () => {
    console.error(`Server failed to listen on port ${PORT}`);
    process.exit(1);
  });

  try {
    await mongoose.connect(mongoUri);
    isReady = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    isReady = false;
    console.error('MongoDB connection failed:', getMongoConnectionFailureMessage(error));
    httpServer.close(() => process.exit(1));
  }
}

async function shutdown(signal) {
  isReady = false;

  try {
    await mongoose.disconnect();
  } finally {
    if (httpServer) {
      httpServer.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  }
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

startServer();
