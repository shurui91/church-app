import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';

/**
 * Add a new user to the database
 * Usage: node scripts/add-user.js <phoneNumber> [role] [name]
 */

async function addUser() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/add-user.js <phoneNumber> [role] [name]');
    console.error('Example: node scripts/add-user.js +15676983308 member "John Doe"');
    process.exit(1);
  }

  let phoneNumber = args[0];
  const role = args[1] || 'member';
  const name = args[2] || null;

  // Normalize phone number
  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');
  
  // Handle US phone numbers
  if (digits.length === 10) {
    phoneNumber = '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    phoneNumber = '+' + digits;
  } else if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }

  console.log(`Adding user with phone number: ${phoneNumber}`);
  console.log(`Role: ${role}`);
  if (name) {
    console.log(`Name: ${name}`);
  }

  try {
    // Initialize database
    await initDatabase();

    // Check if user already exists
    const existingUser = await User.findByPhoneNumber(phoneNumber);
    if (existingUser) {
      console.log(`\n❌ User with phone number ${phoneNumber} already exists:`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.name || 'N/A'}`);
      console.log(`   Role: ${existingUser.role}`);
      process.exit(1);
    }

    // Create user
    const user = await User.create(phoneNumber, role, name);

    console.log(`\n✅ User created successfully!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    process.exit(1);
  }
}

addUser();
