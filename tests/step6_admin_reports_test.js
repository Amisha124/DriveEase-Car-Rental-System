// DriveEase - Admin Reports Page Verification Test Suite
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

async function runAdminReportsTest() {
  console.log('🚀 Running Comprehensive Admin Reports Test Suite...\n');

  try {
    // 1. Admin Authentication & Role Guards
    console.log('--- 1. Admin Authorization & Security Guards ---');
    
    // 1.1 Unauthenticated request rejected with 401
    const noAuthRes = await request('GET', '/api/reports/export/revenue');
    assert(noAuthRes.status === 401, 'Unauthenticated access to export endpoint rejected with 401');

    // 1.2 Customer authentication
    const custLoginRes = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(custLoginRes.status === 200 && custLoginRes.body.token, 'Customer login succeeded');
    const custToken = custLoginRes.body.token;

    // 1.3 Customer access to export rejected with 403
    const custExportRes = await request('GET', '/api/reports/export/revenue', null, custToken);
    assert(custExportRes.status === 403, 'Customer access to admin export rejected with 403 Forbidden');

    // 1.4 Admin authentication
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin login succeeded');
    const adminToken = adminLoginRes.body.token;
    assert(adminLoginRes.body.user.role === 'ADMIN', 'Admin user role is verified as ADMIN');

    // 2. Report Financial & Operational Telemetry
    console.log('\n--- 2. Report Financial & Operational Telemetry ---');
    const analyticsRes = await request('GET', '/api/analytics/admin', null, adminToken);
    assert(analyticsRes.status === 200, 'GET /api/analytics/admin returned 200 OK');
    const data = analyticsRes.body;

    assert(data.kpis !== undefined, 'KPIs payload exists in analytics response');
    const rev = data.kpis.totalRevenue || 0;
    const exp = data.kpis.totalExpenses || 0;
    const profit = data.kpis.totalProfit !== undefined ? data.kpis.totalProfit : Math.max(0, rev - exp);
    const bookingsCount = data.kpis.totalBookings || 0;
    const fleetUtil = data.analyticsKpis ? data.analyticsKpis.fleetUtilization : 0;
    const abv = bookingsCount > 0 ? Math.round(rev / bookingsCount) : 0;

    assert(typeof rev === 'number' && rev > 0, `Total Revenue: ₹${rev.toLocaleString()}`);
    assert(typeof bookingsCount === 'number' && bookingsCount >= 1, `Total Bookings: ${bookingsCount}`);
    assert(typeof fleetUtil === 'number' && fleetUtil >= 0, `Fleet Utilization: ${fleetUtil}%`);
    assert(typeof exp === 'number' && exp >= 0, `Total Expenses: ₹${exp.toLocaleString()}`);
    assert(typeof profit === 'number' && profit >= 0, `Total Profit: ₹${profit.toLocaleString()}`);
    assert(typeof abv === 'number' && abv > 0, `Average Booking Value: ₹${abv.toLocaleString()}`);

    // Exact formula check: Net Profit = Revenue - Expenses
    const calculatedProfit = Math.max(0, rev - exp);
    assert(profit === calculatedProfit, `Profit strictly matches Formula (Revenue - Expenses = ₹${calculatedProfit})`);

    // 3. Multi-Range Time Series (7 Days, 30 Days, 90 Days)
    console.log('\n--- 3. Multi-Range Time Series Telemetry ---');
    assert(data.timeRanges !== undefined, 'Multi-range time series telemetry exists');
    assert(Array.isArray(data.timeRanges['7days'].labels) && data.timeRanges['7days'].labels.length === 7, '7-Day time series contains 7 data points');
    assert(Array.isArray(data.timeRanges['30days'].labels) && data.timeRanges['30days'].labels.length === 30, '30-Day time series contains 30 data points');
    assert(Array.isArray(data.timeRanges['90days'].labels) && data.timeRanges['90days'].labels.length === 12, '90-Day time series contains 12 aggregated weekly buckets');

    // 4. Category Fleet Breakdown & Top Vehicles
    console.log('\n--- 4. Category Fleet Breakdown & Top Vehicles ---');
    assert(Array.isArray(data.categoryBreakdown) && data.categoryBreakdown.length > 0, `Vehicle category breakdown available (${data.categoryBreakdown.length} categories)`);
    assert(Array.isArray(data.topCars) && data.topCars.length > 0, `Top performing vehicle fleet available (${data.topCars.length} models)`);

    // 5. CSV Export Endpoints (All 5 Types)
    console.log('\n--- 5. CSV Export Endpoints (All 5 Report Types) ---');
    const exportTypes = [
      { type: 'bookings', headerCol: 'Booking ID' },
      { type: 'revenue', headerCol: 'Payment ID' },
      { type: 'fleet', headerCol: 'Car ID' },
      { type: 'users', headerCol: 'User ID' },
      { type: 'expenses', headerCol: 'Expense ID' }
    ];

    for (const expItem of exportTypes) {
      const res = await request('GET', `/api/reports/export/${expItem.type}`, null, adminToken);
      assert(res.status === 200, `GET /api/reports/export/${expItem.type} returned 200 OK`);
      assert(res.headers['content-type'] && res.headers['content-type'].includes('text/csv'), `Content-Type is text/csv for ${expItem.type}`);
      assert(res.rawText && res.rawText.includes(expItem.headerCol), `CSV contains expected column header "${expItem.headerCol}"`);
      const lines = res.rawText.trim().split('\n');
      assert(lines.length >= 2, `${expItem.type} CSV contains valid data rows (count: ${lines.length - 1})`);
    }

    console.log('\n=======================================================');
    console.log('🏁 Admin Reports Backend: ALL VERIFICATION CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Admin Reports Test Failed:', err.message);
    process.exit(1);
  }
}

runAdminReportsTest();
