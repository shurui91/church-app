import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';

/**
 * List all users in the database
 * Usage: node scripts/list-users.js
 */

async function listUsers() {
  try {
    // Initialize database
    await initDatabase();

    // Get all users
    const users = await User.findAll();

    console.log(`\nTotal users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    // Display summary table
    console.log('Users in database (Summary):');
    console.log('─'.repeat(120));
    console.log('ID\tPhone Number\t\tNameZh\t\tNameEn\t\tDistrict\tGroupNum\tRole\t\tStatus\t\tLanguage');
    console.log('─'.repeat(120));

    users.forEach((user) => {
      const id = user.id.toString().padEnd(4);
      const phone = (user.phoneNumber || '').padEnd(18);
      const nameZh = (user.nameZh || user.name || 'N/A').padEnd(12).substring(0, 12);
      const nameEn = (user.nameEn || 'N/A').padEnd(12).substring(0, 12);
      const district = (user.district || 'N/A').padEnd(10).substring(0, 10);
      const groupNum = (user.groupNum || 'N/A').padEnd(10).substring(0, 10);
      const role = (user.role || 'N/A').padEnd(10).substring(0, 10);
      const status = (user.status || 'N/A').padEnd(10).substring(0, 10);
      const language = (user.preferredLanguage || 'N/A').padEnd(8).substring(0, 8);
      console.log(`${id}\t${phone}\t${nameZh}\t${nameEn}\t${district}\t${groupNum}\t${role}\t${status}\t${language}`);
    });

    console.log('─'.repeat(120));
    
    // Display detailed information for each user
    console.log(`\n📋 Detailed User Information:\n`);
    users.forEach((user, index) => {
      console.log(`User ${index + 1}: ID=${user.id}`);
      console.log(`  📱 Phone: ${user.phoneNumber || 'N/A'}`);
      console.log(`  👤 Names:`);
      console.log(`     - Name (legacy): ${user.name || '(null)'}`);
      console.log(`     - Name (中文): ${user.nameZh || '(null)'}`);
      console.log(`     - Name (English): ${user.nameEn || '(null)'}`);
      console.log(`  🏢 Organization:`);
      console.log(`     - Role: ${user.role || 'N/A'}`);
      console.log(`     - District: ${user.district || '(null)'}`);
      console.log(`     - Group Number: ${user.groupNum || '(null)'}`);
      console.log(`  📧 Contact:`);
      console.log(`     - Email: ${user.email || '(null)'}`);
      console.log(`  👤 Personal Info:`);
      console.log(`     - Gender: ${user.gender || '(null)'}`);
      console.log(`     - Birthdate: ${user.birthdate || '(null)'}`);
      console.log(`     - Join Date: ${user.joinDate || '(null)'}`);
      console.log(`  ⚙️  Settings:`);
      console.log(`     - Status: ${user.status || '(null)'}`);
      console.log(`     - Preferred Language: ${user.preferredLanguage || '(null)'}`);
      console.log(`     - Last Login: ${user.lastLoginAt || '(null)'}`);
      console.log(`  📝 Notes: ${user.notes || '(null)'}`);
      console.log(`  📅 Timestamps:`);
      console.log(`     - Created: ${user.createdAt || 'N/A'}`);
      console.log(`     - Updated: ${user.updatedAt || 'N/A'}`);
      console.log('');
    });

    console.log(`\n📊 Phone number formats:`);
    const formats = users.map(u => u.phoneNumber).filter(Boolean);
    formats.forEach((phone, index) => {
      console.log(`  ${index + 1}. ${phone}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error listing users:', error.message);
    process.exit(1);
  }
}

listUsers();
