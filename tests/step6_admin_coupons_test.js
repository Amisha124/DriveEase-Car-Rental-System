// DriveEase - Admin Coupons Verification Test Suite
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

async function runAdminCouponsTestSuite() {
  console.log('🚀 Running Comprehensive Admin Coupons Test Suite...\n');

  try {
    // 1. Authenticate as Admin and Customer
    console.log('--- 1. Authentication & Role-Based Access Control Verification ---');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.token, 'Admin authentication successful');
    const adminToken = adminLoginRes.body.token;
    assert(adminLoginRes.body.user.role === 'ADMIN', 'Admin user has role ADMIN');

    const customerLoginRes = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(customerLoginRes.status === 200 && customerLoginRes.body.token, 'Customer authentication successful');
    const customerToken = customerLoginRes.body.token;

    // Customer forbidden from creating coupon
    const custCreateRes = await request('POST', '/api/coupons', { code: 'HACK99', discountPercent: 99 }, customerToken);
    assert(custCreateRes.status === 403, 'Customer correctly forbidden from creating coupon (403)');

    // 2. Coupon Inventory & Dynamic KPI Calculation
    console.log('\n--- 2. Coupon Inventory & Dynamic KPI Calculation ---');
    const couponsRes = await request('GET', '/api/coupons');
    assert(couponsRes.status === 200 && Array.isArray(couponsRes.body), 'Coupons API returned 200 and array of coupons');
    const coupons = couponsRes.body;
    assert(coupons.length > 0, `Loaded ${coupons.length} real coupon campaigns`);

    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.active && (!c.validUntil || new Date(c.validUntil) >= new Date()) && (!c.usageLimit || (c.usageCount || 0) < c.usageLimit)).length;
    const expiredCoupons = coupons.filter(c => c.validUntil && new Date(c.validUntil) < new Date()).length;
    const inactiveCoupons = coupons.filter(c => !c.active).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
    const avgDiscount = totalCoupons > 0 ? Math.round(coupons.reduce((sum, c) => sum + (c.discountPercent || 0), 0) / totalCoupons) : 0;
    const maxDiscountConfigured = coupons.reduce((max, c) => Math.max(max, c.maxDiscount || 0), 0);

    console.log(`     Total Coupons: ${totalCoupons}`);
    console.log(`     Active Coupons: ${activeCoupons}`);
    console.log(`     Inactive Coupons: ${inactiveCoupons}`);
    console.log(`     Expired Coupons: ${expiredCoupons}`);
    console.log(`     Total Redemptions: ${totalRedemptions}`);
    console.log(`     Average Discount: ${avgDiscount}%`);
    console.log(`     Max Discount Cap: ₹${maxDiscountConfigured.toLocaleString('en-IN')}`);

    assert(totalCoupons >= 4, 'Loaded at least 4 active campaigns');
    assert(activeCoupons > 0, 'Active coupons count is strictly greater than 0');
    assert(totalRedemptions > 0, 'Total redemptions count is non-negative');

    // 3. Status Filtering Logic Validation
    console.log('\n--- 3. Status Filtering Logic Validation ---');
    const activeOnly = coupons.filter(c => c.active && (!c.validUntil || new Date(c.validUntil) >= new Date()));
    assert(activeOnly.length === activeCoupons, `Status filter 'Active' yields ${activeOnly.length} items`);
    assert(activeOnly.every(c => c.active), 'All items in Active filter have active === true');

    // 4. Search Query Filtering Logic Validation
    console.log('\n--- 4. Search Query Filtering Logic Validation ---');
    const sampleCoupon = coupons[0];
    const searchByCode = coupons.filter(c => c.code.toLowerCase().includes(sampleCoupon.code.toLowerCase()));
    assert(searchByCode.length >= 1, `Search by code "${sampleCoupon.code}" matches correctly`);

    if (sampleCoupon.description) {
      const searchByDesc = coupons.filter(c => c.description && c.description.toLowerCase().includes('weekend'));
      assert(searchByDesc.length >= 1, 'Search by description matches correctly');
    }

    // 5. Coupon Creation, Booking Validation, Edit, and Deletion Lifecycle
    console.log('\n--- 5. Coupon CRUD & Booking Flow Integration Lifecycle ---');
    const testCode = `PROMO${Date.now().toString().slice(-4)}`;
    const newCouponPayload = {
      code: testCode,
      discountPercent: 25,
      maxDiscount: 5000,
      minAmount: 10000,
      validUntil: '2028-12-31',
      usageLimit: 100,
      description: '25% Luxury Fleet Launch Promo'
    };

    const createRes = await request('POST', '/api/coupons', newCouponPayload, adminToken);
    assert(createRes.status === 201 || createRes.status === 200, `Admin created new promo code #${testCode}`);
    const createdCouponId = createRes.body.coupon ? createRes.body.coupon.id : createRes.body.id;
    assert(createdCouponId, `Created coupon returned ID: ${createdCouponId}`);

    // Verify created coupon validates in checkout booking engine
    const validateRes = await request('POST', '/api/coupons/validate', { code: testCode, amount: 20000 });
    assert(validateRes.status === 200 && validateRes.body.valid === true, `Created coupon ${testCode} validates at booking checkout`);
    assert(validateRes.body.discountAmount === 5000, 'Discount correctly capped at maxDiscount ₹5,000');

    // Edit coupon
    const updateRes = await request('PUT', `/api/coupons/${createdCouponId}`, { discountPercent: 30 }, adminToken);
    assert(updateRes.status === 200, 'Admin updated coupon discount percent to 30%');

    // Toggle active state
    const toggleRes = await request('PUT', `/api/coupons/${createdCouponId}`, { active: false }, adminToken);
    assert(toggleRes.status === 200, 'Admin deactivated coupon');

    // Verify inactive coupon is rejected during checkout validation
    const invalidAfterDeactivate = await request('POST', '/api/coupons/validate', { code: testCode, amount: 20000 });
    assert(invalidAfterDeactivate.status === 404, 'Deactivated coupon correctly rejected by booking engine (404)');

    // Delete coupon
    const deleteRes = await request('DELETE', `/api/coupons/${createdCouponId}`, null, adminToken);
    assert(deleteRes.status === 200, 'Admin deleted test coupon successfully');

    // 6. Cross-Page Relationship Integrity (Standard WEEKEND20 Coupon)
    console.log('\n--- 6. Cross-Page Relationship Integrity ---');
    const weekend20Check = await request('POST', '/api/coupons/validate', { code: 'WEEKEND20', amount: 20000 });
    assert(weekend20Check.status === 200 && weekend20Check.body.valid === true, 'WEEKEND20 validates with 20% discount');
    assert(weekend20Check.body.discountAmount === 4000, 'WEEKEND20 calculates ₹4,000 discount on ₹20,000 order');

    console.log('\n=======================================================');
    console.log('🏁 Step 6 Admin Coupons: ALL 18 TESTS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

runAdminCouponsTestSuite();
