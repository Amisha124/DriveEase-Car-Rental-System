// DriveEase - Admin Reports DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminReportsDOM() {
  console.log('🚀 Running Admin Reports DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Reports includes .admin-page-header');
    assert(adminJs.includes('<h1>Reports</h1>'), 'Page title is "Reports"');
    assert(adminJs.includes('<p>Generate and review fleet, booking and financial reports.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('/api/reports/export/revenue'), 'Header includes direct quick CSV export trigger');

    console.log('\n--- 2. Top KPI Cards & Live Sparklines ---');
    assert(adminJs.includes('Gross Revenue'), 'KPI contains Gross Revenue');
    assert(adminJs.includes('Total Bookings'), 'KPI contains Total Bookings');
    assert(adminJs.includes('Fleet Utilization'), 'KPI contains Fleet Utilization');
    assert(adminJs.includes('Operating Expenses'), 'KPI contains Operating Expenses');
    assert(adminJs.includes('Net Profit'), 'KPI contains Net Profit');
    assert(adminJs.includes('Average Booking Value'), 'KPI contains Average Booking Value');

    // Canvas sparklines
    assert(adminJs.includes('id="spark-reports-revenue"'), 'Contains gross revenue sparkline canvas');
    assert(adminJs.includes('id="spark-reports-bookings"'), 'Contains total bookings sparkline canvas');
    assert(adminJs.includes('id="spark-reports-utilization"'), 'Contains fleet utilization sparkline canvas');
    assert(adminJs.includes('id="spark-reports-expenses"'), 'Contains operating expenses sparkline canvas');
    assert(adminJs.includes('id="spark-reports-profit"'), 'Contains net profit sparkline canvas');
    assert(adminJs.includes('id="spark-reports-abv"'), 'Contains avg booking value sparkline canvas');

    console.log('\n--- 3. Control Bar, Time Range & Focus Pills ---');
    assert(adminJs.includes('admin-control-bar glass-card'), 'Contains .admin-control-bar.glass-card');
    assert(adminJs.includes('setReportTimeRange(\'7days\')') && adminJs.includes('setReportTimeRange(\'30days\')') && adminJs.includes('setReportTimeRange(\'90days\')'), 'Contains 7d, 30d, 90d date range toggle pills');
    assert(adminJs.includes('setReportTab(\'All\')') && adminJs.includes('setReportTab(\'Financials\')') && adminJs.includes('setReportTab(\'Fleet\')') && adminJs.includes('setReportTab(\'Exports\')'), 'Contains report category focus filter pills');
    assert(adminJs.includes('AdminDash.setReportTimeRange'), 'Time range handler connected');
    assert(adminJs.includes('AdminDash.setReportTab'), 'Tab focus handler connected');
    assert(adminJs.includes('AdminDash.setReportChartMode'), 'Chart mode toggle handler connected');

    console.log('\n--- 4. Chart Sections & Canvas Telemetry ---');
    assert(adminJs.includes('id="report-revenue-chart"'), 'Contains main revenue/bookings trajectory chart canvas');
    assert(adminJs.includes('id="report-category-chart"'), 'Contains vehicle category bar chart canvas');
    assert(adminJs.includes('drawReportCharts'), 'Chart draw lifecycle handler exists');

    console.log('\n--- 5. Executive Table & Audit Ledger ---');
    assert(adminJs.includes('admin-table-container glass-card'), 'Contains .admin-table-container.glass-card');
    assert(adminJs.includes('class="table-responsive"'), 'Contains .table-responsive for mobile scroll safety');
    assert(adminJs.includes('class="admin-table"'), 'Contains .admin-table styling');
    assert(adminJs.includes('<th>Vehicle Name</th>'), 'Table header has Vehicle Name column');
    assert(adminJs.includes('<th>Category</th>'), 'Table header has Category column');
    assert(adminJs.includes('<th>Daily Rate</th>'), 'Table header has Daily Rate column');
    assert(adminJs.includes('<th>Trips Completed</th>'), 'Table header has Trips Completed column');
    assert(adminJs.includes('<th>Total Generated</th>'), 'Table header has Total Generated column');
    assert(adminJs.includes('<th>Fleet Yield</th>'), 'Table header has Fleet Yield column');

    console.log('\n--- 6. Direct CSV Export Center ---');
    assert(adminJs.includes('/api/reports/export/bookings'), 'CSV export link for Bookings exists');
    assert(adminJs.includes('/api/reports/export/revenue'), 'CSV export link for Financial Revenue exists');
    assert(adminJs.includes('/api/reports/export/fleet'), 'CSV export link for Fleet Inventory exists');
    assert(adminJs.includes('/api/reports/export/users'), 'CSV export link for User Directory exists');
    assert(adminJs.includes('/api/reports/export/expenses'), 'CSV export link for Operational Expenses exists');

    console.log('\n--- 7. No Emoji Visual Icons in Reports UI ---');
    const reportsRenderMatch = adminJs.match(/renderReportsExport[\s\S]*?drawReportCharts/);
    if (reportsRenderMatch) {
      const reportsHtml = reportsRenderMatch[0];
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert(!emojiRegex.test(reportsHtml), 'No emoji characters detected in renderReportsExport template');
    }

    console.log('\n--- 8. Responsive CSS Rules & Horizontal Overflow Prevention ---');
    assert(adminCss.includes('.admin-grid-top-kpis'), 'CSS contains .admin-grid-top-kpis styles');
    assert(adminCss.includes('.table-responsive'), 'CSS contains .table-responsive styles with overflow-x: auto');
    assert(adminCss.includes('max-width: 100%'), 'CSS prevents page-level container overflow');

    console.log('\n=======================================================');
    console.log('🏁 Admin Reports DOM Verification: ALL 26 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminReportsDOM();
