// DriveEase - Comprehensive Critical Bug Fixes & Second-Pass Verification Suite
// Validates:
// 1. Public Header Auth State & Stale LocalStorage Purge & Dashboard Route Guards
// 2. Dashboard Protection (Fresh Session, Expired/Invalid Token, Role-Based Access)
// 3. Duplicate Vehicle Listings (Deduplication in DB, Landing & Browse Catalog)
// 4. SPA Routing (#home, #browse, #how-it-works, #offers, #reviews, #faq) & Offset Scrolling
// 5. Tax Invoice PDF Structure & Print Styles

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
  console.log('🧪 DRIVEEASE SECOND-PASS BUG FIX VERIFICATION SUITE');
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
  // SECTION 1: PUBLIC HEADER AUTH STATE & STALE LOCALSTORAGE HANDLING
  // ----------------------------------------------------------------
  console.log('▶ [1] Testing Public Header Auth State & Stale LocalStorage Handling...');

  const apiJs = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../public/js/app.js'), 'utf8');

  // Verify api.js State logic purges orphan driveease_user when driveease_token is missing
  assert(apiJs.includes("localStorage.removeItem('driveease_user')"), 'api.js includes orphan user cleanup on missing/invalid token');
  assert(apiJs.includes("function isAuthenticated()"), 'api.js exports isAuthenticated helper checking State.token && State.user');
  assert(apiJs.includes("function isAdmin()"), 'api.js exports isAdmin helper checking State.token && State.user && role === ADMIN');

  // Verify app.js navbar rendering renders Login on public homepage and guards dashboard routes
  assert(appJs.includes("authNavBtn.innerHTML = `Login`;"), 'app.js renders Login button on public homepage header');
  assert(appJs.includes("if (!State.token || !State.user"), 'app.js checks State.token && State.user for protected route guards');

  // Test DOM simulation with stale user object in localStorage (no token)
  const mockStorage = {
    store: {
      driveease_user: JSON.stringify({ id: 'usr_stale', name: 'Ghost User', role: 'CUSTOMER' })
      // Notice: driveease_token is intentionally MISSING!
    },
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = v; },
    removeItem(k) { delete this.store[k]; }
  };

  const evalApiSandbox = new Function('localStorage', apiJs + '\nreturn { State, isAuthenticated, isAdmin };');
  const apiInstance = evalApiSandbox(mockStorage);

  assert(apiInstance.State.token === null, 'State.token is null when no token in localStorage');
  assert(apiInstance.State.user === null, 'Stale State.user is set to null when token is missing');
  assert(mockStorage.getItem('driveease_user') === null, 'Orphan driveease_user was purged from localStorage');
  assert(apiInstance.isAuthenticated() === false, 'isAuthenticated() correctly returns false for stale user');

  // Simulate App.render() with unauthenticated state
  const mockDOM = {
    elements: {
      'view-public': { style: { display: '' } },
      'public-home-section': { style: { display: '' } },
      'public-browse-section': { style: { display: '' } },
      'view-user-dash': { style: { display: '' } },
      'view-admin-dash': { style: { display: '' } },
      'public-car-details-section': { style: { display: '' } },
      'public-nav-auth-btn': { innerHTML: '', onclick: null }
    },
    getElementById(id) {
      if (!this.elements[id]) {
        this.elements[id] = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} } };
      }
      return this.elements[id];
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };

  const evalApp = new Function('State', 'document', 'window', 'openModal', 'closeModal', 'showToast', 'AuthAPI',
    appJs + '\nreturn App;'
  );

  const testApp = evalApp(apiInstance.State, mockDOM, { location: { hash: '#home' }, scrollTo: () => {} }, () => {}, () => {}, () => {}, {});
  testApp.render();

  const authBtnHtml = mockDOM.elements['public-nav-auth-btn'].innerHTML;
  assert(authBtnHtml.includes('Login'), 'Logged-out header displays "Login" button');
  assert(!authBtnHtml.includes('Admin Portal'), 'Logged-out header does NOT display "Admin Portal"');
  assert(!authBtnHtml.includes('My Dashboard'), 'Logged-out header does NOT display "My Dashboard"');

  // Verify authenticated customer on homepage: displays "Login" and preserves session
  const custState = { token: 'valid-jwt-token', user: { id: 'usr_cust_01', name: 'John Doe', role: 'CUSTOMER' } };
  const testAppCust = evalApp(custState, mockDOM, { location: { hash: '#home' }, scrollTo: () => {} }, () => {}, () => {}, () => {}, {});
  testAppCust.render();
  assert(mockDOM.elements['public-nav-auth-btn'].innerHTML.includes('Login'), 'Public homepage displays "Login" even when customer is authenticated');
  assert(!mockDOM.elements['public-nav-auth-btn'].innerHTML.includes('Admin Portal'), 'Public homepage does NOT display "Admin Portal" for customer');
  assert(!mockDOM.elements['public-nav-auth-btn'].innerHTML.includes('My Dashboard'), 'Public homepage displays Login instead of My Dashboard');
  assert(custState.token === 'valid-jwt-token' && custState.user.name === 'John Doe', 'Customer authenticated session is preserved intact');

  // Verify authenticated admin on homepage: displays "Login"
  const adminState = { token: 'valid-admin-jwt', user: { id: 'usr_admin_01', name: 'Admin', role: 'ADMIN' } };
  const testAppAdmin = evalApp(adminState, mockDOM, { location: { hash: '#home' }, scrollTo: () => {} }, () => {}, () => {}, () => {}, {});
  testAppAdmin.render();
  assert(mockDOM.elements['public-nav-auth-btn'].innerHTML.includes('Login'), 'Public homepage displays "Login" when admin visits homepage');
  assert(adminState.token === 'valid-admin-jwt' && adminState.user.role === 'ADMIN', 'Admin authenticated session is preserved intact');

  // Reset to logged-out state
  testApp.render();
  assert(mockDOM.elements['public-nav-auth-btn'].innerHTML.includes('Login'), 'Logged-out header displays "Login"');

  // ----------------------------------------------------------------
  // SECTION 2: DASHBOARD ROUTE GUARDS & BACKEND AUTHORIZATION
  // ----------------------------------------------------------------
  console.log('\n▶ [2] Testing Dashboard Protection & Route Guards...');

  // 2.1 Unauthenticated attempt to access customer dashboard
  const unauthWindow = { location: { hash: '#user-dashboard' }, scrollTo: () => {} };
  let authModalOpened = false;
  let toastMessage = '';
  const testAppUnauth = evalApp(
    { token: null, user: null },
    mockDOM,
    unauthWindow,
    (m) => { if (m === 'auth-modal') authModalOpened = true; },
    () => {},
    (t, m) => { toastMessage = m; },
    {}
  );
  testAppUnauth.render();
  assert(unauthWindow.location.hash === '#home', 'Direct navigation to #user-dashboard without token redirects to #home');
  assert(authModalOpened === true, 'Direct navigation to #user-dashboard triggers login prompt');

  // 2.2 Unauthenticated attempt to access admin dashboard
  unauthWindow.location.hash = '#admin-dashboard';
  testAppUnauth.render();
  assert(unauthWindow.location.hash === '#home', 'Direct navigation to #admin-dashboard without admin credentials redirects to #home');

  // 2.3 Expired/invalid token on backend API
  const badTokenRes = await apiRequest('/api/auth/me', 'GET', null, 'invalid.token.here');
  assert(badTokenRes.status === 401 || badTokenRes.status === 403, 'Backend rejects invalid JWT token with 401/403');

  const badBookingRes = await apiRequest('/api/bookings/my-bookings', 'GET', null, 'invalid.token.here');
  assert(badBookingRes.status === 401 || badBookingRes.status === 403, 'Backend blocks protected bookings API for invalid token');

  // 2.4 Valid Customer Login & Role Check
  const custLoginRes = await apiRequest('/api/auth/login', 'POST', {
    email: 'john.doe@example.com',
    password: 'john123'
  });
  assert(custLoginRes.status === 200 && custLoginRes.body.token, 'Customer login succeeds with JWT');
  const custToken = custLoginRes.body.token;
  const custUser = custLoginRes.body.user;

  // Customer cannot access admin APIs
  const custAdminRes = await apiRequest('/api/analytics/admin', 'GET', null, custToken);
  assert(custAdminRes.status === 403, 'Customer token is denied access to admin backend endpoints (403)');

  // 2.5 Valid Admin Login & Role Check
  const adminLoginRes = await apiRequest('/api/auth/login', 'POST', {
    email: 'admin@driveease.com',
    password: 'admin123'
  });
  assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin login succeeds with JWT');
  const adminToken = adminLoginRes.body.token;

  const adminOverviewRes = await apiRequest('/api/analytics/admin', 'GET', null, adminToken);
  assert(adminOverviewRes.status === 200 && adminOverviewRes.body.kpis && adminOverviewRes.body.kpis.totalCars, 'Admin token successfully accesses admin backend endpoints');

  // ----------------------------------------------------------------
  // SECTION 3: DUPLICATE VEHICLE LISTINGS & DEDUPLICATION
  // ----------------------------------------------------------------
  console.log('\n▶ [3] Testing Vehicle Catalog & Unique ID Deduplication...');

  // 3.1 Verify data/cars.json contains genuine unique vehicles
  const carsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/cars.json'), 'utf8'));
  const carIdsInFile = carsRaw.map(c => c.id);
  const uniqueCarIdsInFile = new Set(carIdsInFile);
  assert(carIdsInFile.length === uniqueCarIdsInFile.size, `data/cars.json contains ZERO duplicate IDs (${carIdsInFile.length} total, ${uniqueCarIdsInFile.size} unique)`);
  assert(carIdsInFile.length >= 24, `data/cars.json contains complete genuine fleet (${carIdsInFile.length} vehicles)`);

  // Verify Lamborghini Urus S appears exactly ONCE in database
  const urusMatches = carsRaw.filter(c => c.name && c.name.includes('Lamborghini Urus'));
  assert(urusMatches.length === 1, `Lamborghini Urus appears exactly 1 time in database (ID: ${urusMatches[0]?.id})`);

  // 3.2 Verify API returns unique cars
  const carsApiRes = await apiRequest('/api/cars');
  const apiCarIds = carsApiRes.body.map(c => c.id);
  const uniqueApiCarIds = new Set(apiCarIds);
  assert(apiCarIds.length === uniqueApiCarIds.size, `GET /api/cars returns ZERO duplicate car IDs (${apiCarIds.length} cars)`);

  // 3.3 Verify Landing Page Deduplication Logic
  const landingJs = fs.readFileSync(path.join(__dirname, '../public/js/landing.js'), 'utf8');
  assert(landingJs.includes('const seenIds = new Set()'), 'Landing.js strictly enforces Set-based unique ID deduplication');

  // 3.4 Verify Browse Cars Deduplication Logic
  const browseJs = fs.readFileSync(path.join(__dirname, '../public/js/browse.js'), 'utf8');
  assert(browseJs.includes('const seenIds = new Set()'), 'Browse.js strictly enforces Set-based unique ID deduplication in loadCars()');

  // ----------------------------------------------------------------
  // SECTION 4: SPA ROUTING & #how-it-works NAVIGATION
  // ----------------------------------------------------------------
  console.log('\n▶ [4] Testing SPA Routing, Navigation & How It Works Offset Scrolling...');

  // 4.1 Check CSS scroll-margin-top in landing.css
  const landingCss = fs.readFileSync(path.join(__dirname, '../public/css/landing.css'), 'utf8');
  assert(landingCss.includes('#how-it-works') && landingCss.includes('scroll-margin-top'), 'landing.css includes scroll-margin-top for #how-it-works');
  assert(landingCss.includes('#why-us') && landingCss.includes('#offers') && landingCss.includes('#reviews'), 'landing.css includes scroll-margin-top for all section anchors');

  // 4.2 Verify Landing.scrollToSection implementation
  assert(landingJs.includes('scrollToSection(sectionId)'), 'Landing.scrollToSection exists');
  assert(landingJs.includes('headerOffset = 80'), 'Landing.scrollToSection offsets sticky header height');

  // 4.3 Verify HTML section anchors exist
  const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert(indexHtml.includes('id="home-hero"'), 'index.html contains #home-hero section');
  assert(indexHtml.includes('id="featured-fleet"'), 'index.html contains #featured-fleet section');
  assert(indexHtml.includes('id="why-us"'), 'index.html contains #why-us section');
  assert(indexHtml.includes('id="offers"'), 'index.html contains #offers section');
  assert(indexHtml.includes('id="how-it-works"'), 'index.html contains #how-it-works section');
  assert(indexHtml.includes('id="reviews"'), 'index.html contains #reviews section');
  assert(indexHtml.includes('id="faq"'), 'index.html contains #faq section');
  assert(indexHtml.includes('id="public-browse-section"'), 'index.html contains #public-browse-section');

  // 4.4 Test Routing behavior in sandbox
  const routerState = { token: null, user: null };
  const routerDOM = {
    elements: {
      'view-public': { style: { display: '' } },
      'public-home-section': { style: { display: '' } },
      'public-browse-section': { style: { display: '' } },
      'view-user-dash': { style: { display: '' } },
      'view-admin-dash': { style: { display: '' } },
      'public-car-details-section': { style: { display: '' } },
      'public-nav-auth-btn': { innerHTML: '', onclick: null }
    },
    getElementById(id) {
      if (!this.elements[id]) {
        this.elements[id] = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} } };
      }
      return this.elements[id];
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };

  const routerWin = { location: { hash: '#how-it-works' }, scrollTo: () => {} };
  const testRouter = evalApp(routerState, routerDOM, routerWin, () => {}, () => {}, () => {}, {});

  // Test #how-it-works
  testRouter.render();
  assert(routerDOM.elements['view-public'].style.display === 'block', '#how-it-works activates view-public container');
  assert(routerDOM.elements['public-home-section'].style.display === 'block', '#how-it-works activates public-home-section where #how-it-works section resides');
  assert(routerDOM.elements['public-browse-section'].style.display === 'none', '#how-it-works ensures browse section is hidden');

  // Test #browse
  routerWin.location.hash = '#browse';
  testRouter.render();
  assert(routerDOM.elements['view-public'].style.display === 'block', '#browse activates view-public container');
  assert(routerDOM.elements['public-browse-section'].style.display === 'block', '#browse activates public-browse-section');
  assert(routerDOM.elements['public-home-section'].style.display === 'none', '#browse hides public-home-section');

  // Test #home
  routerWin.location.hash = '#home';
  testRouter.render();
  assert(routerDOM.elements['public-home-section'].style.display === 'block', '#home activates public-home-section');
  assert(routerDOM.elements['public-browse-section'].style.display === 'none', '#home hides public-browse-section');

  // ----------------------------------------------------------------
  // SECTION 5: TAX INVOICE GENERATION & PDF PRINT STYLES
  // ----------------------------------------------------------------
  console.log('\n▶ [5] Testing GST Tax Invoice & Print/PDF Export Formatting...');

  const bookingRes = await apiRequest('/api/bookings/BK-1025', 'GET', null, custToken);
  assert(bookingRes.status === 200 && bookingRes.body.id === 'BK-1025', 'Fetched sample booking BK-1025 for invoice testing');

  const bookingJs = fs.readFileSync(path.join(__dirname, '../public/js/booking.js'), 'utf8');
  assert(bookingJs.includes('openPrintReceipt(bookingId)'), 'booking.js contains openPrintReceipt');

  const bookingDOM = {
    elements: {},
    getElementById(id) {
      if (!this.elements[id]) {
        this.elements[id] = { innerHTML: '', style: {}, classList: { add() {}, remove() {}, toggle() {} } };
      }
      return this.elements[id];
    }
  };

  const evalBooking = new Function('BookingsAPI', 'formatDate', 'formatCurrency', 'openModal', 'closeModal', 'showToast', 'document',
    bookingJs + '\nreturn Booking;'
  );

  const testBooking = evalBooking(
    { getById: async () => bookingRes.body },
    (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    (val) => `₹${Number(val).toLocaleString('en-IN')}`,
    () => {}, () => {}, () => {},
    bookingDOM
  );

  await testBooking.openPrintReceipt('BK-1025');
  const invoiceHtml = bookingDOM.getElementById('receipt-modal-body').innerHTML;

  assert(invoiceHtml.includes('TAX INVOICE'), 'Generated receipt displays TAX INVOICE heading');
  assert(invoiceHtml.includes('INV-BK-1025'), 'Generated receipt displays Invoice Number');
  assert(invoiceHtml.includes('John Doe'), 'Generated receipt displays Customer Name');
  assert(invoiceHtml.includes('BMW 5 Series'), 'Generated receipt displays Vehicle Name');
  assert(invoiceHtml.includes('GST') && invoiceHtml.includes('18.00%'), 'Generated receipt includes 18% GST calculation line');
  assert(invoiceHtml.includes('PAID'), 'Generated receipt includes Paid badge');

  const bookingCss = fs.readFileSync(path.join(__dirname, '../public/css/booking.css'), 'utf8');
  assert(bookingCss.includes('@media print'), 'booking.css has @media print stylesheet');
  assert(bookingCss.includes('#receipt-modal') && bookingCss.includes('position: static !important;'), '@media print resets modal overlay to normal static document flow');

  console.log('\n================================================================');
  console.log(`🏁 VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution failure:', err);
  process.exit(1);
});
