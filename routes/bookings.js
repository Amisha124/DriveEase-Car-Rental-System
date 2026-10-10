const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Helper to check for booking collisions
function hasDateOverlap(existingStart, existingEnd, newStart, newEnd) {
  const eStart = new Date(existingStart).getTime();
  const eEnd = new Date(existingEnd).getTime();
  const nStart = new Date(newStart).getTime();
  const nEnd = new Date(newEnd).getTime();
  return (nStart <= eEnd && nEnd >= eStart);
}

// GET /api/bookings - Fetch user bookings or all bookings (for Admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, carId } = req.query;
    let bookings = [];

    if (req.user.role === 'ADMIN') {
      bookings = await db.read('bookings');
    } else {
      bookings = await db.find('bookings', { userId: req.user.id });
    }

    if (status && status !== 'All') {
      bookings = bookings.filter(b => b.bookingStatus.toLowerCase() === status.toLowerCase());
    }

    if (carId) {
      bookings = bookings.filter(b => b.carId === carId);
    }

    // Sort newest first
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings: ' + err.message });
  }
});

// GET /api/bookings/:id - Single booking details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await db.findOne('bookings', { id: req.params.id });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Customer can only see their own booking
    if (req.user.role !== 'ADMIN' && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const car = await db.findOne('cars', { id: booking.carId });
    const user = await db.findOne('users', { id: booking.userId });

    res.json({
      ...booking,
      carDetails: car,
      customerDetails: user ? {
        name: user.name,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking details: ' + err.message });
  }
});

// POST /api/bookings - Create a new booking
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      carId,
      pickupLocation,
      returnLocation,
      pickupDate,
      returnDate,
      pickupTime,
      returnTime,
      addOns = [],
      couponCode,
      customerName,
      customerPhone
    } = req.body;

    if (!carId || !pickupDate || !returnDate || !pickupLocation) {
      return res.status(400).json({ error: 'Car, dates, and pickup location are required' });
    }

    const car = await db.findOne('cars', { id: carId });
    if (!car) {
      return res.status(404).json({ error: 'Selected car not found' });
    }

    if (car.status === 'Maintenance' || car.status === 'Out of Service') {
      return res.status(400).json({ error: `Car is currently in ${car.status} and unavailable for booking` });
    }

    // Check date validity
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: 'Invalid pickup or return date' });
    }

    // Calculate days (minimum 1 day)
    const diffTime = Math.abs(end - start);
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Check for overlapping active bookings for this car
    const existingBookings = await db.find('bookings', b =>
      b.carId === carId && ['Confirmed', 'Active', 'Pending'].includes(b.bookingStatus)
    );

    const isConflict = existingBookings.some(b => hasDateOverlap(b.pickupDate, b.returnDate, pickupDate, returnDate));
    if (isConflict) {
      return res.status(409).json({ error: 'Selected car is already reserved for the chosen dates. Please choose different dates or another vehicle.' });
    }

    // Pricing calculation
    const basePrice = car.pricePerDay * days;
    const insurancePrice = Math.round(basePrice * 0.10); // Standard 10% insurance rate

    let addOnsPrice = insurancePrice;
    const formattedAddOns = [{ name: 'Comprehensive Zero-Deductible Insurance', price: insurancePrice }];

    if (Array.isArray(addOns)) {
      addOns.forEach(addon => {
        if (addon && addon.name && addon.price) {
          // If this is insurance and already added in default formattedAddOns, skip duplicating
          const isInsurance = addon.name.toLowerCase().includes('insurance') || addon.name.toLowerCase().includes('zero-deductible');
          if (isInsurance) {
            return;
          }
          formattedAddOns.push({ name: addon.name, price: Number(addon.price) });
          addOnsPrice += Number(addon.price);
        }
      });
    }

    // Coupon discount calculation
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await db.findOne('coupons', { code: couponCode.toUpperCase().trim(), active: true });
      if (coupon) {
        const subtotal = basePrice + addOnsPrice;
        if (subtotal >= (coupon.minAmount || 0)) {
          const calculatedDiscount = Math.round((subtotal * coupon.discountPercent) / 100);
          discount = Math.min(calculatedDiscount, coupon.maxDiscount || calculatedDiscount);
          appliedCoupon = coupon.code;

          // Increment coupon usage
          await db.updateById('coupons', coupon.id, { usageCount: (coupon.usageCount || 0) + 1 });
        }
      }
    }

    const subtotalAfterDiscount = Math.max(0, (basePrice + addOnsPrice) - discount);
    const tax = Math.round(subtotalAfterDiscount * 0.18); // 18% GST/Tax
    const totalAmount = subtotalAfterDiscount + tax;

    const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking = await db.insert('bookings', {
      id: bookingId,
      userId: req.user.id,
      userName: customerName || req.user.name,
      userEmail: req.user.email,
      userPhone: customerPhone || req.user.phone || '+91 98765 00000',
      carId: car.id,
      carName: car.name,
      carBrand: car.brand,
      carImage: car.image,
      pickupLocation,
      returnLocation: returnLocation || pickupLocation,
      pickupDate,
      returnDate,
      pickupTime: pickupTime || '10:00 AM',
      returnTime: returnTime || '06:00 PM',
      days,
      basePrice,
      insurancePrice,
      addOns: formattedAddOns,
      addOnsPrice,
      couponCode: appliedCoupon,
      discount,
      tax,
      totalAmount,
      paymentStatus: 'Pending',
      paymentMethod: null,
      paymentId: null,
      bookingStatus: 'Pending'
    });

    // Create notification for customer
    await db.insert('notifications', {
      userId: req.user.id,
      title: 'Booking Created',
      message: `Your booking #${newBooking.id} for ${car.name} has been initiated. Complete payment to confirm.`,
      type: 'booking',
      read: false
    });

    // Create activity
    await db.insert('activities', {
      type: 'booking_created',
      user: req.user.email,
      userName: req.user.name,
      action: 'Car booking created',
      description: `${req.user.name} created booking #${newBooking.id} for ${car.name}`,
      icon: 'calendar',
      time: 'Just now'
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking: ' + err.message });
  }
});

