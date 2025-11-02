import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { initDatabase } from '../database/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.sqlite');

async function migrate() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    const newColumns = [
      { name: 'email', sql: 'ALTER TABLE users ADD COLUMN email TEXT' },
      { name: 'lastLoginAt', sql: 'ALTER TABLE users ADD COLUMN lastLoginAt TEXT' },
      { name: 'status', sql: "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended'))" },
      { name: 'gender', sql: "ALTER TABLE users ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female', 'other'))" },
      { name: 'birthdate', sql: 'ALTER TABLE users ADD COLUMN birthdate TEXT' },
      { name: 'joinDate', sql: 'ALTER TABLE users ADD COLUMN joinDate TEXT' },
      { name: 'preferredLanguage', sql: "ALTER TABLE users ADD COLUMN preferredLanguage TEXT DEFAULT 'zh'" },
      { name: 'notes', sql: 'ALTER TABLE users ADD COLUMN notes TEXT' },
    ];

    let completed = 0;
    const total = newColumns.length;

    newColumns.forEach(({ name, sql }) => {
      db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error(`Error adding ${name} column:`, err);
        } else if (!err || err.message.includes('duplicate column')) {
          if (err && err.message.includes('duplicate column')) {
            console.log(`✓ Column ${name} already exists`);
          } else {
            console.log(`✓ Added column ${name}`);
          }
        }
        completed++;
        if (completed === total) {
          // Create indexes
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (err) => {
            if (err) console.error('Error creating index on email:', err);
            else console.log('✓ Created index on email');
          });

          db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`, (err) => {
            if (err) console.error('Error creating index on status:', err);
            else console.log('✓ Created index on status');
          });

          // Update existing users to have status='active' if NULL
          db.run(`UPDATE users SET status = 'active' WHERE status IS NULL`, (err) => {
            if (err) {
              console.error('Error updating existing users status:', err);
            } else {
              console.log('✓ Updated existing users status to active');
            }

            // Close database
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                reject(err);
              } else {
                console.log('\n✅ Migration completed successfully!');
                resolve();
              }
            });
          });
        }
      });
    });
  });
}

// Run migration
initDatabase()
  .then(() => migrate())
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
