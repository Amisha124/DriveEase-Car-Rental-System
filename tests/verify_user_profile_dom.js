const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING USER DASHBOARD PHASE 7 (MY PROFILE) VERIFICATION ===\n');

  try {
    // 1. Authenticate customer
    console.log('1. Authenticating test customer (john.doe@example.com)...');
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
    const initialUser = loginData.user;
    console.log(`   ✓ Authenticated as: ${initialUser.name} (${initialUser.email})`);
    console.log(`   ✓ Membership Tier: ${initialUser.membership}`);
    console.log(`   ✓ License Number: ${initialUser.licenseNumber}`);

    // 2. Fetch authenticated profile via GET /api/auth/me
    console.log('\n2. Testing GET /api/auth/me...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (!meRes.ok || !meData.user || meData.user.email !== 'john.doe@example.com') {
      throw new Error('GET /api/auth/me failed to return current authenticated user');
    }
    console.log('   ✓ Verified GET /api/auth/me returns accurate profile');

    // 3. Test Profile Update API (PUT /api/auth/profile)
    console.log('\n3. Testing PUT /api/auth/profile with valid updates...');
    const updatePayload = {
      name: 'Johnathan Doe',
      phone: '+91 98234 56789',
      address: 'Penthouse 14, Bandra West, Mumbai 400050',
      licenseNumber: 'MH-01-2018-0094821',
      licenseExpiry: '2032-12-31',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    };

    const updateRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok) throw new Error('Profile update failed: ' + updateData.error);

    if (updateData.user.name !== 'Johnathan Doe' || updateData.user.address !== updatePayload.address) {
      throw new Error('PUT /api/auth/profile did not persist updated values');
    }
    console.log(`   ✓ Profile updated successfully. Returned Name: ${updateData.user.name}`);
    console.log(`   ✓ Profile Completion calculated: ${updateData.user.profileCompletion}%`);

    // 4. Test validation of empty name (Backend rejection)
    console.log('\n4. Testing backend rejection of invalid empty name...');
    const emptyNameRes = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: '   ' })
    });
    const emptyNameData = await emptyNameRes.json();
    if (emptyNameRes.status === 400) {
      console.log(`   ✓ Backend correctly returned 400: ${emptyNameData.error}`);
    } else {
      throw new Error('Backend should have rejected empty name with 400, got: ' + emptyNameRes.status);
    }

    // 5. Test Password Update API (PUT /api/auth/password) with incorrect current password
    console.log('\n5. Testing PUT /api/auth/password with incorrect current password...');
    const wrongPassRes = await fetch(`${BASE_URL}/api/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'wrongpassword999',
        newPassword: 'johnnewpassword123'
      })
    });
    const wrongPassData = await wrongPassRes.json();
    if (wrongPassRes.status === 400) {
      console.log(`   ✓ Backend correctly rejected wrong password with 400: ${wrongPassData.error}`);
    } else {
      throw new Error('Backend should have rejected incorrect password with 400, got: ' + wrongPassRes.status);
    }

    // 6. Test Password Update with short password (< 6 chars)
    console.log('\n6. Testing PUT /api/auth/password with short password (< 6 chars)...');
    const shortPassRes = await fetch(`${BASE_URL}/api/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'john123',
        newPassword: '123'
      })
    });
    const shortPassData = await shortPassRes.json();
    if (shortPassRes.status === 400) {
      console.log(`   ✓ Backend correctly rejected short password with 400: ${shortPassData.error}`);
    } else {
      throw new Error('Backend should have rejected short password with 400, got: ' + shortPassRes.status);
    }

    // 7. Test valid password update
    console.log('\n7. Testing PUT /api/auth/password with valid credentials...');
    const validPassRes = await fetch(`${BASE_URL}/api/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'john123',
        newPassword: 'johnnewpassword123'
      })
    });
    const validPassData = await validPassRes.json();
    if (!validPassRes.ok) throw new Error('Password update failed: ' + validPassData.error);
    console.log(`   ✓ Password updated: ${validPassData.message}`);

    // 8. Verify login works with new password
    console.log('\n8. Testing login with newly set password...');
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'johnnewpassword123'
      })
    });
    const newLoginData = await newLoginRes.json();
    if (!newLoginRes.ok) throw new Error('Login with new password failed: ' + newLoginData.error);
    console.log(`   ✓ Successfully logged in with new password. Token received: ${Boolean(newLoginData.token)}`);

    // 9. Restore password back to john123 for test environment consistency
    console.log('\n9. Reverting password back to standard test password (john123)...');
    const revertPassRes = await fetch(`${BASE_URL}/api/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newLoginData.token}`
      },
      body: JSON.stringify({
        currentPassword: 'johnnewpassword123',
        newPassword: 'john123'
      })
    });
    const revertPassData = await revertPassRes.json();
    if (!revertPassRes.ok) throw new Error('Revert password failed: ' + revertPassData.error);
    console.log('   ✓ Password restored successfully.');

    // 10. Restore profile name back to John Doe
    console.log('\n10. Restoring profile data back to original state...');
    await fetch(`${BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'John Doe',
        phone: '+91 98234 56789',
        address: 'Bandra West, Mumbai 400050',
        licenseNumber: 'MH-01-2018-0094821',
        licenseExpiry: '2030-12-31',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
      })
    });
    console.log('   ✓ Original profile data restored.');

    console.log('\n=== ALL PHASE 7 (MY PROFILE) API VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
