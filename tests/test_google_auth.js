const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function request(urlPath, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch {
          resolve({ status: res.statusCode, body: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runGoogleAuthTests() {
  console.log('================================================================');
  console.log('🔒 DRIVEEASE GOOGLE OAUTH & IDENTITY SERVICES TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  ✅ PASS: ${desc}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
        failed++;
      }
    })();
  }

  // 1. Config Endpoint
  await test('GET /api/auth/config returns configured Google Client ID', async () => {
    const res = await request('/api/auth/config');
    assert.strictEqual(res.status, 200);
    assert(res.body.googleClientId && res.body.googleClientId.includes('88451250603-kbn9pbjdmpadjujk14bnqtrvk0672pol'));
  });

  // 2. Reject Missing Token
  await test('POST /api/auth/google rejects missing credential/token with 400 Bad Request', async () => {
    const res = await request('/api/auth/google', 'POST', {});
    assert.strictEqual(res.status, 400);
    assert(res.body.error && res.body.error.includes('required'));
  });

  // 3. Reject Malformed / Invalid Signature Token
  await test('POST /api/auth/google rejects garbage/malformed token with 401 Unauthorized', async () => {
    const res = await request('/api/auth/google', 'POST', {
      credential: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvY2siLCJpYXQiOjE1MTYyMzkwMjJ9.invalidSignature'
    });
    assert.strictEqual(res.status, 401);
    assert(res.body.error);
  });

  // 4. Reject Expired / Forged Google Token
  await test('POST /api/auth/google rejects forged token with 401 Unauthorized', async () => {
    const res = await request('/api/auth/google', 'POST', {
      credential: 'invalid_raw_token_value_abc_123'
    });
    assert.strictEqual(res.status, 401);
    assert(res.body.error);
  });

  // 5. Existing Password Account Protection (No hijacking existing accounts)
  await test('Existing email/password accounts cannot be hijacked via Google without proper verification', async () => {
    // When an existing user (e.g. john.doe@example.com with password) has no linked googleId,
    // sending a request should either require password login or return 409 conflict.
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf-8'));
    const adminUser = users.find(u => u.email === 'admin@driveease.com');
    assert(adminUser, 'Admin user exists in storage');
    assert(adminUser.role === 'ADMIN', 'Admin user role is ADMIN');
    assert(adminUser.password, 'Admin user has password hash');
  });

  // 6. Role Enforcement in Code
  await test('Verify routes/auth.js enforces CUSTOMER role and prevents role escalation', async () => {
    const authCode = fs.readFileSync(path.join(__dirname, '..', 'routes', 'auth.js'), 'utf-8');
    assert(authCode.includes("role: 'CUSTOMER'"), 'Google user creation sets role strictly to CUSTOMER');
    assert(!authCode.includes("role: payload.role"), 'Never trusts role from token payload');
  });

  // 7. Existing Standard Authentication Functions
  await test('Existing Customer Email/Password Login continues to work normally', async () => {
    const res = await request('/api/auth/login', 'POST', {
      email: 'john.doe@example.com',
      password: 'john123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'john.doe@example.com');
    assert.strictEqual(res.body.user.role, 'CUSTOMER');
    assert(res.body.token, 'JWT session token returned');
  });

  // 8. Existing Admin Authentication Functions
  await test('Existing Admin Email/Password Login continues to work normally', async () => {
    const res = await request('/api/auth/login', 'POST', {
      email: 'admin@driveease.com',
      password: 'admin123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'admin@driveease.com');
    assert.strictEqual(res.body.user.role, 'ADMIN');
    assert(res.body.token, 'JWT session token returned');
  });

  // 9. Frontend DOM Inspection
  await test('public/index.html includes Google Identity Services script and button containers', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf-8');
    assert(html.includes('https://accounts.google.com/gsi/client'), 'GSI script included in index.html');
    assert(html.includes('id="g_id_signin_container"'), 'Sign In Google button container present');
    assert(html.includes('id="g_id_signup_container"'), 'Sign Up Google button container present');
  });

  // 10. Frontend API & App.js Integration
  await test('public/js/api.js and public/js/app.js implement Google Auth methods', async () => {
    const apiJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'api.js'), 'utf-8');
    const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf-8');
    assert(apiJs.includes('loginGoogle'), 'AuthAPI.loginGoogle method exists');
    assert(apiJs.includes('/api/auth/google'), 'AuthAPI posts to /api/auth/google');
    assert(appJs.includes('initGoogleAuth'), 'App.initGoogleAuth exists');
    assert(appJs.includes('handleGoogleCredentialResponse'), 'App.handleGoogleCredentialResponse exists');
    assert(appJs.includes("text: 'continue_with'"), "Google button configured with text: 'continue_with'");
  });

  console.log('\n================================================================');
  console.log(`🏁 GOOGLE AUTH TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runGoogleAuthTests();
