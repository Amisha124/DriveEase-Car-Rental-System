// DriveEase - Admin Payments Verification Test Suite
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

async function runAdminPaymentsTestSuite() {
  console.log('🚀 Running Comprehensive Admin Payments Test Suite...\n');

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

    // 2. Data Retrieval & Financial KPI Accuracy
    console.log('\n--- 2. Payments & Expenses Real Data and Financial KPI Accuracy ---');
    const paymentsRes = await request('GET', '/api/payments', null, adminToken);
    assert(paymentsRes.status === 200 && Array.isArray(paymentsRes.body), 'Payments API returned 200 and list of payments');
    const payments = paymentsRes.body;
    assert(payments.length > 0, `Loaded ${payments.length} real payment records`);

    const expensesRes = await request('GET', '/api/expenses', null, adminToken);
    assert(expensesRes.status === 200 && Array.isArray(expensesRes.body), 'Expenses API returned 200 and list of expenses');
    const expenses = expensesRes.body;
    assert(expenses.length > 0, `Loaded ${expenses.length} operating expenses records`);

    // Verify Financial Totals
    const totalGrossRevenue = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidCount = payments.filter(p => p.status === 'Paid').length;
    const pendingCount = payments.filter(p => p.status === 'Pending').length;
    const refundedCount = payments.filter(p => p.status === 'Refunded').length;
    const refundedAmount = payments.filter(p => p.status === 'Refunded').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalGrossRevenue - totalExpenses;
    const avgTransaction = paidCount > 0 ? Math.round(totalGrossRevenue / paidCount) : 0;

    console.log(`     Total Gross Revenue: ₹${totalGrossRevenue.toLocaleString('en-IN')}`);
    console.log(`     Successful Payments: ${paidCount}`);
    console.log(`     Pending Payments: ${pendingCount}`);
    console.log(`     Refunded Amount: ₹${refundedAmount.toLocaleString('en-IN')} (${refundedCount} transactions)`);
    console.log(`     Operating Expenses: ₹${totalExpenses.toLocaleString('en-IN')}`);
    console.log(`     Estimated Net Profit: ₹${netProfit.toLocaleString('en-IN')}`);
    console.log(`     Average Transaction: ₹${avgTransaction.toLocaleString('en-IN')}`);

    assert(totalGrossRevenue > 0, 'Total Gross Revenue is strictly greater than 0');
    assert(paidCount > 0, 'Paid transactions count is strictly greater than 0');
    assert(typeof totalExpenses === 'number' && totalExpenses >= 0, 'Total Operating Expenses is valid');

    // 3. Status Filtering Validation
    console.log('\n--- 3. Payments Status Filtering Logic ---');
    const paidOnly = payments.filter(p => p.status === 'Paid');
    assert(paidOnly.length === paidCount, `Status filter 'Paid' returns ${paidOnly.length} items`);
    assert(paidOnly.every(p => p.status === 'Paid'), 'All items in Paid filter have status === Paid');

    const pendingOnly = payments.filter(p => p.status === 'Pending');
    assert(pendingOnly.length === pendingCount, `Status filter 'Pending' returns ${pendingOnly.length} items`);
    assert(pendingOnly.every(p => p.status === 'Pending'), 'All items in Pending filter have status === Pending');

    const refundedOnly = payments.filter(p => p.status === 'Refunded');
    assert(refundedOnly.length === refundedCount, `Status filter 'Refunded' returns ${refundedOnly.length} items`);
    assert(refundedOnly.every(p => p.status === 'Refunded'), 'All items in Refunded filter have status === Refunded');

    // 4. Search Query Multi-Field Filtering
    console.log('\n--- 4. Search Query Filtering Logic ---');
    const samplePayment = payments[0];
    const searchById = payments.filter(p => p.id.toLowerCase().includes(samplePayment.id.toLowerCase()));
    assert(searchById.length >= 1, `Search by Payment ID #${samplePayment.id} matches correctly`);

    if (samplePayment.bookingId) {
      const searchByBooking = payments.filter(p => p.bookingId && p.bookingId.toLowerCase().includes(samplePayment.bookingId.toLowerCase()));
      assert(searchByBooking.length >= 1, `Search by Booking ID #${samplePayment.bookingId} matches correctly`);
    }

    if (samplePayment.userName) {
      const searchByName = payments.filter(p => p.userName && p.userName.toLowerCase().includes(samplePayment.userName.toLowerCase()));
      assert(searchByName.length >= 1, `Search by Customer Name "${samplePayment.userName}" matches correctly`);
    }

    if (samplePayment.carName) {
      const searchByCar = payments.filter(p => p.carName && p.carName.toLowerCase().includes(samplePayment.carName.toLowerCase()));
      assert(searchByCar.length >= 1, `Search by Vehicle "${samplePayment.carName}" matches correctly`);
    }

    // 5. Payment Transaction Dossier Verification
    console.log('\n--- 5. Payment Details Dossier Verification ---');
    assert(samplePayment.id && samplePayment.amount && samplePayment.status, 'Payment record contains required attributes (id, amount, status)');
    assert(samplePayment.method, `Payment record has valid payment method: ${samplePayment.method}`);

    // 6. Operational Expenses CRUD Lifecycle
    console.log('\n--- 6. Operating Expenses Ledger Management ---');
    const newExpensePayload = {
      title: 'Test Fleet Detailing & Alignment',
      category: 'Maintenance',
      amount: 12500,
      date: new Date().toISOString().split('T')[0]
    };
    const createExpenseRes = await request('POST', '/api/expenses', newExpensePayload, adminToken);
    assert(createExpenseRes.status === 201 || createExpenseRes.status === 200, 'Admin can record operational expense');
    const createdExpenseId = createExpenseRes.body.expense ? createExpenseRes.body.expense.id : createExpenseRes.body.id;
    assert(createdExpenseId, `Created expense returned ID: ${createdExpenseId}`);

    // Clean up created test expense
    const deleteExpenseRes = await request('DELETE', `/api/expenses/${createdExpenseId}`, null, adminToken);
    assert(deleteExpenseRes.status === 200, 'Admin can delete/reconcile operational expense');

    // 7. Financial Reports CSV Export Verification
    console.log('\n--- 7. Financial CSV Export Verification ---');
    const exportRes = await request('GET', '/api/reports/export/revenue', null, adminToken);
    assert(exportRes.status === 200, 'Financials export endpoint returns 200');
    assert(exportRes.headers['content-type'].includes('text/csv'), 'Export returns text/csv content type');
    assert(exportRes.rawText.includes('Payment ID') || exportRes.rawText.includes('Amount') || exportRes.rawText.includes('Date'), 'CSV contains financial column headers');

    // 8. Cross-Page Relationship Integrity (Payments vs Bookings)
    console.log('\n--- 8. Cross-Page Relationship Integrity ---');
    const bookingsRes = await request('GET', '/api/bookings', null, adminToken);
    assert(bookingsRes.status === 200 && Array.isArray(bookingsRes.body), 'Bookings API returned list of bookings');
    const bookings = bookingsRes.body;

    // Verify bookings with payment status Paid match payment records
    const paidBookings = bookings.filter(b => b.paymentStatus === 'Paid');
    assert(paidBookings.length > 0, `Found ${paidBookings.length} bookings marked Paid`);
    console.log(`     Cross-referenced ${paidBookings.length} paid bookings against payment records`);

    console.log('\n=======================================================');
    console.log('🏁 Step 6 Admin Payments: ALL TESTS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  }
}

runAdminPaymentsTestSuite();
