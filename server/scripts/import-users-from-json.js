// server/scripts/import-users-from-json.js
import { User } from '../database/models/User.js';
import { initDatabase } from '../database/init.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import users from JSON file to database
 * Usage: node scripts/import-users-from-json.js [input-file]
 * Example: node scripts/import-users-from-json.js users-export.json
 */

async function importUsers() {
  try {
    // Determine input file
    const inputFile = process.argv[2] || path.join(__dirname, '../users-export.json');
    
    if (!fs.existsSync(inputFile)) {
      console.error(`\n❌ File not found: ${inputFile}`);
      console.error(`   Usage: node scripts/import-users-from-json.js <json-file>`);
      process.exit(1);
    }

    // Read and parse JSON file
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const exportData = JSON.parse(fileContent);

    if (!exportData.users || !Array.isArray(exportData.users)) {
      console.error('\n❌ Invalid JSON format. Expected object with "users" array.');
      process.exit(1);
    }

    console.log(`\n📥 Importing users from: ${inputFile}`);
    console.log(`   Exported at: ${exportData.exportedAt || 'unknown'}`);
    console.log(`   Total users in file: ${exportData.users.length}\n`);

    // Initialize database
    await initDatabase();

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userData of exportData.users) {
      try {
        // Check if user already exists
        const existingUser = await User.findByPhoneNumber(userData.phoneNumber);
        if (existingUser) {
          console.log(`⏭️  User ${userData.phoneNumber} already exists, skipping`);
          skippedCount++;
          continue;
        }

        // Create user with all fields
        const user = await User.create(
          userData.phoneNumber,
          userData.role || 'member',
          userData.name || null,
          userData.nameZh || null,
          userData.nameEn || null,
          userData.district || null,
          userData.groupNum || null,
          userData.email || null,
          userData.status || 'active',
          userData.gender || null,
          userData.birthdate || null,
          userData.joinDate || null,
          userData.preferredLanguage || 'zh',
          userData.notes || null
        );

        console.log(`✅ Imported: ${user.phoneNumber} - ${user.name || user.nameZh || user.nameEn || 'N/A'} (${user.role})`);
        importedCount++;
      } catch (error) {
        console.error(`❌ Error importing ${userData.phoneNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n─'.repeat(60));
    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Imported: ${importedCount} users`);
    console.log(`   ⏭️  Skipped (already exist): ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log(`   📝 Total: ${exportData.users.length} users\n`);

    // Show all users in database
    const allUsers = await User.findAll();
    console.log(`📋 Total users in database now: ${allUsers.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error importing users:', error);
    process.exit(1);
  }
}

importUsers();

