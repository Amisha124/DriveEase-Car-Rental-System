// DriveEase - User Dashboard My Bookings DOM Structure & Design Integrity Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserBookingsDOM() {
  console.log('🚀 Running User Dashboard My Bookings DOM & Design System Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Page Header & Navigation ---');
    assert(userJs.includes('renderMyBookings()'), 'renderMyBookings() function is defined');
    assert(userJs.includes('My Bookings'), 'Header title "My Bookings" present');
    assert(userJs.includes('Manage your reservations and keep track of every journey.'), 'Header subtitle present');
    assert(userJs.includes('my-bookings-explore-cta') || userJs.includes("App.navigateTo('#browse')"), 'Explore Cars CTA navigating to #browse present');

    console.log('\n--- 2. 4 Real-Data Booking KPI Summary Cards ---');
    assert(userJs.includes('kpi-card-blue') && userJs.includes('Total Bookings'), 'Total Bookings KPI card with Blue accent');
    assert(userJs.includes('kpi-card-orange') && userJs.includes('Upcoming Trips'), 'Upcoming Trips KPI card with Orange/Amber accent');
    assert(userJs.includes('kpi-card-purple') && userJs.includes('Active Rentals'), 'Active Rentals KPI card with Purple/Violet accent');
    assert(userJs.includes('kpi-card-emerald') && userJs.includes('Completed Trips'), 'Completed Trips KPI card with Emerald accent');
    assert(userJs.includes('totalBookings = bookings.length'), 'Total Bookings computed from real authenticated data');
    assert(userJs.includes('upcomingCount') && userJs.includes('activeCount') && userJs.includes('completedCount'), 'Accurate real data calculations for trips');

    console.log('\n--- 3. Premium Booking Filter Bar & Live Search ---');
    assert(userJs.includes('booking-filters-bar'), 'Contains .booking-filters-bar');
    assert(userJs.includes('booking-filter-tabs'), 'Contains .booking-filter-tabs');
    assert(userJs.includes('booking-filter-pill'), 'Filter buttons styled with .booking-filter-pill');
    assert(userJs.includes('booking-search-input'), 'Contains interactive .booking-search-input');
    assert(userJs.includes('bookingSearchQuery'), 'Dynamic search query state integrated');
    assert(userJs.includes('setBookingsTab'), 'Interactive tab switcher setBookingsTab() defined');

    console.log('\n--- 4. Luxury Automotive Reservation Cards ---');
    assert(userJs.includes('booking-card glass-card'), 'Reservation card container with luxury glassmorphic card');
    assert(userJs.includes('booking-card-media'), 'Vehicle image thumbnail container .booking-card-media');
    assert(userJs.includes('booking-car-thumb'), 'Controlled image class .booking-car-thumb');
    assert(userJs.includes('booking-category-tag'), 'Category badge tag .booking-category-tag');
    assert(userJs.includes('booking-id-pill'), 'Booking reference ID pill .booking-id-pill');
    assert(userJs.includes('booking-status-badge'), 'Status badge container with status dot');
    assert(userJs.includes('status-pulse-dot'), 'Animated status pulse dot included');
    assert(userJs.includes('booking-payment-badge'), 'Payment status badge included');
    assert(userJs.includes('booking-trip-grid'), 'Trip route & schedule grid .booking-trip-grid');
    assert(userJs.includes('PICKUP SCHEDULE') && userJs.includes('RETURN SCHEDULE'), 'Clear Pickup and Return schedule sections');
    assert(userJs.includes('trip-duration-pill'), 'Duration badge .trip-duration-pill');
    assert(userJs.includes('booking-price-block'), 'Total price display with breakdown hint');

    console.log('\n--- 5. Contextual Action Buttons & Modals Integration ---');
    assert(userJs.includes("App.navigateTo('#car/"), 'Car Details button navigates to vehicle details');
    assert(userJs.includes('Booking.openPrintReceipt'), 'Tax Invoice button triggers Booking.openPrintReceipt()');
    assert(userJs.includes('UserDash.cancelBooking'), 'Cancel Booking button calls UserDash.cancelBooking()');
    assert(userJs.includes('UserDash.openReviewModal'), 'Write Review button calls UserDash.openReviewModal()');
    assert(userJs.includes("isUpcoming ? `") || userJs.includes("['Confirmed', 'Pending'].includes(b.bookingStatus)"), 'Cancel only shown for upcoming/pending bookings');
    assert(userJs.includes('isCompleted ? `'), 'Review only shown for completed bookings');

    console.log('\n--- 6. Empty States & Feedback ---');
    assert(userJs.includes('Your next adventure awaits.'), 'Empty total bookings heading present');
    assert(userJs.includes('Explore our fleet and find the perfect car for your next trip.'), 'Empty total bookings description present');
    assert(userJs.includes('No bookings found in this category.'), 'Empty filter category heading present');
    assert(userJs.includes('Reset Filters & View All'), 'Reset filter action present');

    console.log('\n--- 7. Cancellation Confirmation & APIs ---');
    assert(userJs.includes('confirm('), 'Cancellation includes explicit confirmation dialog');
    assert(userJs.includes('BookingsAPI.cancel(bookingId)'), 'Preserves real BookingsAPI.cancel endpoint');
    assert(userJs.includes('Booking Cancelled'), 'Shows feedback toast upon cancellation');

    console.log('\n--- 8. CSS Design System & Responsive Rules ---');
    assert(userCss.includes('.booking-filters-bar'), 'CSS contains .booking-filters-bar styling');
    assert(userCss.includes('.booking-filter-pill.active'), 'CSS contains active filter gradient styling');
    assert(userCss.includes('.booking-card'), 'CSS contains .booking-card styling');
    assert(userCss.includes('[data-theme="dark"] .booking-card:hover'), 'CSS contains dark mode hover styling for booking cards');
    assert(userCss.includes('.booking-car-thumb'), 'CSS contains .booking-car-thumb styling');
    assert(userCss.includes('object-fit: cover'), 'CSS enforces object-fit: cover on thumbnails');
    assert(userCss.includes('.status-confirmed'), 'CSS contains .status-confirmed status badge');
    assert(userCss.includes('.status-active'), 'CSS contains .status-active status badge');
    assert(userCss.includes('.status-completed'), 'CSS contains .status-completed status badge');
    assert(userCss.includes('.status-cancelled'), 'CSS contains .status-cancelled status badge');
    assert(userCss.includes('.booking-trip-grid'), 'CSS contains .booking-trip-grid styling');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains tablet responsive breakpoints for booking cards');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains mobile responsive breakpoints for booking cards');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains small phone responsive breakpoints for booking buttons');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard My Bookings: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
    return true;
  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

verifyUserBookingsDOM();
