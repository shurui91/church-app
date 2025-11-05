import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';

/**
 * Add Joanne Zhang as a new user
 */

async function addUser() {
  try {
    await initDatabase();
    
    const phoneNumber = '+18586634856';
    
    // Check if user already exists
    const existingUser = await User.findByPhoneNumber(phoneNumber);
    if (existingUser) {
      console.log('\n❌ User already exists:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Name: ${existingUser.nameZh || existingUser.nameEn || existingUser.name || 'N/A'}`);
      console.log(`   Role: ${existingUser.role}`);
      process.exit(1);
    }
    
    // Create user with all fields
    const user = await User.create(
      phoneNumber,      // phoneNumber
      'usher',          // role
      'Joanne Zhang',   // name (legacy)
      '张娟',           // nameZh
      'Joanne Zhang',   // nameEn
      'A',              // district
      '4',              // groupNum
      null,             // email
      'active',         // status
      null,             // gender
      null,             // birthdate
      null,             // joinDate
      'zh',             // preferredLanguage
      null              // notes
    );
    
    console.log('\n✅ User created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   Name (legacy): ${user.name || 'N/A'}`);
    console.log(`   Name (Chinese): ${user.nameZh || 'N/A'}`);
    console.log(`   Name (English): ${user.nameEn || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   District: ${user.district || 'N/A'}`);
    console.log(`   Group Number: ${user.groupNum || 'N/A'}`);
    console.log(`   Created: ${user.createdAt}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addUser();

