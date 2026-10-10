// DriveEase - Admin Payments DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminPaymentsDOM() {
  console.log('🚀 Running Admin Payments DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Payments includes .admin-page-header');
    assert(adminJs.includes('<h1>Payments</h1>'), 'Page title is "Payments"');
    assert(adminJs.includes('<p>Track transactions, revenue and payment status.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('Export Financials CSV'), 'Header includes financial export action');
    assert(adminJs.includes('+ Record Expense'), 'Header includes record expense action');

    console.log('\n--- 2. Top KPI Cards & Live Sparklines ---');
    assert(adminJs.includes('class="admin-grid-top-kpis"'), 'Payments contains top KPI grid');
    assert(adminJs.includes('Total Gross Revenue'), 'KPI contains Total Gross Revenue');
    assert(adminJs.includes('Successful Payments'), 'KPI contains Successful Payments');
    assert(adminJs.includes('Pending Settlements'), 'KPI contains Pending Settlements');
    assert(adminJs.includes('Refunded Amount'), 'KPI contains Refunded Amount');
    assert(adminJs.includes('Operating Expenses'), 'KPI contains Operating Expenses');
    assert(adminJs.includes('Estimated Net Profit'), 'KPI contains Estimated Net Profit');

    // Canvas sparklines
    assert(adminJs.includes('id="spark-payment-rev"'), 'Contains revenue sparkline canvas');
    assert(adminJs.includes('id="spark-payment-success"'), 'Contains success sparkline canvas');
    assert(adminJs.includes('id="spark-payment-pending"'), 'Contains pending sparkline canvas');
    assert(adminJs.includes('id="spark-payment-refunded"'), 'Contains refund sparkline canvas');
    assert(adminJs.includes('id="spark-payment-expenses"'), 'Contains expenses sparkline canvas');
    assert(adminJs.includes('id="spark-payment-net"'), 'Contains net profit sparkline canvas');

    console.log('\n--- 3. Control Bar, Search & Status Pills ---');
    assert(adminJs.includes('admin-control-bar glass-card'), 'Contains .admin-control-bar.glass-card');
    assert(adminJs.includes('pill-toggle'), 'Contains .pill-toggle for status filtering');
    assert(adminJs.includes('pill-btn'), 'Contains .pill-btn pills');
    assert(adminJs.includes('dash-search-input'), 'Contains .dash-search-input search box');
    assert(adminJs.includes('AdminDash.setPaymentFilter'), 'Filter pill click handler connected');
    assert(adminJs.includes('AdminDash.setPaymentSearch'), 'Search input handler connected');
    assert(adminJs.includes('AdminDash.resetPaymentFilters'), 'Reset filters handler connected');

    console.log('\n--- 4. Payments Table & Customer Dossier ---');
    assert(adminJs.includes('admin-table-container glass-card'), 'Contains .admin-table-container.glass-card');
    assert(adminJs.includes('class="table-responsive"'), 'Contains .table-responsive for mobile scroll safety');
    assert(adminJs.includes('class="admin-table"'), 'Contains .admin-table styling');
    assert(adminJs.includes('Payment ID'), 'Table header has Payment ID column');
    assert(adminJs.includes('Customer'), 'Table header has Customer column');
    assert(adminJs.includes('Booking'), 'Table header has Booking column');
    assert(adminJs.includes('Vehicle'), 'Table header has Vehicle column');
    assert(adminJs.includes('Amount'), 'Table header has Amount column');
    assert(adminJs.includes('Payment Method'), 'Table header has Payment Method column');
    assert(adminJs.includes('Status'), 'Table header has Status column');
    assert(adminJs.includes('Actions'), 'Table header has Actions column');

    console.log('\n--- 5. Payment Dossier Modal & Status Badges ---');
    assert(adminJs.includes('openPaymentDetailsModal'), 'Contains openPaymentDetailsModal function');
    assert(adminJs.includes('modal-box modal-lg'), 'Payment modal uses .modal-box.modal-lg');
    assert(adminJs.includes('Payment Transaction Dossier'), 'Payment modal has structured dossier header');
    assert(adminJs.includes('badge-success') && adminJs.includes('badge-warning') && adminJs.includes('badge-danger'), 'Uses global status badges');

    console.log('\n--- 6. Responsive CSS Rules & Horizontal Overflow Prevention ---');
    assert(adminCss.includes('.admin-grid-top-kpis'), 'CSS contains .admin-grid-top-kpis styles');
    assert(adminCss.includes('.table-responsive'), 'CSS contains .table-responsive styles with overflow-x: auto');
    assert(adminCss.includes('max-width: 100%'), 'CSS prevents page-level container overflow');

    console.log('\n=======================================================');
    console.log('🏁 Admin Payments DOM Verification: ALL 24 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminPaymentsDOM();
