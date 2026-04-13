import { initDatabase } from '../database/init.js';
import { User } from '../database/models/User.js';
import { normalizePhoneNumber, validatePhoneNumber } from '../services/sms.js';

/**
 * Normalize all users' phone numbers to E.164.
 * Usage: node server/scripts/normalize-user-phone-numbers.js
 */
async function normalizeUserPhones() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');

    const users = await User.findAll();
    console.log(`ℹ️  Found ${users.length} users in database`);

    if (users.length === 0) {
      console.log('⚠️  No users to process');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    let invalid = 0;
    let conflicts = 0;

    for (const user of users) {
      const currentPhone = user.phoneNumber ?? '';
      if (!currentPhone) {
        console.log(`⏭️  User ${user.id} has no phone number, skipping`);
        skipped++;
        continue;
      }

      const normalized = normalizePhoneNumber(currentPhone);
      if (!validatePhoneNumber(normalized)) {
        console.warn(
          `⚠️  User ${user.id} 的手机号不能转成有效的 E.164：当前值 ${currentPhone} ⇒ ${normalized}`
        );
        invalid++;
        continue;
      }

      if (normalized === currentPhone) {
        skipped++;
        continue;
      }

      const existingUser = await User.findByPhoneNumber(normalized);
      if (existingUser && existingUser.id !== user.id) {
        console.warn(
          `❌  用户 ${user.id} (${currentPhone}) 的归一化结果 ${normalized} 已被用户 ${existingUser.id} 使用，跳过`
        );
        conflicts++;
        continue;
      }

      await User.updateById(user.id, { phonenumber: normalized });
      console.log(`✅  User ${user.id} 手机号 ${currentPhone} → ${normalized}`);
      updated++;
    }

    console.log('─'.repeat(60));
    console.log('📊 归一化结果：');
    console.log(`   ✅ 已更新: ${updated}`);
    console.log(`   ⏭️  已跳过: ${skipped}`);
    console.log(`   ⚠️  非法号码: ${invalid}`);
    console.log(`   ❌  冲突: ${conflicts}`);
    console.log('✅ 任务完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 归一化失败:', error);
    process.exit(1);
  }
}

normalizeUserPhones();
