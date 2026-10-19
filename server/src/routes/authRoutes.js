const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const router = express.Router();
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const failedLoginAttempts = new Map();
const loginFailureLimit = Number(process.env.AUTH_LOCKOUT_FAILURES || 5);
const loginLockoutMs = Number(process.env.AUTH_LOCKOUT_MS || 15 * 60 * 1000);

function getAuthInput(body = {}) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    password: typeof body.password === 'string' ? body.password : ''
  };
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

function isValidationError(error) {
  return error?.name === 'ValidationError' || error?.name === 'CastError';
}

function loginAttemptKey(email, request) {
  return `${email}:${request.ip || 'unknown'}`;
}

function getActiveLockout(key) {
  const attempt = failedLoginAttempts.get(key);

  if (!attempt) {
    return null;
  }

  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    return attempt;
  }

  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    failedLoginAttempts.delete(key);
  }

  return null;
}

function recordFailedLogin(key) {
  const attempt = failedLoginAttempts.get(key) || { failures: 0 };
  attempt.failures += 1;

  if (attempt.failures >= loginFailureLimit) {
    attempt.lockedUntil = Date.now() + loginLockoutMs;
  }

  failedLoginAttempts.set(key, attempt);
  return attempt;
}

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password } = getAuthInput(req.body);

  if (!name || !email || !password) {
    return res.status(400).json({
      message: 'Name, email and password are required'
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      message: 'Name must be 100 characters or fewer'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: 'A valid email address is required'
    });
  }

  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({
      message: 'Password must be between 6 and 128 characters'
    });
  }

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'Email is already registered'
      });
    }

    if (isValidationError(error)) {
      return res.status(400).json({
        message: 'Registration data is invalid'
      });
    }

    console.error('Registration failed:', error.message);
    return res.status(500).json({
      message: 'Registration failed'
    });
  }
});

// Login an existing user
router.post('/login', async (req, res) => {
  const { email, password } = getAuthInput(req.body);

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      message: 'A valid email address is required'
    });
  }

  const attemptKey = loginAttemptKey(email, req);
  const activeLockout = getActiveLockout(attemptKey);

  if (activeLockout) {
    const retryAfterSeconds = Math.ceil((activeLockout.lockedUntil - Date.now()) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      message: 'Too many failed login attempts. Please try again later.'
    });
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      const attempt = recordFailedLogin(attemptKey);

      if (attempt.lockedUntil) {
        const retryAfterSeconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
          message: 'Too many failed login attempts. Please try again later.'
        });
      }

      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    failedLoginAttempts.delete(attemptKey);

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({
      message: 'Login failed'
    });
  }
});

module.exports = router;
