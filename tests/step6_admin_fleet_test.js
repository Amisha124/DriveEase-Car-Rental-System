// DriveEase - Admin Fleet Management Verification Test Suite
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

async function runAdminFleetTestSuite() {
  console.log('🚀 Running Comprehensive Admin Fleet Management Test Suite...\n');

  try {
    // 1. Authenticate as Admin
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin authentication successful');
    const adminToken = loginRes.body.token;

    // 2. Fetch Fleet
    console.log('\n--- 1. Fleet Inventory & KPI Calculation ---');
    const carsRes = await request('GET', '/api/cars');
    assert(carsRes.status === 200 && Array.isArray(carsRes.body), `Loaded ${carsRes.body.length} fleet vehicles`);
    const cars = carsRes.body;
    assert(cars.length >= 20, 'Fleet size contains catalogued assets');

    const totalCars = cars.length;
    const availableCars = cars.filter(c => c.status === 'Available' || !c.status).length;
    const rentedCars = cars.filter(c => c.status === 'Rented').length;
    const maintenanceCars = cars.filter(c => c.status === 'Maintenance').length;
    const totalPrice = cars.reduce((sum, c) => sum + (c.pricePerDay || 0), 0);
    const avgDailyRate = Math.round(totalPrice / totalCars);
    const utilRate = Math.round((rentedCars / totalCars) * 100);

    assert(availableCars + rentedCars + maintenanceCars + cars.filter(c => c.status === 'Unavailable').length === totalCars, 'Status sum matches totalCars');
    assert(avgDailyRate > 5000, `Average Daily Rate calculated: ₹${avgDailyRate}`);
    assert(typeof utilRate === 'number', `Fleet Utilization: ${utilRate}%`);

    // 3. Category filtering
    console.log('\n--- 2. Category & Text Search Filtering ---');
    const categories = ['Sedan', 'SUV', 'Luxury', 'Sports', 'Electric'];
    for (const cat of categories) {
      const catCars = cars.filter(c => (c.type || '').toLowerCase() === cat.toLowerCase());
      assert(catCars.length > 0, `Category ${cat} has ${catCars.length} vehicles`);
    }

    // Text search filter
    const bmwCars = cars.filter(c => (c.name || '').toLowerCase().includes('bmw') || (c.brand || '').toLowerCase().includes('bmw'));
    assert(bmwCars.length > 0, `Search for 'BMW' matches ${bmwCars.length} vehicles`);

    // 4. Create Vehicle (Add Car Modal CRUD)
    console.log('\n--- 3. Add Vehicle Modal CRUD ---');
    const newCarPayload = {
      name: 'Ferrari 296 GTB Hybrid',
      brand: 'Ferrari',
      type: 'Sports',
      pricePerDay: 85000,
      seats: 2,
      transmission: 'Automatic',
      fuel: 'Hybrid',
      power: '819 HP',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&auto=format&fit=crop&q=80',
      description: 'Mid-rear-engined Berlinetta featuring 120° V6 turbo hybrid powertrain.'
    };

    const createCarRes = await request('POST', '/api/cars', newCarPayload, adminToken);
    assert(createCarRes.status === 201 && createCarRes.body.car?.id, `Admin created vehicle #${createCarRes.body.car.id} (${createCarRes.body.car.name})`);
    const newCarId = createCarRes.body.car.id;

    // 5. Verify Cross-Page Reflection: Public browse cars includes new car
    console.log('\n--- 4. Cross-Page Data Consistency ---');
    const updatedBrowseRes = await request('GET', '/api/cars');
    const foundInBrowse = updatedBrowseRes.body.find(c => c.id === newCarId);
    assert(foundInBrowse !== undefined, 'New vehicle immediately appears in public Browse Cars catalog');

    // Verify Car Details API
    const carDetailsRes = await request('GET', `/api/cars/${newCarId}`);
    assert(carDetailsRes.status === 200 && carDetailsRes.body.name === 'Ferrari 296 GTB Hybrid', 'New vehicle details API returns 200 OK');

    // 6. Edit Vehicle Modal CRUD
    console.log('\n--- 5. Edit Vehicle Modal CRUD ---');
    const updateCarRes = await request('PUT', `/api/cars/${newCarId}`, {
      pricePerDay: 90000,
      power: '830 HP'
    }, adminToken);
    assert(updateCarRes.status === 200 && updateCarRes.body.car.pricePerDay === 90000, 'Admin updated vehicle daily rate to ₹90,000');

    // 7. Update Status selector
    console.log('\n--- 6. Status Selector Updates ---');
    const statusMaintRes = await request('PUT', `/api/cars/${newCarId}/status`, { status: 'Maintenance' }, adminToken);
    assert(statusMaintRes.status === 200 && statusMaintRes.body.car.status === 'Maintenance', 'Updated vehicle status to Maintenance');

    const statusAvailRes = await request('PUT', `/api/cars/${newCarId}/status`, { status: 'Available' }, adminToken);
    assert(statusAvailRes.status === 200 && statusAvailRes.body.car.status === 'Available', 'Reactivated vehicle status to Available');

    // 8. Delete Vehicle
    console.log('\n--- 7. Delete / Remove Vehicle ---');
    const deleteRes = await request('DELETE', `/api/cars/${newCarId}`, null, adminToken);
    assert(deleteRes.status === 200, `Deleted test vehicle #${newCarId}`);

    // Verify removed from public browse
    const afterDeleteRes = await request('GET', '/api/cars');
    const foundAfterDelete = afterDeleteRes.body.find(c => c.id === newCarId);
    assert(foundAfterDelete === undefined, 'Deleted vehicle successfully removed from catalog');

    console.log('\n=======================================================');
    console.log('🏁 Admin Fleet Management: ALL VERIFICATION CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Fleet Management Test Failed:', err.message);
    process.exit(1);
  }
}

runAdminFleetTestSuite();
