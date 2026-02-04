import { initDatabase } from '../database/init.js';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Migrate users table to add new columns
 */
async function migrateUsersTable() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database for migration');
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Check if columns exist and add them if needed
    db.get("PRAGMA table_info(users)", (err, rows) => {
      if (err) {
        console.error('Error getting table info:', err);
        db.close();
        reject(err);
        return;
      }
    });

    // Get all columns
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error('Error getting table info:', err);
        db.close();
        reject(err);
        return;
      }

      const columnNames = columns.map(col => col.name);
      console.log('Existing columns:', columnNames);

      const newColumns = [
        { name: 'nameZh', sql: 'ALTER TABLE users ADD COLUMN nameZh TEXT' },
        { name: 'nameTw', sql: 'ALTER TABLE users ADD COLUMN nameTw TEXT' },
        { name: 'nameEn', sql: 'ALTER TABLE users ADD COLUMN nameEn TEXT' },
        { name: 'district', sql: 'ALTER TABLE users ADD COLUMN district TEXT' },
        { name: 'groupNum', sql: 'ALTER TABLE users ADD COLUMN groupNum TEXT' },
      ];

      let pending = 0;
      let completed = 0;

      newColumns.forEach(({ name, sql }) => {
        if (!columnNames.includes(name)) {
          pending++;
          console.log(`Adding column: ${name}...`);
          db.run(sql, (err) => {
            if (err) {
              console.error(`Error adding column ${name}:`, err);
            } else {
              console.log(`✓ Column ${name} added successfully`);
            }
            completed++;
            if (completed === pending) {
              // Create indexes
              console.log('Creating indexes...');
              db.run(`CREATE INDEX IF NOT EXISTS idx_users_district ON users(district)`, (err) => {
                if (err) console.error('Error creating index on district:', err);
                else console.log('✓ Index on district created');
              });

              db.run(`CREATE INDEX IF NOT EXISTS idx_users_groupNum ON users(groupNum)`, (err) => {
                if (err) {
                  console.error('Error creating index on groupNum:', err);
                } else {
                  console.log('✓ Index on groupNum created');
                  db.close((err) => {
                    if (err) {
                      console.error('Error closing database:', err);
                      reject(err);
                    } else {
                      console.log('Migration completed successfully');
                      resolve();
                    }
                  });
                }
              });
            }
          });
        } else {
          console.log(`Column ${name} already exists, skipping...`);
        }
      });

      if (pending === 0) {
        console.log('All columns already exist. Migration not needed.');
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
}

// Run migration
migrateUsersTable()
  .then(() => {
    console.log('Database migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database migration failed:', err);
    process.exit(1);
  });

