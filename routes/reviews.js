const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Helper to recalculate car average rating
async function updateCarRating(carId) {
  const reviews = await db.find('reviews', r => r.carId === carId && r.status === 'Approved');
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const rounded = Math.round(avg * 10) / 10;
    await db.updateById('cars', carId, {
      rating: rounded,
      reviewsCount: reviews.length
    });
  }
}

// GET /api/reviews/car/:carId - Public approved reviews for a car
router.get('/car/:carId', async (req, res) => {
  try {
    const reviews = await db.find('reviews', r => r.carId === req.params.carId && r.status === 'Approved');
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews: ' + err.message });
  }
});

// GET /api/reviews/all - Admin view all reviews with status
router.get('/all', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const reviews = await db.read('reviews');
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all reviews: ' + err.message });
  }
});

// GET /api/reviews/my - User's submitted reviews
router.get('/my', authenticate, async (req, res) => {
  try {
    const reviews = await db.find('reviews', { userId: req.user.id });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your reviews: ' + err.message });
  }
});

// POST /api/reviews - Submit review
router.post('/', authenticate, async (req, res) => {
  try {
    const { carId, rating, title, comment } = req.body;
    if (!carId || !rating || !comment) {
      return res.status(400).json({ error: 'Car, star rating, and review comment are required' });
    }

    const car = await db.findOne('cars', { id: carId });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const numRating = Math.min(5, Math.max(1, Number(rating)));

    // Prevent duplicate review submissions: if user already reviewed this vehicle, update existing review
    const existing = await db.findOne('reviews', r =>
      r.carId === carId &&
      r.userId === req.user.id
    );

    if (existing) {
      const updated = await db.updateById('reviews', existing.id, {
        rating: numRating,
        title: title || existing.title || 'Great Experience',
        comment: comment.trim(),
        status: 'Approved'
      });
      await updateCarRating(carId);
      return res.status(201).json({ message: 'Review updated successfully', review: updated });
    }

    const newReview = await db.insert('reviews', {
      carId,
      carName: car.name,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatar,
      rating: numRating,
      title: title || 'Great Experience',
      comment: comment.trim(),
      status: 'Approved' // Auto-approve by default, admin can moderate
    });

    await updateCarRating(carId);

    // Log activity
    await db.insert('activities', {
      type: 'review_submitted',
      user: req.user.email,
      userName: req.user.name,
      action: 'Review submitted',
      description: `${req.user.name} rated ${car.name} (${numRating}★)`,
      icon: 'star',
      time: 'Just now'
    });

    res.status(201).json({ message: 'Review submitted successfully', review: newReview });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review: ' + err.message });
  }
});

// PUT /api/reviews/:id/status - Admin moderate review (Approved / Rejected)
router.put('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await db.findOne('reviews', { id: req.params.id });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const updated = await db.updateById('reviews', review.id, { status });
    await updateCarRating(review.carId);

    res.json({ message: `Review status changed to ${status}`, review: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update review status: ' + err.message });
  }
});

// DELETE /api/reviews/:id - Delete review (Admin or Author)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await db.findOne('reviews', { id: req.params.id });
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Ownership check: allow admin or review author
    if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only delete your own reviews' });
    }

    await db.removeById('reviews', req.params.id);
    await updateCarRating(review.carId);

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review: ' + err.message });
  }
});

module.exports = router;
