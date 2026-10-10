// DriveEase - Admin Settings DOM Structure & Design Verification
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function verifyAdminSettingsDOM() {
  console.log('🚀 Running Admin Settings DOM & Design System Integrity Verification...\n');

  try {
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');

    const adminJs = fs.readFileSync(adminJsPath, 'utf8');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    console.log('--- 1. Page Header & Design System Tokens ---');
    assert(adminJs.includes('class="admin-page-header"'), 'Admin Settings includes .admin-page-header');
    assert(adminJs.includes('<h1>Settings</h1>'), 'Page title is "Settings"');
    assert(adminJs.includes('<p>Manage DriveEase admin preferences and system configuration.</p>'), 'Page subtitle matches specification');
    assert(adminJs.includes('AdminDash.renderAdminSettings()'), 'Header includes refresh/render handler');

    console.log('\n--- 2. 6 Logical Glass-Card Settings Groups ---');
    assert(adminJs.includes('General Configuration'), 'Contains General Configuration section');
    assert(adminJs.includes('Appearance & Interface Theme'), 'Contains Appearance & Interface Theme section');
    assert(adminJs.includes('Notifications & Telemetry Alerts'), 'Contains Notifications & Telemetry Alerts section');
    assert(adminJs.includes('Booking & Rental Policies'), 'Contains Booking & Rental Policies section');
    assert(adminJs.includes('Security & Authentication'), 'Contains Security & Authentication section');
    assert(adminJs.includes('Admin Profile & Identity'), 'Contains Admin Profile & Identity section');

    console.log('\n--- 3. General Settings Controls & Storage ---');
    assert(adminJs.includes('id="admin-set-brand"'), 'Contains platform brand name input');
    assert(adminJs.includes('id="admin-set-email"'), 'Contains support email input');
    assert(adminJs.includes('id="admin-set-tax"'), 'Contains GST/tax input');
    assert(adminJs.includes('id="admin-set-hub"'), 'Contains fleet hub input');
    assert(adminJs.includes('saveGeneralSettings'), 'Contains saveGeneralSettings method');
    assert(adminJs.includes('resetGeneralSettings'), 'Contains resetGeneralSettings method');

    console.log('\n--- 4. Appearance & Theme System Integration ---');
    assert(adminJs.includes('setThemePreference'), 'Contains setThemePreference method');
    assert(adminJs.includes('App.toggleTheme()'), 'Connected to existing App.toggleTheme()');
    assert(adminJs.includes('Luxury Dark') && adminJs.includes('Slate Light'), 'Displays theme labels');

    console.log('\n--- 5. Notifications & Telemetry Toggles ---');
    assert(adminJs.includes('id="admin-notif-bookings"'), 'Contains booking notif switch');
    assert(adminJs.includes('id="admin-notif-fleet"'), 'Contains fleet maintenance notif switch');
    assert(adminJs.includes('id="admin-notif-payments"'), 'Contains payments notif switch');
    assert(adminJs.includes('id="admin-notif-users"'), 'Contains users notif switch');
    assert(adminJs.includes('id="admin-notif-security"'), 'Contains security notif switch');
    assert(adminJs.includes('saveNotificationPreferences'), 'Contains saveNotificationPreferences method');
    assert(adminJs.includes('openBroadcastNotifModal'), 'Contains broadcast modal action');

    console.log('\n--- 6. Booking Policies Configuration ---');
    assert(adminJs.includes('id="admin-set-instant-book"'), 'Contains instant booking switch');
    assert(adminJs.includes('id="admin-set-cancel-window"'), 'Contains cancellation grace window selector');
    assert(adminJs.includes('id="admin-set-min-duration"'), 'Contains min duration selector');
    assert(adminJs.includes('id="admin-set-min-age"'), 'Contains min driver age selector');
    assert(adminJs.includes('saveBookingPolicies'), 'Contains saveBookingPolicies method');

    console.log('\n--- 7. Security & Password Update Flow ---');
    assert(adminJs.includes('id="admin-cur-pass"'), 'Contains current password input');
    assert(adminJs.includes('id="admin-new-pass"'), 'Contains new password input');
    assert(adminJs.includes('id="admin-confirm-pass"'), 'Contains confirm password input');
    assert(adminJs.includes('handleUpdatePassword'), 'Contains handleUpdatePassword method');
    assert(adminJs.includes('AuthAPI.updatePassword'), 'Calls backend AuthAPI.updatePassword');

    console.log('\n--- 8. Admin Profile & Dossier ---');
    assert(adminJs.includes('id="admin-prof-name"'), 'Contains admin name input');
    assert(adminJs.includes('id="admin-prof-email"'), 'Contains admin email input');
    assert(adminJs.includes('admin@driveease.com'), 'References admin@driveease.com');
    assert(adminJs.includes('id="admin-prof-phone"'), 'Contains admin phone input');
    assert(adminJs.includes('id="admin-prof-address"'), 'Contains admin address input');
    assert(adminJs.includes('id="admin-prof-avatar"'), 'Contains admin avatar input');
    assert(adminJs.includes('handleUpdateProfile'), 'Contains handleUpdateProfile method');
    assert(adminJs.includes('previewAdminAvatar'), 'Contains previewAdminAvatar method');
    assert(adminJs.includes('resetProfileForm'), 'Contains resetProfileForm method');

    console.log('\n--- 9. Responsive CSS Rules & Custom Switch ---');
    assert(adminCss.includes('.admin-settings-grid'), 'CSS contains .admin-settings-grid');
    assert(adminCss.includes('.admin-settings-card'), 'CSS contains .admin-settings-card');
    assert(adminCss.includes('.admin-switch'), 'CSS contains .admin-switch');
    assert(adminCss.includes('.admin-switch-slider'), 'CSS contains .admin-switch-slider');
    assert(adminCss.includes('@media (max-width: 1024px)'), 'CSS contains tablet/desktop responsive breakpoint');
    assert(adminCss.includes('@media (max-width: 640px)'), 'CSS contains mobile responsive breakpoint');

    console.log('\n=======================================================');
    console.log('🏁 Admin Settings DOM Verification: ALL 28 CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ DOM Verification Failed:', err.message);
    process.exit(1);
  }
}

verifyAdminSettingsDOM();
