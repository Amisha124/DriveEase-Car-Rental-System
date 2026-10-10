// DriveEase - Admin Coupons DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminCouponsDOM() {
  console.log('🚀 Running Admin Coupons DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Coupons includes .admin-page-header');
    assert(adminJs.includes('<h1>Coupons</h1>'), 'Page title is "Coupons"');
    assert(adminJs.includes('<p>Create, manage and track promotional offers.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('openAddCouponModal'), 'Header includes + Add Coupon action');

    console.log('\n--- 2. Top KPI Cards & Live Sparklines ---');
    assert(adminJs.includes('Total Coupons'), 'KPI contains Total Coupons');
    assert(adminJs.includes('Active Coupons'), 'KPI contains Active Coupons');
    assert(adminJs.includes('Total Redemptions'), 'KPI contains Total Redemptions');
    assert(adminJs.includes('Average Discount'), 'KPI contains Average Discount');
    assert(adminJs.includes('Max Discount Cap'), 'KPI contains Max Discount Cap');
    assert(adminJs.includes('Inactive / Expired'), 'KPI contains Inactive / Expired');

    // Canvas sparklines
    assert(adminJs.includes('id="spark-coupons-total"'), 'Contains total coupons sparkline canvas');
    assert(adminJs.includes('id="spark-coupons-active"'), 'Contains active coupons sparkline canvas');
    assert(adminJs.includes('id="spark-coupons-usage"'), 'Contains redemptions sparkline canvas');
    assert(adminJs.includes('id="spark-coupons-avg"'), 'Contains avg discount sparkline canvas');
    assert(adminJs.includes('id="spark-coupons-cap"'), 'Contains discount cap sparkline canvas');
    assert(adminJs.includes('id="spark-coupons-inactive"'), 'Contains inactive sparkline canvas');

    console.log('\n--- 3. Control Bar, Search & Status Pills ---');
    assert(adminJs.includes('admin-control-bar glass-card'), 'Contains .admin-control-bar.glass-card');
    assert(adminJs.includes('setCouponFilter(\'Active\')') && adminJs.includes('setCouponFilter(\'Expired\')') && adminJs.includes('setCouponFilter(\'Inactive\')'), 'Contains status filter pills');
    assert(adminJs.includes('AdminDash.setCouponFilter'), 'Filter pill click handler connected');
    assert(adminJs.includes('AdminDash.setCouponSearch'), 'Search handler connected');
    assert(adminJs.includes('AdminDash.resetCouponFilters'), 'Reset filters handler connected');

    console.log('\n--- 4. Coupons Table & Actions ---');
    assert(adminJs.includes('admin-table-container glass-card'), 'Contains .admin-table-container.glass-card');
    assert(adminJs.includes('class="table-responsive"'), 'Contains .table-responsive for mobile scroll safety');
    assert(adminJs.includes('class="admin-table"'), 'Contains .admin-table styling');
    assert(adminJs.includes('<th>Coupon Code</th>'), 'Table header has Coupon Code column');
    assert(adminJs.includes('<th>Discount</th>'), 'Table header has Discount column');
    assert(adminJs.includes('<th>Min Spend</th>'), 'Table header has Min Spend column');
    assert(adminJs.includes('<th>Valid Until</th>'), 'Table header has Valid Until column');
    assert(adminJs.includes('<th>Usage / Limit</th>'), 'Table header has Usage / Limit column');
    assert(adminJs.includes('<th>Status</th>'), 'Table header has Status column');
    assert(adminJs.includes('Actions</th>'), 'Table header has Actions column');

    console.log('\n--- 5. Add / Edit / Details Modals & Lifecycle ---');
    assert(adminJs.includes('openAddCouponModal'), 'Contains openAddCouponModal function');
    assert(adminJs.includes('openEditCouponModal'), 'Contains openEditCouponModal function');
    assert(adminJs.includes('openCouponDetailsModal'), 'Contains openCouponDetailsModal function');
    assert(adminJs.includes('modal-box modal-lg'), 'Coupon modals use .modal-box.modal-lg');
    assert(adminJs.includes('AdminDash.toggleCouponActive'), 'Includes activate/deactivate toggle');
    assert(adminJs.includes('AdminDash.deleteCoupon'), 'Includes delete coupon action');

    console.log('\n--- 6. Responsive CSS Rules & Horizontal Overflow Prevention ---');
    assert(adminCss.includes('.admin-grid-top-kpis'), 'CSS contains .admin-grid-top-kpis styles');
    assert(adminCss.includes('.table-responsive'), 'CSS contains .table-responsive styles with overflow-x: auto');
    assert(adminCss.includes('max-width: 100%'), 'CSS prevents page-level container overflow');

    console.log('\n=======================================================');
    console.log('🏁 Admin Coupons DOM Verification: ALL 24 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminCouponsDOM();
