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

    console.log('Users in database:');
    console.log('─'.repeat(100));
    console.log('ID\tPhone Number\t\tNameZh\t\tNameEn\t\tDistrict\tGroupNum\tRole');
    console.log('─'.repeat(100));

    users.forEach((user) => {
      const id = user.id.toString().padEnd(4);
      const phone = (user.phoneNumber || '').padEnd(18);
      const nameZh = (user.nameZh || user.name || 'N/A').padEnd(12).substring(0, 12);
      const nameEn = (user.nameEn || 'N/A').padEnd(12).substring(0, 12);
      const district = (user.district || 'N/A').padEnd(10).substring(0, 10);
      const groupNum = (user.groupNum || 'N/A').padEnd(10).substring(0, 10);
      const role = user.role || 'N/A';
      console.log(`${id}\t${phone}\t${nameZh}\t${nameEn}\t${district}\t${groupNum}\t${role}`);
    });

    console.log('─'.repeat(80));
    console.log(`\nPhone number formats:`);
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
