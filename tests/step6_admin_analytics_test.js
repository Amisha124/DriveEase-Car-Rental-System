// DriveEase - Admin Analytics Page Verification Test Suite
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

async function runAdminAnalyticsTest() {
  console.log('🚀 Running Comprehensive Admin Analytics Test Suite...\n');

  try {
    // 1. Authenticate as Admin
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin authentication successful');
    const token = loginRes.body.token;

    // 2. Fetch Admin Analytics Telemetry
    const analyticsRes = await request('GET', '/api/analytics/admin', null, token);
    assert(analyticsRes.status === 200, 'GET /api/analytics/admin returned 200 OK');
    const data = analyticsRes.body;

    // 3. Verify Row 1: 4 KPI Cards Metrics
    console.log('\n--- 1. Row 1 KPI Metrics Verification ---');
    assert(data.analyticsKpis !== undefined, 'analyticsKpis object exists');
    assert(typeof data.analyticsKpis.fleetUtilization === 'number' && data.analyticsKpis.fleetUtilization >= 0, `Fleet Utilization: ${data.analyticsKpis.fleetUtilization}%`);
    assert(typeof data.analyticsKpis.avgTripDuration === 'string' || typeof data.analyticsKpis.avgTripDuration === 'number', `Avg Trip Duration: ${data.analyticsKpis.avgTripDuration} Days`);
    assert(typeof data.analyticsKpis.fleetEfficiency === 'number' && data.analyticsKpis.fleetEfficiency > 0, `Fleet Efficiency: ${data.analyticsKpis.fleetEfficiency}%`);
    assert(typeof data.analyticsKpis.revenuePerVehicle === 'number' && data.analyticsKpis.revenuePerVehicle > 0, `Revenue Per Vehicle: ₹${data.analyticsKpis.revenuePerVehicle}`);

    // 4. Verify Row 2: Multi-Range Time Series (7 Days, 30 Days, 90 Days)
    console.log('\n--- 2. Multi-Range Time Series (7d / 30d / 90d) ---');
    assert(data.timeRanges !== undefined, 'timeRanges object exists');
    assert(Array.isArray(data.timeRanges['7days'].labels) && data.timeRanges['7days'].labels.length === 7, '7-day range has 7 daily data points');
    assert(Array.isArray(data.timeRanges['30days'].labels) && data.timeRanges['30days'].labels.length === 30, '30-day range has 30 daily data points');
    assert(Array.isArray(data.timeRanges['90days'].labels) && data.timeRanges['90days'].labels.length === 12, '90-day range has 12 weekly aggregated buckets');

    // 5. Verify Row 3: Fleet Status Telemetry
    console.log('\n--- 3. Fleet Utilization & Capacity Metrics ---');
    assert(typeof data.analyticsKpis.utilizedVehicles === 'number', `Utilized Vehicles on Road: ${data.analyticsKpis.utilizedVehicles}`);
    assert(typeof data.analyticsKpis.availableVehicles === 'number', `Available Vehicles for Booking: ${data.analyticsKpis.availableVehicles}`);
    assert(typeof data.analyticsKpis.maintenanceVehicles === 'number', `Vehicles in Maintenance: ${data.analyticsKpis.maintenanceVehicles}`);
    assert(typeof data.analyticsKpis.outOfServiceVehicles === 'number', `Vehicles Out of Service: ${data.analyticsKpis.outOfServiceVehicles}`);

    // 6. Verify Row 4: Category Performance
    console.log('\n--- 4. Vehicle Category Breakdown ---');
    assert(Array.isArray(data.categoryBreakdown) && data.categoryBreakdown.length === 5, '5 automotive categories breakdown calculated (Sedan, SUV, Luxury, Sports, Electric)');
    data.categoryBreakdown.forEach(cat => {
      assert(typeof cat.revenue === 'number' && typeof cat.bookingsCount === 'number', `Category ${cat.category}: ${cat.totalCars} cars, ${cat.bookingsCount} trips, ₹${cat.revenue} rev`);
    });

    // 7. Verify Row 5: Performance Highlights
    console.log('\n--- 5. Vehicle Telemetry Highlights ---');
    assert(data.performanceHighlights !== undefined, 'performanceHighlights object exists');
    assert(data.performanceHighlights.topVehicle !== null, `Top Performing Vehicle: ${data.performanceHighlights.topVehicle.name} (₹${data.performanceHighlights.topVehicle.revenue})`);
    assert(data.performanceHighlights.mostBooked !== null, `Most Booked Vehicle: ${data.performanceHighlights.mostBooked.name} (${data.performanceHighlights.mostBooked.bookingsCount} trips)`);
    assert(typeof data.performanceHighlights.avgBookingValue === 'number' && data.performanceHighlights.avgBookingValue > 0, `Average Booking Value: ₹${data.performanceHighlights.avgBookingValue}`);

    console.log('\n=======================================================');
    console.log('🏁 Admin Analytics Deep View: ALL VERIFICATION CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Admin Analytics Test Failed:', err.message);
    process.exit(1);
  }
}

runAdminAnalyticsTest();
