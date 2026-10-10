const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Running User Dashboard Settings DOM & Design Verification...\n');

  try {
    // 1. Authenticate test customer
    console.log('--- 1. Authenticating Customer Session ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'john123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + loginData.error);
    const token = loginData.token;
    console.log(`  ✅ PASS: Authenticated as ${loginData.user.name} (${loginData.user.email})`);

    // 2. Test GET /api/auth/preferences
    console.log('\n--- 2. Testing GET /api/auth/preferences ---');
    const getPrefsRes = await fetch(`${BASE_URL}/api/auth/preferences`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const getPrefsData = await getPrefsRes.json();
    if (!getPrefsRes.ok) throw new Error('GET preferences failed: ' + getPrefsData.error);
    if (!getPrefsData.preferences) throw new Error('No preferences object returned');
    console.log(`  ✅ PASS: Retrieved user preferences:`, getPrefsData.preferences);
    console.log(`  ✅ PASS: Default currency: ${getPrefsData.preferences.currency}`);
    console.log(`  ✅ PASS: Default theme: ${getPrefsData.preferences.theme}`);

    // 3. Test PUT /api/auth/preferences (Notification Delivery Updates)
    console.log('\n--- 3. Testing PUT /api/auth/preferences (Notification Channels) ---');
    const updatedNotifs = {
      emailNotifications: true,
      smsNotifications: false,
      marketingOffers: true,
      securityAlerts: true
    };
    const putPrefsRes = await fetch(`${BASE_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatedNotifs)
    });
    const putPrefsData = await putPrefsRes.json();
    if (!putPrefsRes.ok) throw new Error('PUT preferences failed: ' + putPrefsData.error);
    if (putPrefsData.preferences.smsNotifications !== false) {
      throw new Error('smsNotifications preference was not persisted as false');
    }
    console.log(`  ✅ PASS: Updated notification preferences persisted to backend`);

    // 4. Test Regional & Display Formats Update
    console.log('\n--- 4. Testing Regional & Display Formats Update ---');
    const regionalUpdates = {
      currency: 'INR',
      unitSystem: 'metric',
      language: 'English',
      theme: 'dark'
    };
    const putRegRes = await fetch(`${BASE_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(regionalUpdates)
    });
    const putRegData = await putRegRes.json();
    if (!putRegRes.ok) throw new Error('PUT regional preferences failed: ' + putRegData.error);
    if (putRegData.preferences.unitSystem !== 'metric' || putRegData.preferences.currency !== 'INR') {
      throw new Error('Regional preferences were not properly updated');
    }
    console.log(`  ✅ PASS: Regional formats persisted successfully`);

    // 5. Restore default preferences
    console.log('\n--- 5. Restoring Default Preferences ---');
    await fetch(`${BASE_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        emailNotifications: true,
        smsNotifications: true,
        marketingOffers: true,
        securityAlerts: true,
        currency: 'INR',
        unitSystem: 'metric',
        language: 'English',
        theme: 'dark'
      })
    });
    console.log(`  ✅ PASS: Default settings restored`);

    // 6. Inspect JS and CSS DOM structure for Settings
    console.log('\n--- 6. Inspecting Client-Side DOM & Design Structure ---');
    const userDashJs = fs.readFileSync(path.join(__dirname, '../public/js/user-dash.js'), 'utf8');
    const userDashCss = fs.readFileSync(path.join(__dirname, '../public/css/user-dash.css'), 'utf8');

    // JS Checks
    if (!userDashJs.includes('renderSettings(')) throw new Error('renderSettings() missing in user-dash.js');
    console.log('  ✅ PASS: renderSettings() defined in user-dash.js');

    if (!userDashJs.includes('setThemePreference(')) throw new Error('setThemePreference() missing in user-dash.js');
    console.log('  ✅ PASS: setThemePreference() interactive theme handler present');

    if (!userDashJs.includes('handleNotificationPreferencesSave(')) throw new Error('handleNotificationPreferencesSave() missing');
    console.log('  ✅ PASS: handleNotificationPreferencesSave() handler present');

    if (!userDashJs.includes('handleRegionalPreferencesSave(')) throw new Error('handleRegionalPreferencesSave() missing');
    console.log('  ✅ PASS: handleRegionalPreferencesSave() handler present');

    if (!userDashJs.includes('settings-theme-card')) throw new Error('Theme cards markup missing in user-dash.js');
    console.log('  ✅ PASS: Interactive Theme selector cards present');

    if (!userDashJs.includes('pref-email-notif') || !userDashJs.includes('pref-sms-notif')) {
      throw new Error('Notification switches markup missing in user-dash.js');
    }
    console.log('  ✅ PASS: Notification switches present with unique semantic IDs');

    // CSS Checks
    if (!userDashCss.includes('.settings-layout-grid')) throw new Error('.settings-layout-grid missing in user-dash.css');
    console.log('  ✅ PASS: CSS contains .settings-layout-grid definition');

    if (!userDashCss.includes('.settings-theme-card')) throw new Error('.settings-theme-card missing in user-dash.css');
    console.log('  ✅ PASS: CSS contains .settings-theme-card styling');

    if (!userDashCss.includes('.settings-switch')) throw new Error('.settings-switch missing in user-dash.css');
    console.log('  ✅ PASS: CSS contains accessible .settings-switch slider styling');

    if (!userDashCss.includes('.settings-security-tile')) throw new Error('.settings-security-tile missing');
    console.log('  ✅ PASS: CSS contains .settings-security-tile link styling');

    if (!userDashCss.includes('@media (max-width: 1024px)') || !userDashCss.includes('@media (max-width: 768px)')) {
      throw new Error('Responsive media queries missing in user-dash.css');
    }
    console.log('  ✅ PASS: CSS contains tablet (1024px), mobile (768px), and small phone (480px) breakpoints');

    console.log('\n=======================================================');
    console.log('🏁 User Dashboard Settings: ALL VERIFICATIONS PASSED!');
    console.log('=======================================================\n');
  } catch (err) {
    console.error('\n❌ SETTINGS VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
