const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate } = require('../middleware/auth');

// GET /api/favourites - List user's favourite cars with full details
router.get('/', authenticate, async (req, res) => {
  try {
    const favs = await db.find('favourites', { userId: req.user.id });
    const cars = await db.read('cars');

    const favCars = favs.map(f => {
      const car = cars.find(c => c.id === f.carId);
      return car ? { ...car, favouriteId: f.id, favouritedAt: f.createdAt } : null;
    }).filter(Boolean);

    res.json(favCars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favourites: ' + err.message });
  }
});

// POST /api/favourites/toggle/:carId - Toggle favourite
router.post('/toggle/:carId', authenticate, async (req, res) => {
  try {
    const carId = req.params.carId;
    const car = await db.findOne('cars', { id: carId });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const existing = await db.findOne('favourites', { userId: req.user.id, carId });
    if (existing) {
      await db.removeById('favourites', existing.id);
      return res.json({ message: 'Removed from favourites', isFavourite: false, carId });
    } else {
      const newFav = await db.insert('favourites', {
        userId: req.user.id,
        carId
      });

      // Log activity
      await db.insert('activities', {
        type: 'car_favourited',
        user: req.user.email,
        userName: req.user.name,
        action: 'Added car to favourites',
        description: `Added ${car.name} to favourites`,
        icon: 'heart',
        time: 'Just now'
      });

      return res.json({ message: 'Added to favourites', isFavourite: true, carId, favourite: newFav });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favourite: ' + err.message });
  }
});

module.exports = router;
