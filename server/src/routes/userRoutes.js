const express = require('express');
const User = require('../models/User.js');
const authMiddleware = require('../middleware/authMiddleware.js');

const router = express.Router();

// Projects currently have an owner-only access model and no membership
// collection. Until collaborators are modeled, the only eligible assignee is
// the authenticated project owner.
router.get('/eligible-assignees', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: req.user._id })
      .select('_id name email')
      .lean();

    return res.json({ users });
  } catch (error) {
    console.error('Eligible user lookup failed:', error.message);
    return res.status(500).json({ message: 'Failed to load eligible users' });
  }
});

module.exports = router;
