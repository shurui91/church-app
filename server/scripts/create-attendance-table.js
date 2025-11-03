import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

// Use the same DB_PATH logic as init.js and db.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

async function createAttendanceTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log(`Connected to SQLite database at: ${DB_PATH}`);
      
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
          db.close();
          reject(err);
          return;
        }
      });

      // Check if users table exists first
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
          console.error('Error checking users table:', err);
          db.close();
          reject(err);
          return;
        }
        
        if (!row) {
          console.error(`\n❌ Error: users table does not exist in database at ${DB_PATH}`);
          console.error('   Please make sure users table exists before creating attendance table.');
          db.close();
          reject(new Error('users table does not exist'));
          return;
        }
        
        console.log('✓ Users table exists, proceeding with attendance table creation...\n');
        
        // Check if attendance table already exists
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'", (err, row) => {
          if (err) {
            console.error('Error checking attendance table:', err);
            db.close();
            reject(err);
            return;
          }
          
          if (row) {
            console.log('⚠️  Attendance table already exists. Checking structure...\n');
            // Check if foreign key constraint exists
            db.all("PRAGMA foreign_key_list(attendance)", (err, fkList) => {
              if (err) {
                console.error('Error checking foreign keys:', err);
              } else {
                const hasFK = fkList && fkList.some(fk => fk.table === 'users' && fk.from === 'createdBy');
                if (hasFK) {
                  console.log('✓ Attendance table already exists with foreign key constraint to users table');
                  console.log('  No changes needed.\n');
                } else {
                  console.log('⚠️  Attendance table exists but foreign key may not be properly configured');
                }
              }
              db.close();
              resolve();
            });
            return;
          }
          
          // Create attendance table
          console.log('Creating attendance table...');
          db.run(`
            CREATE TABLE IF NOT EXISTS attendance (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL,
              meetingType TEXT NOT NULL CHECK(meetingType IN ('table', 'homeMeeting', 'prayer')),
              adultCount INTEGER NOT NULL CHECK(adultCount >= 0),
              youthChildCount INTEGER NOT NULL CHECK(youthChildCount >= 0),
              createdBy INTEGER NOT NULL,
              district TEXT,
              notes TEXT,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL,
              UNIQUE(date, meetingType, createdBy),
              FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) {
              console.error('❌ Error creating attendance table:', err);
              db.close();
              reject(err);
              return;
            }
            console.log('✓ Attendance table created successfully\n');
            
            // Create indexes
            console.log('Creating indexes...');
            const indexes = [
              { name: 'idx_attendance_date', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)' },
              { name: 'idx_attendance_meetingType', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_meetingType ON attendance(meetingType)' },
              { name: 'idx_attendance_createdBy', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_createdBy ON attendance(createdBy)' },
              { name: 'idx_attendance_date_type_creator', sql: 'CREATE INDEX IF NOT EXISTS idx_attendance_date_type_creator ON attendance(date, meetingType, createdBy)' },
            ];
            
            let completed = 0;
            indexes.forEach(({ name, sql }) => {
              db.run(sql, (err) => {
                if (err) {
                  console.error(`  ❌ Error creating index ${name}:`, err);
                } else {
                  console.log(`  ✓ Created index: ${name}`);
                }
                completed++;
                if (completed === indexes.length) {
                  console.log('\n✅ All indexes created successfully\n');
                  
                  // Verify foreign key constraint
                  db.all("PRAGMA foreign_key_list(attendance)", (err, fkList) => {
                    if (err) {
                      console.error('Error verifying foreign keys:', err);
                    } else {
                      const fk = fkList && fkList.find(fk => fk.table === 'users' && fk.from === 'createdBy');
                      if (fk) {
                        console.log('✓ Foreign key constraint verified:');
                        console.log(`  - Column: createdBy`);
                        console.log(`  - References: users(id)`);
                        console.log(`  - On Delete: CASCADE\n`);
                      } else {
                        console.log('⚠️  Warning: Could not verify foreign key constraint');
                      }
                    }
                    db.close();
                    resolve();
                  });
                }
              });
            });
          });
        });
      });
    });
  });
}

// Run migration
createAttendanceTable()
  .then(() => {
    console.log('✅ Attendance table creation completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Attendance table creation failed:', err);
    process.exit(1);
  });

