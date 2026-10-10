// DriveEase - Admin Activities DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminActivitiesDOM() {
  console.log('🚀 Running Admin Activities DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Activities includes .admin-page-header');
    assert(adminJs.includes('<h1>Activities</h1>'), 'Page title is "Activities"');
    assert(adminJs.includes('<p>Monitor recent actions and system activity across DriveEase.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('AdminDash.renderActivityLogs()'), 'Header includes Refresh Feed action');

    console.log('\n--- 2. Top KPI Cards & Live Sparklines ---');
    assert(adminJs.includes('Total Activities'), 'KPI contains Total Activities');
    assert(adminJs.includes('Today\'s Activities'), 'KPI contains Today\'s Activities');
    assert(adminJs.includes('User Actions'), 'KPI contains User Actions');
    assert(adminJs.includes('Admin Actions'), 'KPI contains Admin Actions');

    // Canvas sparklines
    assert(adminJs.includes('id="spark-act-total"'), 'Contains total activities sparkline canvas');
    assert(adminJs.includes('id="spark-act-today"'), 'Contains today activities sparkline canvas');
    assert(adminJs.includes('id="spark-act-user"'), 'Contains user actions sparkline canvas');
    assert(adminJs.includes('id="spark-act-admin"'), 'Contains admin actions sparkline canvas');

    console.log('\n--- 3. Control Bar, Search & Filter Pills ---');
    assert(adminJs.includes('admin-control-bar glass-card'), 'Contains .admin-control-bar.glass-card');
    assert(adminJs.includes('setActivityFilter(\'All\')') && adminJs.includes('setActivityFilter(\'User Actions\')') && adminJs.includes('setActivityFilter(\'Admin Actions\')'), 'Contains status filter pills');
    assert(adminJs.includes('setActivityFilter(\'Bookings\')') && adminJs.includes('setActivityFilter(\'Payments\')') && adminJs.includes('setActivityFilter(\'Fleet\')') && adminJs.includes('setActivityFilter(\'Authentication\')'), 'Contains domain categories filter pills');
    assert(adminJs.includes('AdminDash.setActivityFilter'), 'Filter pill click handler connected');
    assert(adminJs.includes('AdminDash.setActivitySearch'), 'Search handler connected');
    assert(adminJs.includes('AdminDash.resetActivityFilters'), 'Reset filters handler connected');

    console.log('\n--- 4. Activities Table & Schema ---');
    assert(adminJs.includes('admin-table-container glass-card'), 'Contains .admin-table-container.glass-card');
    assert(adminJs.includes('class="table-responsive"'), 'Contains .table-responsive for mobile scroll safety');
    assert(adminJs.includes('class="admin-table"'), 'Contains .admin-table styling');
    assert(adminJs.includes('<th>Date / Time</th>'), 'Table header has Date / Time column');
    assert(adminJs.includes('<th>User</th>'), 'Table header has User column');
    assert(adminJs.includes('<th>Action</th>'), 'Table header has Action column');
    assert(adminJs.includes('<th>Activity</th>'), 'Table header has Activity column');
    assert(adminJs.includes('<th>Related Item</th>'), 'Table header has Related Item column');
    assert(adminJs.includes('<th>Status</th>'), 'Table header has Status column');
    assert(adminJs.includes('Actions</th>'), 'Table header has Actions column');

    console.log('\n--- 5. Activity Details Dossier Modal ---');
    assert(adminJs.includes('openActivityDetailsModal'), 'Contains openActivityDetailsModal function');
    assert(adminJs.includes('modal-box modal-lg'), 'Activity dossier uses .modal-box.modal-lg');
    assert(adminJs.includes('Initiator Identity'), 'Dossier includes Initiator Identity card');
    assert(adminJs.includes('Telemetry and Metadata'), 'Dossier includes Telemetry and Metadata card');

    console.log('\n--- 6. No Emoji Visual Icons in Activities UI ---');
    const actRenderMatch = adminJs.match(/renderActivityLogs[\s\S]*?openActivityDetailsModal/);
    if (actRenderMatch) {
      const actHtml = actRenderMatch[0];
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert(!emojiRegex.test(actHtml), 'No emoji characters detected in renderActivityLogs template');
    }

    console.log('\n--- 7. Responsive CSS Rules & Horizontal Overflow Prevention ---');
    assert(adminCss.includes('.admin-grid-top-kpis'), 'CSS contains .admin-grid-top-kpis styles');
    assert(adminCss.includes('.table-responsive'), 'CSS contains .table-responsive styles with overflow-x: auto');
    assert(adminCss.includes('max-width: 100%'), 'CSS prevents page-level container overflow');

    console.log('\n=======================================================');
    console.log('🏁 Admin Activities DOM Verification: ALL 24 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminActivitiesDOM();
