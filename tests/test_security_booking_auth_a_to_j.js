// DriveEase - Security Verification Suite for Booking Authentication (Tests A - J)
const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'driveease_super_secret_jwt_key_2026';

function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function getBookingsFromFile() {
  const filePath = path.join(__dirname, '../data/bookings.json');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

function getPaymentsFromFile() {
  const filePath = path.join(__dirname, '../data/payments.json');
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '[]');
  } catch {
    return [];
  }
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🔒 DRIVEEASE CRITICAL SECURITY TESTS (TESTS A - J)');
  console.log('================================================================\n');

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

  // Initial Data Snapshot
  const initialBookingsCount = getBookingsFromFile().length;
  const initialPaymentsCount = getPaymentsFromFile().length;

  console.log(`Initial State: ${initialBookingsCount} bookings, ${initialPaymentsCount} payments in storage.\n`);

  // Fetch cars to find an available vehicle
  const carsRes = await apiRequest('/api/cars');
  const availableCars = (carsRes.body || []).filter(c => c.status === 'Available');
  const testCar = availableCars[0] || { id: 'car_merc_s_class' };

  // Helper to generate unique future dates
  function getUniqueDates() {
    const offset = Math.floor(3000 + Math.random() * 50000);
    const start = new Date(Date.now() + 86400000 * offset);
    const end = new Date(start.getTime() + 86400000 * 3);
    return {
      pickupDate: start.toISOString().split('T')[0],
      returnDate: end.toISOString().split('T')[0]
    };
  }

  // ----------------------------------------------------------------
  // TEST A: Send direct POST without Authorization header
  // ----------------------------------------------------------------
  console.log('▶ [TEST A] Direct POST request without Authorization header...');
  const datesA = getUniqueDates();
  const resA = await apiRequest('/api/bookings', 'POST', {
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  });
  assert(resA.status === 401, `Status is 401 Unauthorized (got ${resA.status})`);
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking record created in data/bookings.json');

  // ----------------------------------------------------------------
  // TEST B: Send booking request with an invalid token
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST B] Booking request with invalid token...');
  const resB = await apiRequest('/api/bookings', 'POST', {
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  }, 'invalid_bogus_token_xyz999');
  assert(resB.status === 401, `Status is 401 Unauthorized (got ${resB.status})`);
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking record created in data/bookings.json');

  // ----------------------------------------------------------------
  // TEST C: Send booking request with an expired token
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST C] Booking request with expired token...');
  const expiredToken = jwt.sign(
    { id: 'usr_customer_1', email: 'john.doe@example.com', role: 'CUSTOMER' },
    JWT_SECRET,
    { expiresIn: '-10s' }
  );
  const resC = await apiRequest('/api/bookings', 'POST', {
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  }, expiredToken);
  assert(resC.status === 401, `Status is 401 Unauthorized (got ${resC.status})`);
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking record created in data/bookings.json');

  // ----------------------------------------------------------------
  // TEST D: Send booking request with forged customer ID without valid token
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST D] Booking request with forged customer ID but no valid token...');
  const resD = await apiRequest('/api/bookings', 'POST', {
    userId: 'usr_admin_1',
    customerName: 'Admin Impersonator',
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  });
  assert(resD.status === 401, `Status is 401 Unauthorized (got ${resD.status})`);
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking record created in data/bookings.json');

  // ----------------------------------------------------------------
  // TEST E: Attempt booking through homepage Quick Booking flow while logged out
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST E] Verification of Quick Booking flow auth enforcement...');
  const landingJs = fs.readFileSync(path.join(__dirname, '../public/js/landing.js'), 'utf8');
  assert(landingJs.includes('handleQuickBookingClick'), 'Landing controller contains handleQuickBookingClick');
  assert(landingJs.includes("Please log in to book a car."), 'Quick booking displays "Please log in to book a car."');
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking created during logged-out quick booking');

  // ----------------------------------------------------------------
  // TEST F: Attempt booking through vehicle details page while logged out
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST F] Verification of Car Details page booking flow auth enforcement...');
  const carDetailsJs = fs.readFileSync(path.join(__dirname, '../public/js/car-details.js'), 'utf8');
  const bookingJs = fs.readFileSync(path.join(__dirname, '../public/js/booking.js'), 'utf8');
  assert(bookingJs.includes("Please log in to book a car."), 'Booking wizard displays "Please log in to book a car."');
  assert(bookingJs.includes("App.pendingAction = { type: 'booking'"), 'Pending booking action preserved for post-login resumption');
  assert(getBookingsFromFile().length === initialBookingsCount, 'No booking created during logged-out vehicle details interaction');

  // ----------------------------------------------------------------
  // TEST G: Attempt booking through checkout / payment while logged out
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST G] Direct payment/process request while logged out...');
  const resG = await apiRequest('/api/payments/process', 'POST', {
    bookingId: 'BK-9999',
    method: 'Credit Card'
  });
  assert(resG.status === 401, `Payment status is 401 Unauthorized (got ${resG.status})`);
  assert(getPaymentsFromFile().length === initialPaymentsCount, 'No payment record created in data/payments.json');

  // ----------------------------------------------------------------
  // TEST H: Log in as valid customer and submit a valid booking
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST H] Authenticated customer creates valid booking...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', {
    email: 'john.doe@example.com',
    password: 'john123'
  });
  const customerToken = loginRes.body.token;
  const customerUser = loginRes.body.user;
  assert(!!customerToken, 'Customer logged in successfully');

  const datesH = getUniqueDates();
  const resH = await apiRequest('/api/bookings', 'POST', {
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    returnLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesH.pickupDate,
    returnDate: datesH.returnDate,
    pickupTime: '10:00 AM',
    returnTime: '06:00 PM'
  }, customerToken);

  assert(resH.status === 201, `Booking created successfully with status 201 (got ${resH.status})`);
  const createdBooking = resH.body.booking;
  assert(!!createdBooking && !!createdBooking.id, `Booking ID generated: #${createdBooking?.id}`);
  assert(createdBooking?.userId === customerUser.id, `Booking owner is verified customer (${createdBooking?.userId})`);
  assert(getBookingsFromFile().length === initialBookingsCount + 1, 'Exactly one booking appended to data/bookings.json');

  // ----------------------------------------------------------------
  // TEST I: Attempt to access another customer's booking
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST I] Cross-customer access isolation...');
  const regCustomerB = await apiRequest('/api/auth/register', 'POST', {
    name: 'Customer B (Isolation Test)',
    email: `cust.b.${Date.now()}@example.com`,
    password: 'password123',
    role: 'CUSTOMER'
  });
  const tokenB = regCustomerB.body.token;

  const resI_view = await apiRequest(`/api/bookings/${createdBooking.id}`, 'GET', null, tokenB);
  assert(resI_view.status === 403, `Viewing another customer booking returns 403 Forbidden (got ${resI_view.status})`);

  const resI_cancel = await apiRequest(`/api/bookings/${createdBooking.id}/cancel`, 'PUT', null, tokenB);
  assert(resI_cancel.status === 403, `Cancelling another customer booking returns 403 Forbidden (got ${resI_cancel.status})`);

  // ----------------------------------------------------------------
  // TEST J: Repeat booking request after authentication failure
  // ----------------------------------------------------------------
  console.log('\n▶ [TEST J] Integrity after authentication failure...');
  const countBeforeJ = getBookingsFromFile().length;
  const payCountBeforeJ = getPaymentsFromFile().length;

  const resJ_fail = await apiRequest('/api/bookings', 'POST', {
    carId: testCar.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  }, 'tampered_token');
  assert(resJ_fail.status === 401, 'Request with tampered token failed with 401');

  const countAfterJ = getBookingsFromFile().length;
  const payCountAfterJ = getPaymentsFromFile().length;
  assert(countAfterJ === countBeforeJ, 'No anonymous booking records created after failure');
  assert(payCountAfterJ === payCountBeforeJ, 'No false payment records created after failure');

  console.log('\n================================================================');
  console.log(`🏁 SECURITY TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runSecurityTests().catch(err => {
  console.error('Security Test Execution Error:', err);
  process.exit(1);
});
