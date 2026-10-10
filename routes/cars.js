const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');

// Helper to check if car is booked during specified date range
function isCarBooked(carId, bookings, startDate, endDate) {
  if (!startDate || !endDate) return false;
  const reqStart = new Date(startDate).getTime();
  const reqEnd = new Date(endDate).getTime();

  return bookings.some(b => {
    if (b.carId !== carId) return false;
    if (b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Completed') return false;
    const bStart = new Date(b.pickupDate).getTime();
    const bEnd = new Date(b.returnDate).getTime();
    // Check overlap: (StartA <= EndB) and (EndA >= StartB)
    return (reqStart <= bEnd && reqEnd >= bStart);
  });
}

// GET /api/cars - List/search cars with rich filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    let cars = await db.read('cars');
    const bookings = await db.read('bookings');

    const {
      search,
      brand,
      type,
      minPrice,
      maxPrice,
      seats,
      transmission,
      fuel,
      minRating,
      pickupDate,
      returnDate,
      featured,
      popular,
      luxury,
      sort
    } = req.query;

    // Apply text search
    if (search) {
      const q = search.toLowerCase().trim();
      cars = cars.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Filter by brand
    if (brand && brand !== 'All') {
      const brands = Array.isArray(brand) ? brand : brand.split(',');
      cars = cars.filter(c => brands.map(b => b.toLowerCase()).includes(c.brand.toLowerCase()));
    }

    // Filter by type
    if (type && type !== 'All') {
      const types = Array.isArray(type) ? type : type.split(',');
      cars = cars.filter(c => types.map(t => t.toLowerCase()).includes(c.type.toLowerCase()));
    }

    // Filter by price range
    if (minPrice) {
      cars = cars.filter(c => c.pricePerDay >= Number(minPrice));
    }
    if (maxPrice) {
      cars = cars.filter(c => c.pricePerDay <= Number(maxPrice));
    }

    // Filter by seats
    if (seats && seats !== 'All') {
      cars = cars.filter(c => c.seats >= Number(seats));
    }

    // Filter by transmission
    if (transmission && transmission !== 'All') {
      cars = cars.filter(c => c.transmission.toLowerCase() === transmission.toLowerCase());
    }

    // Filter by fuel
    if (fuel && fuel !== 'All') {
      cars = cars.filter(c => c.fuel.toLowerCase() === fuel.toLowerCase());
    }

    // Filter by min rating
    if (minRating) {
      cars = cars.filter(c => c.rating >= Number(minRating));
    }

    // Filter by category tags
    if (featured === 'true') {
      cars = cars.filter(c => c.featured);
    }
    if (popular === 'true') {
      cars = cars.filter(c => c.popular);
    }
    if (luxury === 'true') {
      cars = cars.filter(c => c.luxury);
    }

    // Date availability filter
    if (pickupDate && returnDate) {
      cars = cars.map(car => {
        const booked = isCarBooked(car.id, bookings, pickupDate, returnDate);
        return {
          ...car,
          isAvailableForDates: !booked && car.status === 'Available'
        };
      });
    } else {
      cars = cars.map(car => ({
        ...car,
        isAvailableForDates: car.status === 'Available'
      }));
    }

    // Sorting
    if (sort) {
      switch (sort) {
        case 'price_asc':
          cars.sort((a, b) => a.pricePerDay - b.pricePerDay);
          break;
        case 'price_desc':
          cars.sort((a, b) => b.pricePerDay - a.pricePerDay);
          break;
        case 'rating_desc':
          cars.sort((a, b) => b.rating - a.rating);
          break;
        case 'popular':
          cars.sort((a, b) => (b.totalBookings || 0) - (a.totalBookings || 0));
          break;
        case 'newest':
          cars.sort((a, b) => (b.year || 2024) - (a.year || 2024));
          break;
        default:
          break;
      }
    }

    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cars: ' + err.message });
  }
});

