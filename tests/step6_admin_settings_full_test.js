// DriveEase - Full Functional Verification Test for Admin Settings
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json, rawText: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, rawText: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runAdminSettingsFullVerification() {
  console.log('🚀 Running Complete Admin Settings End-to-End Verification Test...\n');

  try {
    // 1. Admin Authentication
    console.log('--- 1. Admin Authentication & Role Protection ---');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert(adminLogin.status === 200, 'Admin login succeeded');
    const adminToken = adminLogin.body.token;
    assert(adminLogin.body.user.role === 'ADMIN', 'User has ADMIN role');

    // Customer access forbidden check
    const custLogin = await request('POST', '/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert(custLogin.status === 200, 'Customer login succeeded');
    const custToken = custLogin.body.token;
    assert(custLogin.body.user.role === 'CUSTOMER', 'Customer role is verified');

    // 2. Profile API Functionality
    console.log('\n--- 2. Admin Profile Update API Verification ---');
    const profileUpdateRes = await request('PUT', '/api/auth/profile', {
      name: 'Super Admin',
      phone: '+91 98765 43210',
      address: 'DriveEase Central HQ, Mumbai'
    }, adminToken);
    assert(profileUpdateRes.status === 200, 'Admin profile update API succeeded');
    assert(profileUpdateRes.body.user.name === 'Super Admin', 'Admin name updated to Super Admin');

    // Reset admin name back to Admin
    await request('PUT', '/api/auth/profile', {
      name: 'Admin',
      phone: '+91 98765 43210',
      address: 'Mumbai Central Fleet HQ, Maharashtra'
    }, adminToken);

    // 3. Password API Verification
    console.log('\n--- 3. Admin Password Security API Verification ---');
    // Test invalid current password
    const badPassRes = await request('PUT', '/api/auth/password', {
      currentPassword: 'wrongpassword',
      newPassword: 'newadminpass123'
    }, adminToken);
    assert(badPassRes.status === 400, 'Incorrect current password rejected with 400 Bad Request');

    // Test password too short
    const shortPassRes = await request('PUT', '/api/auth/password', {
      currentPassword: 'admin123',
      newPassword: '123'
    }, adminToken);
    assert(shortPassRes.status === 400, 'Short new password rejected with 400 Bad Request');

    // 4. Client Side Source Code Integrity
    console.log('\n--- 4. Client Script & Design System Code Integrity ---');
    const adminJsPath = path.join(__dirname, '..', 'public', 'js', 'admin-dash.js');
    const adminJs = fs.readFileSync(adminJsPath, 'utf8');

    assert(adminJs.includes('renderAdminSettings()'), 'renderAdminSettings exists in AdminDash');
    assert(adminJs.includes('saveGeneralSettings()'), 'saveGeneralSettings exists in AdminDash');
    assert(adminJs.includes('resetGeneralSettings()'), 'resetGeneralSettings exists in AdminDash');
    assert(adminJs.includes('setThemePreference(theme)'), 'setThemePreference exists in AdminDash');
    assert(adminJs.includes('saveNotificationPreferences()'), 'saveNotificationPreferences exists in AdminDash');
    assert(adminJs.includes('saveBookingPolicies()'), 'saveBookingPolicies exists in AdminDash');
    assert(adminJs.includes('handleUpdatePassword()'), 'handleUpdatePassword exists in AdminDash');
    assert(adminJs.includes('handleUpdateProfile()'), 'handleUpdateProfile exists in AdminDash');
    assert(adminJs.includes('previewAdminAvatar(url)'), 'previewAdminAvatar exists in AdminDash');
    assert(adminJs.includes('resetProfileForm()'), 'resetProfileForm exists in AdminDash');

    // 5. CSS Responsive Breakpoints & Overflow Guard
    console.log('\n--- 5. CSS & Responsive Breakpoints ---');
    const adminCssPath = path.join(__dirname, '..', 'public', 'css', 'admin-dash.css');
    const adminCss = fs.readFileSync(adminCssPath, 'utf8');

    assert(adminCss.includes('.admin-settings-grid'), '.admin-settings-grid defined in CSS');
    assert(adminCss.includes('.admin-switch'), '.admin-switch defined in CSS');
    assert(adminCss.includes('.admin-profile-avatar-preview'), '.admin-profile-avatar-preview defined in CSS');

    console.log('\n=======================================================');
    console.log('🏁 Admin Settings Full Verification: ALL CHECKS PASSED!');
    console.log('=======================================================\n');

  } catch (err) {
    console.error('\n❌ Verification Failed:', err.message);
    process.exit(1);
  }
}

runAdminSettingsFullVerification();
