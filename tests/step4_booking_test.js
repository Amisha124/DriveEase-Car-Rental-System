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

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

async function runStep4BookingSuite() {
  console.log('🚀 Running Step 4 Comprehensive Booking Flow Test Suite...\n');

  // 1. Health check
  const health = await get('/api/health');
  assert(health.status === 200 && health.body.status === 'ok', 'Server is healthy');

  // 2. Fetch Cars
  const carsRes = await get('/api/cars');
  assert(carsRes.status === 200 && carsRes.body.length > 0, `Loaded ${carsRes.body.length} cars from fleet`);
  const car = carsRes.body.find(c => c.pricePerDay >= 5000 && c.status === 'Available') || carsRes.body[0];

  // 3. Customer Auth
  const loginRes = await post('/api/auth/login', {
    email: 'john.doe@example.com',
    password: 'john123'
  });
  assert(loginRes.status === 200 && loginRes.body.token, 'Customer login succeeded');
  const token = loginRes.body.token;
  const user = loginRes.body.user;

  // 4. Coupon Validation Tests
  // 4a. Valid coupon
  const validCoupon = await post('/api/coupons/validate', { code: 'WEEKEND20', amount: 20000 });
  assert(validCoupon.status === 200 && validCoupon.body.valid === true && validCoupon.body.discountAmount === 4000, 'Coupon WEEKEND20 validates 20% discount');

  // 4b. Invalid coupon
  const invalidCoupon = await post('/api/coupons/validate', { code: 'INVALID999', amount: 20000 });
  assert(invalidCoupon.status === 404, 'Invalid coupon rejected with 404');

  // 4c. Minimum amount coupon violation
  const underMinCoupon = await post('/api/coupons/validate', { code: 'WEEKEND20', amount: 3000 });
  assert(underMinCoupon.status === 400, 'Coupon with amount under minAmount rejected with 400');

  // 5. Date Calculations & Validation Tests
  const pickupDateObj = new Date(Date.now() + 86400000 * 800 + Math.floor(Math.random() * 86400000 * 500));
  const returnDateObj = new Date(pickupDateObj.getTime() + 86400000 * 3);

  const fmt = d => d.toISOString().split('T')[0];
  const pickupDate = fmt(pickupDateObj);
  const returnDate = fmt(returnDateObj);

  // 5a. Invalid dates (return before pickup)
  const invalidDateBooking = await post('/api/bookings', {
    carId: car.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate: returnDate,
    returnDate: pickupDate,
    customerName: 'John Doe',
    customerPhone: '+91 98765 43210'
  }, token);
  assert(invalidDateBooking.status === 400, 'Booking with return date before pickup rejected with 400');

  // 6. Successful Booking Creation with Addons & Coupon
  const createBookingRes = await post('/api/bookings', {
    carId: car.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    returnLocation: 'Same as Pickup',
    pickupDate,
    returnDate,
    pickupTime: '10:00 AM',
    returnTime: '06:00 PM',
    addOns: [
      { name: 'Comprehensive Zero-Deductible Insurance', price: Math.round(car.pricePerDay * 3 * 0.1) },
      { name: 'High-Precision GPS Navigation', price: 600 }
    ],
    couponCode: 'WEEKEND20',
    customerName: user.name,
    customerPhone: '+91 98234 56789'
  }, token);

  assert(createBookingRes.status === 201 && createBookingRes.body.booking?.id, `Booking created successfully #${createBookingRes.body.booking?.id}`);
  const createdBooking = createBookingRes.body.booking;

  // 7. Verify Pricing Breakdown Matches Formula Exactly
  const expectedDays = 3;
  const expectedBase = car.pricePerDay * 3;
  const expectedInsurance = Math.round(expectedBase * 0.10);
  const expectedAddons = expectedInsurance + 600;
  const expectedSubtotal = expectedBase + expectedAddons;
  const expectedDiscount = Math.min(8000, Math.round((expectedSubtotal * 20) / 100));
  const expectedDiscountedSubtotal = Math.max(0, expectedSubtotal - expectedDiscount);
  const expectedTax = Math.round(expectedDiscountedSubtotal * 0.18);
  const expectedTotal = expectedDiscountedSubtotal + expectedTax;

  assert(createdBooking.days === expectedDays, `Booking days (${createdBooking.days}) matches expected (3)`);
  assert(createdBooking.basePrice === expectedBase, `Base price (₹${createdBooking.basePrice}) matches expected (₹${expectedBase})`);
  assert(createdBooking.addOnsPrice === expectedAddons, `Add-ons price (₹${createdBooking.addOnsPrice}) matches expected (₹${expectedAddons})`);
  assert(createdBooking.discount === expectedDiscount, `Discount (₹${createdBooking.discount}) matches expected (₹${expectedDiscount})`);
  assert(createdBooking.tax === expectedTax, `GST/Tax (₹${createdBooking.tax}) matches expected (₹${expectedTax})`);
  assert(createdBooking.totalAmount === expectedTotal, `Total amount (₹${createdBooking.totalAmount}) matches expected (₹${expectedTotal})`);

  // 8. Test Overlapping Booking Collision Rejection (409 Conflict)
  const conflictBookingRes = await post('/api/bookings', {
    carId: car.id,
    pickupLocation: 'Mumbai Airport (BOM)',
    pickupDate,
    returnDate,
    customerName: 'Jane Smith',
    customerPhone: '+91 91234 56789'
  }, token);

  assert(conflictBookingRes.status === 409, 'Overlapping booking on same dates rejected with 409 Conflict');

  // 9. Process Demo Payment
  const payRes = await post('/api/payments/process', {
    bookingId: createdBooking.id,
    method: 'Credit Card',
    cardLast4: '4242'
  }, token);

  assert(payRes.status === 200 && payRes.body.payment?.status === 'Paid', `Demo payment processed successfully #${payRes.body.payment?.id}`);

  // 10. Fetch Single Booking with Customer & Car details for Tax Invoice
  const invoiceRes = await get(`/api/bookings/${createdBooking.id}`, token);
  assert(invoiceRes.status === 200, 'Invoice API retrieved single booking');
  assert(invoiceRes.body.paymentStatus === 'Paid', 'Booking payment status updated to Paid');
  assert(invoiceRes.body.bookingStatus === 'Confirmed', 'Booking status updated to Confirmed');
  assert(invoiceRes.body.customerDetails !== null, 'Customer details populated for invoice');
  assert(invoiceRes.body.carDetails !== null, 'Vehicle details populated for invoice');

  // 11. Fetch User Bookings and verify newly created booking is present
  const userBookingsRes = await get('/api/bookings', token);
  assert(userBookingsRes.status === 200, 'User bookings retrieved');
  const found = userBookingsRes.body.find(b => b.id === createdBooking.id);
  assert(found !== undefined, `New booking #${createdBooking.id} found in Customer Bookings history`);
  assert(found.totalAmount === expectedTotal, `Saved booking total amount in DB is ₹${found.totalAmount}`);

  // 12. Fetch User Payments and verify payment is recorded
  const userPaymentsRes = await get('/api/payments', token);
  assert(userPaymentsRes.status === 200, 'User payments retrieved');
  const foundPay = userPaymentsRes.body.find(p => p.bookingId === createdBooking.id);
  assert(foundPay !== undefined, `Payment record #${foundPay?.id} found in payment history`);

  console.log('\n=======================================================');
  console.log('🏁 Step 4 Booking Verification: ALL 12 TESTS PASSED!');
  console.log('=======================================================\n');
}

runStep4BookingSuite().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
