const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function del(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function put(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function del(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runE2ETests() {
  console.log('🏁 Starting Complete DriveEase E2E Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Health
    const health = await get('/api/health');
    assert(health.status === 200 && health.body.status === 'ok', 'Server health check returns 200 OK');

    // Test 2: Guest Car Browsing
    const cars = await get('/api/cars');
    assert(cars.status === 200 && cars.body.length >= 10, `Guest can browse all ${cars.body.length} fleet cars`);

    const bmwCars = await get('/api/cars?search=BMW');
    assert(bmwCars.body.every(c => c.name.includes('BMW') || c.brand.includes('BMW')), 'Guest car text search filter works for BMW');

    const suvCars = await get('/api/cars?type=SUV');
    assert(suvCars.body.every(c => c.type === 'SUV'), 'Guest category filter works for SUVs');

    // Test 3: Coupon validation
    const couponValid = await post('/api/coupons/validate', { code: 'WEEKEND20', amount: 20000 });
    assert(couponValid.status === 200 && couponValid.body.discountAmount === 4000, 'Coupon WEEKEND20 validates with 20% discount (₹4,000 off ₹20,000)');

    // Test 4: Customer Login (John Doe)
    const custLogin = await post('/api/auth/login', { email: 'john.doe@example.com', password: 'john123' });
    assert(custLogin.status === 200 && custLogin.body.user.name === 'John Doe', 'Customer login (John Doe) successful');
    const custToken = custLogin.body.token;

    // Test 5: Customer Analytics (Dashboard matching Screenshot 1)
    const custAnalytics = await get('/api/analytics/user', custToken);
    assert(custAnalytics.status === 200 && custAnalytics.body.kpis.totalBookings >= 1, 'Customer Dashboard KPIs calculated dynamically');
    assert(custAnalytics.body.recommendedCars.length > 0, 'Rule-based recommendation engine produces personalized recommendations');
    assert(custAnalytics.body.profileCompletion >= 80, 'Profile completion is accurately calculated');

    // Test 6: Create New Booking & Overlap Collision Check
    const availableCars = await get('/api/cars');
    const targetCar = availableCars.body.find(c => c.pricePerDay >= 5000 && c.status === 'Available') || availableCars.body[0];
    const offsetDays = 500 + Math.floor(Math.random() * 5000);
    const sDate = new Date(Date.now() + 86400000 * offsetDays);
    const eDate = new Date(sDate.getTime() + 86400000 * 3);
    const sStr = sDate.toISOString().split('T')[0];
    const eStr = eDate.toISOString().split('T')[0];

    const newBookingRes = await post('/api/bookings', {
      carId: targetCar.id,
      pickupLocation: 'Mumbai Airport (BOM)',
      returnLocation: 'Mumbai Airport (BOM)',
      pickupDate: sStr,
      returnDate: eStr,
      pickupTime: '10:00 AM',
      returnTime: '06:00 PM',
      addOns: [
        { name: 'Comprehensive Zero-Deductible Insurance', price: 2400 },
        { name: 'GPS Navigation System', price: 600 }
      ],
      couponCode: 'WEEKEND20'
    }, custToken);
    assert(newBookingRes.status === 201 && newBookingRes.body?.booking?.id?.startsWith('BK-'), `Booking created successfully #${newBookingRes.body?.booking?.id || JSON.stringify(newBookingRes.body)}`);
    const bookingId = newBookingRes.body?.booking?.id;

    // Test 7: Overlap collision protection
    const overlapRes = await post('/api/bookings', {
      carId: targetCar.id,
      pickupLocation: 'Mumbai Airport (BOM)',
      pickupDate: sStr,
      returnDate: eStr,
      pickupTime: '10:00 AM',
      returnTime: '06:00 PM'
    }, custToken);
    assert(overlapRes.status === 409, 'Overlapping booking on conflicting dates for same vehicle is successfully rejected (409 Conflict)');

    // Test 8: Process Demo Payment
    const payRes = await post('/api/payments/process', {
      bookingId,
      method: 'Credit Card',
      cardLast4: '4242'
    }, custToken);
    assert(payRes.status === 200 && payRes.body.payment.status === 'Paid', `Demo payment processed successfully #${payRes.body.payment.id}`);

    // Test 9: Toggle Favourites
    const favRes = await post('/api/favourites/toggle/car_tesla_model_s', {}, custToken);
    assert(favRes.status === 200 && typeof favRes.body.isFavourite === 'boolean', `Toggled Tesla Model S in Customer Favourites (isFavourite: ${favRes.body.isFavourite})`);

    // Test 10: Submit Review
    const revRes = await post('/api/reviews', {
      carId: 'car_merc_g63',
      rating: 5,
      title: 'Monstrous acceleration and unmatched luxury',
      comment: 'The G63 AMG exhaust note is unforgettable. Exceptional service by DriveEase team.'
    }, custToken);
    assert(revRes.status === 201 && revRes.body.review.rating === 5, 'Customer review submitted and published');

    // Test 11: Admin Login
    const adminLogin = await post('/api/auth/login', { email: 'admin@driveease.com', password: 'admin123' });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'ADMIN', 'Admin authentication (admin@driveease.com) successful');
    const adminToken = adminLogin.body.token;

    // Test 12: Admin Dashboard Analytics (Screenshot 2)
    const adminAnalytics = await get('/api/analytics/admin', adminToken);
    assert(adminAnalytics.status === 200 && adminAnalytics.body.kpis.totalRevenue > 0, 'Admin Dashboard Analytics computed dynamically with real revenue & profit');
    assert(adminAnalytics.body.carStatusBreakdown.length === 4, 'Car Status donut breakdown calculated (Available, Rented, Maintenance, Out of Service)');
    assert(adminAnalytics.body.bookingStatusBreakdown.length === 5, 'Booking Status donut breakdown calculated');
    assert(adminAnalytics.body.topCars.length > 0, 'Top Performing Cars leaderboard calculated');

    // Test 13: Admin Fleet Management (Add Car)
    const newCar = await post('/api/cars', {
      name: 'Lamborghini Urus S',
      brand: 'Lamborghini',
      type: 'Luxury',
      year: 2025,
      pricePerDay: 35000,
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Petrol',
      power: '657 HP',
      image: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?w=800&auto=format&fit=crop&q=80',
      description: 'Super SUV combining supercar dynamics with luxurious versatility.'
    }, adminToken);
    assert(newCar.status === 201 && newCar.body.car.name === 'Lamborghini Urus S', 'Admin created new vehicle in fleet');
    if (newCar.body?.car?.id) {
      await del(`/api/cars/${newCar.body.car.id}`, adminToken);
    }

    // Test 14: Admin Expense Recording & Profit Calculation
    const expRes = await post('/api/expenses', {
      title: 'Ceramic Coating & Windshield Treatment',
      category: 'Maintenance',
      amount: 18000,
      date: '2026-10-07'
    }, adminToken);
    assert(expRes.status === 201 && expRes.body.expense.amount === 18000, 'Admin recorded operational expense');

    // Test 15: CSV Reports
    const repRes = await get('/api/reports/export/bookings', adminToken);
    assert(repRes.status === 200 && repRes.body.includes('Booking ID'), 'Admin can export bookings CSV report');

    console.log(`\n=======================================================`);
    console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`=======================================================`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runE2ETests();
