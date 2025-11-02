import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Migrate "group" column to groupNum
 * SQLite doesn't support ALTER TABLE RENAME COLUMN in older versions,
 * so we need to create a new column, copy data, drop old column, and recreate index
 */
async function migrateGroupToGroupNum() {
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

    // Check if "group" column exists
    db.all("PRAGMA table_info(users)", (err, columns) => {
      if (err) {
        console.error('Error getting table info:', err);
        db.close();
        reject(err);
        return;
      }

      const columnNames = columns.map(col => col.name);
      const hasGroupColumn = columnNames.includes('group');
      const hasGroupNumColumn = columnNames.includes('groupNum');

      console.log('Existing columns:', columnNames);

      if (!hasGroupColumn && hasGroupNumColumn) {
        console.log('Migration already completed: groupNum column exists, "group" column does not exist.');
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
            reject(err);
          } else {
            resolve();
          }
        });
        return;
      }

      if (!hasGroupColumn && !hasGroupNumColumn) {
        console.log('Neither "group" nor groupNum column exists. Adding groupNum column...');
        db.run(`ALTER TABLE users ADD COLUMN groupNum TEXT`, (err) => {
          if (err) {
            console.error('Error adding groupNum column:', err);
            db.close();
            reject(err);
            return;
          }
          console.log('✓ Added groupNum column');
          
          // Create index
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_groupNum ON users(groupNum)`, (err) => {
            if (err) {
              console.error('Error creating index on groupNum:', err);
            } else {
              console.log('✓ Created index on groupNum');
            }
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                reject(err);
              } else {
                console.log('Migration completed successfully');
                resolve();
              }
            });
          });
        });
        return;
      }

      if (hasGroupColumn && hasGroupNumColumn) {
        console.log('Both "group" and groupNum columns exist. Copying data from "group" to groupNum...');
        // Copy data from "group" to groupNum where groupNum is NULL
        db.run(`UPDATE users SET groupNum = "group" WHERE groupNum IS NULL AND "group" IS NOT NULL`, (err) => {
          if (err) {
            console.error('Error copying data:', err);
            db.close();
            reject(err);
            return;
          }
          console.log('✓ Copied data from "group" to groupNum');
          
          // Drop old index
          db.run(`DROP INDEX IF EXISTS idx_users_group`, (err) => {
            if (err && !err.message.includes('no such index')) {
              console.error('Error dropping old index:', err);
            } else {
              console.log('✓ Dropped old index');
            }
            
            // Note: SQLite doesn't support dropping columns directly in older versions
            // We'll leave the "group" column but it will be ignored
            console.log('⚠ Note: The old "group" column still exists but will be ignored.');
            console.log('  For a clean migration, you may need to recreate the table manually.');
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                reject(err);
              } else {
                console.log('Migration completed successfully');
                resolve();
              }
            });
          });
        });
        return;
      }

      // hasGroupColumn && !hasGroupNumColumn
      console.log('Migrating "group" column to groupNum...');
      
      // Step 1: Add groupNum column
      db.run(`ALTER TABLE users ADD COLUMN groupNum TEXT`, (err) => {
        if (err) {
          console.error('Error adding groupNum column:', err);
          db.close();
          reject(err);
          return;
        }
        console.log('✓ Added groupNum column');
        
        // Step 2: Copy data from "group" to groupNum
        db.run(`UPDATE users SET groupNum = "group" WHERE "group" IS NOT NULL`, (err) => {
          if (err) {
            console.error('Error copying data:', err);
            db.close();
            reject(err);
            return;
          }
          console.log('✓ Copied data from "group" to groupNum');
          
          // Step 3: Drop old index
          db.run(`DROP INDEX IF EXISTS idx_users_group`, (err) => {
            if (err && !err.message.includes('no such index')) {
              console.error('Error dropping old index:', err);
            } else {
              console.log('✓ Dropped old index');
            }
            
            // Step 4: Create new index
            db.run(`CREATE INDEX IF NOT EXISTS idx_users_groupNum ON users(groupNum)`, (err) => {
              if (err) {
                console.error('Error creating index on groupNum:', err);
              } else {
                console.log('✓ Created index on groupNum');
              }
              
              console.log('⚠ Note: The old "group" column still exists but will be ignored.');
              console.log('  For a clean migration, you may need to recreate the table manually.');
              
              db.close((err) => {
                if (err) {
                  console.error('Error closing database:', err);
                  reject(err);
                } else {
                  console.log('Migration completed successfully');
                  resolve();
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
migrateGroupToGroupNum()
  .then(() => {
    console.log('\n✅ Database migration completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Database migration failed:', err);
    process.exit(1);
  });

