import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Migration script to add 'usher' role to the users table CHECK constraint
 * Since SQLite doesn't support ALTER TABLE to modify CHECK constraints,
 * we need to recreate the table with the new constraint.
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
        const baseColumns = ['id', 'phoneNumber', 'name', 'nameZh', 'nameEn', 'role', 'district', 'groupNum', 'createdAt', 'updatedAt'];
        const additionalColumns = columnNames.filter(col => !baseColumns.includes(col));

        console.log(`Found columns: ${columnNames.join(', ')}`);
        if (additionalColumns.length > 0) {
          console.log(`Additional columns to preserve: ${additionalColumns.join(', ')}`);
        }

        // Build CREATE TABLE statement with all columns
        let createTableSQL = `
          CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phoneNumber TEXT NOT NULL UNIQUE,
            name TEXT,
            nameZh TEXT,
            nameEn TEXT,
            role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('super_admin', 'admin', 'leader', 'member', 'usher')),
            district TEXT,
            groupNum TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
        `;

        // Add additional columns if they exist
        additionalColumns.forEach(col => {
          const colInfo = columns.find(c => c.name === col);
          const colType = colInfo ? colInfo.type : 'TEXT';
          const notNull = colInfo && colInfo.notnull ? ' NOT NULL' : '';
          const defaultValue = colInfo && colInfo.dflt_value !== null ? ` DEFAULT ${colInfo.dflt_value}` : '';
          createTableSQL += `,\n            ${col} ${colType}${notNull}${defaultValue}`;
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
          console.log('Created users_new table with usher role');

          // Copy all data from old table to new table
          const allColsStr = columnNames.join(', ');
          db.run(`
            INSERT INTO users_new (${allColsStr})
            SELECT ${allColsStr} FROM users
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
            console.log('Copied data from users to users_new');

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
              console.log('Dropped old users table');

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
                console.log('Renamed users_new to users');

                // Recreate indexes if they exist
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
                  console.log('The users table now supports the "usher" role.');
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
