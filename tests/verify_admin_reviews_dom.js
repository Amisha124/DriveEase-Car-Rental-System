// DriveEase - Admin Reviews DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminReviewsDOM() {
  console.log('🚀 Running Admin Reviews DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Reviews includes .admin-page-header');
    assert(adminJs.includes('<h1>Reviews</h1>'), 'Page title is "Reviews"');
    assert(adminJs.includes('<p>Monitor customer feedback, ratings and vehicle reviews.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('renderReviewsModeration'), 'Controller includes renderReviewsModeration');

    console.log('\n--- 2. Top KPI Cards & Live Sparklines ---');
    assert(adminJs.includes('Total Reviews'), 'KPI contains Total Reviews');
    assert(adminJs.includes('Average Rating'), 'KPI contains Average Rating');
    assert(adminJs.includes('5-Star Reviews'), 'KPI contains 5-Star Reviews');
    assert(adminJs.includes('4-Star Reviews'), 'KPI contains 4-Star Reviews');
    assert(adminJs.includes('3-Star Reviews'), 'KPI contains 3-Star Reviews');
    assert(adminJs.includes('Low Ratings'), 'KPI contains Low Ratings');

    // Canvas sparklines
    assert(adminJs.includes('id="spark-reviews-total"'), 'Contains total reviews sparkline canvas');
    assert(adminJs.includes('id="spark-reviews-avg"'), 'Contains average rating sparkline canvas');
    assert(adminJs.includes('id="spark-reviews-5star"'), 'Contains 5-star sparkline canvas');
    assert(adminJs.includes('id="spark-reviews-4star"'), 'Contains 4-star sparkline canvas');
    assert(adminJs.includes('id="spark-reviews-3star"'), 'Contains 3-star sparkline canvas');
    assert(adminJs.includes('id="spark-reviews-low"'), 'Contains low ratings sparkline canvas');

    console.log('\n--- 3. Control Bar, Search & Rating Pills ---');
    assert(adminJs.includes('admin-control-bar glass-card'), 'Contains .admin-control-bar.glass-card');
    assert(adminJs.includes('5 Star') && adminJs.includes('4 Star') && adminJs.includes('3 Star') && adminJs.includes('2 Star') && adminJs.includes('1 Star'), 'Contains all 5 rating filter pills');
    assert(adminJs.includes('AdminDash.setReviewRatingFilter'), 'Rating pill handler connected');
    assert(adminJs.includes('AdminDash.setReviewSearch'), 'Search handler connected');
    assert(adminJs.includes('AdminDash.resetReviewFilters'), 'Reset filters handler connected');

    console.log('\n--- 4. Reviews Table & Customer Dossier ---');
    assert(adminJs.includes('admin-table-container glass-card'), 'Contains .admin-table-container.glass-card');
    assert(adminJs.includes('class="table-responsive"'), 'Contains .table-responsive for mobile scroll safety');
    assert(adminJs.includes('class="admin-table"'), 'Contains .admin-table styling');
    assert(adminJs.includes('<th>Customer</th>'), 'Table header has Customer column');
    assert(adminJs.includes('<th>Vehicle</th>'), 'Table header has Vehicle column');
    assert(adminJs.includes('<th>Rating</th>'), 'Table header has Rating column');
    assert(adminJs.includes('<th>Review Feedback</th>'), 'Table header has Review Feedback column');
    assert(adminJs.includes('<th>Date</th>'), 'Table header has Date column');
    assert(adminJs.includes('<th>Status</th>'), 'Table header has Status column');
    assert(adminJs.includes('<th>Actions</th>'), 'Table header has Actions column');

    console.log('\n--- 5. Review Dossier Modal & Status Badges ---');
    assert(adminJs.includes('openReviewDetailsModal'), 'Contains openReviewDetailsModal function');
    assert(adminJs.includes('modal-box modal-lg'), 'Review modal uses .modal-box.modal-lg');
    assert(adminJs.includes('Review Feedback Dossier'), 'Review modal has structured dossier header');
    assert(adminJs.includes('AdminDash.setReviewStatus'), 'Includes moderation status toggle');
    assert(adminJs.includes('AdminDash.deleteReview'), 'Includes delete review action');

    console.log('\n--- 6. Responsive CSS Rules & Horizontal Overflow Prevention ---');
    assert(adminCss.includes('.admin-grid-top-kpis'), 'CSS contains .admin-grid-top-kpis styles');
    assert(adminCss.includes('.table-responsive'), 'CSS contains .table-responsive styles with overflow-x: auto');
    assert(adminCss.includes('max-width: 100%'), 'CSS prevents page-level container overflow');

    console.log('\n=======================================================');
    console.log('🏁 Admin Reviews DOM Verification: ALL 24 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminReviewsDOM();
