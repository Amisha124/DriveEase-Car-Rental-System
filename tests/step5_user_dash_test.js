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

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

async function runStep5UserDashSuite() {
  console.log('🚀 Running Step 5 Comprehensive Customer Dashboard Test Suite...\n');

  // 1. Customer Login
  const loginRes = await post('/api/auth/login', {
    email: 'john.doe@example.com',
    password: 'john123'
  });
  assert(loginRes.status === 200 && loginRes.body.token, 'Customer login succeeded');
  const token = loginRes.body.token;
  const user = loginRes.body.user;

  // 2. User Analytics & KPIs
  const analyticsRes = await get('/api/analytics/user', token);
  assert(analyticsRes.status === 200, 'User analytics API returned 200');
  assert(analyticsRes.body.kpis.totalBookings >= 0, `Total bookings count: ${analyticsRes.body.kpis.totalBookings}`);
  assert(analyticsRes.body.kpis.totalSpent >= 0, `Total verified spend: ₹${analyticsRes.body.kpis.totalSpent}`);
  assert(Array.isArray(analyticsRes.body.recommendedCars), 'Recommended cars array generated');

  // 3. User Bookings
  const bookingsRes = await get('/api/bookings', token);
  assert(bookingsRes.status === 200, 'Customer bookings retrieved');
  assert(Array.isArray(bookingsRes.body), `Found ${bookingsRes.body.length} bookings for user`);

  // 4. Favourites
  const favsRes = await get('/api/favourites', token);
  assert(favsRes.status === 200, 'Favourites retrieved');
  assert(Array.isArray(favsRes.body), `Found ${favsRes.body.length} saved vehicles`);

  // 5. Payments
  const paymentsRes = await get('/api/payments', token);
  assert(paymentsRes.status === 200, 'Payments retrieved');
  assert(Array.isArray(paymentsRes.body), `Found ${paymentsRes.body.length} payment records`);

  // 6. Notifications
  const notifsRes = await get('/api/notifications', token);
  assert(notifsRes.status === 200, 'Notifications retrieved');
  assert(Array.isArray(notifsRes.body.notifications), `Found ${notifsRes.body.notifications.length} notifications`);

  // Mark all read
  const markReadRes = await post('/api/notifications/read-all', {}, token);
  assert(markReadRes.status === 200, 'Notifications mark all read succeeded');

  // 7. Reviews
  const reviewsRes = await get('/api/reviews/my', token);
  assert(reviewsRes.status === 200, 'Customer reviews retrieved');
  assert(Array.isArray(reviewsRes.body), `Found ${reviewsRes.body.length} reviews submitted by user`);

  // Submit new review
  const carsRes = await get('/api/cars');
  const testCar = carsRes.body[0];
  const postRevRes = await post('/api/reviews', {
    carId: testCar.id,
    rating: 5,
    title: 'Outstanding Luxury Experience',
    comment: 'The car was in pristine condition, buttery smooth acceleration and seamless return.'
  }, token);
  assert(postRevRes.status === 201, 'New review submitted successfully');

  // 8. Profile Update
  const updateProfRes = await put('/api/auth/profile', {
    name: 'John Doe',
    phone: '+91 98234 56789',
    address: 'Bandra West, Mumbai 400050',
    licenseNumber: 'MH-01-2018-0094821',
    licenseExpiry: '2030-12-31'
  }, token);
  assert(updateProfRes.status === 200, 'User profile updated successfully');
  assert(updateProfRes.body.user.address === 'Bandra West, Mumbai 400050', 'Updated address reflected in response');

  // 9. Auth Me Check
  const meRes = await get('/api/auth/me', token);
  assert(meRes.status === 200, 'GET /api/auth/me succeeded');
  assert(meRes.body.user.email === 'john.doe@example.com', 'Verified current authenticated user identity');

  console.log('\n=======================================================');
  console.log('🏁 Step 5 User Dashboard: ALL TESTS PASSED!');
  console.log('=======================================================\n');
}

runStep5UserDashSuite().catch(err => {
  console.error('\n❌ Step 5 Test suite failed:', err);
  process.exit(1);
});
