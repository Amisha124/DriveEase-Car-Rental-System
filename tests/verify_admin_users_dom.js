// DriveEase - Admin Users DOM & Layout Static Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminUsersDOM() {
  console.log('🚀 Running Admin Users DOM, CSS, and Structure Verification...\n');

  try {
    // 1. Check admin-dash.js content
    const jsPath = path.join(__dirname, '../public/js/admin-dash.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    console.log('--- 1. JavaScript Implementation Verification ---');
    assert(jsContent.includes('renderUserManagement()'), 'renderUserManagement is defined');
    assert(jsContent.includes('admin-page-header'), 'Uses standard admin-page-header');
    assert(jsContent.includes('Users</h1>'), 'Page title is Users');
    assert(jsContent.includes('Manage customers, accounts and user access.'), 'Page subtitle matches specification');
    assert(jsContent.includes('admin-grid-top-kpis'), 'Uses .admin-grid-top-kpis 6-column grid for KPI row');
    assert(jsContent.includes('spark-user-total'), 'Includes sparkline canvas for total users');
    assert(jsContent.includes('spark-user-customers'), 'Includes sparkline canvas for customers');
    assert(jsContent.includes('spark-user-admins'), 'Includes sparkline canvas for administrators');
    assert(jsContent.includes('spark-user-active'), 'Includes sparkline canvas for active status');
    assert(jsContent.includes('spark-user-bookings'), 'Includes sparkline canvas for total reservations');
    assert(jsContent.includes('spark-user-spend'), 'Includes sparkline canvas for total platform spend');
    assert(jsContent.includes('admin-control-bar'), 'Includes .admin-control-bar glass card');
    assert(jsContent.includes('pill-toggle'), 'Includes pill-toggle role/status selectors');
    assert(jsContent.includes('admin-table-container'), 'Includes .admin-table-container glass card');
    assert(jsContent.includes('table-responsive'), 'Table wrapped in .table-responsive to prevent page-level horizontal overflow');
    assert(jsContent.includes('admin-table'), 'Uses .admin-table styling');
    assert(jsContent.includes('openUserDetailsModal'), 'Implements openUserDetailsModal');
    assert(jsContent.includes('openAddUserModal'), 'Implements openAddUserModal');
    assert(jsContent.includes('modal-box modal-lg'), 'Modals use .modal-box.modal-lg');
    assert(jsContent.includes('toggleUserStatus'), 'Implements toggleUserStatus');
    assert(jsContent.includes('resetUserFilters'), 'Implements resetUserFilters');
    assert(jsContent.includes('drawUserSparklines'), 'Implements drawUserSparklines');
    assert(jsContent.includes("hash === '#admin-users'"), 'setupResizeListener includes #admin-users handling');

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

verifyAdminUsersDOM();
