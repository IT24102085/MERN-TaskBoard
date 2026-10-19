
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.js');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication token is required'
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      message: 'Authentication token is required'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }

  if (!decoded?.userId || !mongoose.isValidObjectId(decoded.userId)) {
    return res.status(401).json({
      message: 'Invalid authentication token'
    });
  }

  try {
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error.message);
    return res.status(500).json({
      message: 'Authentication service unavailable'
    });
  }
};

module.exports = authMiddleware;
