require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./services/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/favourites', require('./routes/favourites'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'DriveEase API', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Boot and seed
async function startServer() {
  try {
    console.log('Initializing DriveEase local JSON storage...');
    await db.seedInitialData();
    console.log('Database initialized and verified.');

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 DriveEase Car Rental Platform is live!`);
      console.log(`🔗 Local Web App: http://localhost:${PORT}`);
      console.log(`👑 Demo Admin:    admin@driveease.com / admin123`);
      console.log(`👤 Demo Customer: john.doe@example.com / john123`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
