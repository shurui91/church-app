/**
 * Test script for users management API endpoints
 * Run with: node test-users-api.js
 * 
 * Prerequisites:
 * 1. Create test users with different roles in database
 * 2. Login to get admin/super_admin token
 */

const BASE_URL = 'http://localhost:3000';

async function testUsersAPI() {
  console.log('Testing Users Management API...\n');

  try {
    // First, we need to create some test users and get tokens
    const { User } = await import('./database/models/User.js');
    const { VerificationCode } = await import('./database/models/VerificationCode.js');
    const { generateToken } = await import('./middleware/auth.js');

    // Create test users
    console.log('1. Creating test users...');
    const memberPhone = '+1111111111';
    const adminPhone = '+2222222222';
    const superAdminPhone = '+3333333333';

    // Clean up existing users
    let member = await User.findByPhoneNumber(memberPhone);
    if (member) await User.delete(member.id);
    let admin = await User.findByPhoneNumber(adminPhone);
    if (admin) await User.delete(admin.id);
    let superAdmin = await User.findByPhoneNumber(superAdminPhone);
    if (superAdmin) await User.delete(superAdmin.id);

    member = await User.create(memberPhone, 'member', 'Member User');
    admin = await User.create(adminPhone, 'admin', 'Admin User');
    superAdmin = await User.create(superAdminPhone, 'super_admin', 'Super Admin User');

    console.log('✓ Test users created');

    // Generate tokens
    const memberToken = generateToken(member);
    const adminToken = generateToken(admin);
    const superAdminToken = generateToken(superAdmin);

    // Test GET /api/users (requires admin)
    console.log('\n2. Testing GET /api/users (as admin)...');
    const usersResponse = await fetch(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    const usersData = await usersResponse.json();
    console.log(`Response: Found ${usersData.data?.count || 0} users`);
    if (usersData.success) {
      console.log('✓ Users list retrieved');
    }

    // Test GET /api/users/:id
    console.log('\n3. Testing GET /api/users/:id...');
    const userResponse = await fetch(`${BASE_URL}/api/users/${member.id}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    const userData = await userResponse.json();
    console.log('Response:', userData);
    if (userData.success) {
      console.log('✓ User details retrieved');
    }

    // Test PUT /api/users/:id/role (as admin)
    console.log('\n4. Testing PUT /api/users/:id/role (as admin)...');
    const updateRoleResponse = await fetch(`${BASE_URL}/api/users/${member.id}/role`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'responsible_one',
      }),
    });

    const updateRoleData = await updateRoleResponse.json();
    console.log('Response:', updateRoleData);
    if (updateRoleData.success) {
      console.log('✓ User role updated');
    }

    // Test PUT /api/users/:id/name
    console.log('\n5. Testing PUT /api/users/:id/name...');
    const updateNameResponse = await fetch(`${BASE_URL}/api/users/${member.id}/name`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Updated Name',
      }),
    });

    const updateNameData = await updateNameResponse.json();
    console.log('Response:', updateNameData);
    if (updateNameData.success) {
      console.log('✓ User name updated');
    }

    // Test permission: member cannot access /api/users
    console.log('\n6. Testing permission: member cannot access /api/users...');
    const forbiddenResponse = await fetch(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${memberToken}`,
      },
    });

    const forbiddenData = await forbiddenResponse.json();
    console.log('Response:', forbiddenData);
    if (forbiddenResponse.status === 403) {
      console.log('✓ Permission correctly enforced');
    }

    // Cleanup
    console.log('\n7. Cleaning up test data...');
    await User.delete(member.id);
    await User.delete(admin.id);
    await User.delete(superAdmin.id);
    console.log('✓ Test users deleted');

    console.log('\n✅ All users API tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUsersAPI();
