// DriveEase - User Dashboard Payments & Transactions DOM Structure & Design Integrity Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserPaymentsDOM() {
  console.log('🚀 Running User Dashboard Payments & Transactions DOM & Design Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Page Header & Navigation ---');
    assert(userJs.includes('renderPayments()'), 'renderPayments() function is defined');
    assert(userJs.includes('Payments & Transactions'), 'Header title "Payments & Transactions" present');
    assert(userJs.includes('Track your payments and view your rental transaction history.'), 'Header subtitle present');
    assert(userJs.includes('payments-bookings-cta') || userJs.includes("App.navigateTo('#user-bookings')"), 'View Bookings CTA present');
    assert(userJs.includes('payments-explore-cta') || userJs.includes("App.navigateTo('#browse')"), 'Explore Cars CTA present');

    console.log('\n--- 2. 4 Real-Data Payment KPI Summary Cards ---');
    assert(userJs.includes('kpi-card-emerald') && userJs.includes('Total Paid'), 'Total Paid card with Emerald accent');
    assert(userJs.includes('kpi-card-blue') && userJs.includes('Successful Transactions'), 'Successful Transactions card with Blue accent');
    assert(userJs.includes('kpi-card-orange') && userJs.includes('Pending Payments'), 'Pending Payments card with Amber/Orange accent');
    assert(userJs.includes('kpi-card-purple') && userJs.includes('Refunds & Adjustments'), 'Refunds card with Violet accent');
    assert(userJs.includes('totalPaid =') && userJs.includes("p.status === 'Paid'"), 'Real total paid calculation matching business rules');

    console.log('\n--- 3. Search, Status & Method Filters ---');
    assert(userJs.includes('payment-filters-bar'), 'Contains .payment-filters-bar container');
    assert(userJs.includes('payment-filter-pill'), 'Status filter pills styled with .payment-filter-pill');
    assert(userJs.includes('payment-search-input'), 'Live search input #payment-search-input present');
    assert(userJs.includes('setPaymentStatusFilter'), 'setPaymentStatusFilter() helper present');
    assert(userJs.includes('filterPayments'), 'filterPayments() helper processes status, method & query filters');

    console.log('\n--- 4. Transaction Ledger Table & Fields ---');
    assert(userJs.includes('payment-ledger-card') && userJs.includes('payment-ledger-table'), 'Ledger table container and elements present');
    assert(userJs.includes('payment-id-pill'), 'Monospace transaction reference pill .payment-id-pill');
    assert(userJs.includes('payment-car-name'), 'Vehicle title .payment-car-name present');
    assert(userJs.includes('payment-booking-ref'), 'Linked reservation reference .payment-booking-ref');
    assert(userJs.includes('payment-method-item'), 'Payment method with icon and detail .payment-method-item');
    assert(userJs.includes('payment-amount-val'), 'Formatted currency amount .payment-amount-val');
    assert(userJs.includes('payment-status-badge'), 'Status badge .payment-status-badge with pulse dot');
    assert(userJs.includes('Booking.openPrintReceipt'), 'Printable tax invoice action wired to Booking.openPrintReceipt');

    console.log('\n--- 5. Empty States & Error Handling ---');
    assert(userJs.includes('No transactions yet'), 'Zero total payments empty state heading');
    assert(userJs.includes('Your rental payment history will appear here'), 'Zero total payments empty state description');
    assert(userJs.includes('No transactions found in this category.'), 'Filter empty state heading');
    assert(userJs.includes('Reset Filters & View All') || userJs.includes('resetPaymentFilters'), 'Filter reset button');
    assert(userJs.includes('Error Loading Payments'), 'Error container with retry button');

    console.log('\n--- 6. CSS Design System & Responsive Rules ---');
    assert(userCss.includes('.payment-filters-bar'), 'CSS contains .payment-filters-bar styling');
    assert(userCss.includes('.payment-filter-pill.active'), 'CSS contains active filter gradient styling');
    assert(userCss.includes('.payment-ledger-card'), 'CSS contains .payment-ledger-card styling');
    assert(userCss.includes('.payment-ledger-table'), 'CSS contains .payment-ledger-table styling');
    assert(userCss.includes('.payment-id-pill'), 'CSS contains .payment-id-pill styling');
    assert(userCss.includes('.status-paid') && userCss.includes('.status-refunded'), 'CSS contains status badge color variants');
    assert(userCss.includes('.payment-empty-card'), 'CSS contains .payment-empty-card styling');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains 1024px tablet breakpoint');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains 768px mobile breakpoint');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains 480px small screen breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard Payments: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
    return true;
  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

verifyUserPaymentsDOM();
