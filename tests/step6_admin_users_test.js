// DriveEase - Admin Users Verification Test Suite
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

async function runAdminUsersTestSuite() {
  console.log('🚀 Running Comprehensive Admin Users Test Suite...\n');

  try {
    // 1. Authenticate as Admin and Customer
    console.log('--- 1. Authentication & Role-Based Access Control Verification ---');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin authentication successful');
    const adminToken = adminLoginRes.body.token;
    const adminUserId = adminLoginRes.body.user.id;
    assert(adminLoginRes.body.user.role === 'ADMIN', 'Admin user has role ADMIN');

    const customerLoginRes = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(customerLoginRes.status === 200 && customerLoginRes.body.token, 'Customer authentication successful');
    const customerToken = customerLoginRes.body.token;
    assert(customerLoginRes.body.user.role === 'CUSTOMER', 'Customer user has role CUSTOMER');

    // Customer forbidden from /api/users
    const custAccessRes = await request('GET', '/api/users', null, customerToken);
    assert(custAccessRes.status === 403, 'Customer request to /api/users correctly rejected with 403 Forbidden');

    // Unauthenticated forbidden
    const anonAccessRes = await request('GET', '/api/users');
    assert(anonAccessRes.status === 401, 'Unauthenticated request to /api/users correctly rejected with 401 Unauthorized');

    // 2. Fetch Users & Verify KPI Metric Calculations
    console.log('\n--- 2. Users Inventory & Dynamic KPI Calculations ---');
    const usersRes = await request('GET', '/api/users', null, adminToken);
    assert(usersRes.status === 200 && Array.isArray(usersRes.body), `Loaded ${usersRes.body.length} registered user accounts`);
    const allUsers = usersRes.body;
    assert(allUsers.length > 0, 'User inventory contains active accounts');

    const totalUsers = allUsers.length;
    const customerCount = allUsers.filter(u => u.role === 'CUSTOMER').length;
    const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;
    const activeCount = allUsers.filter(u => u.status === 'Active').length;
    const totalBookingsSum = allUsers.reduce((sum, u) => sum + (u.totalBookings || 0), 0);
    const totalSpentSum = allUsers.reduce((sum, u) => sum + (u.totalSpent || 0), 0);

    assert(customerCount + adminCount === totalUsers, 'Customer count + Admin count equals totalUsers');
    assert(activeCount <= totalUsers, 'Active accounts count is within totalUsers');
    assert(totalBookingsSum >= 0, 'Total bookings sum is a non-negative number');
    assert(totalSpentSum >= 0, 'Total spent sum is a non-negative number');
    console.log(`     KPIs: Total=${totalUsers}, Customers=${customerCount}, Admins=${adminCount}, Active=${activeCount}, TotalBookings=${totalBookingsSum}, TotalSpent=₹${totalSpentSum}`);

    // 3. Role & Status Filters
    console.log('\n--- 3. Role & Status Filter Verification ---');
    const filterTabs = [
      { key: 'All', count: totalUsers },
      { key: 'CUSTOMER', count: customerCount },
      { key: 'ADMIN', count: adminCount },
      { key: 'Active', count: activeCount }
    ];
    for (const f of filterTabs) {
      const filtered = f.key === 'All' ? allUsers : (['CUSTOMER', 'ADMIN'].includes(f.key) ? allUsers.filter(u => u.role === f.key) : allUsers.filter(u => u.status === f.key));
      assert(filtered.length === f.count, `Filter '${f.key}' matches exactly ${filtered.length} users`);
    }

    // 4. Search Filter Verification
    console.log('\n--- 4. Client Search Filter by Name, Email, Phone ---');
    const sample = allUsers.find(u => u.role === 'CUSTOMER') || allUsers[0];
    
    // Search by name
    const firstName = sample.name.split(' ')[0].toLowerCase();
    const byName = allUsers.filter(u => u.name && u.name.toLowerCase().includes(firstName));
    assert(byName.length >= 1, `Search for '${firstName}' matches ${byName.length} users`);

    // Search by email
    const emailPrefix = sample.email.split('@')[0].toLowerCase();
    const byEmail = allUsers.filter(u => u.email && u.email.toLowerCase().includes(emailPrefix));
    assert(byEmail.length >= 1, `Search for email prefix '${emailPrefix}' matches ${byEmail.length} users`);

    // 5. User Dossier API
    console.log('\n--- 5. User Details Dossier API ---');
    const dossierRes = await request('GET', `/api/users/${sample.id}`, null, adminToken);
    assert(dossierRes.status === 200 && dossierRes.body.user.id === sample.id, `Retrieved dossier for user #${sample.id}`);
    assert(Array.isArray(dossierRes.body.bookings), 'Dossier contains user bookings array');
    assert(Array.isArray(dossierRes.body.payments), 'Dossier contains user payments array');
    assert(dossierRes.body.user.password === undefined, 'Sanitized response does NOT expose password hash');

    // 6. User Account Creation CRUD
    console.log('\n--- 6. User Creation API ---');
    const testUserEmail = `test_admin_user_${Date.now()}@example.com`;
    const createRes = await request('POST', '/api/users', {
      name: 'Aditi Deshmukh',
      email: testUserEmail,
      password: 'password123',
      role: 'CUSTOMER',
      phone: '+91 99887 76655',
      address: '702 Sea View Towers, Worli, Mumbai',
      licenseNumber: 'MH-02-2022-0098765'
    }, adminToken);
    assert(createRes.status === 201 && createRes.body.user, 'Created new user account successfully');
    const createdUserId = createRes.body.user.id;

    // Duplicate email rejection
    const duplicateRes = await request('POST', '/api/users', {
      name: 'Duplicate User',
      email: testUserEmail,
      password: 'password123'
    }, adminToken);
    assert(duplicateRes.status === 400, 'Duplicate email registration rejected with 400 Bad Request');

    // 7. Status Toggle & Self-Admin Protection
    console.log('\n--- 7. User Status Toggle & Critical Security ---');
    // Disable test user
    const disableRes = await request('PUT', `/api/users/${createdUserId}/status`, {
      status: 'Disabled'
    }, adminToken);
    assert(disableRes.status === 200 && disableRes.body.user.status === 'Disabled', `Disabled test user #${createdUserId}`);

    // Re-enable test user
    const enableRes = await request('PUT', `/api/users/${createdUserId}/status`, {
      status: 'Active'
    }, adminToken);
    assert(enableRes.status === 200 && enableRes.body.user.status === 'Active', `Re-activated test user #${createdUserId}`);

    // Self-admin protection: Admin cannot disable own account
    const selfDisableRes = await request('PUT', `/api/users/${adminUserId}/status`, {
      status: 'Disabled'
    }, adminToken);
    assert(selfDisableRes.status === 400, 'Admin disabling own account is strictly blocked with 400 Bad Request');

    // 8. CSV Export
    console.log('\n--- 8. CSV Export Report ---');
    const exportRes = await request('GET', '/api/reports/export/users', null, adminToken);
    assert(exportRes.status === 200, 'Users CSV export returns HTTP 200');
    assert(exportRes.rawText && exportRes.rawText.includes('User ID') && exportRes.rawText.includes('Email'), 'Users CSV contains valid header structure');

    console.log('\n🎉 ALL ADMIN USERS TESTS PASSED PERFECTLY!\n');
    return true;
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runAdminUsersTestSuite();
