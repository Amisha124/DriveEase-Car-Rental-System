// DriveEase - Step 6 Comprehensive Admin Dashboard Verification Test Suite
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawText: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, rawText: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runStep6AdminTestSuite() {
  console.log('🚀 Running Step 6 Comprehensive Admin Dashboard Test Suite...\n');

  try {
    // -------------------------------------------------------------
    // 1. ADMIN AUTHORIZATION & ROLE GUARDS
    // -------------------------------------------------------------
    console.log('--- 1. Admin Authorization & Role Middleware ---');

    // 1.1 Unauthenticated request rejected with 401
    const noAuthRes = await request('GET', '/api/analytics/admin');
    assert(noAuthRes.status === 401, 'Unauthenticated request to /api/analytics/admin rejected with 401 Unauthorized');

    // 1.2 Customer login
    const custLoginRes = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(custLoginRes.status === 200 && custLoginRes.body.token, 'Customer login succeeded');
    const customerToken = custLoginRes.body.token;

    // 1.3 Customer access to Admin endpoint rejected with 403 Forbidden
    const custAdminRes = await request('GET', '/api/analytics/admin', null, customerToken);
    assert(custAdminRes.status === 403, 'Customer access to /api/analytics/admin rejected with 403 Forbidden');

    // 1.4 Admin login
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin login succeeded');
    const adminToken = adminLoginRes.body.token;
    assert(adminLoginRes.body.user.role === 'ADMIN', 'Admin user role is verified as ADMIN');

    // -------------------------------------------------------------
    // 2. DASHBOARD KPI CARDS & REAL ANALYTICS
    // -------------------------------------------------------------
    console.log('\n--- 2. Dashboard KPIs, Real Data & Profit Formula ---');

    const analyticsRes = await request('GET', '/api/analytics/admin', null, adminToken);
    assert(analyticsRes.status === 200, 'Admin analytics API returned 200 OK');

    const data = analyticsRes.body;
    assert(data.kpis !== undefined, 'KPIs object present in analytics response');
    assert(typeof data.kpis.totalUsers === 'number' && data.kpis.totalUsers >= 5, `Total Users: ${data.kpis.totalUsers}`);
    assert(typeof data.kpis.totalCars === 'number' && data.kpis.totalCars >= 20, `Total Cars: ${data.kpis.totalCars}`);
    assert(typeof data.kpis.totalBookings === 'number' && data.kpis.totalBookings >= 1, `Total Bookings: ${data.kpis.totalBookings}`);
    assert(typeof data.kpis.totalRevenue === 'number' && data.kpis.totalRevenue > 0, `Total Revenue: ₹${data.kpis.totalRevenue}`);
    assert(typeof data.kpis.totalExpenses === 'number', `Total Expenses: ₹${data.kpis.totalExpenses}`);
    assert(typeof data.kpis.totalProfit === 'number', `Total Profit: ₹${data.kpis.totalProfit}`);
    assert(typeof data.kpis.activeRentals === 'number', `Active Rentals: ${data.kpis.activeRentals}`);

    // Profit logic verification: Net Revenue - Expenses = Profit (or 0 if negative)
    const expectedProfit = Math.max(0, data.kpis.totalRevenue - data.kpis.totalExpenses);
    assert(data.kpis.totalProfit === expectedProfit, `Profit calculation strictly matches Gross Revenue - Expenses = ₹${expectedProfit}`);

    // Car Status Donut Breakdown
    assert(Array.isArray(data.carStatusBreakdown) && data.carStatusBreakdown.length === 4, 'Car status breakdown has 4 states (Available, Rented, Maintenance, Out of Service)');
    const totalStatusCars = data.carStatusBreakdown.reduce((sum, s) => sum + s.count, 0);
    assert(totalStatusCars === data.kpis.totalCars, 'Sum of car statuses equals totalCars count');

    // Booking Status Breakdown
    assert(Array.isArray(data.bookingStatusBreakdown) && data.bookingStatusBreakdown.length === 5, 'Booking status breakdown has 5 states (Confirmed, Active, Pending, Completed, Cancelled)');

    // Top Performing Cars
    assert(Array.isArray(data.topCars) && data.topCars.length > 0, `Top Performing Cars list returned (${data.topCars.length} cars)`);
    assert(data.topCars[0].revenue >= data.topCars[data.topCars.length - 1].revenue, 'Top cars properly sorted descending by revenue');

    // Time series
    assert(Array.isArray(data.timeSeries.labels) && data.timeSeries.labels.length === 14, '14-day time series labels generated');
    assert(Array.isArray(data.timeSeries.revenue) && data.timeSeries.revenue.length === 14, '14-day revenue series generated');
    assert(Array.isArray(data.timeSeries.bookings) && data.timeSeries.bookings.length === 14, '14-day bookings series generated');

    // User growth
    assert(Array.isArray(data.userGrowth.data) && data.userGrowth.data.length === 14, '14-day user growth series generated');

    // -------------------------------------------------------------
    // 3. FLEET MANAGEMENT CRUD
    // -------------------------------------------------------------
    console.log('\n--- 3. Fleet Management CRUD Operations ---');

    // 3.1 Create test car
    const newCarPayload = {
      name: 'Porsche 911 GT3 RS Test',
      brand: 'Porsche',
      type: 'Sports',
      pricePerDay: 45000,
      seats: 2,
      transmission: 'Automatic',
      fuel: 'Petrol',
      power: '518 HP',
      image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&auto=format&fit=crop&q=80',
      description: 'Track-focused naturally aspirated supercar with DRS aerodynamics.'
    };
    const createCarRes = await request('POST', '/api/cars', newCarPayload, adminToken);
    assert(createCarRes.status === 201 && createCarRes.body.car.id, `Created new car #${createCarRes.body.car.id} (${createCarRes.body.car.name})`);
    const testCarId = createCarRes.body.car.id;

    // 3.2 Update car details
    const updateCarRes = await request('PUT', `/api/cars/${testCarId}`, {
      pricePerDay: 48000,
      description: 'Updated daily rate and description.'
    }, adminToken);
    assert(updateCarRes.status === 200 && updateCarRes.body.car.pricePerDay === 48000, 'Updated car daily rate to ₹48,000');

    // 3.3 Update car status
    const statusCarRes = await request('PUT', `/api/cars/${testCarId}/status`, { status: 'Maintenance' }, adminToken);
    assert(statusCarRes.status === 200 && statusCarRes.body.car.status === 'Maintenance', 'Updated car status to Maintenance');

    // 3.4 Delete car
    const deleteCarRes = await request('DELETE', `/api/cars/${testCarId}`, null, adminToken);
    assert(deleteCarRes.status === 200, `Deleted test car #${testCarId}`);

    // -------------------------------------------------------------
    // 4. BOOKINGS MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 4. Bookings Management & Status Updates ---');

    const allBookingsRes = await request('GET', '/api/bookings', null, adminToken);
    assert(allBookingsRes.status === 200 && Array.isArray(allBookingsRes.body), `Retrieved all platform bookings (${allBookingsRes.body.length})`);
    const testBooking = allBookingsRes.body[0];
    if (testBooking) {
      const origStatus = testBooking.bookingStatus;
      const updateBookingRes = await request('PUT', `/api/bookings/${testBooking.id}/status`, {
        bookingStatus: 'Confirmed'
      }, adminToken);
      assert(updateBookingRes.status === 200, `Admin updated booking #${testBooking.id.slice(-6)} status to Confirmed`);
    }

    // -------------------------------------------------------------
    // 5. USER MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 5. User Management & Account Moderation ---');

    const allUsersRes = await request('GET', '/api/users', null, adminToken);
    assert(allUsersRes.status === 200 && Array.isArray(allUsersRes.body), `Admin listed users (${allUsersRes.body.length} accounts)`);

    // 5.1 Admin create user
    const uniqueEmail = `testuser_${Date.now()}@example.com`;
    const createUserRes = await request('POST', '/api/users', {
      name: 'Test Customer',
      email: uniqueEmail,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '+91 91234 56789'
    }, adminToken);
    assert(createUserRes.status === 201 && createUserRes.body.user.id, `Admin created user account (${uniqueEmail})`);
    const testUserId = createUserRes.body.user.id;

    // 5.2 Toggle user status (Disable)
    const disableUserRes = await request('PUT', `/api/users/${testUserId}/status`, { status: 'Disabled' }, adminToken);
    assert(disableUserRes.status === 200 && disableUserRes.body.user.status === 'Disabled', 'User account successfully disabled');

    // 5.3 Toggle user status (Reactivate)
    const enableUserRes = await request('PUT', `/api/users/${testUserId}/status`, { status: 'Active' }, adminToken);
    assert(enableUserRes.status === 200 && enableUserRes.body.user.status === 'Active', 'User account successfully reactivated');

    // 5.4 Self-deactivation prevention for admin
    const adminUser = allUsersRes.body.find(u => u.role === 'ADMIN');
    if (adminUser) {
      const selfDisableRes = await request('PUT', `/api/users/${adminUser.id}/status`, { status: 'Disabled' }, adminToken);
      assert(selfDisableRes.status === 400, 'Admin prevented from disabling their own account (400 Bad Request)');
    }

    // -------------------------------------------------------------
    // 6. PAYMENTS & OPERATIONAL EXPENSES LEDGER
    // -------------------------------------------------------------
    console.log('\n--- 6. Payments & Operational Expenses Ledger ---');

    // 6.1 Get all expenses
    const expensesRes = await request('GET', '/api/expenses', null, adminToken);
    assert(expensesRes.status === 200 && Array.isArray(expensesRes.body), `Loaded operational expenses ledger (${expensesRes.body.length} items)`);

    // 6.2 Record new expense
    const createExpRes = await request('POST', '/api/expenses', {
      title: 'Audi RS6 Brake Pad Replacement & Fluid Flush',
      category: 'Maintenance',
      amount: 32000,
      date: new Date().toISOString().split('T')[0]
    }, adminToken);
    assert(createExpRes.status === 201 && createExpRes.body.expense.id, `Recorded expense of ₹32,000 for maintenance`);
    const testExpId = createExpRes.body.expense.id;

    // 6.3 Delete expense
    const deleteExpRes = await request('DELETE', `/api/expenses/${testExpId}`, null, adminToken);
    assert(deleteExpRes.status === 200, `Deleted test expense #${testExpId}`);

    // 6.4 Get all payments
    const paymentsRes = await request('GET', '/api/payments', null, adminToken);
    assert(paymentsRes.status === 200 && Array.isArray(paymentsRes.body), `Retrieved customer transactions ledger (${paymentsRes.body.length} payments)`);

    // -------------------------------------------------------------
    // 7. REVIEWS MODERATION
    // -------------------------------------------------------------
    console.log('\n--- 7. Reviews Moderation ---');

    const reviewsRes = await request('GET', '/api/reviews/all', null, adminToken);
    assert(reviewsRes.status === 200 && Array.isArray(reviewsRes.body), `Retrieved all vehicle reviews (${reviewsRes.body.length})`);
    if (reviewsRes.body.length > 0) {
      const rev = reviewsRes.body[0];
      const modRes = await request('PUT', `/api/reviews/${rev.id}/status`, { status: 'Approved' }, adminToken);
      assert(modRes.status === 200, `Moderated review #${rev.id.slice(-4)} as Approved`);
    }

    // -------------------------------------------------------------
    // 8. OFFERS & COUPONS MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- 8. Offers & Promotional Coupons ---');

    const promoCode = `FESTIVE${Math.floor(100 + Math.random() * 900)}`;
    const createCpnRes = await request('POST', '/api/coupons', {
      code: promoCode,
      discountPercent: 15,
      minAmount: 8000,
      description: '15% Festive Seasonal Discount'
    }, adminToken);
    assert(createCpnRes.status === 201 && createCpnRes.body.coupon.id, `Created promo code ${promoCode} (15% Off)`);
    const testCpnId = createCpnRes.body.coupon.id;

    // Toggle active state
    const toggleCpnRes = await request('PUT', `/api/coupons/${testCpnId}`, { active: false }, adminToken);
    assert(toggleCpnRes.status === 200 && toggleCpnRes.body.coupon.active === false, 'Deactivated coupon');

    // Delete coupon
    const deleteCpnRes = await request('DELETE', `/api/coupons/${testCpnId}`, null, adminToken);
    assert(deleteCpnRes.status === 200, 'Deleted test coupon');

    // -------------------------------------------------------------
    // 9. REPORTS & CSV EXPORTS
    // -------------------------------------------------------------
    console.log('\n--- 9. Data Reports & CSV Exports ---');

    const reportTypes = ['bookings', 'revenue', 'fleet', 'users', 'expenses'];
    for (const rep of reportTypes) {
      const repRes = await request('GET', `/api/reports/export/${rep}`, null, adminToken);
      assert(repRes.status === 200, `Exported ${rep} CSV report (${repRes.headers['content-type']})`);
      assert(repRes.rawText && repRes.rawText.includes(','), `${rep} CSV contains formatted CSV rows`);
    }

    // -------------------------------------------------------------
    // 10. SYSTEM ACTIVITY LOGS
    // -------------------------------------------------------------
    console.log('\n--- 10. Activity Logs & Audit Trail ---');

    const activitiesRes = await request('GET', '/api/activities', null, adminToken);
    assert(activitiesRes.status === 200 && Array.isArray(activitiesRes.body), `Loaded system activity audit trail (${activitiesRes.body.length} events)`);

    console.log('\n=======================================================');
    console.log('🏁 Step 6 Admin Dashboard: ALL 11 SECTIONS VERIFIED & PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed with error:', err.message);
    process.exit(1);
  }
}

runStep6AdminTestSuite();
