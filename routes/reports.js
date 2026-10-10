const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

function toCSV(headers, rows) {
  const headLine = headers.join(',');
  const rowLines = rows.map(r => r.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','));
  return [headLine, ...rowLines].join('\n');
}

// GET /api/reports/export/:type - Export CSV report
router.get('/export/:type', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const type = req.params.type;
    let csvData = '';
    let filename = `driveease_${type}_report_${Date.now()}.csv`;

    if (type === 'bookings') {
      const bookings = await db.read('bookings');
      const headers = ['Booking ID', 'Customer Name', 'Email', 'Car Name', 'Pickup Location', 'Return Location', 'Pickup Date', 'Return Date', 'Days', 'Amount', 'Payment Status', 'Booking Status', 'Created At'];
      const rows = bookings.map(b => [
        b.id, b.userName, b.userEmail, b.carName, b.pickupLocation, b.returnLocation,
        b.pickupDate, b.returnDate, b.days, b.totalAmount, b.paymentStatus, b.bookingStatus, b.createdAt
      ]);
      csvData = toCSV(headers, rows);
    } else if (type === 'revenue' || type === 'payments') {
      const payments = await db.read('payments');
      const headers = ['Payment ID', 'Booking ID', 'Customer Name', 'Car Name', 'Amount', 'Payment Method', 'Status', 'Date'];
      const rows = payments.map(p => [
        p.id, p.bookingId, p.userName, p.carName, p.amount, p.method, p.status, p.date
      ]);
      csvData = toCSV(headers, rows);
    } else if (type === 'fleet') {
      const cars = await db.read('cars');
      const headers = ['Car ID', 'Car Name', 'Brand', 'Category', 'Year', 'Price/Day', 'Transmission', 'Fuel', 'Rating', 'Status', 'Total Bookings', 'Total Earnings', 'Maintenance Cost'];
      const rows = cars.map(c => [
        c.id, c.name, c.brand, c.type, c.year, c.pricePerDay, c.transmission, c.fuel, c.rating, c.status, c.totalBookings, c.totalEarnings, c.maintenanceCost
      ]);
      csvData = toCSV(headers, rows);
    } else if (type === 'users') {
      const users = await db.read('users');
      const headers = ['User ID', 'Name', 'Email', 'Role', 'Membership', 'Phone', 'Status', 'Total Bookings', 'Total Spent', 'Registered At'];
      const rows = users.map(u => [
        u.id, u.name, u.email, u.role, u.membership || 'Standard', u.phone, u.status, u.totalBookings, u.totalSpent, u.createdAt
      ]);
      csvData = toCSV(headers, rows);
    } else if (type === 'expenses') {
      const expenses = await db.read('expenses');
      const headers = ['Expense ID', 'Title', 'Category', 'Amount', 'Date', 'Created At'];
      const rows = expenses.map(e => [
        e.id, e.title, e.category, e.amount, e.date, e.createdAt || e.date
      ]);
      csvData = toCSV(headers, rows);
    } else {
      return res.status(400).json({ error: 'Invalid report type. Supported: bookings, revenue, payments, fleet, users, expenses' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report: ' + err.message });
  }
});

module.exports = router;
