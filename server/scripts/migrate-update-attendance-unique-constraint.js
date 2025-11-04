import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - should match init.js
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

console.log(`\n📦 Migrating attendance table to update UNIQUE constraint...`);
console.log(`📂 Database path: ${DB_PATH}\n`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database\n');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Check if attendance table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'", (err, row) => {
  if (err) {
    console.error('❌ Error checking attendance table:', err);
    db.close();
    process.exit(1);
  }

  if (!row) {
    console.error(`\n❌ Error: attendance table does not exist in database at ${DB_PATH}`);
    console.error('Please run init.js first to create the attendance table.\n');
    db.close();
    process.exit(1);
  }

  console.log('✅ Attendance table exists\n');

  // Get current table structure
  db.all("PRAGMA table_info(attendance)", (err, columns) => {
    if (err) {
      console.error('❌ Error getting table info:', err);
      db.close();
      process.exit(1);
    }

    // Check if scope and scopeValue columns exist
    const hasScope = columns.some(col => col.name === 'scope');
    const hasScopeValue = columns.some(col => col.name === 'scopeValue');

    if (!hasScope || !hasScopeValue) {
      console.error('❌ Error: scope or scopeValue columns do not exist.');
      console.error('Please run migrate-add-attendance-scope.js first.\n');
      db.close();
      process.exit(1);
    }

    console.log('✅ Required columns exist\n');

    // SQLite doesn't support directly modifying UNIQUE constraints
    // We need to:
    // 1. Create a new table with the new constraint
    // 2. Copy data from old table
    // 3. Drop old table
    // 4. Rename new table

    console.log('📝 Step 1: Creating new table with updated UNIQUE constraint...\n');

    // Create new table without UNIQUE constraint (logic handled in application layer)
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meetingType TEXT NOT NULL CHECK(meetingType IN ('table', 'homeMeeting', 'prayer')),
        scope TEXT NOT NULL CHECK(scope IN ('full_congregation', 'district', 'small_group')),
        scopeValue TEXT,
        adultCount INTEGER NOT NULL CHECK(adultCount >= 0),
        youthChildCount INTEGER NOT NULL CHECK(youthChildCount >= 0),
        createdBy INTEGER NOT NULL,
        district TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('❌ Error creating new table:', err);
        db.close();
        process.exit(1);
      }
      console.log('✅ New table created\n');

      console.log('📝 Step 2: Copying data from old table to new table...\n');
      
      // Copy data, handling duplicates:
      // - For full_congregation: Keep all records (allow multiple)
      // - For small_group/district: Keep only the most recent one per (date, meetingType, scope, scopeValue)
      db.run(`
        INSERT INTO attendance_new (
          id, date, meetingType, scope, scopeValue, adultCount, youthChildCount,
          createdBy, district, notes, createdAt, updatedAt
        )
        SELECT 
          a1.id, a1.date, a1.meetingType, a1.scope, a1.scopeValue, a1.adultCount, a1.youthChildCount,
          a1.createdBy, a1.district, a1.notes, a1.createdAt, a1.updatedAt
        FROM attendance a1
        WHERE a1.scope = 'full_congregation'
        OR (
          a1.scope != 'full_congregation'
          AND a1.id = (
            SELECT a2.id 
            FROM attendance a2
            WHERE a2.date = a1.date 
              AND a2.meetingType = a1.meetingType 
              AND a2.scope = a1.scope
              AND (a2.scopeValue = a1.scopeValue OR (a2.scopeValue IS NULL AND a1.scopeValue IS NULL))
            ORDER BY a2.updatedAt DESC
            LIMIT 1
          )
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error copying data:', err);
          // Drop new table on error
          db.run('DROP TABLE IF EXISTS attendance_new', () => {
            db.close();
            process.exit(1);
          });
          return;
        }

        db.get('SELECT COUNT(*) as count FROM attendance_new', (err, row) => {
          if (err) {
            console.error('❌ Error counting records:', err);
            db.run('DROP TABLE IF EXISTS attendance_new', () => {
              db.close();
              process.exit(1);
            });
            return;
          }

          console.log(`✅ Copied ${row.count} records to new table\n`);

          console.log('📝 Step 3: Dropping old table...\n');
          db.run('DROP TABLE attendance', (err) => {
            if (err) {
              console.error('❌ Error dropping old table:', err);
              db.run('DROP TABLE IF EXISTS attendance_new', () => {
                db.close();
                process.exit(1);
              });
              return;
            }
            console.log('✅ Old table dropped\n');

            console.log('📝 Step 4: Renaming new table...\n');
            db.run('ALTER TABLE attendance_new RENAME TO attendance', (err) => {
              if (err) {
                console.error('❌ Error renaming table:', err);
                db.close();
                process.exit(1);
              }
              console.log('✅ Table renamed\n');

              console.log('📝 Step 5: Recreating indexes...\n');
              
              // Recreate indexes
              const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_meetingType ON attendance(meetingType)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_createdBy ON attendance(createdBy)',
                'CREATE INDEX IF NOT EXISTS idx_attendance_date_type_scope ON attendance(date, meetingType, scope, scopeValue)',
              ];

              let completed = 0;
              indexes.forEach((sql, index) => {
                db.run(sql, (err) => {
                  if (err) {
                    console.error(`❌ Error creating index ${index + 1}:`, err);
                  } else {
                    completed++;
                    if (completed === indexes.length) {
                      console.log('✅ All indexes recreated\n');
                      console.log('✅ Migration completed successfully!\n');
                      console.log('📋 UNIQUE constraint removed - logic handled in application layer');
                      console.log('   - full_congregation: Allows multiple records for same date + meetingType');
                      console.log('   - small_group/district: Overwrites records with same date + meetingType + scope + scopeValue\n');
                      db.close((err) => {
                        if (err) {
                          console.error('❌ Error closing database:', err);
                          process.exit(1);
                        }
                        process.exit(0);
                      });
                    }
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

