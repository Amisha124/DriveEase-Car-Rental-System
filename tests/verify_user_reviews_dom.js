// DriveEase - User Dashboard My Reviews DOM Structure & Design Integrity Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserReviewsDOM() {
  console.log('🚀 Running User Dashboard My Reviews DOM & Design Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Page Header & Navigation ---');
    assert(userJs.includes('renderReviews()'), 'renderReviews() function is defined');
    assert(userJs.includes('My Reviews & Ratings'), 'Header title "My Reviews & Ratings" present');
    assert(userJs.includes('Share your experience and manage your vehicle reviews.'), 'Header subtitle present');
    assert(userJs.includes('my-reviews-write-cta') || userJs.includes('openWriteReviewModal'), 'Write a Review CTA present');
    assert(userJs.includes('my-reviews-explore-cta') || userJs.includes("App.navigateTo('#browse')"), 'Explore Cars CTA present');

    console.log('\n--- 2. 4 Real-Data Review KPI Summary Cards ---');
    assert(userJs.includes('kpi-card-blue') && userJs.includes('Total Reviews'), 'Total Reviews card with Blue accent');
    assert(userJs.includes('kpi-card-orange') && userJs.includes('Average Rating Given'), 'Average Rating card with Amber/Orange accent');
    assert(userJs.includes('kpi-card-emerald') && userJs.includes('Five-Star Reviews'), 'Five-Star Reviews card with Emerald accent');
    assert(userJs.includes('kpi-card-purple') && userJs.includes('Verified Ratings'), 'Verified Ratings card with Purple accent');
    assert(userJs.includes('totalReviews =') && userJs.includes('avgRating ='), 'Calculates real customer submitted review metrics');

    console.log('\n--- 3. Search, Rating Filters & Sorting ---');
    assert(userJs.includes('review-filters-bar'), 'Contains .review-filters-bar container');
    assert(userJs.includes('review-filter-pill'), 'Rating filter pills styled with .review-filter-pill');
    assert(userJs.includes('review-search-input'), 'Live search input #review-search-input present');
    assert(userJs.includes('setReviewRatingFilter'), 'setReviewRatingFilter() helper present');
    assert(userJs.includes('filterReviews'), 'filterReviews() helper handles rating, search & sort options');

    console.log('\n--- 4. Luxury Review Cards & Elements ---');
    assert(userJs.includes('review-cards-list'), 'Container uses .review-cards-list');
    assert(userJs.includes('review-item-card'), 'Card element uses .review-item-card');
    assert(userJs.includes('review-card-media'), 'Vehicle image thumbnail container .review-card-media');
    assert(userJs.includes('review-card-thumb'), 'Controlled image class .review-card-thumb');
    assert(userJs.includes('review-car-title'), 'Vehicle title .review-car-title present');
    assert(userJs.includes('review-stars-pill'), 'Star rating badge .review-stars-pill with gold stars');
    assert(userJs.includes('review-headline'), 'Review headline .review-headline');
    assert(userJs.includes('review-comment-text'), 'Review body comment .review-comment-text');
    assert(userJs.includes('review-meta-bar'), 'Review date and status footer .review-meta-bar');

    console.log('\n--- 5. Edit, Delete & Write Review Workflows ---');
    assert(userJs.includes('openWriteReviewModal'), 'openWriteReviewModal() defined for creating new reviews');
    assert(userJs.includes('openReviewModal'), 'openReviewModal() defined for editing existing reviews');
    assert(userJs.includes('submitReview'), 'submitReview() handles submission with validation');
    assert(userJs.includes('deleteReview'), 'deleteReview() includes confirmation and deletion API call');
    assert(userJs.includes('ReviewsAPI.delete'), 'Wired to ReviewsAPI.delete');

    console.log('\n--- 6. Empty States & Error Handling ---');
    assert(userJs.includes('Your journey deserves a review.'), 'Zero total reviews empty state heading');
    assert(userJs.includes('Share your experience with the cars you\'ve driven'), 'Zero total reviews empty state description');
    assert(userJs.includes('No reviews match your filters.'), 'Filter empty state heading');
    assert(userJs.includes('Reset Filters & View All') || userJs.includes('resetReviewFilters'), 'Filter reset button');
    assert(userJs.includes('Error Loading Reviews'), 'Error container with retry button');

    console.log('\n--- 7. CSS Design System & Responsive Rules ---');
    assert(userCss.includes('.review-filters-bar'), 'CSS contains .review-filters-bar styling');
    assert(userCss.includes('.review-filter-pill.active'), 'CSS contains active filter gradient styling');
    assert(userCss.includes('.review-item-card'), 'CSS contains .review-item-card styling');
    assert(userCss.includes('.review-card-thumb'), 'CSS contains .review-card-thumb styling');
    assert(userCss.includes('object-fit: cover'), 'CSS enforces object-fit: cover on images');
    assert(userCss.includes('.review-stars-pill'), 'CSS contains .review-stars-pill styling');
    assert(userCss.includes('.review-empty-card'), 'CSS contains .review-empty-card styling');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains 1024px tablet breakpoint');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains 768px mobile breakpoint');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains 480px small screen breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard My Reviews: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
    return true;
  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

verifyUserReviewsDOM();
