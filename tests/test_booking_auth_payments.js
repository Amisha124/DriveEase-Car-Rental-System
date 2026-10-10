// DriveEase - Comprehensive Booking Auth, Favourites Security & Payment Methods Test Suite
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

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

async function runTests() {
  console.log('================================================================');
  console.log('🧪 DRIVEEASE BOOKING AUTH, FAVOURITES & PAYMENTS TEST SUITE');
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

  // ----------------------------------------------------------------
  // 1. SETUP: Authenticate Test Users & Fetch Available Cars
  // ----------------------------------------------------------------
  console.log('▶ [1] Authenticating Customer A, Customer B, and Admin...');
  
  // Customer A: John Doe
  const loginA = await apiRequest('/api/auth/login', 'POST', { email: 'john.doe@example.com', password: 'john123' });
  const tokenA = loginA.body.token;
  assert(!!tokenA, 'Customer A (John Doe) authenticated successfully');

  // Customer B: Register / Login secondary test user
  const emailB = `test.customer.b.${Date.now()}@example.com`;
  const regB = await apiRequest('/api/auth/register', 'POST', {
    name: 'Customer B',
    email: emailB,
    password: 'password123',
    role: 'CUSTOMER'
  });
  const tokenB = regB.body.token;
  assert(!!tokenB, 'Customer B authenticated successfully');

  // Admin
  const loginAdmin = await apiRequest('/api/auth/login', 'POST', { email: 'admin@driveease.com', password: 'admin123' });
  const adminToken = loginAdmin.body.token;
  assert(!!adminToken, 'Fleet Administrator authenticated successfully');

  // Get available cars
  const carsRes = await apiRequest('/api/cars');
  const availableCars = (carsRes.body || []).filter(c => c.status === 'Available');
  const safeAvailable = availableCars.length > 0 ? availableCars : carsRes.body;
  const numAvail = safeAvailable.length;
  const carA = safeAvailable[0 % numAvail];
  const carB = safeAvailable[1 % numAvail];
  const carC = safeAvailable[2 % numAvail];
  const carD = safeAvailable[3 % numAvail];
  const carE = safeAvailable[4 % numAvail];
  const carF = safeAvailable[5 % numAvail];

  // Helper to generate non-colliding random date pairs
  function getUniqueDates() {
    const offset = Math.floor(1000 + Math.random() * 50000);
    const start = new Date(Date.now() + 86400000 * offset);
    const end = new Date(start.getTime() + 86400000 * 3);
    return {
      pickupDate: start.toISOString().split('T')[0],
      returnDate: end.toISOString().split('T')[0]
    };
  }

  // ----------------------------------------------------------------
  // 2. PART 1: BOOKING AUTHENTICATION & AUTHORIZATION
  // ----------------------------------------------------------------
  console.log('\n▶ [2] Testing Booking Authentication & Security...');

  const datesA = getUniqueDates();

  // 2.1 Unauthenticated booking attempt
  const unauthBooking = await apiRequest('/api/bookings', 'POST', {
    carId: carA.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    returnLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  });
  assert(unauthBooking.status === 401, 'Unauthenticated POST /api/bookings is rejected (401 Unauthorized)');

  // 2.2 Unauthenticated booking retrieval
  const unauthGetBookings = await apiRequest('/api/bookings', 'GET');
  assert(unauthGetBookings.status === 401, 'Unauthenticated GET /api/bookings is rejected (401 Unauthorized)');

  // 2.3 Valid booking creation by Customer A
  const validBookingA = await apiRequest('/api/bookings', 'POST', {
    carId: carA.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    returnLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate,
    pickupTime: '10:00 AM',
    returnTime: '06:00 PM'
  }, tokenA);

  assert(validBookingA.status === 201, `Authenticated Customer A creates booking successfully (201 Created) [got ${validBookingA.status}]`);
  const bookingAId = validBookingA.body.booking?.id;
  assert(!!bookingAId, `Booking created with ID #${bookingAId}`);
  if (validBookingA.body.booking) {
    assert(validBookingA.body.booking.userId === loginA.body.user.id, 'Booking userId is derived securely from token (never spoofed from frontend)');
  }

  // 2.4 Customer B cannot view Customer A's booking
  const crossUserGet = await apiRequest(`/api/bookings/${bookingAId}`, 'GET', null, tokenB);
  assert(crossUserGet.status === 403, 'Customer B is denied access to Customer A\'s booking details (403 Forbidden)');

  // 2.5 Customer B cannot cancel Customer A's booking
  const crossUserCancel = await apiRequest(`/api/bookings/${bookingAId}/cancel`, 'PUT', null, tokenB);
  assert(crossUserCancel.status === 403, 'Customer B is denied cancellation of Customer A\'s booking (403 Forbidden)');

  // 2.6 Admin can access any customer booking
  const adminGetBooking = await apiRequest(`/api/bookings/${bookingAId}`, 'GET', null, adminToken);
  assert(adminGetBooking.status === 200, 'Admin can inspect customer booking details (200 OK)');

  // 2.7 Date validation (returnDate < pickupDate)
  const invalidDatesBooking = await apiRequest('/api/bookings', 'POST', {
    carId: carA.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: '2028-02-25',
    returnDate: '2028-02-20'
  }, tokenA);
  assert(invalidDatesBooking.status === 400, 'Booking with returnDate < pickupDate is rejected (400 Bad Request)');

  // 2.8 Overlapping collision rejection
  const overlapBooking = await apiRequest('/api/bookings', 'POST', {
    carId: carA.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesA.pickupDate,
    returnDate: datesA.returnDate
  }, tokenB);
  assert(overlapBooking.status === 409, 'Overlapping booking on reserved dates is rejected (409 Conflict)');

  // ----------------------------------------------------------------
  // 3. PART 2: FAVOURITES AUTHENTICATION & SECURITY
  // ----------------------------------------------------------------
  console.log('\n▶ [3] Testing Favourites Authentication & Security...');

  // 3.1 Unauthenticated favourites request
  const unauthFavs = await apiRequest('/api/favourites', 'GET');
  assert(unauthFavs.status === 401, 'Unauthenticated GET /api/favourites is rejected (401 Unauthorized)');

  // 3.2 Unauthenticated favourite toggle
  const unauthToggle = await apiRequest(`/api/favourites/toggle/${carA.id}`, 'POST');
  assert(unauthToggle.status === 401, 'Unauthenticated POST /api/favourites/toggle is rejected (401 Unauthorized)');

  // 3.3 Customer A toggles favourite (add)
  const toggleAdd = await apiRequest(`/api/favourites/toggle/${carA.id}`, 'POST', null, tokenA);
  assert(toggleAdd.status === 200 && typeof toggleAdd.body.isFavourite === 'boolean', 'Customer A can toggle car favourites');

  // 3.4 Customer A toggles favourite again (remove)
  const toggleRemove = await apiRequest(`/api/favourites/toggle/${carA.id}`, 'POST', null, tokenA);
  assert(toggleRemove.status === 200 && typeof toggleRemove.body.isFavourite === 'boolean', 'Customer A can toggle favourite back');

  // ----------------------------------------------------------------
  // 4. PART 3 & 4: MULTIPLE PAYMENT METHODS & DATA INTEGRITY
  // ----------------------------------------------------------------
  console.log('\n▶ [4] Testing Multiple Payment Methods...');

  // 4.1 Unauthenticated payment attempt
  const unauthPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: bookingAId,
    method: 'Credit Card'
  });
  assert(unauthPay.status === 401, 'Unauthenticated POST /api/payments/process is rejected (401 Unauthorized)');

  // 4.2 Customer B attempts to pay for Customer A's booking
  const crossPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: bookingAId,
    method: 'Credit Card'
  }, tokenB);
  assert(crossPay.status === 403, 'Customer B cannot pay for Customer A\'s booking (403 Forbidden)');

  // 4.3 Test UPI Payment Method on fresh booking
  const datesUPI = getUniqueDates();
  const bookingUPI = await apiRequest('/api/bookings', 'POST', {
    carId: carB.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesUPI.pickupDate,
    returnDate: datesUPI.returnDate
  }, tokenA);
  const upiBookingId = bookingUPI.body?.booking?.id;

  const upiPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: upiBookingId,
    method: 'UPI',
    upiId: 'john.doe@okhdfcbank'
  }, tokenA);
  assert(upiPay.status === 200, 'UPI payment processed successfully');
  assert(upiPay.body.payment?.method === 'UPI', 'Payment record method stored as "UPI"');
  assert(upiPay.body.payment?.status === 'Paid', 'Payment record status is "Paid"');
  assert(upiPay.body.payment?.upiId === 'john.doe@okhdfcbank', 'Payment record preserves upiId');

  // 4.4 Test Debit Card Payment Method
  const datesDebit = getUniqueDates();
  const bookingDebit = await apiRequest('/api/bookings', 'POST', {
    carId: carC.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesDebit.pickupDate,
    returnDate: datesDebit.returnDate
  }, tokenA);
  const debitBookingId = bookingDebit.body?.booking?.id;

  const debitPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: debitBookingId,
    method: 'Debit Card',
    cardLast4: '8821'
  }, tokenA);
  assert(debitPay.status === 200, 'Debit Card payment processed successfully');
  assert(debitPay.body.payment?.method === 'Debit Card', 'Payment record method stored as "Debit Card"');
  assert(debitPay.body.payment?.cardLast4 === '8821', 'Payment record preserves debit cardLast4 (8821)');

  // 4.5 Test Net Banking Payment Method
  const datesNetBank = getUniqueDates();
  const bookingNetBank = await apiRequest('/api/bookings', 'POST', {
    carId: carD.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesNetBank.pickupDate,
    returnDate: datesNetBank.returnDate
  }, tokenA);
  const netBankBookingId = bookingNetBank.body?.booking?.id;

  const netBankPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: netBankBookingId,
    method: 'Net Banking',
    bankName: 'ICICI Bank'
  }, tokenA);
  assert(netBankPay.status === 200, 'Net Banking payment processed successfully');
  assert(netBankPay.body.payment?.method === 'Net Banking', 'Payment record method stored as "Net Banking"');
  assert(netBankPay.body.payment?.bankName === 'ICICI Bank', 'Payment record preserves bankName');

  // 4.6 Test VIP Wallet Payment Method
  const datesWallet = getUniqueDates();
  const bookingWallet = await apiRequest('/api/bookings', 'POST', {
    carId: carE.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesWallet.pickupDate,
    returnDate: datesWallet.returnDate
  }, tokenA);
  const walletBookingId = bookingWallet.body?.booking?.id;

  const walletPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: walletBookingId,
    method: 'Wallet',
    walletName: 'DriveEase VIP Wallet'
  }, tokenA);
  assert(walletPay.status === 200, 'Wallet payment processed successfully');
  assert(walletPay.body.payment?.method === 'Wallet', 'Payment record method stored as "Wallet"');

  // 4.7 Test Pay at Pickup Method
  const datesPickup = getUniqueDates();
  const bookingPickup = await apiRequest('/api/bookings', 'POST', {
    carId: carF.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: datesPickup.pickupDate,
    returnDate: datesPickup.returnDate
  }, tokenA);
  const pickupBookingId = bookingPickup.body?.booking?.id;

  const pickupPay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: pickupBookingId,
    method: 'Pay at Pickup'
  }, tokenA);
  assert(pickupPay.status === 200, 'Pay at Pickup reservation confirmed successfully');
  assert(pickupPay.body.payment?.method === 'Pay at Pickup', 'Payment record method stored as "Pay at Pickup"');
  assert(pickupPay.body.payment?.status === 'Pay at Pickup', 'Payment record status is "Pay at Pickup"');

  // 4.8 Verify duplicate payment rejection on already paid booking
  const duplicatePay = await apiRequest('/api/payments/process', 'POST', {
    bookingId: upiBookingId,
    method: 'Credit Card'
  }, tokenA);
  assert(duplicatePay.status === 400, 'Duplicate payment submission on paid booking is rejected (400 Bad Request)');

  // ----------------------------------------------------------------
  // 5. FRONTEND LOGIC & PROMPT STRINGS VERIFICATION
  // ----------------------------------------------------------------
  console.log('\n▶ [5] Verifying Frontend Authentication Prompts & Methods...');

  const bookingJs = fs.readFileSync(path.join(__dirname, '../public/js/booking.js'), 'utf8');
  const browseJs = fs.readFileSync(path.join(__dirname, '../public/js/browse.js'), 'utf8');

  assert(bookingJs.includes("Please log in to continue with your booking."), 'booking.js contains exact required login prompt');
  assert(browseJs.includes("Please log in to save cars to your favourites."), 'browse.js contains exact required favourites login prompt');
  assert(bookingJs.includes("Credit Card") && bookingJs.includes("Debit Card") && bookingJs.includes("UPI") && bookingJs.includes("Net Banking") && bookingJs.includes("Wallet") && bookingJs.includes("Pay at Pickup"), 'booking.js contains all 6 payment methods');

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
