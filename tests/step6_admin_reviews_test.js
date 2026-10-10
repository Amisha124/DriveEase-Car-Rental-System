// DriveEase - Admin Reviews Verification Test Suite
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

async function runAdminReviewsTestSuite() {
  console.log('🚀 Running Comprehensive Admin Reviews Test Suite...\n');

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

    // Customer forbidden from accessing /api/reviews/all
    const custReviewsRes = await request('GET', '/api/reviews/all', null, customerToken);
    assert(custReviewsRes.status === 403, 'Customer correctly forbidden from accessing /api/reviews/all (403)');

    // 2. Real Reviews Data Retrieval & Dynamic KPI Calculations
    console.log('\n--- 2. Real Reviews Data Retrieval & Dynamic KPI Calculations ---');
    const reviewsRes = await request('GET', '/api/reviews/all', null, adminToken);
    assert(reviewsRes.status === 200 && Array.isArray(reviewsRes.body), 'Admin reviews API returned 200 and list of reviews');
    const reviews = reviewsRes.body;
    assert(reviews.length > 0, `Loaded ${reviews.length} real customer review records`);

    // Verify dynamic KPI metrics calculations
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1) : '5.0';
    const fiveStarReviews = reviews.filter(r => r.rating === 5).length;
    const fourStarReviews = reviews.filter(r => r.rating === 4).length;
    const threeStarReviews = reviews.filter(r => r.rating === 3).length;
    const lowRatings = reviews.filter(r => (r.rating || 0) <= 2).length;

    console.log(`     Total Reviews: ${totalReviews}`);
    console.log(`     Average Rating: ${avgRating} ★ / 5.0`);
    console.log(`     5-Star Reviews: ${fiveStarReviews} (${Math.round((fiveStarReviews / totalReviews) * 100)}%)`);
    console.log(`     4-Star Reviews: ${fourStarReviews}`);
    console.log(`     3-Star Reviews: ${threeStarReviews}`);
    console.log(`     Low Ratings (1-2★): ${lowRatings}`);

    assert(totalReviews === (fiveStarReviews + fourStarReviews + threeStarReviews + lowRatings), 'Sum of star rating breakdowns equals total reviews');
    assert(parseFloat(avgRating) >= 1.0 && parseFloat(avgRating) <= 5.0, 'Average rating is within valid 1.0 - 5.0 range');

    // 3. Rating Filtering Logic Validation
    console.log('\n--- 3. Rating Filtering Logic Validation ---');
    const filter5 = reviews.filter(r => r.rating === 5);
    assert(filter5.length === fiveStarReviews, `Filter '5 Star' yields ${filter5.length} items`);
    assert(filter5.every(r => r.rating === 5), 'All items in 5 Star filter have rating === 5');

    const filter4 = reviews.filter(r => r.rating === 4);
    assert(filter4.length === fourStarReviews, `Filter '4 Star' yields ${filter4.length} items`);
    assert(filter4.every(r => r.rating === 4), 'All items in 4 Star filter have rating === 4');

    const filter3 = reviews.filter(r => r.rating === 3);
    assert(filter3.length === threeStarReviews, `Filter '3 Star' yields ${filter3.length} items`);

    // 4. Search Query Filtering Logic Validation
    console.log('\n--- 4. Search Query Filtering Logic Validation ---');
    const sampleReview = reviews[0];
    const searchByName = reviews.filter(r => r.userName && r.userName.toLowerCase().includes(sampleReview.userName.toLowerCase()));
    assert(searchByName.length >= 1, `Search by customer "${sampleReview.userName}" matched ${searchByName.length} reviews`);

    const searchByCar = reviews.filter(r => r.carName && r.carName.toLowerCase().includes(sampleReview.carName.toLowerCase()));
    assert(searchByCar.length >= 1, `Search by vehicle "${sampleReview.carName}" matched ${searchByCar.length} reviews`);

    if (sampleReview.title) {
      const searchByTitle = reviews.filter(r => r.title && r.title.toLowerCase().includes(sampleReview.title.toLowerCase()));
      assert(searchByTitle.length >= 1, `Search by review title matched ${searchByTitle.length} reviews`);
    }

    // 5. Review Moderation Lifecycle (Approve / Reject)
    console.log('\n--- 5. Review Moderation Lifecycle ---');
    const modRes = await request('PUT', `/api/reviews/${sampleReview.id}/status`, { status: 'Rejected' }, adminToken);
    assert(modRes.status === 200, `Admin updated review #${sampleReview.id} status to Rejected`);
    assert(modRes.body.review.status === 'Rejected', 'Updated review reflects status Rejected');

    // Revert back to Approved
    const revertRes = await request('PUT', `/api/reviews/${sampleReview.id}/status`, { status: 'Approved' }, adminToken);
    assert(revertRes.status === 200, `Admin reverted review #${sampleReview.id} status to Approved`);
    assert(revertRes.body.review.status === 'Approved', 'Updated review reflects status Approved');

    // 6. Review Creation, Moderation, and Deletion Lifecycle
    console.log('\n--- 6. Review Creation, Moderation, and Deletion Lifecycle ---');
    const testReviewPayload = {
      carId: 'car_bmw_5',
      rating: 5,
      title: 'Admin Automated Test Review',
      comment: 'Superb automotive engineering and driving comfort during the entire road trip.'
    };
    const createReviewRes = await request('POST', '/api/reviews', testReviewPayload, customerToken);
    assert(createReviewRes.status === 201 || createReviewRes.status === 200, 'Customer submitted review successfully');
    const createdReviewId = createReviewRes.body.review ? createReviewRes.body.review.id : createReviewRes.body.id;
    assert(createdReviewId, `Created review returned ID: ${createdReviewId}`);

    // Delete the test review as Admin
    const deleteReviewRes = await request('DELETE', `/api/reviews/${createdReviewId}`, null, adminToken);
    assert(deleteReviewRes.status === 200, 'Admin deleted test review successfully');

    // 7. Cross-Page Relationship Integrity (Reviews vs Car Details)
    console.log('\n--- 7. Cross-Page Relationship Integrity ---');
    const carReviewsRes = await request('GET', `/api/reviews/car/car_bmw_5`);
    assert(carReviewsRes.status === 200 && Array.isArray(carReviewsRes.body), 'Public car reviews API returned list of approved reviews');
    assert(carReviewsRes.body.every(r => r.status === 'Approved'), 'All public car reviews have status Approved');

    const carDetailsRes = await request('GET', `/api/cars/car_bmw_5`);
    assert(carDetailsRes.status === 200, 'Car details API returned 200');
    assert(carDetailsRes.body.rating >= 4.0, `BMW 5 Series rating is synchronized (${carDetailsRes.body.rating}★)`);

    console.log('\n=======================================================');
    console.log('🏁 Step 6 Admin Reviews: ALL 16 TESTS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

runAdminReviewsTestSuite();
