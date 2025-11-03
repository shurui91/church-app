import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

async function verifyAttendanceTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log(`\n📊 验证 attendance 表结构和关联关系\n`);
      console.log(`数据库路径: ${DB_PATH}\n`);
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Check if attendance table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'", (err, row) => {
      if (err) {
        console.error('❌ Error checking attendance table:', err);
        db.close();
        reject(err);
        return;
      }

      if (!row) {
        console.error('❌ Attendance table does not exist!');
        db.close();
        reject(new Error('Attendance table does not exist'));
        return;
      }

      console.log('✓ Attendance table exists\n');

      // Get table structure
      console.log('📋 表结构:');
      db.all("PRAGMA table_info(attendance)", (err, columns) => {
        if (err) {
          console.error('❌ Error getting table info:', err);
          db.close();
          reject(err);
          return;
        }

        columns.forEach(col => {
          const nullable = col.notnull === 0 ? 'NULL' : 'NOT NULL';
          const pk = col.pk === 1 ? ' (PRIMARY KEY)' : '';
          const defaultValue = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
          console.log(`  - ${col.name}: ${col.type} ${nullable}${defaultValue}${pk}`);
        });

        // Check foreign keys
        console.log('\n🔗 外键关系:');
        db.all("PRAGMA foreign_key_list(attendance)", (err, fkList) => {
          if (err) {
            console.error('❌ Error checking foreign keys:', err);
          } else if (fkList && fkList.length > 0) {
            fkList.forEach(fk => {
              console.log(`  ✓ createdBy → users(${fk.to})`);
              console.log(`    - On Delete: ${fk.on_delete || 'NO ACTION'}`);
              console.log(`    - On Update: ${fk.on_update || 'NO ACTION'}`);
            });
          } else {
            console.log('  ⚠️  未找到外键约束（请检查是否启用了 FOREIGN KEYS）');
          }

          // Check indexes
          console.log('\n📑 索引:');
          db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='attendance'", (err, indexes) => {
            if (err) {
              console.error('❌ Error checking indexes:', err);
            } else if (indexes && indexes.length > 0) {
              indexes.forEach(idx => {
                if (!idx.name.startsWith('sqlite_autoindex')) {
                  console.log(`  ✓ ${idx.name}`);
                }
              });
            } else {
              console.log('  ⚠️  未找到索引');
            }

            // Check unique constraint
            console.log('\n🔒 唯一约束:');
            db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance'", (err, tables) => {
              if (err) {
                console.error('❌ Error checking constraints:', err);
              } else if (tables && tables.length > 0) {
                const sql = tables[0].sql || '';
                if (sql.includes('UNIQUE(date, meetingType, createdBy)')) {
                  console.log('  ✓ UNIQUE(date, meetingType, createdBy) - 确保同一用户同一日期同一类型只有一条记录');
                } else {
                  console.log('  ⚠️  未找到唯一约束');
                }
              }

              // Count records
              db.get("SELECT COUNT(*) as count FROM attendance", (err, result) => {
                if (err) {
                  console.error('❌ Error counting records:', err);
                } else {
                  console.log(`\n📈 当前记录数: ${result.count}`);
                }

                db.close();
                console.log('\n✅ 验证完成\n');
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

// Run verification
verifyAttendanceTable()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });

