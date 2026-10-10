const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/coupons - List active coupons (public) or all coupons (admin)
router.get('/', async (req, res) => {
  try {
    const all = await db.read('coupons');
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons: ' + err.message });
  }
});

// POST /api/coupons/validate - Validate coupon code against an amount
router.post('/validate', async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const cleanCode = code.toUpperCase().trim();
    const coupon = await db.findOne('coupons', { code: cleanCode, active: true });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid or inactive promo code' });
    }

    // Check expiry
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return res.status(400).json({ error: 'This promo code has expired' });
    }

    // Check usage limit
    if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
      return res.status(400).json({ error: 'This promo code has reached maximum usage limit' });
    }

    // Check min amount
    const orderAmount = Number(amount) || 0;
    if (coupon.minAmount && orderAmount < coupon.minAmount) {
      return res.status(400).json({
        error: `Minimum rental booking amount of ₹${coupon.minAmount.toLocaleString('en-IN')} required for this coupon`
      });
    }

    // Calculate discount
    const calculatedDiscount = Math.round((orderAmount * coupon.discountPercent) / 100);
    const finalDiscount = coupon.maxDiscount ? Math.min(calculatedDiscount, coupon.maxDiscount) : calculatedDiscount;

    res.json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount: finalDiscount,
      description: coupon.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Coupon validation failed: ' + err.message });
  }
});

// POST /api/coupons - Admin create new coupon
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, discountPercent, maxDiscount, minAmount, description, validUntil, usageLimit } = req.body;
    if (!code || !discountPercent) {
      return res.status(400).json({ error: 'Coupon code and discount percentage are required' });
    }

    const cleanCode = code.toUpperCase().trim();
    const existing = await db.findOne('coupons', { code: cleanCode });
    if (existing) {
      return res.status(400).json({ error: 'A coupon with this code already exists' });
    }

    const newCoupon = await db.insert('coupons', {
      code: cleanCode,
      discountPercent: Number(discountPercent),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minAmount: minAmount ? Number(minAmount) : 0,
      description: description || `${discountPercent}% Off Rental`,
      validUntil: validUntil || '2027-12-31',
      usageLimit: usageLimit ? Number(usageLimit) : 1000,
      usageCount: 0,
      active: true
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coupon: ' + err.message });
  }
});

// PUT /api/coupons/:id - Admin update coupon
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const updated = await db.updateById('coupons', req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json({ message: 'Coupon updated successfully', coupon: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon: ' + err.message });
  }
});

// DELETE /api/coupons/:id - Admin delete coupon
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await db.removeById('coupons', req.params.id);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon: ' + err.message });
  }
});

module.exports = router;
