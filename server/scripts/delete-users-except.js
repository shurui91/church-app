import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';

/**
 * Delete all users except the specified phone number
 * Usage: node scripts/delete-users-except.js <phoneNumber>
 */

async function deleteUsersExcept() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/delete-users-except.js <phoneNumber>');
    console.error('Example: node scripts/delete-users-except.js 5676983308');
    process.exit(1);
  }

  let phoneNumber = args[0];
  
  // Normalize phone number
  let digits = phoneNumber.replace(/\D/g, '');
  
  if (digits.length === 10) {
    phoneNumber = '+1' + digits;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    phoneNumber = '+' + digits;
  } else if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }

  console.log(`Keeping user with phone number: ${phoneNumber}`);
  console.log('Deleting all other users...\n');

  try {
    // Initialize database
    await initDatabase();

    // Get all users
    const allUsers = await User.findAll();
    
    if (allUsers.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    // Find the user to keep
    const userToKeep = await User.findByPhoneNumber(phoneNumber);
    
    if (!userToKeep) {
      console.log(`⚠️  Warning: User with phone number ${phoneNumber} not found.`);
      console.log('Will delete ALL users. Continue? (This cannot be undone)');
      // For safety, we'll still proceed but warn
    } else {
      console.log(`✅ Found user to keep:`);
      console.log(`   ID: ${userToKeep.id}`);
      console.log(`   Phone: ${userToKeep.phoneNumber}`);
      console.log(`   Name: ${userToKeep.name || 'N/A'}`);
      console.log(`   Role: ${userToKeep.role}`);
      console.log('');
    }

    let deletedCount = 0;
    let keptCount = 0;

    for (const user of allUsers) {
      if (user.phoneNumber === phoneNumber) {
        keptCount++;
        console.log(`Keeping: ${user.phoneNumber} (ID: ${user.id})`);
      } else {
        const deleted = await User.delete(user.id);
        if (deleted) {
          deletedCount++;
          console.log(`Deleted: ${user.phoneNumber} (ID: ${user.id})`);
        }
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Kept: ${keptCount} user(s)`);
    console.log(`   Deleted: ${deletedCount} user(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

deleteUsersExcept();
