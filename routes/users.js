const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// GET /api/users - Admin list all users with stats
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await db.read('users');
    const bookings = await db.read('bookings');

    const enrichedUsers = users.map(user => {
      const userBookings = bookings.filter(b => b.userId === user.id);
      const activeBooking = userBookings.find(b => ['Confirmed', 'Active'].includes(b.bookingStatus));
      const totalSpent = userBookings.filter(b => b.paymentStatus === 'Paid').reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      return {
        ...sanitizeUser(user),
        totalBookings: userBookings.length,
        totalSpent: totalSpent || user.totalSpent || 0,
        activeBooking: activeBooking ? {
          id: activeBooking.id,
          carName: activeBooking.carName,
          status: activeBooking.bookingStatus,
          dates: `${activeBooking.pickupDate} to ${activeBooking.returnDate}`
        } : null
      };
    });

    res.json(enrichedUsers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// GET /api/users/:id - Admin view single user details and their bookings
router.get('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const user = await db.findOne('users', { id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bookings = await db.find('bookings', { userId: user.id });
    const payments = await db.find('payments', { userId: user.id });
    const reviews = await db.find('reviews', { userId: user.id });

    res.json({
      user: sanitizeUser(user),
      bookings,
      payments,
      reviews
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile: ' + err.message });
  }
});

// POST /api/users - Admin create new user
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, phone, address, licenseNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.findOne('users', { email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.insert('users', {
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      membership: role === 'ADMIN' ? 'Administrator' : 'Standard Member',
      phone: phone || '',
      address: address || '',
      licenseNumber: licenseNumber || '',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      status: 'Active',
      profileCompletion: 70,
      totalBookings: 0,
      totalSpent: 0
    });

    res.status(201).json({ message: 'User created successfully', user: sanitizeUser(newUser) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

// PUT /api/users/:id/status - Admin enable/disable user account
router.put('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await db.findOne('users', { id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN' && req.user.id === user.id) {
      return res.status(400).json({ error: 'Cannot disable your own admin account' });
    }

    const updated = await db.updateById('users', user.id, { status });

    // Log activity
    await db.insert('activities', {
      type: 'user_status_changed',
      user: req.user.email,
      userName: req.user.name,
      action: `User account ${status.toLowerCase()}`,
      description: `Account for ${user.name} (${user.email}) marked as ${status}`,
      icon: status === 'Active' ? 'check-circle' : 'slash',
      time: 'Just now'
    });

    res.json({ message: `User account is now ${status}`, user: sanitizeUser(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status: ' + err.message });
  }
});

module.exports = router;
