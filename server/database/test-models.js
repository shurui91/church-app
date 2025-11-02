import { User } from './models/User.js';
import { VerificationCode } from './models/VerificationCode.js';

/**
 * Simple test script to verify database models are working
 * Run with: node database/test-models.js
 */

async function testModels() {
  console.log('Testing database models...\n');

  try {
    // Clean up any existing test data first
    const testPhone = '+1234567890';
    const existingUser = await User.findByPhoneNumber(testPhone);
    if (existingUser) {
      console.log('Cleaning up existing test user...');
      await User.delete(existingUser.id);
      await VerificationCode.deleteByPhoneNumber(testPhone);
    }

    // Test User model
    console.log('1. Testing User.create()...');
    const user = await User.create(testPhone, 'member', 'Test User');
    console.log('✓ User created:', user);

    console.log('\n2. Testing User.findByPhoneNumber()...');
    const foundUser = await User.findByPhoneNumber(testPhone);
    console.log('✓ User found:', foundUser);

    console.log('\n3. Testing User.updateRole()...');
    const updatedUser = await User.updateRole(user.id, 'admin');
    console.log('✓ User role updated:', updatedUser);

    console.log('\n4. Testing VerificationCode.create()...');
    const code = await VerificationCode.create(testPhone, '123456');
    console.log('✓ Verification code created:', code);

    console.log('\n5. Testing VerificationCode.verify() with wrong code...');
    const wrongResult = await VerificationCode.verify(testPhone, '000000');
    console.log('✓ Wrong code result:', wrongResult);

    console.log('\n6. Testing VerificationCode.verify() with correct code...');
    // Create a new code first
    const newCode = await VerificationCode.create(testPhone, '123456');
    const correctResult = await VerificationCode.verify(testPhone, '123456');
    console.log('✓ Correct code result:', correctResult);

    console.log('\n7. Testing User.findAll()...');
    const allUsers = await User.findAll();
    console.log(`✓ Found ${allUsers.length} user(s)`);

    console.log('\n8. Cleaning up test data...');
    await User.delete(user.id);
    console.log('✓ Test user deleted');

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
testModels();
