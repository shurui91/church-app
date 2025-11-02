import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Initialize database and create tables
 */
export function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phoneNumber TEXT NOT NULL UNIQUE,
        name TEXT,
        nameZh TEXT,
        nameEn TEXT,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('super_admin', 'admin', 'leader', 'member')),
        district TEXT,
        groupNum TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }
      console.log('Users table created or already exists');
      
      // Migrate existing database: add new columns if they don't exist
      db.run(`ALTER TABLE users ADD COLUMN nameZh TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding nameZh column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN nameEn TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding nameEn column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN district TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding district column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN groupNum TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding groupNum column:', err);
        }
      });
      
      // Add new columns: email, lastLoginAt, status, gender, birthdate, joinDate, preferredLanguage, notes
      db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding email column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN lastLoginAt TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding lastLoginAt column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended'))`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding status column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female', 'other'))`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding gender column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN birthdate TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding birthdate column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN joinDate TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding joinDate column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN preferredLanguage TEXT DEFAULT 'zh'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding preferredLanguage column:', err);
        }
      });
      
      db.run(`ALTER TABLE users ADD COLUMN notes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding notes column:', err);
        }
      });
      
      // Create indexes for new columns
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, (err) => {
        if (err) console.error('Error creating index on email:', err);
      });
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`, (err) => {
        if (err) console.error('Error creating index on status:', err);
      });
    });

    // Create indexes for users table
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_phoneNumber ON users(phoneNumber)`, (err) => {
      if (err) console.error('Error creating index on phoneNumber:', err);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`, (err) => {
      if (err) console.error('Error creating index on role:', err);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_users_district ON users(district)`, (err) => {
      if (err) console.error('Error creating index on district:', err);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_users_groupNum ON users(groupNum)`, (err) => {
      if (err) console.error('Error creating index on groupNum:', err);
    });

    // Create verification_codes table
    db.run(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phoneNumber TEXT NOT NULL,
        code TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Error creating verification_codes table:', err);
        reject(err);
        return;
      }
      console.log('Verification codes table created or already exists');
    });

    // Create indexes for verification_codes table
    db.run(`CREATE INDEX IF NOT EXISTS idx_verification_codes_phoneNumber ON verification_codes(phoneNumber)`, (err) => {
      if (err) console.error('Error creating index on phoneNumber:', err);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_verification_codes_expiresAt ON verification_codes(expiresAt)`, (err) => {
      if (err) console.error('Error creating index on expiresAt:', err);
    });

    // Create sessions table (optional, for session management)
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        deviceInfo TEXT,
        expiresAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating sessions table:', err);
        reject(err);
        return;
      }
      console.log('Sessions table created or already exists');
    });

    // Create indexes for sessions table
    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId)`, (err) => {
      if (err) console.error('Error creating index on userId:', err);
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`, (err) => {
      if (err) console.error('Error creating index on token:', err);
    });

    // Close database connection after initialization
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
        return;
      }
      console.log('Database initialization completed');
      resolve();
    });
  });
}

// If running directly, initialize database
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('Database initialized successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}
