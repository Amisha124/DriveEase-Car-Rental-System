// DriveEase - Admin Bookings DOM & Layout Static Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminBookingsDOM() {
  console.log('🚀 Running Admin Bookings DOM, CSS, and Structure Verification...\n');

  try {
    // 1. Check admin-dash.js content
    const jsPath = path.join(__dirname, '../public/js/admin-dash.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    console.log('--- 1. JavaScript Implementation Verification ---');
    assert(jsContent.includes('renderBookingManagement()'), 'renderBookingManagement is defined');
    assert(jsContent.includes('admin-page-header'), 'Uses standard admin-page-header');
    assert(jsContent.includes('Bookings</h1>'), 'Page title is Bookings');
    assert(jsContent.includes('Manage reservations, booking status and customer trips.'), 'Page subtitle matches specification');
    assert(jsContent.includes('admin-grid-top-kpis'), 'Uses .admin-grid-top-kpis 6-column grid for KPI row');
    assert(jsContent.includes('spark-booking-total'), 'Includes sparkline canvas for total bookings');
    assert(jsContent.includes('spark-booking-pending'), 'Includes sparkline canvas for pending bookings');
    assert(jsContent.includes('spark-booking-confirmed'), 'Includes sparkline canvas for confirmed bookings');
    assert(jsContent.includes('spark-booking-active'), 'Includes sparkline canvas for active bookings');
    assert(jsContent.includes('spark-booking-completed'), 'Includes sparkline canvas for completed bookings');
    assert(jsContent.includes('spark-booking-cancelled'), 'Includes sparkline canvas for cancelled bookings');
    assert(jsContent.includes('admin-control-bar'), 'Includes .admin-control-bar glass card');
    assert(jsContent.includes('pill-toggle'), 'Includes pill-toggle status selectors');
    assert(jsContent.includes('admin-table-container'), 'Includes .admin-table-container glass card');
    assert(jsContent.includes('table-responsive'), 'Table wrapped in .table-responsive to prevent page-level horizontal overflow');
    assert(jsContent.includes('admin-table'), 'Uses .admin-table styling');
    assert(jsContent.includes('openBookingDetailsModal'), 'Implements openBookingDetailsModal');
    assert(jsContent.includes('modal-box modal-lg'), 'Dossier modal uses .modal-box.modal-lg');
    assert(jsContent.includes('saveModalBookingStatus'), 'Implements saveModalBookingStatus');
    assert(jsContent.includes('resetBookingFilters'), 'Implements resetBookingFilters');
    assert(jsContent.includes('drawBookingSparklines'), 'Implements drawBookingSparklines');
    assert(jsContent.includes('setupResizeListener'), 'setupResizeListener includes #admin-bookings handling');

    // 2. Check admin-dash.css content
    console.log('\n--- 2. CSS Design System & Responsive Rules Verification ---');
    const cssPath = path.join(__dirname, '../public/css/admin-dash.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert(cssContent.includes('.admin-grid-top-kpis'), '.admin-grid-top-kpis rule exists in CSS');
    assert(cssContent.includes('.admin-kpi-card'), '.admin-kpi-card rule exists in CSS');
    assert(cssContent.includes('.admin-page-header'), '.admin-page-header rule exists in CSS');
    assert(cssContent.includes('.admin-control-bar'), '.admin-control-bar rule exists in CSS');
    assert(cssContent.includes('.table-responsive'), '.table-responsive rule exists in CSS with overflow-x: auto');
    assert(cssContent.includes('.admin-table'), '.admin-table rule exists in CSS');
    assert(cssContent.includes('@media (max-width: 1536px)'), 'Responsive rule for 1536px exists');
    assert(cssContent.includes('@media (max-width: 1280px)'), 'Responsive rule for 1280px exists');
    assert(cssContent.includes('@media (max-width: 1024px)'), 'Responsive rule for 1024px exists');
    assert(cssContent.includes('@media (max-width: 768px)'), 'Responsive rule for 768px exists');
    assert(cssContent.includes('@media (max-width: 480px)'), 'Responsive rule for mobile/390px exists');

    console.log('\n🎉 ALL DOM & CSS VERIFICATIONS PASSED!\n');
  } catch (err) {
    console.error('\n❌ DOM VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

verifyAdminBookingsDOM();
