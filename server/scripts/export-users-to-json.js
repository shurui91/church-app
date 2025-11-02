// server/scripts/export-users-to-json.js
import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Export all users from database to JSON file
 * Usage: node scripts/export-users-to-json.js [output-file]
 * Example: node scripts/export-users-to-json.js users-export.json
 */

async function exportUsers() {
  try {
    await initDatabase();
    
    const users = await User.findAll();
    
    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    // Export data (exclude sensitive fields if needed)
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalUsers: users.length,
      users: users.map(user => ({
        phoneNumber: user.phoneNumber,
        name: user.name || null,
        nameZh: user.nameZh || null,
        nameEn: user.nameEn || null,
        role: user.role,
        district: user.district || null,
        groupNum: user.groupNum || null,
        email: user.email || null,
        status: user.status || 'active',
        gender: user.gender || null,
        birthdate: user.birthdate || null,
        joinDate: user.joinDate || null,
        preferredLanguage: user.preferredLanguage || 'zh',
        notes: user.notes || null,
        // Note: createdAt and updatedAt will be set to current time on import
      })),
    };

    // Determine output file
    const outputFile = process.argv[2] || path.join(__dirname, '../users-export.json');
    
    // Write JSON file
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log(`\n✅ Exported ${users.length} users to: ${outputFile}\n`);
    console.log('📋 Users exported:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.phoneNumber} - ${user.name || user.nameZh || user.nameEn || 'N/A'} (${user.role})`);
    });
    
    console.log(`\n💡 To import to Railway:`);
    console.log(`   1. Copy ${outputFile} to Railway (via Railway Shell upload or git commit)`);
    console.log(`   2. In Railway Shell, run: node scripts/import-users-from-json.js ${path.basename(outputFile)}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error exporting users:', error);
    process.exit(1);
  }
}

exportUsers();

