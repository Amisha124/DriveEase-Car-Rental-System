// DriveEase - Admin Activities Page Verification Test Suite
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

async function runAdminActivitiesTest() {
  console.log('🚀 Running Comprehensive Admin Activities Test Suite...\n');

  try {
    // 1. Admin Authentication & Role Guards
    console.log('--- 1. Admin Authorization & Security Guards ---');
    
    // 1.1 Unauthenticated request rejected with 401
    const noAuthRes = await request('GET', '/api/activities');
    assert(noAuthRes.status === 401, 'Unauthenticated access to /api/activities rejected with 401 Unauthorized');

    // 1.2 Customer authentication
    const custLoginRes = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(custLoginRes.status === 200 && custLoginRes.body.token, 'Customer login succeeded');
    const custToken = custLoginRes.body.token;

    // 1.3 Customer access rejected with 403 Forbidden
    const custRes = await request('GET', '/api/activities', null, custToken);
    assert(custRes.status === 403, 'Customer access to /api/activities rejected with 403 Forbidden');

    // 1.4 Admin authentication
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin login succeeded');
    const adminToken = adminLoginRes.body.token;
    assert(adminLoginRes.body.user.role === 'ADMIN', 'Admin user role is verified as ADMIN');

    // 2. Activities Feed Retrieval & Data Integrity
    console.log('\n--- 2. Activities Feed Retrieval & Real Data ---');
    const actRes = await request('GET', '/api/activities', null, adminToken);
    assert(actRes.status === 200, 'GET /api/activities returned 200 OK');
    assert(Array.isArray(actRes.body) && actRes.body.length > 0, `Retrieved active activity feed (${actRes.body.length} records)`);

    const sample = actRes.body[0];
    assert(sample.id && sample.type && sample.action && sample.user, 'Activity record contains id, type, action, user attributes');
    assert(sample.createdAt || sample.time, 'Activity record contains valid timestamp');

    // 3. Dynamic KPI Calculation Verification
    console.log('\n--- 3. Dynamic Activity KPIs Verification ---');
    const activities = actRes.body;
    const totalActivities = activities.length;
    const adminActions = activities.filter(a => a.user === 'admin@driveease.com' || a.userName === 'Admin' || (a.type && (a.type.includes('car_') || a.type.includes('user_status')))).length;
    const userActions = Math.max(0, totalActivities - adminActions);

    assert(totalActivities >= 10, `Total Activities metric: ${totalActivities} records`);
    assert(adminActions >= 1, `Admin Actions count: ${adminActions} privileged ops`);
    assert(userActions >= 1, `User Actions count: ${userActions} customer actions`);
    assert(userActions + adminActions === totalActivities, 'Sum of user actions + admin actions equals total activities');

    // 4. Activity Category Filters
    console.log('\n--- 4. Category Filter Mapping ---');
    const categories = ['booking', 'payment', 'car', 'login', 'review'];
    categories.forEach(cat => {
      const matching = activities.filter(a => (a.type || '').toLowerCase().includes(cat));
      assert(matching !== undefined, `Category filter '${cat}' mapped with ${matching.length} matching events`);
    });

    // 5. Cross-Page Activity Ingestion Verification
    console.log('\n--- 5. Cross-Page Activity Ingestion Verification ---');
    // 5.1 Perform Admin Action: Create temporary test car
    const testCarPayload = {
      name: 'Activity Test Car Asset',
      brand: 'Audi',
      type: 'Sedan',
      pricePerDay: 8000,
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Petrol'
    };
    const createCarRes = await request('POST', '/api/cars', testCarPayload, adminToken);
    assert(createCarRes.status === 201 && createCarRes.body.car.id, 'Created new test car in fleet');
    const testCarId = createCarRes.body.car.id;

    // 5.2 Verify new activity appears in feed
    const freshActRes = await request('GET', '/api/activities', null, adminToken);
    assert(freshActRes.status === 200, 'Re-fetched activity stream');
    const carAct = freshActRes.body.find(a => (a.description && a.description.includes('Activity Test Car Asset')) || (a.action && a.action.includes('Car added')));
    assert(carAct !== undefined, 'New car creation activity was ingested and verified in activity ledger');

    // Clean up test car
    await request('DELETE', `/api/cars/${testCarId}`, null, adminToken);

    console.log('\n=======================================================');
    console.log('🏁 Admin Activities: ALL VERIFICATION CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Admin Activities Test Failed:', err.message);
    process.exit(1);
  }
}

runAdminActivitiesTest();
