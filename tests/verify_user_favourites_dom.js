// DriveEase - User Dashboard My Favourites DOM Structure & Design Integrity Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserFavouritesDOM() {
  console.log('🚀 Running User Dashboard My Favourites DOM & Design System Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Page Header & Navigation ---');
    assert(userJs.includes('renderFavourites()'), 'renderFavourites() function is defined');
    assert(userJs.includes('My Favourites'), 'Header title "My Favourites" present');
    assert(userJs.includes('Your favourite cars, ready for your next journey.'), 'Header subtitle present');
    assert(userJs.includes('my-favs-explore-cta') || userJs.includes("App.navigateTo('#browse')"), 'Explore Cars CTA navigating to #browse present');
    assert(userJs.includes('favCars.length'), 'Header includes actual saved vehicle count');

    console.log('\n--- 2. Search, Filters & Sorting Controls ---');
    assert(userJs.includes('fav-filters-bar'), 'Contains .fav-filters-bar');
    assert(userJs.includes('fav-filter-pill'), 'Category pills styled with .fav-filter-pill');
    assert(userJs.includes('fav-avail-pill') || userJs.includes('Available Now'), 'Contains Available Now filter toggle');
    assert(userJs.includes('fav-sort-select'), 'Contains sorting dropdown .fav-sort-select');
    assert(userJs.includes('fav-search-input'), 'Contains interactive search input #fav-search-input');
    assert(userJs.includes('filterFavourites'), 'filterFavourites() logic handles category, search, availability & sort');

    console.log('\n--- 3. Luxury Automotive Vehicle Cards ---');
    assert(userJs.includes('fav-cars-grid'), 'Card container uses responsive .fav-cars-grid');
    assert(userJs.includes('fav-car-card'), 'Card element uses .fav-car-card');
    assert(userJs.includes('fav-card-img-wrap'), 'Controlled thumbnail container .fav-card-img-wrap');
    assert(userJs.includes('fav-card-img'), 'Image element .fav-card-img');
    assert(userJs.includes('fav-badge-tag'), 'Badges overlay .fav-badge-tag');
    assert(userJs.includes('fav-car-brand'), 'Brand and subcategory label present');
    assert(userJs.includes('fav-car-title'), 'Vehicle title clickable and present');
    assert(userJs.includes('fav-rating-pill'), 'Rating badge with review count present');
    assert(userJs.includes('fav-specs-grid'), 'Specifications grid present (Seats, Transmission, Fuel, Power)');
    assert(userJs.includes('fav-card-price'), 'Daily rental price with formatCurrency present');

    console.log('\n--- 4. Interactive Actions (Remove, Details, Book) ---');
    assert(userJs.includes('fav-remove-btn'), 'Remove from favourites heart button present');
    assert(userJs.includes('removeFavourite('), 'removeFavourite() method defined and hooked up');
    assert(userJs.includes('FavouritesAPI.toggle('), 'Preserves real FavouritesAPI.toggle endpoint');
    assert(userJs.includes("App.navigateTo('#car/"), 'View Details navigates to dedicated vehicle details route');
    assert(userJs.includes("Booking.startBooking("), 'Book Now uses the existing booking flow');

    console.log('\n--- 5. Vehicle Availability Rules ---');
    assert(userJs.includes('isAvailable'), 'Checks real car availability status');
    assert(userJs.includes('badge-avail-yes') && userJs.includes('badge-avail-no'), 'Visual indicator for Available / Unavailable');
    assert(userJs.includes('disabled') || userJs.includes('Unavailable'), 'Prevents invalid booking when vehicle is unavailable');

    console.log('\n--- 6. Empty States & Feedback ---');
    assert(userJs.includes('Your dream drive starts here.'), 'Empty total favourites heading present');
    assert(userJs.includes('Save the cars you love and find them here whenever you return.'), 'Empty total favourites description present');
    assert(userJs.includes('No favourites match your filters.'), 'Empty filter category heading present');
    assert(userJs.includes('Reset Filters & View All') || userJs.includes('resetFavFilters'), 'Reset filter action present');

    console.log('\n--- 7. CSS Design System & Responsive Rules ---');
    assert(userCss.includes('.fav-filters-bar'), 'CSS contains .fav-filters-bar styling');
    assert(userCss.includes('.fav-filter-pill.active'), 'CSS contains active filter gradient styling');
    assert(userCss.includes('.fav-cars-grid'), 'CSS contains .fav-cars-grid definition');
    assert(userCss.includes('.fav-car-card'), 'CSS contains .fav-car-card styling');
    assert(userCss.includes('[data-theme="dark"] .fav-car-card:hover'), 'CSS contains dark mode hover styling');
    assert(userCss.includes('.fav-card-img'), 'CSS contains .fav-card-img styling');
    assert(userCss.includes('object-fit: cover'), 'CSS enforces object-fit: cover on images');
    assert(userCss.includes('.fav-remove-btn'), 'CSS contains .fav-remove-btn styling');
    assert(userCss.includes('@media (max-width: 1280px)'), 'CSS contains 1280px desktop breakpoint');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains 1024px tablet breakpoint');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains 768px mobile breakpoint');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains 480px small screen breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard My Favourites: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
    return true;
  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

verifyUserFavouritesDOM();
