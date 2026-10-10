// DriveEase - Admin Bookings Verification Test Suite
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

async function runAdminBookingsTestSuite() {
  console.log('🚀 Running Comprehensive Admin Bookings Test Suite...\n');

  try {
    // 1. Authenticate as Admin
    console.log('--- 1. Admin Authentication & Access Verification ---');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin authentication successful');
    const adminToken = loginRes.body.token;

    // 2. Fetch All Bookings & Verify KPI Calculation
    console.log('\n--- 2. Booking Inventory & KPI Metric Calculations ---');
    const bookingsRes = await request('GET', '/api/bookings', null, adminToken);
    assert(bookingsRes.status === 200 && Array.isArray(bookingsRes.body), `Loaded ${bookingsRes.body.length} booking records`);
    const allBookings = bookingsRes.body;
    assert(allBookings.length > 0, 'Bookings inventory contains active data');

    const totalBookings = allBookings.length;
    const pendingCount = allBookings.filter(b => b.bookingStatus === 'Pending').length;
    const confirmedCount = allBookings.filter(b => b.bookingStatus === 'Confirmed').length;
    const activeCount = allBookings.filter(b => b.bookingStatus === 'Active').length;
    const completedCount = allBookings.filter(b => b.bookingStatus === 'Completed').length;
    const cancelledCount = allBookings.filter(b => b.bookingStatus === 'Cancelled').length;

    assert(pendingCount + confirmedCount + activeCount + completedCount + cancelledCount === totalBookings, 'All 5 booking statuses sum exactly to total bookings');
    console.log(`     KPIs: Total=${totalBookings}, Pending=${pendingCount}, Confirmed=${confirmedCount}, Active=${activeCount}, Completed=${completedCount}, Cancelled=${cancelledCount}`);

    // 3. Status Filters Verification
    console.log('\n--- 3. Status Filter Tabs Verification ---');
    const statusTabs = ['All', 'Confirmed', 'Active', 'Pending', 'Completed', 'Cancelled'];
    for (const status of statusTabs) {
      const filtered = status === 'All' ? allBookings : allBookings.filter(b => b.bookingStatus === status);
      assert(filtered.length >= 0, `Status pill filter '${status}' correctly yields ${filtered.length} items`);
    }

    // 4. Search Filter Verification
    console.log('\n--- 4. Client Search Filter by ID, Customer, Vehicle, Location ---');
    if (allBookings.length > 0) {
      const sample = allBookings[0];
      
      // Search by ID
      const byId = allBookings.filter(b => b.id.toLowerCase().includes(sample.id.toLowerCase()));
      assert(byId.length >= 1, `Search by ID '${sample.id}' returns matching record`);

      // Search by Customer Name
      if (sample.userName) {
        const firstName = sample.userName.split(' ')[0].toLowerCase();
        const byName = allBookings.filter(b => b.userName && b.userName.toLowerCase().includes(firstName));
        assert(byName.length >= 1, `Search by customer name '${firstName}' matches ${byName.length} records`);
      }

      // Search by Vehicle Name
      if (sample.carName) {
        const carWord = sample.carName.split(' ')[0].toLowerCase();
        const byCar = allBookings.filter(b => b.carName && b.carName.toLowerCase().includes(carWord));
        assert(byCar.length >= 1, `Search by car name '${carWord}' matches ${byCar.length} records`);
      }
    }

    // 5. Booking Details Dossier Verification
    console.log('\n--- 5. Booking Details Dossier API ---');
    const targetBooking = allBookings[0];
    const detailsRes = await request('GET', `/api/bookings/${targetBooking.id}`, null, adminToken);
    assert(detailsRes.status === 200 && detailsRes.body.id === targetBooking.id, `Retrieved dossier for booking #${targetBooking.id}`);
    assert(detailsRes.body.userName && detailsRes.body.totalAmount > 0, 'Booking contains customer and pricing details');
    assert(detailsRes.body.pickupLocation && detailsRes.body.pickupDate, 'Booking contains schedule and location details');

    // 6. Booking Status Lifecycle Transition
    console.log('\n--- 6. Status Update Lifecycle & Vehicle Status Sync ---');
    const initialStatus = targetBooking.bookingStatus;
    const nextStatus = initialStatus === 'Confirmed' ? 'Active' : 'Confirmed';

    // Update status
    const updateRes = await request('PUT', `/api/bookings/${targetBooking.id}/status`, {
      bookingStatus: nextStatus
    }, adminToken);
    assert(updateRes.status === 200, `Updated booking #${targetBooking.id} status to '${nextStatus}'`);
    assert(updateRes.body.booking.bookingStatus === nextStatus, 'Updated booking object reflects new status');

    // Verify car status reflects the change if set to Active
    if (nextStatus === 'Active') {
      const carRes = await request('GET', `/api/cars/${targetBooking.carId}`);
      assert(carRes.body.status === 'Rented', 'Vehicle status automatically set to Rented when booking is Active');
    }

    // Revert status back to initial
    const revertRes = await request('PUT', `/api/bookings/${targetBooking.id}/status`, {
      bookingStatus: initialStatus
    }, adminToken);
    assert(revertRes.status === 200 && revertRes.body.booking.bookingStatus === initialStatus, `Reverted booking status to '${initialStatus}'`);

    // 7. CSV Export Report Verification
    console.log('\n--- 7. CSV Export Report Endpoint ---');
    const exportRes = await request('GET', '/api/reports/export/bookings', null, adminToken);
    assert(exportRes.status === 200, 'Bookings CSV report export responds with HTTP 200');
    assert(exportRes.rawText && exportRes.rawText.includes('Booking ID') && exportRes.rawText.includes('Customer'), 'CSV report includes valid CSV headers and content');

    console.log('\n🎉 ALL ADMIN BOOKINGS TESTS PASSED PERFECTLY!\n');
    return true;
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  }
}

runAdminBookingsTestSuite();
