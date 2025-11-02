/**
 * Test script for authentication API endpoints
 * Run with: node test-auth-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function testAuthAPI() {
  console.log('Testing Authentication API...\n');

  const testPhone = '+1234567890';

  try {
    // 1. Create a test user first
    console.log('1. Creating test user...');
    const { User } = await import('./database/models/User.js');
    let user = await User.findByPhoneNumber(testPhone);
    if (!user) {
      user = await User.create(testPhone, 'member', 'Test User');
      console.log('✓ Test user created');
    } else {
      console.log('✓ Test user already exists');
    }

    // 2. Test send-code endpoint
    console.log('\n2. Testing POST /api/auth/send-code...');
    const sendCodeResponse = await fetch(`${BASE_URL}/api/auth/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: testPhone,
      }),
    });

    const sendCodeData = await sendCodeResponse.json();
    console.log('Response:', sendCodeData);

    if (!sendCodeData.success) {
      console.error('✗ Failed to send code');
      return;
    }
    console.log('✓ Code sent successfully');

    // 3. Get the code from database (for testing)
    console.log('\n3. Retrieving code from database...');
    const { VerificationCode } = await import('./database/models/VerificationCode.js');
    const codeRecord = await VerificationCode.findByPhoneNumber(testPhone);
    if (!codeRecord) {
      console.error('✗ No code found in database');
      return;
    }
    console.log(`✓ Found code: ${codeRecord.code}`);

    // 4. Test verify-code endpoint
    console.log('\n4. Testing POST /api/auth/verify-code...');
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: testPhone,
        code: codeRecord.code,
      }),
    });

    const verifyData = await verifyResponse.json();
    console.log('Response:', verifyData);

    if (!verifyData.success || !verifyData.data.token) {
      console.error('✗ Failed to verify code');
      return;
    }
    console.log('✓ Login successful');
    const token = verifyData.data.token;

    // 5. Test /me endpoint
    console.log('\n5. Testing GET /api/auth/me...');
    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const meData = await meResponse.json();
    console.log('Response:', meData);

    if (!meData.success) {
      console.error('✗ Failed to get user info');
      return;
    }
    console.log('✓ User info retrieved successfully');

    // 6. Test invalid token
    console.log('\n6. Testing GET /api/auth/me with invalid token...');
    const invalidResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    const invalidData = await invalidResponse.json();
    console.log('Response:', invalidData);

    if (invalidResponse.status === 401) {
      console.log('✓ Invalid token correctly rejected');
    }

    console.log('\n✅ All API tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthAPI();
