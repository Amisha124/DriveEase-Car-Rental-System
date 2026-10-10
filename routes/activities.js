const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/activities - Admin view recent activities feed
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const activities = await db.read('activities');
    activities.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(activities.slice(0, 50));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs: ' + err.message });
  }
});

module.exports = router;
