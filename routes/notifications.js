const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications - Get current user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    let notifications = [];
    if (req.user.role === 'ADMIN') {
      notifications = await db.find('notifications', n => n.userId === req.user.id || n.type === 'admin');
    } else {
      notifications = await db.find('notifications', { userId: req.user.id });
    }

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications: ' + err.message });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notif = await db.findOne('notifications', { id: req.params.id });
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (req.user.role !== 'ADMIN' && notif.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only update your own notifications' });
    }
    const updated = await db.updateById('notifications', req.params.id, { read: true });
    res.json({ message: 'Marked as read', notification: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification: ' + err.message });
  }
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    const notifications = await db.read('notifications');
    const updated = notifications.map(n => {
      if (n.userId === req.user.id || (req.user.role === 'ADMIN' && n.type === 'admin')) {
        return { ...n, read: true };
      }
      return n;
    });
    await db.write('notifications', updated);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read: ' + err.message });
  }
});

// DELETE /api/notifications/:id - Clear notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notif = await db.findOne('notifications', { id: req.params.id });
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (req.user.role !== 'ADMIN' && notif.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own notifications' });
    }
    await db.removeById('notifications', req.params.id);
    res.json({ message: 'Notification cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notification: ' + err.message });
  }
});

module.exports = router;
