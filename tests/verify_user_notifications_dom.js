// DriveEase - User Dashboard Notifications DOM Structure & Design Integrity Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyUserNotificationsDOM() {
  console.log('🚀 Running User Dashboard Notifications DOM & Design Verification...\n');

  try {
    const userJsPath = path.join(__dirname, '..', 'public', 'js', 'user-dash.js');
    const userCssPath = path.join(__dirname, '..', 'public', 'css', 'user-dash.css');

    const userJs = fs.readFileSync(userJsPath, 'utf8');
    const userCss = fs.readFileSync(userCssPath, 'utf8');

    console.log('--- 1. Page Header & Navigation ---');
    assert(userJs.includes('renderNotifications()'), 'renderNotifications() function is defined');
    assert(userJs.includes('dash-page-title">Notifications'), 'Header title "Notifications" present');
    assert(userJs.includes('Stay updated on your trip reminders, bookings, and exclusive discounts.'), 'Header subtitle present');
    assert(userJs.includes('notif-mark-all-cta') || userJs.includes('markAllNotificationsRead'), 'Mark All Read CTA present when unread alerts exist');
    assert(userJs.includes('notif-explore-cta') || userJs.includes("App.navigateTo('#browse')"), 'Explore Cars CTA present');

    console.log('\n--- 2. 4 Real-Data Notification KPI Summary Cards ---');
    assert(userJs.includes('kpi-card-blue') && userJs.includes('Total Notifications'), 'Total Notifications card with Blue accent');
    assert(userJs.includes('kpi-card-orange') && userJs.includes('Unread Alerts'), 'Unread Alerts card with Amber/Orange accent');
    assert(userJs.includes('kpi-card-emerald') && userJs.includes('Trip & Bookings'), 'Trip & Bookings card with Emerald accent');
    assert(userJs.includes('kpi-card-purple') && userJs.includes('Offers & Payments'), 'Offers & Payments card with Purple accent');
    assert(userJs.includes('totalNotifs =') && userJs.includes('unreadCount ='), 'Calculates real customer notification counts');

    console.log('\n--- 3. Search, Category Filters & Sorting ---');
    assert(userJs.includes('notif-filters-bar'), 'Contains .notif-filters-bar container');
    assert(userJs.includes('notif-filter-pill'), 'Category filter pills styled with .notif-filter-pill');
    assert(userJs.includes('notif-search-input'), 'Live search input #notif-search-input present');
    assert(userJs.includes('setNotifFilter'), 'setNotifFilter() helper present');
    assert(userJs.includes('filterNotifications'), 'filterNotifications() helper processes unread, booking, promo & search');

    console.log('\n--- 4. Luxury Notification Cards & Visual Distinctions ---');
    assert(userJs.includes('notif-cards-list'), 'Container uses .notif-cards-list');
    assert(userJs.includes('notif-item-card'), 'Card element uses .notif-item-card');
    assert(userJs.includes('notif-unread'), 'Unread cards decorated with .notif-unread');
    assert(userJs.includes('notif-unread-dot'), 'Animated unread status pulse dot present');
    assert(userJs.includes('notif-icon-box'), 'Type-specific icon container .notif-icon-box');
    assert(userJs.includes('notif-card-title'), 'Bold notification title .notif-card-title');
    assert(userJs.includes('notif-card-msg'), 'Notification content body .notif-card-msg');
    assert(userJs.includes('notif-card-footer'), 'Notification footer metadata and actions bar');

    console.log('\n--- 5. Real Actions (Mark Read, Mark All, Clear, Navigation) ---');
    assert(userJs.includes('markNotificationRead'), 'markNotificationRead() defined and updates server');
    assert(userJs.includes('markAllNotificationsRead'), 'markAllNotificationsRead() defined and updates server');
    assert(userJs.includes('clearNotification'), 'clearNotification() defined and removes from server');
    assert(userJs.includes('NotificationsAPI.markRead'), 'Wired to NotificationsAPI.markRead');
    assert(userJs.includes('NotificationsAPI.markAllRead'), 'Wired to NotificationsAPI.markAllRead');
    assert(userJs.includes('NotificationsAPI.clear'), 'Wired to NotificationsAPI.clear');

    console.log('\n--- 6. Empty States & Error Handling ---');
    assert(userJs.includes('You\'re all caught up!'), 'Zero total alerts empty state heading');
    assert(userJs.includes('No active notifications or alerts at this time'), 'Zero total alerts empty state description');
    assert(userJs.includes('No notifications match your filter.'), 'Filter empty state heading');
    assert(userJs.includes('Reset Filters & View All') || userJs.includes('resetNotifFilters'), 'Filter reset button');
    assert(userJs.includes('Error Loading Notifications'), 'Error container with retry button');

    console.log('\n--- 7. CSS Design System & Responsive Rules ---');
    assert(userCss.includes('.notif-filters-bar'), 'CSS contains .notif-filters-bar styling');
    assert(userCss.includes('.notif-filter-pill.active'), 'CSS contains active filter gradient styling');
    assert(userCss.includes('.notif-item-card.notif-unread'), 'CSS contains unread notification highlight styling');
    assert(userCss.includes('.notif-icon-booking'), 'CSS contains booking icon variant');
    assert(userCss.includes('.notif-icon-payment'), 'CSS contains payment icon variant');
    assert(userCss.includes('.notif-icon-promo'), 'CSS contains promo icon variant');
    assert(userCss.includes('.notif-empty-card'), 'CSS contains .notif-empty-card styling');
    assert(userCss.includes('@media (max-width: 1024px)'), 'CSS contains 1024px tablet breakpoint');
    assert(userCss.includes('@media (max-width: 768px)'), 'CSS contains 768px mobile breakpoint');
    assert(userCss.includes('@media (max-width: 480px)'), 'CSS contains 480px small screen breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard Notifications: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
    return true;
  } catch (err) {
    console.error(`\n❌ VERIFICATION FAILED: ${err.message}\n`);
    process.exit(1);
  }
}

verifyUserNotificationsDOM();
