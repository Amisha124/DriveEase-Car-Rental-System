const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/payments - User payments or all payments for Admin
router.get('/', authenticate, async (req, res) => {
  try {
    let payments = [];
    if (req.user.role === 'ADMIN') {
      payments = await db.read('payments');
    } else {
      payments = await db.find('payments', { userId: req.user.id });
    }

    payments.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments: ' + err.message });
  }
});

// GET /api/payments/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const payment = await db.findOne('payments', { id: req.params.id });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (req.user.role !== 'ADMIN' && payment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment: ' + err.message });
  }
});

// POST /api/payments/process - Process interactive demo payment
router.post('/process', authenticate, async (req, res) => {
  try {
    const { bookingId, method, cardLast4, upiId, bankName, walletName } = req.body;
    if (!bookingId || !method) {
      return res.status(400).json({ error: 'Booking ID and payment method are required' });
    }

    const validMethods = ['Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Pay at Pickup'];
    const sanitizedMethod = validMethods.find(m => m.toLowerCase() === method.toLowerCase()) || method;

    const booking = await db.findOne('bookings', { id: bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: You can only pay for your own bookings' });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ error: 'Booking is already paid' });
    }

    const isPayAtPickup = sanitizedMethod === 'Pay at Pickup';
    const paymentStatus = isPayAtPickup ? 'Pay at Pickup' : 'Paid';
    const paymentId = `PAY-${Math.floor(10000 + Math.random() * 90000)}`;
    const paymentDate = new Date().toISOString();

    // Create payment record
    const paymentRecord = await db.insert('payments', {
      id: paymentId,
      bookingId: booking.id,
      userId: req.user.id,
      userName: booking.userName || req.user.name,
      carName: booking.carName,
      amount: booking.totalAmount,
      method: sanitizedMethod,
      cardLast4: cardLast4 || (sanitizedMethod === 'Credit Card' ? '4242' : (sanitizedMethod === 'Debit Card' ? '8821' : null)),
      upiId: upiId || (sanitizedMethod === 'UPI' ? `${req.user.name.toLowerCase().replace(/\s+/g, '')}@okaxis` : null),
      bankName: bankName || (sanitizedMethod === 'Net Banking' ? 'HDFC Bank' : null),
      walletName: walletName || (sanitizedMethod === 'Wallet' ? 'DriveEase VIP Wallet' : null),
      status: paymentStatus,
      date: paymentDate
    });

    // Update booking status
    await db.updateById('bookings', booking.id, {
      paymentStatus,
      paymentMethod: sanitizedMethod,
      paymentId: paymentRecord.id,
      bookingStatus: 'Confirmed'
    });

    // Update user stats
    const user = await db.findOne('users', { id: req.user.id });
    if (user) {
      await db.updateById('users', user.id, {
        totalBookings: (user.totalBookings || 0) + 1,
        totalSpent: (user.totalSpent || 0) + (isPayAtPickup ? 0 : booking.totalAmount)
      });
    }

    // Update car stats
    const car = await db.findOne('cars', { id: booking.carId });
    if (car) {
      await db.updateById('cars', car.id, {
        totalBookings: (car.totalBookings || 0) + 1,
        totalEarnings: (car.totalEarnings || 0) + (isPayAtPickup ? 0 : booking.totalAmount)
      });
    }

    // User notification
    await db.insert('notifications', {
      userId: req.user.id,
      title: isPayAtPickup ? 'Booking Reserved (Pay at Pickup) 🚗' : 'Payment Successful! 🎉',
      message: isPayAtPickup 
        ? `Your reservation for ${booking.carName} (Booking #${booking.id}) is confirmed. Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} is due at vehicle pickup.`
        : `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} for ${booking.carName} (Booking #${booking.id}) confirmed.`,
      type: isPayAtPickup ? 'booking' : 'payment',
      read: false
    });

    // Admin notification
    const admins = await db.find('users', { role: 'ADMIN' });
    for (const admin of admins) {
      await db.insert('notifications', {
        userId: admin.id,
        title: isPayAtPickup ? 'New Pay-at-Pickup Booking' : 'New Paid Booking',
        message: `${booking.userName || req.user.name} confirmed booking #${booking.id} for ${booking.carName} via ${sanitizedMethod} (₹${booking.totalAmount.toLocaleString('en-IN')}).`,
        type: 'admin',
        read: false
      });
    }

    // Activity Log
    await db.insert('activities', {
      type: isPayAtPickup ? 'booking_confirmed' : 'payment_received',
      user: req.user.email,
      userName: req.user.name,
      action: isPayAtPickup ? 'Reservation confirmed (Pay at Pickup)' : 'Payment received',
      description: `₹${booking.totalAmount.toLocaleString('en-IN')} via ${sanitizedMethod} • ${booking.carName}`,
      icon: isPayAtPickup ? 'map-pin' : 'credit-card',
      time: 'Just now'
    });

    res.status(200).json({
      message: isPayAtPickup ? 'Booking confirmed for Pay at Pickup' : 'Payment processed successfully',
      payment: paymentRecord,
      bookingId: booking.id
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment processing failed: ' + err.message });
  }
});

module.exports = router;