// GET /api/cars/:id - Single car details
router.get('/:id', async (req, res) => {
  try {
    const car = await db.findOne('cars', { id: req.params.id });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    // Fetch car reviews
    const reviews = await db.find('reviews', r => r.carId === car.id && r.status === 'Approved');
    
    // Check recent bookings
    const bookings = await db.find('bookings', b => b.carId === car.id && ['Confirmed', 'Active'].includes(b.bookingStatus));

    res.json({
      ...car,
      reviews,
      activeBookings: bookings.map(b => ({ pickupDate: b.pickupDate, returnDate: b.returnDate }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch car: ' + err.message });
  }
});

// POST /api/cars - Admin create new car
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const {
      name,
      brand,
      type,
      year,
      pricePerDay,
      seats,
      transmission,
      fuel,
      mileage,
      power,
      acceleration,
      topSpeed,
      image,
      gallery,
      location,
      description,
      features,
      featured,
      popular,
      luxury
    } = req.body;

    if (!name || !brand || !pricePerDay) {
      return res.status(400).json({ error: 'Car name, brand, and daily price are required' });
    }

    const newCar = await db.insert('cars', {
      name: name.trim(),
      brand: brand.trim(),
      type: type || 'Sedan',
      year: Number(year) || 2024,
      pricePerDay: Number(pricePerDay),
      seats: Number(seats) || 5,
      transmission: transmission || 'Automatic',
      fuel: fuel || 'Petrol',
      mileage: mileage || '15 km/l',
      power: power || '200 HP',
      acceleration: acceleration || '7.0s (0-100)',
      topSpeed: topSpeed || '240 km/h',
      rating: 5.0,
      reviewsCount: 0,
      status: 'Available',
      featured: Boolean(featured),
      popular: Boolean(popular),
      luxury: Boolean(luxury),
      image: image || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80',
      gallery: gallery || [image || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop&q=80'],
      location: location || 'Mumbai Airport & Downtown Hub',
      description: description || 'Premium rental vehicle offering luxury, comfort, and state-of-the-art performance.',
      features: features || ['Apple CarPlay', 'Surround Sound', 'Climate Control', 'Cruise Control'],
      cancellationPolicy: 'Free cancellation up to 24 hours prior to journey.',
      totalBookings: 0,
      totalEarnings: 0,
      maintenanceCost: 0
    });

    // Log activity
    await db.insert('activities', {
      type: 'car_added',
      user: req.user.email,
      userName: req.user.name,
      action: 'Car added to fleet',
      description: `Added ${newCar.name} (${newCar.brand}) to the fleet`,
      icon: 'truck',
      time: 'Just now'
    });

    res.status(201).json({ message: 'Car added successfully', car: newCar });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create car: ' + err.message });
  }
});

// PUT /api/cars/:id - Admin update car
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const carId = req.params.id;
    const existing = await db.findOne('cars', { id: carId });
    if (!existing) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const updated = await db.updateById('cars', carId, req.body);

    // Log activity
    await db.insert('activities', {
      type: 'car_updated',
      user: req.user.email,
      userName: req.user.name,
      action: 'Car details updated',
      description: `Updated fleet specifications for ${existing.name}`,
      icon: 'edit',
      time: 'Just now'
    });

    res.json({ message: 'Car updated successfully', car: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update car: ' + err.message });
  }
});

// PUT /api/cars/:id/status - Admin update car status (Available, Maintenance, Out of Service)
router.put('/:id/status', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Available', 'Rented', 'Maintenance', 'Unavailable'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await db.updateById('cars', req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Car not found' });
    }

    await db.insert('activities', {
      type: 'car_status_changed',
      user: req.user.email,
      userName: req.user.name,
      action: 'Car status changed',
      description: `${updated.name} status changed to ${status}`,
      icon: 'tool',
      time: 'Just now'
    });

    res.json({ message: `Car status updated to ${status}`, car: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update car status: ' + err.message });
  }
});

// DELETE /api/cars/:id - Admin delete car
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const car = await db.findOne('cars', { id: req.params.id });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    await db.removeById('cars', req.params.id);

    await db.insert('activities', {
      type: 'car_deleted',
      user: req.user.email,
      userName: req.user.name,
      action: 'Car removed from fleet',
      description: `Removed ${car.name} from active fleet`,
      icon: 'trash-2',
      time: 'Just now'
    });

    res.json({ message: 'Car deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete car: ' + err.message });
  }
});

module.exports = router;
