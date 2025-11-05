import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Migration script to remove the 'group' column from users table
 * Since SQLite doesn't support DROP COLUMN directly in older versions,
 * we need to recreate the table without the 'group' column.
 */
async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to database');
    });

    db.serialize(() => {
      // Start transaction
      db.run('BEGIN TRANSACTION');

      // First, get all columns from the existing users table
      db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
          console.error('Error getting table info:', err);
          db.run('ROLLBACK');
          db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr);
            reject(err);
          });
          return;
        }

        const columnNames = columns.map(col => col.name);
        
        // Check if 'group' column exists
        const hasGroupColumn = columnNames.includes('group');
        if (!hasGroupColumn) {
          console.log('✓ "group" column does not exist, no migration needed');
          db.run('ROLLBACK');
          db.close((closeErr) => {
            if (closeErr) console.error('Error closing database:', closeErr);
            resolve();
          });
          return;
        }

        console.log(`Found columns: ${columnNames.join(', ')}`);
        console.log('Removing "group" column...');

        // Filter out 'group' column
        const columnsToKeep = columnNames.filter(col => col !== 'group');
        const columnsToKeepInfo = columns.filter(col => col.name !== 'group');

        // Build CREATE TABLE statement without 'group' column
        let createTableSQL = `
          CREATE TABLE IF NOT EXISTS users_new (
        `;

        // Add all columns except 'group'
        columnsToKeepInfo.forEach((colInfo, index) => {
          if (index > 0) createTableSQL += ',\n            ';
          
          const colName = colInfo.name;
          const colType = colInfo.type;
          const notNull = colInfo.notnull ? ' NOT NULL' : '';
          const primaryKey = colInfo.pk ? ' PRIMARY KEY' + (colInfo.dflt_value === null ? ' AUTOINCREMENT' : '') : '';
          const unique = colName === 'phoneNumber' ? ' UNIQUE' : '';
          
          // Handle CHECK constraint for role column
          let columnDef = `${colName} ${colType}${notNull}${primaryKey}${unique}`;
          
          if (colName === 'role') {
            // Add CHECK constraint for role
            columnDef += ` CHECK(role IN ('super_admin', 'admin', 'leader', 'member', 'usher'))`;
          }
          
          if (colInfo.dflt_value !== null && !colInfo.pk) {
            columnDef += ` DEFAULT ${colInfo.dflt_value}`;
          }
          
          createTableSQL += columnDef;
        });

        createTableSQL += '\n          )';

        // Create new table
        db.run(createTableSQL, (err) => {
          if (err) {
            console.error('Error creating users_new table:', err);
            db.run('ROLLBACK');
            db.close((closeErr) => {
              if (closeErr) console.error('Error closing database:', closeErr);
              reject(err);
            });
            return;
          }
          console.log('✓ Created users_new table without "group" column');

          // Copy all data from old table to new table (excluding 'group')
          const colsToCopy = columnsToKeep.join(', ');
          db.run(`
            INSERT INTO users_new (${colsToCopy})
            SELECT ${colsToCopy} FROM users
          `, (err) => {
            if (err) {
              console.error('Error copying data:', err);
              db.run('ROLLBACK');
              db.close((closeErr) => {
                if (closeErr) console.error('Error closing database:', closeErr);
                reject(err);
              });
              return;
            }
            console.log('✓ Copied data from users to users_new');

            // Drop old table
            db.run('DROP TABLE users', (err) => {
              if (err) {
                console.error('Error dropping old users table:', err);
                db.run('ROLLBACK');
                db.close((closeErr) => {
                  if (closeErr) console.error('Error closing database:', closeErr);
                  reject(err);
                });
                return;
              }
              console.log('✓ Dropped old users table');

              // Rename new table
              db.run('ALTER TABLE users_new RENAME TO users', (err) => {
                if (err) {
                  console.error('Error renaming users_new to users:', err);
                  db.run('ROLLBACK');
                  db.close((closeErr) => {
                    if (closeErr) console.error('Error closing database:', closeErr);
                    reject(err);
                  });
                  return;
                }
                console.log('✓ Renamed users_new to users');

                // Recreate indexes
                db.run('CREATE INDEX IF NOT EXISTS idx_users_phoneNumber ON users(phoneNumber)', (err) => {
                  if (err) console.log('Note: Could not create index (may already exist):', err.message);
                });

                db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)', (err) => {
                  if (err) console.log('Note: Could not create index (may already exist):', err.message);
                });

                // Commit transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    db.run('ROLLBACK');
                    db.close((closeErr) => {
                      if (closeErr) console.error('Error closing database:', closeErr);
                      reject(err);
                    });
                    return;
                  }
                  console.log('✅ Migration completed successfully!');
                  console.log('The "group" column has been removed from the users table.');
                  db.close((closeErr) => {
                    if (closeErr) console.error('Error closing database:', closeErr);
                    resolve();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });

