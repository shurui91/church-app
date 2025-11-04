import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path - should match init.js
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

console.log(`\n📦 Migrating attendance table to add scope and scopeValue fields...`);
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

  // Add scope column if it doesn't exist
  db.run(`ALTER TABLE attendance ADD COLUMN scope TEXT CHECK(scope IN ('full_congregation', 'district', 'small_group'))`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error adding scope column:', err);
    } else if (err && err.message.includes('duplicate column')) {
      console.log('ℹ️  scope column already exists, skipping...');
    } else {
      console.log('✅ Added scope column');
    }

    // Add scopeValue column if it doesn't exist
    db.run(`ALTER TABLE attendance ADD COLUMN scopeValue TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('❌ Error adding scopeValue column:', err);
      } else if (err && err.message.includes('duplicate column')) {
        console.log('ℹ️  scopeValue column already exists, skipping...');
      } else {
        console.log('✅ Added scopeValue column');
      }

      // Update existing records: set default scope based on meetingType
      // For backward compatibility, we'll set default values
      db.run(`
        UPDATE attendance 
        SET scope = CASE 
          WHEN meetingType = 'table' THEN 'full_congregation'
          WHEN meetingType = 'homeMeeting' THEN 'small_group'
          WHEN meetingType = 'prayer' THEN 'district'
          ELSE 'full_congregation'
        END,
        scopeValue = CASE
          WHEN meetingType = 'homeMeeting' AND district IS NOT NULL THEN district
          WHEN meetingType = 'prayer' AND district IS NOT NULL THEN district
          ELSE NULL
        END
        WHERE scope IS NULL
      `, (err) => {
        if (err) {
          console.error('❌ Error updating existing records:', err);
        } else {
          db.get('SELECT changes() as changes', (err, row) => {
            if (!err && row && row.changes > 0) {
              console.log(`✅ Updated ${row.changes} existing records with default scope values`);
            } else {
              console.log('ℹ️  No existing records to update');
            }

            // Note: We cannot modify the UNIQUE constraint easily in SQLite
            // The new constraint should be handled by the application logic
            // The old UNIQUE(date, meetingType, createdBy) will still work for existing records

            console.log('\n✅ Migration completed successfully!\n');
            db.close((err) => {
              if (err) {
                console.error('❌ Error closing database:', err);
                process.exit(1);
              }
              process.exit(0);
            });
          });
        }
      });
    });
  });
});

