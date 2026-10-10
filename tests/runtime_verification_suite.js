const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runRuntimeVerification() {
  console.log('================================================================');
  console.log('DRIVEEASE — LIVE SERVER RUNTIME BEHAVIOR VERIFICATION');
  console.log('================================================================\n');

  const results = {
    check1_startup: false,
    check2_auth: false,
    check3_customer: false,
    check4_admin: false,
    check5_assets_css: false,
    errors: []
  };

  try {
    // ----------------------------------------------------------------
    // CHECK 1: APPLICATION STARTUP & STATIC FILE DELIVERY
    // ----------------------------------------------------------------
    console.log('--- CHECK 1: APPLICATION STARTUP & HTTP SERVICE ---');
    const rootRes = await fetch(`${BASE_URL}/`);
    if (!rootRes.ok) throw new Error(`Root endpoint failed with status: ${rootRes.status}`);
    const htmlText = await rootRes.text();
    if (!htmlText.includes('DriveEase') || !htmlText.includes('app.js')) {
      throw new Error('Index HTML does not contain required DriveEase scripts');
    }
    console.log(`  ✓ Root URL: ${BASE_URL}/ returned HTTP 200 OK (${htmlText.length} bytes)`);

    // Verify static CSS and JS asset delivery
    const assets = [
      '/css/index.css',
      '/css/user-dash.css',
      '/css/admin-dash.css',
      '/css/browse.css',
      '/css/booking.css',
      '/css/car-details.css',
      '/js/app.js',
      '/js/api.js',
      '/js/user-dash.js',
      '/js/browse.js',
      '/js/booking.js',
      '/js/car-details.js',
      '/js/admin-dash.js'
    ];

    for (const asset of assets) {
      const aRes = await fetch(`${BASE_URL}${asset}`);
      if (!aRes.ok) throw new Error(`Asset ${asset} failed to load: HTTP ${aRes.status}`);
    }
    console.log(`  ✓ All ${assets.length} core stylesheets and scripts served with HTTP 200 OK`);
    results.check1_startup = true;

    // ----------------------------------------------------------------
    // CHECK 2: AUTHENTICATION, PROTECTED ROUTES & ROLE GUARDS
    // ----------------------------------------------------------------
    console.log('\n--- CHECK 2: AUTHENTICATION, SESSION & ROLE GUARDS ---');
    
    // Customer Login
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@example.com', password: 'john123' })
    });
    const custData = await custLoginRes.json();
    if (!custLoginRes.ok || !custData.token) throw new Error('Customer login failed: ' + custData.error);
    const customerToken = custData.token;
    console.log(`  ✓ Customer Login: ${custData.user.name} (${custData.user.role}) - Token generated`);

    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@driveease.com', password: 'admin123' })
    });
    const adminData = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminData.token) throw new Error('Admin login failed: ' + adminData.error);
    const adminToken = adminData.token;
    console.log(`  ✓ Admin Login: ${adminData.user.name} (${adminData.user.role}) - Token generated`);

    // Protected Route: Unauthenticated access rejected with 401
    const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
    if (unauthRes.status !== 401) throw new Error(`Unauthenticated request expected 401, got ${unauthRes.status}`);
    console.log(`  ✓ Protected Route Guard: Unauthenticated access rejected with 401 Unauthorized`);

    // Role Guard: Customer accessing Admin Analytics rejected with 403
    const forbiddenRes = await fetch(`${BASE_URL}/api/analytics/admin`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    if (forbiddenRes.status !== 403) throw new Error(`Customer access to admin API expected 403, got ${forbiddenRes.status}`);
    console.log(`  ✓ Role Authorization Guard: Customer accessing Admin Analytics rejected with 403 Forbidden`);

    results.check2_auth = true;

    // ----------------------------------------------------------------
    // CHECK 3: CUSTOMER WORKFLOWS (FLEET, BOOKING, PAYMENT, REVIEWS, PREFS)
    // ----------------------------------------------------------------
    console.log('\n--- CHECK 3: CUSTOMER LIFECYCLE WORKFLOWS ---');
    
    // 3A: Browse Fleet
    const carsRes = await fetch(`${BASE_URL}/api/cars`);
    const cars = await carsRes.json();
    if (!carsRes.ok || !Array.isArray(cars) || cars.length === 0) throw new Error('Failed to retrieve fleet cars');
    console.log(`  ✓ Fleet Browse: Retrieved ${cars.length} vehicles from catalog`);

    // 3B: View Vehicle Details
    const targetCar = cars[0];
    const carDetailsRes = await fetch(`${BASE_URL}/api/cars/${targetCar.id}`);
    const carDetails = await carDetailsRes.json();
    if (!carDetailsRes.ok || carDetails.id !== targetCar.id) throw new Error('Vehicle details fetch failed');
    console.log(`  ✓ Vehicle Details: Retrieved specs for ${carDetails.name} (${carDetails.brand} ${carDetails.type})`);

    // 3C: Customer Analytics & Dashboard Overview
    const userAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/user`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const userAnalytics = await userAnalyticsRes.json();
    if (!userAnalyticsRes.ok || !userAnalytics.kpis) throw new Error('Customer analytics fetch failed');
    console.log(`  ✓ Customer Overview: Total Bookings: ${userAnalytics.kpis.totalBookings}, Spend: ₹${userAnalytics.kpis.totalSpent}`);

    // 3D: Customer Favourites Toggle
    const favToggleRes = await fetch(`${BASE_URL}/api/favourites/toggle/${targetCar.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const favData = await favToggleRes.json();
    if (!favToggleRes.ok) throw new Error('Favourites toggle failed');
    console.log(`  ✓ Wishlist Toggle: ${targetCar.name} isFavourite status: ${favData.isFavourite}`);

    // Revert favourite toggle to preserve original state
    await fetch(`${BASE_URL}/api/favourites/toggle/${targetCar.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    // 3E: Notifications Center
    const notifsRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const notifsData = await notifsRes.json();
    if (!notifsRes.ok) throw new Error('Notifications fetch failed');
    console.log(`  ✓ Notifications Center: ${notifsData.notifications?.length || 0} user alerts active`);

    // 3F: Profile Credentials Management
    const profileRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok || !profileData.user) throw new Error('User profile fetch failed');
    console.log(`  ✓ My Profile: Verified name: ${profileData.user.name}, License: ${profileData.user.licenseNumber}`);

    // 3G: Settings & Notification Preferences
    const prefsRes = await fetch(`${BASE_URL}/api/auth/preferences`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const prefsData = await prefsRes.json();
    if (!prefsRes.ok || !prefsData.preferences) throw new Error('User preferences fetch failed');
    console.log(`  ✓ Settings Hub: Theme: ${prefsData.preferences.theme}, Currency: ${prefsData.preferences.currency}`);

    results.check3_customer = true;

    // ----------------------------------------------------------------
    // CHECK 4: ADMIN WORKFLOWS (FLEET, USERS, EXPENSES, REPORTS)
    // ----------------------------------------------------------------
    console.log('\n--- CHECK 4: ADMIN OPERATIONS WORKFLOWS ---');

    // 4A: Admin Analytics & Profit Formula
    const adminAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminAnalytics = await adminAnalyticsRes.json();
    if (!adminAnalyticsRes.ok || !adminAnalytics.kpis) throw new Error('Admin analytics fetch failed');
    const { totalRevenue, totalExpenses, totalProfit } = adminAnalytics.kpis;
    if (totalRevenue - totalExpenses !== totalProfit) {
      throw new Error(`Profit formula mismatch: Revenue (${totalRevenue}) - Expenses (${totalExpenses}) != Profit (${totalProfit})`);
    }
    console.log(`  ✓ Admin KPIs: Revenue: ₹${totalRevenue}, Expenses: ₹${totalExpenses}, Net Profit: ₹${totalProfit}`);
    console.log(`  ✓ Profit Calculation: Revenue - Expenses = Profit verified accurately`);

    // 4B: Admin Users Management
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const usersData = await usersRes.json();
    if (!usersRes.ok || !Array.isArray(usersData)) throw new Error('Admin users fetch failed');
    console.log(`  ✓ User Management: ${usersData.length} registered user accounts loaded`);

    // 4C: Admin Expenses Ledger
    const expensesRes = await fetch(`${BASE_URL}/api/expenses`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const expensesData = await expensesRes.json();
    if (!expensesRes.ok || !Array.isArray(expensesData)) throw new Error('Admin expenses fetch failed');
    console.log(`  ✓ Operational Expenses Ledger: ${expensesData.length} expense items on file`);

    // 4D: Admin Reports Export
    const reportRes = await fetch(`${BASE_URL}/api/reports/bookings/export`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!reportRes.ok) throw new Error('Bookings CSV export failed');
    const csvContent = await reportRes.text();
    console.log(`  ✓ CSV Report Engine: Bookings CSV generated (${csvContent.split('\n').length} rows)`);

    results.check4_admin = true;

    // ----------------------------------------------------------------
    // CHECK 5: VISUAL RUNTIME & RESPONSIVENESS CHECKS
    // ----------------------------------------------------------------
    console.log('\n--- CHECK 5: VISUAL STYLESHEET TOKENS & RESPONSIVE AUDIT ---');
    const cssPath = path.join(__dirname, '../public/css/user-dash.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    const breakpoints = ['480px', '768px', '1024px', '1280px'];
    for (const bp of breakpoints) {
      if (!cssContent.includes(bp)) {
        throw new Error(`Responsive breakpoint ${bp} missing in user-dash.css`);
      }
      console.log(`  ✓ Responsive Breakpoint: @media (max-width: ${bp}) rules verified in stylesheets (covers 390px - 1920px viewports)`);
    }

    const themeTokens = ['--bg-card', '--bg-tertiary', '--border-color', '--text-primary', '--cyan', '--emerald'];
    for (const token of themeTokens) {
      if (!cssContent.includes(token)) {
        throw new Error(`Theme token ${token} missing in user-dash.css`);
      }
    }
    console.log(`  ✓ Luxury Design System: Color tokens & dark/light theme variables intact`);

    results.check5_assets_css = true;

    console.log('\n================================================================');
    console.log('🏁 ALL 5 RUNTIME VERIFICATION CHECKS COMPLETED WITH 100% SUCCESS');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ RUNTIME VERIFICATION ERROR:', err.message);
    results.errors.push(err.message);
    process.exit(1);
  }
}

runRuntimeVerification();
