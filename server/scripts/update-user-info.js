// server/scripts/update-user-info.js
import { getCurrentTimestamp, getDatabase } from '../database/db.js';
import { initDatabase } from '../database/init.js';
import { User } from '../database/models/User.js';

/**
 * Batch update user information by phone number
 * Usage: node scripts/update-user-info.js
 * 
 * Edit the USER_UPDATES array below to specify which users to update and what fields to update.
 */

// ═══════════════════════════════════════════════════════════════
// 在这里定义要更新的用户信息
// ═══════════════════════════════════════════════════════════════
const USER_UPDATES = [
  {
    phoneNumber: '+15676983308',
    // 姓名相关
    nameZh: '刘书睿',        // 中文名
    nameEn: 'Aaron Liu',   // 英文名
    name: 'Aaron Liu',          // 兼容字段（可选）
    
    // 组织信息
    district: 'D',         // 大区
    groupNum: '亲子',         // 小组号
    
    // 联系信息
    email: 'shurui91@gmail.com',
    
    // 个人信息
    gender: 'male',        // 'male', 'female', 'other'
    birthdate: '1991-02-08',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '超级管理员',
  },
  {
    phoneNumber: '+15625199698',
    nameZh: '潘小麟',
    nameEn: 'Caroline Pan',
	name: 'Caroline Pan',          // 兼容字段（可选）
    district: 'Other',
    groupNum: null,
    email: 'pan@example.com',
    
    // 个人信息
    gender: 'female',        // 'male', 'female', 'other'
    birthdate: '1990-01-01',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '',
  },
  {
    phoneNumber: '+16262274460',
    nameZh: '刘云涛',
    nameEn: 'Kevin Liu',
	name: 'Kevin Liu',          // 兼容字段（可选）
    district: 'D',
    groupNum: '亲子',
    email: 'kevinliu@example.com',

	// 个人信息
    gender: 'male',        // 'male', 'female', 'other'
    birthdate: '1982-01-01',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '',
  },
  {
    phoneNumber: '+15622919164',
    nameZh: '伍玉涛',
    nameEn: 'Yutao Liu',
	name: 'Yutao Liu',          // 兼容字段（可选）
    district: 'D',
    groupNum: '亲子',
    email: 'yutaowu@example.com',

	// 个人信息
    gender: 'male',        // 'male', 'female', 'other'
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '',
  },
  {
    phoneNumber: '+16263999536',
    nameZh: '马崇博',
    nameEn: 'Chongbo Ma',
	name: 'Chongbo Ma',          // 兼容字段（可选）
    district: 'D',
    groupNum: '亲子',
    email: 'bo.ma@example.com',

	// 个人信息
    gender: 'male',        // 'male', 'female', 'other'
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '',
  },
  {
    phoneNumber: '+19495161377',
    nameZh: '陈旸',
    nameEn: 'Sunny Chen',
	name: 'Sunny Chen',          // 兼容字段（可选）
    district: 'D',
    groupNum: '亲子',
    email: 'sunny.chen@example.com',

	// 个人信息
    gender: 'female',        // 'male', 'female', 'other'
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    
    // 设置
    status: 'active',      // 'active', 'inactive', 'suspended'
    preferredLanguage: 'zh', // 'zh', 'en'
    notes: '',
  },
];

// ═══════════════════════════════════════════════════════════════

async function updateUsers() {
  try {
    await initDatabase();
    console.log('✓ Database initialized\n');

    const db = await getDatabase();
    const now = getCurrentTimestamp();

    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const update of USER_UPDATES) {
      const { phoneNumber, ...fields } = update;
      
      try {
        // 查找用户
        const user = await User.findByPhoneNumber(phoneNumber);
        
        if (!user) {
          console.log(`❌ User not found: ${phoneNumber}`);
          notFoundCount++;
          continue;
        }

        console.log(`\n📝 Updating user: ${phoneNumber} (ID: ${user.id})`);

        // 1. 更新姓名（使用现有的方法）
        if (fields.nameZh !== undefined || fields.nameEn !== undefined) {
          await User.updateNames(
            user.id,
            fields.nameZh !== undefined ? fields.nameZh : null,
            fields.nameEn !== undefined ? fields.nameEn : null
          );
          console.log(`  ✓ Updated names: nameZh="${fields.nameZh || '(unchanged)'}", nameEn="${fields.nameEn || '(unchanged)'}"`);
        }

        // 更新兼容字段 name（如果提供）
        if (fields.name !== undefined) {
          await User.updateName(user.id, fields.name);
          console.log(`  ✓ Updated name (legacy): "${fields.name}"`);
        }

        // 2. 更新大区和小组（使用现有的方法）
        if (fields.district !== undefined || fields.groupNum !== undefined) {
          await User.updateDistrictAndGroup(
            user.id,
            fields.district !== undefined ? fields.district : null,
            fields.groupNum !== undefined ? fields.groupNum : null
          );
          console.log(`  ✓ Updated district/group: district="${fields.district || '(unchanged)'}", groupNum="${fields.groupNum || '(unchanged)'}"`);
        }

        // 3. 更新其他字段（直接使用 SQL）
        const otherFields = ['email', 'gender', 'birthdate', 'joinDate', 'status', 'preferredLanguage', 'notes'];
        const updates = [];
        const values = [];

        for (const field of otherFields) {
          if (fields[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(fields[field]);
            console.log(`  ✓ Will update ${field}: "${fields[field]}"`);
          }
        }

        // 如果有其他字段需要更新，执行 SQL
        if (updates.length > 0) {
          updates.push('updatedAt = ?');
          values.push(now);
          values.push(user.id);

          const updateQuery = `
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = ?
          `;

          await db.run(updateQuery, values);
          console.log(`  ✓ Updated ${updates.length - 1} additional field(s)`);
        }

        // 验证更新结果
        const updatedUser = await User.findById(user.id);
        console.log(`  📋 Current info: nameZh="${updatedUser.nameZh || '(null)'}", nameEn="${updatedUser.nameEn || '(null)'}"`);
        if (fields.district !== undefined || fields.groupNum !== undefined) {
          console.log(`  📋 District: "${updatedUser.district || '(null)'}", Group: "${updatedUser.groupNum || '(null)'}"`);
        }

        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error updating user ${phoneNumber}:`, error.message);
        errorCount++;
      }
    }

    await db.close();

    console.log('\n' + '─'.repeat(60));
    console.log(`📊 更新统计:`);
    console.log(`   ✅ 已更新: ${updatedCount} 个用户`);
    console.log(`   ❌ 未找到: ${notFoundCount} 个用户`);
    console.log(`   ⚠️  错误: ${errorCount} 个用户`);
    console.log(`   📝 总计: ${USER_UPDATES.length} 个用户\n`);

    if (updatedCount > 0) {
      console.log('✅ 更新完成！');
      console.log('\n💡 提示: 运行 "node scripts/list-users.js" 查看所有用户的最新信息');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating users:', error);
    process.exit(1);
  }
}

updateUsers();

