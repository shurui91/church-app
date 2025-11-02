// server/scripts/update-existing-users.js
import { initDatabase } from '../database/init.js';
import { getDatabase, getCurrentTimestamp } from '../database/db.js';
import { User } from '../database/models/User.js';

/**
 * Update existing users with default values for new fields
 * Usage: node scripts/update-existing-users.js
 */

async function updateExistingUsers() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✓ Database initialized\n');

    // Get all users
    const users = await User.findAll();
    console.log(`Found ${users.length} users in database\n`);

    if (users.length === 0) {
      console.log('No users to update.');
      process.exit(0);
    }

    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      let updatedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        // Check if user needs updates (if status or preferredLanguage is NULL)
        const needsUpdate = user.status === null || user.status === undefined || 
                           user.preferredLanguage === null || user.preferredLanguage === undefined;

        if (!needsUpdate) {
          console.log(`⏭️  User ${user.id} (${user.phoneNumber}) - already has all fields set, skipping`);
          skippedCount++;
          continue;
        }

        // Update user with default values
        const updates = [];
        const values = [];

        if (user.status === null || user.status === undefined) {
          updates.push('status = ?');
          values.push('active');
        }

        if (user.preferredLanguage === null || user.preferredLanguage === undefined) {
          updates.push('preferredLanguage = ?');
          values.push('zh');
        }

        // Always update updatedAt
        updates.push('updatedAt = ?');
        values.push(now);

        // Add user id for WHERE clause
        values.push(user.id);

        const updateQuery = `
          UPDATE users 
          SET ${updates.join(', ')} 
          WHERE id = ?
        `;

        await db.run(updateQuery, values);

        // Get updated user to verify
        const updatedUser = await User.findById(user.id);

        console.log(`✅ User ${user.id} (${user.phoneNumber}) - updated:`);
        if (user.status === null || user.status === undefined) {
          console.log(`   - status: null → 'active'`);
        }
        if (user.preferredLanguage === null || user.preferredLanguage === undefined) {
          console.log(`   - preferredLanguage: null → 'zh'`);
        }
        console.log(`   - Current fields: status=${updatedUser.status}, preferredLanguage=${updatedUser.preferredLanguage}`);
        console.log(`   - Other new fields: email=${updatedUser.email || '(null)'}, gender=${updatedUser.gender || '(null)'}, birthdate=${updatedUser.birthdate || '(null)'}, joinDate=${updatedUser.joinDate || '(null)'}, notes=${updatedUser.notes || '(null)'}\n`);

        updatedCount++;
      }

      console.log('─'.repeat(60));
      console.log(`\n📊 更新统计:`);
      console.log(`   ✅ 已更新: ${updatedCount} 个用户`);
      console.log(`   ⏭️  已跳过: ${skippedCount} 个用户`);
      console.log(`   📝 总计: ${users.length} 个用户\n`);

      // Show summary of all users
      console.log('📋 所有用户的字段状态:');
      console.log('─'.repeat(80));
      const allUsers = await User.findAll();
      allUsers.forEach(user => {
        console.log(`ID: ${user.id} | Phone: ${user.phoneNumber}`);
        console.log(`   status: ${user.status || '(null)'} | preferredLanguage: ${user.preferredLanguage || '(null)'}`);
        console.log(`   email: ${user.email || '(null)'} | gender: ${user.gender || '(null)'} | birthdate: ${user.birthdate || '(null)'}`);
        console.log(`   joinDate: ${user.joinDate || '(null)'} | notes: ${user.notes || '(null)'} | lastLoginAt: ${user.lastLoginAt || '(null)'}\n`);
      });

    } finally {
      await db.close();
    }

    console.log('✅ 更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating users:', error);
    process.exit(1);
  }
}

updateExistingUsers();

