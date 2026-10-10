const http = require('http');
const fs = require('fs');
const path = require('path');

async function testApi(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function runFrontendVerification() {
  console.log('🔍 Running Frontend Bug Fixes QA Verification...\n');

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

  // 1. Verify CSS rules for Bug 1 (Dropdown visibility)
  const styleCss = fs.readFileSync(path.join(__dirname, '../public/css/style.css'), 'utf8');
  const browseCss = fs.readFileSync(path.join(__dirname, '../public/css/browse.css'), 'utf8');

  assert(styleCss.includes('.field-select option') && styleCss.includes('select option'), 'Universal select & field-select option rules present in style.css');
  assert(styleCss.includes('#0d121f') && styleCss.includes('#f8fafc'), 'Dark mode option background (#0d121f) and text (#f8fafc) defined');
  assert(styleCss.includes('[data-theme="light"]') && styleCss.includes('#ffffff') && styleCss.includes('#0f172a'), 'Light mode option background (#ffffff) and text (#0f172a) defined');
  assert(browseCss.includes('.browse-search-bar-wrap .hero-search-box'), 'Search bar panel styled in browse.css');
  assert(browseCss.includes('.field-select option'), 'Field select option contrast styled in browse.css');
  assert(browseCss.includes('.btn-search-cta'), 'Search CTA button styled in browse.css');

  // 2. Verify Date Helpers for Bug 2 (Malformed Date Value)
  const apiJs = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
  const browseJs = fs.readFileSync(path.join(__dirname, '../public/js/browse.js'), 'utf8');
  const carDetailsJs = fs.readFileSync(path.join(__dirname, '../public/js/car-details.js'), 'utf8');

  assert(apiJs.includes('function toISODateString('), 'toISODateString function defined in api.js');
  assert(apiJs.includes('function sanitizeISODate('), 'sanitizeISODate function defined in api.js');
  assert(apiJs.includes('function formatNumber('), 'formatNumber helper defined in api.js');

  // Evaluate sanitizeISODate logic directly with browser mocks
  const dateHelperSandbox = { localStorage: { getItem: () => null, setItem: () => {} }, document: { getElementById: () => null } };
  new Function('exports', 'localStorage', 'document', apiJs + '\nexports.sanitizeISODate = sanitizeISODate;\nexports.toISODateString = toISODateString;\nexports.formatNumber = formatNumber;')(dateHelperSandbox, dateHelperSandbox.localStorage, dateHelperSandbox.document);

  const testIso = dateHelperSandbox.toISODateString(new Date());
  assert(/^\d{4}-\d{2}-\d{2}$/.test(testIso), `toISODateString generates valid YYYY-MM-DD: ${testIso}`);

  const malformedDmy = '15-10-2026';
  const sanitizedDmy = dateHelperSandbox.sanitizeISODate(malformedDmy, new Date());
  assert(sanitizedDmy === '2026-10-15', `sanitizeISODate fixes DD-MM-YYYY (${malformedDmy} -> ${sanitizedDmy})`);

  const malformedGibberish = '15-10-102020';
  const sanitizedGibberish = dateHelperSandbox.sanitizeISODate(malformedGibberish, new Date());
  assert(/^\d{4}-\d{2}-\d{2}$/.test(sanitizedGibberish), `sanitizeISODate fixes malformed string (${malformedGibberish} -> ${sanitizedGibberish})`);

  assert(browseJs.includes('sanitizeISODate(ctx.pickupDate') && browseJs.includes('sanitizeISODate(ctx.returnDate'), 'Browse.syncSearchContext sanitizes session dates');
  assert(browseJs.includes('pInput.min = todayStr'), 'Browse.initDefaultDates sets min attribute on date inputs');

  // 3. Verify Bug 3 (Car Details formatNumber & rendering)
  assert(!carDetailsJs.includes('formatNumber(pricePerDay)') || apiJs.includes('function formatNumber('), 'Car Details does not have undefined formatNumber references');

  return { passed, failed };
}

async function runCarDetailsApiVerification() {
  console.log('\n🚗 Running Car Details API & Vehicle Lookup Verification...\n');
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

  const testVehicles = [
    { id: 'car_bmw_5', expectedName: 'BMW 5 Series', expectedBrand: 'BMW' },
    { id: 'car_range_rover_sport', expectedName: 'Range Rover Sport', expectedBrand: 'Range Rover' },
    { id: 'car_audi_a6', expectedName: 'Audi A6', expectedBrand: 'Audi' },
    { id: 'car_merc_c', expectedName: 'Mercedes C-Class', expectedBrand: 'Mercedes-Benz' }
  ];

  for (const v of testVehicles) {
    const res = await testApi(`/api/cars/${v.id}`);
    assert(res.status === 200, `GET /api/cars/${v.id} returned 200 OK`);
    assert(res.body && res.body.name && res.body.name.includes(v.expectedName.split(' ')[0]), `Vehicle ${v.id} returned correct name: "${res.body.name}"`);
    assert(res.body.pricePerDay > 0, `Vehicle ${v.id} has valid pricePerDay: ₹${res.body.pricePerDay}`);
    assert(Array.isArray(res.body.gallery) && res.body.gallery.length > 0, `Vehicle ${v.id} has gallery photos (${res.body.gallery.length} images)`);
  }

  return { passed, failed };
}

async function main() {
  const fRes = runFrontendVerification();
  const cRes = await runCarDetailsApiVerification();

  const totalPassed = fRes.passed + cRes.passed;
  const totalFailed = fRes.failed + cRes.failed;

  console.log('\n=======================================================');
  console.log(`🏁 QA Bug Fixes Verification: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('=======================================================');

  if (totalFailed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error during QA verification:', err);
  process.exit(1);
});
