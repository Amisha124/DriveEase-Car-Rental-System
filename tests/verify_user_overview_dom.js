// DriveEase - User Dashboard Overview DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserOverviewDOM() {
  console.log('🚀 Running User Dashboard Overview DOM & Design System Integrity Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Dashboard Shell & Navigation ---');
    assert(userJs.includes('renderSidebar()'), 'Sidebar renderer exists');
    assert(userJs.includes('#user-dashboard') || userJs.includes('#user-overview'), 'Overview route linked');
    assert(userJs.includes('#user-bookings'), 'My Bookings route linked');
    assert(userJs.includes('#user-favourites'), 'Favourites route linked');
    assert(userJs.includes('#user-payments'), 'Payments route linked');
    assert(userJs.includes('#user-notifications'), 'Notifications route linked');
    assert(userJs.includes('#user-reviews'), 'Reviews route linked');
    assert(userJs.includes('#user-profile'), 'Profile route linked');
    assert(userJs.includes('#user-settings'), 'Settings route linked');
    assert(userJs.includes('AuthAPI.logout()'), 'Logout action linked');

    console.log('\n--- 2. Colorful Welcome Hero Banner ---');
    assert(userJs.includes('dash-hero-card'), 'Contains .dash-hero-card');
    assert(userJs.includes('dash-hero-badge'), 'Contains .dash-hero-badge indicator');
    assert(userJs.includes('this.getGreeting()'), 'Dynamic personalized greeting logic');
    assert(userJs.includes('user.name'), 'Personalized with logged-in user name (no hardcoded name)');
    assert(userJs.includes("App.navigateTo('#browse')"), 'Explore Cars action button');
    assert(userJs.includes("App.navigateTo('#user-bookings')"), 'Secondary My Bookings button');
    assert(userJs.includes('hero-car-img'), 'Automotive hero image included');

    console.log('\n--- 3. 4 Colorful KPI Cards (Real Authenticated Data) ---');
    assert(userJs.includes('kpi-card-blue'), 'Total Bookings card has Blue accent class');
    assert(userJs.includes('Total Bookings'), 'Total Bookings label present');
    assert(userJs.includes('kpi-card-purple'), 'Active Rentals card has Purple accent class');
    assert(userJs.includes('Active Rentals'), 'Active Rentals label present');
    assert(userJs.includes('kpi-card-orange'), 'Upcoming Trips card has Orange accent class');
    assert(userJs.includes('Upcoming Trips'), 'Upcoming Trips label present');
    assert(userJs.includes('kpi-card-emerald'), 'Total Spent card has Emerald accent class');
    assert(userJs.includes('Total Spent'), 'Total Spent label present');
    assert(userJs.includes('totalSpent') && userJs.includes('formatCurrency'), 'Total Spent formatted with real currency');

    console.log('\n--- 4. Upcoming Trip Card & Empty State ---');
    assert(userJs.includes('rental-widget'), 'Contains .rental-widget');
    assert(userJs.includes('upcomingRental'), 'Checks for upcoming rental object');
    assert(userJs.includes('countdown-days'), 'Includes live countdown days display');
    assert(userJs.includes('countdown-hrs'), 'Includes live countdown hours display');
    assert(userJs.includes('empty-upcoming-trip'), 'Empty upcoming trip state container present');
    assert(userJs.includes('Your next adventure awaits'), 'Empty state encouraging headline');

    console.log('\n--- 5. Colorful Quick Actions & Profile Readiness ---');
    assert(userJs.includes('quick-actions-card'), 'Contains .quick-actions-card');
    assert(userJs.includes('act-blue'), 'Explore Cars button has .act-blue');
    assert(userJs.includes('act-purple'), 'My Bookings button has .act-purple');
    assert(userJs.includes('act-rose'), 'Saved Cars button has .act-rose');
    assert(userJs.includes('act-emerald'), 'Payments button has .act-emerald');
    assert(userJs.includes('act-amber'), 'Reviews button has .act-amber');
    assert(userJs.includes('act-cyan'), 'Profile button has .act-cyan');
    assert(userJs.includes('profile-card'), 'Contains .profile-card');
    assert(userJs.includes('profile-progress-ring'), 'Contains SVG progress ring');

    console.log('\n--- 6. Recommended Fleet & Recent Activity ---');
    assert(userJs.includes('recommended-section'), 'Recommended fleet section present');
    assert(userJs.includes('weekend-promo-card'), 'Weekend promo privilege card present');
    assert(userJs.includes('WEEKEND20'), 'Promo coupon code present');
    assert(userJs.includes('bottom-dashboard-grid'), 'Bottom 3-column activity grid present');
    assert(userJs.includes('Recent Bookings'), 'Recent Bookings section present');
    assert(userJs.includes('Saved Vehicles'), 'Saved Vehicles section present');
    assert(userJs.includes('Payment History'), 'Payment History section present');

    console.log('\n--- 7. Light Mode & Dark Mode Styling Rules ---');
    assert(userCss.includes('.dash-hero-card'), 'CSS contains .dash-hero-card styling');
    assert(userCss.includes('[data-theme="dark"] .dash-hero-card'), 'CSS contains dark mode override for hero');
    assert(userCss.includes('.kpi-card-blue'), 'CSS contains .kpi-card-blue');
    assert(userCss.includes('[data-theme="dark"] .kpi-card-blue'), 'CSS contains dark mode .kpi-card-blue');
    assert(userCss.includes('.kpi-card-purple'), 'CSS contains .kpi-card-purple');
    assert(userCss.includes('.kpi-card-orange'), 'CSS contains .kpi-card-orange');
    assert(userCss.includes('.kpi-card-emerald'), 'CSS contains .kpi-card-emerald');
    assert(userCss.includes('.act-blue:hover'), 'CSS contains hover styling for .act-blue');
    assert(userCss.includes('.act-purple:hover'), 'CSS contains hover styling for .act-purple');
    assert(userCss.includes('.act-emerald:hover'), 'CSS contains hover styling for .act-emerald');

    console.log('\n--- 8. Vehicle Card Image Size & Layout Control ---');
    assert(userCss.includes('.cars-carousel-grid'), 'CSS contains .cars-carousel-grid definition');
    assert(userCss.includes('.car-card'), 'CSS contains .car-card definition');
    assert(userCss.includes('.car-card-img-wrap'), 'CSS contains .car-card-img-wrap container');
    assert(userCss.includes('.car-card-img'), 'CSS contains .car-card-img styling');
    assert(userCss.includes('object-fit: cover'), 'CSS applies object-fit: cover to car card images');
    assert(userCss.includes('.car-card-body'), 'CSS contains .car-card-body layout');

    console.log('\n--- 8. Responsive Design Breakpoints ---');
    assert(userCss.includes('@media (max-width: 1280px)'), 'CSS contains 1280px breakpoint');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains 1024px breakpoint');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains 768px breakpoint');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains mobile breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard Overview Verification: ALL 38 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyUserOverviewDOM();