// PUT /api/bookings/:id/cancel - User or Admin cancel booking
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await db.findOne('bookings', { id: req.params.id });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (req.user.role !== 'ADMIN' && booking.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (['Completed', 'Cancelled'].includes(booking.bookingStatus)) {
      return res.status(400).json({ error: `Booking is already ${booking.bookingStatus.toLowerCase()}` });
    }

    let updatedPaymentStatus = booking.paymentStatus;
    if (booking.paymentStatus === 'Paid') {
      updatedPaymentStatus = 'Refunded';

      // Update existing payment record to refunded
      if (booking.paymentId) {
        await db.update('payments', { id: booking.paymentId }, {
          status: 'Refunded',
          refundDate: new Date().toISOString()
        });
      }
    }

    const updated = await db.updateById('bookings', booking.id, {
      bookingStatus: 'Cancelled',
      paymentStatus: updatedPaymentStatus
    });

    // Notify user
    await db.insert('notifications', {
      userId: booking.userId,
      title: 'Booking Cancelled',
      message: `Booking #${booking.id} has been cancelled.${booking.paymentStatus === 'Paid' ? ' A full refund has been initiated to your original payment method.' : ''}`,
      type: 'alert',
      read: false
    });

    // Log activity
    await db.insert('activities', {
      type: 'booking_cancelled',
      user: req.user.email,
      userName: req.user.name,
      action: 'Booking cancelled',
      description: `${booking.carName} • #${booking.id}`,
      icon: 'x-circle',
      time: 'Just now'
    });

    res.json({ message: 'Booking cancelled successfully', booking: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking: ' + err.message });
  }
});

// PUT /api/bookings/:id/status - Admin update booking status (Pending, Confirmed, Active, Completed, Cancelled)
router.put('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const booking = await db.findOne('bookings', { id: req.params.id });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updates = {};
    if (bookingStatus) updates.bookingStatus = bookingStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus;

    const updated = await db.updateById('bookings', booking.id, updates);

    // If status became Active, mark car status as Rented
    if (bookingStatus === 'Active') {
      await db.updateById('cars', booking.carId, { status: 'Rented' });
    } else if (['Completed', 'Cancelled'].includes(bookingStatus)) {
      await db.updateById('cars', booking.carId, { status: 'Available' });
    }

    // Notify customer
    await db.insert('notifications', {
      userId: booking.userId,
      title: `Booking Status: ${bookingStatus || 'Updated'}`,
      message: `Your booking #${booking.id} for ${booking.carName} is now marked as ${bookingStatus}.`,
      type: 'booking',
      read: false
    });

    // Log activity
    await db.insert('activities', {
      type: 'booking_status_updated',
      user: req.user.email,
      userName: req.user.name,
      action: 'Admin updated booking status',
      description: `Booking #${booking.id} status changed to ${bookingStatus}`,
      icon: 'refresh-cw',
      time: 'Just now'
    });

    res.json({ message: 'Booking status updated successfully', booking: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status: ' + err.message });
  }
});

module.exports = router;
