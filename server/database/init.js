import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

/**
 * Default users to create on database initialization
 * These users will be created if they don't already exist
 */
const DEFAULT_USERS = [
  {
    phoneNumber: '+15676983308',
    role: 'super_admin',
    nameZh: null,
    nameEn: null,
    district: 'D',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
  {
    phoneNumber: '+15625199698',
    role: 'member',
    nameZh: null,
    nameEn: null,
    district: 'Other',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
  {
    phoneNumber: '+16262274460',
    role: 'admin',
    nameZh: null,
    nameEn: null,
    district: 'D',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
  {
    phoneNumber: '+15622919164',
    role: 'member',
    nameZh: null,
    nameEn: null,
    district: 'D',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
  {
    phoneNumber: '+16263999536',
    role: 'member',
    nameZh: null,
    nameEn: null,
    district: 'D',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
  {
    phoneNumber: '+19495161377',
    role: 'member',
    nameZh: null,
    nameEn: null,
    district: 'D',
    groupNum: null,
    email: null,
    status: 'active',
    gender: null,
    birthdate: null,
    joinDate: null,
    preferredLanguage: 'zh',
    notes: null,
  },
];

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
      
      // Initialize default users after database tables are created
      initDefaultUsers().then(() => {
        resolve();
      }).catch((err) => {
        console.error('Warning: Failed to initialize default users:', err);
        // Don't reject - database initialization is complete even if users fail
        resolve();
      });
    });
  });
}

/**
 * Initialize default users in the database
 * Only creates users if they don't already exist
 */
async function initDefaultUsers() {
  try {
    // Dynamic import to avoid circular dependency
    const { User } = await import('./models/User.js');
    
    if (!DEFAULT_USERS || DEFAULT_USERS.length === 0) {
      return;
    }

    console.log(`\nInitializing ${DEFAULT_USERS.length} default user(s)...`);
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of DEFAULT_USERS) {
      try {
        // Check if user already exists
        const existingUser = await User.findByPhoneNumber(userData.phoneNumber);
        
        if (existingUser) {
          console.log(`  ⏭️  User ${userData.phoneNumber} already exists, skipping`);
          skippedCount++;
          continue;
        }

        // Create user
        await User.create(
          userData.phoneNumber,
          userData.role,
          null, // name (legacy)
          userData.nameZh,
          userData.nameEn,
          userData.district,
          userData.groupNum,
          userData.email,
          userData.status,
          userData.gender,
          userData.birthdate,
          userData.joinDate,
          userData.preferredLanguage,
          userData.notes
        );

        console.log(`  ✅ Created default user: ${userData.phoneNumber} (${userData.role})`);
        createdCount++;
      } catch (error) {
        // If user already exists (race condition), just skip
        if (error.message && error.message.includes('UNIQUE constraint')) {
          console.log(`  ⏭️  User ${userData.phoneNumber} already exists, skipping`);
          skippedCount++;
        } else {
          console.error(`  ❌ Error creating user ${userData.phoneNumber}:`, error.message);
        }
      }
    }

    if (createdCount > 0 || skippedCount > 0) {
      console.log(`\nDefault users initialization: ${createdCount} created, ${skippedCount} skipped`);
    }
  } catch (error) {
    console.error('Error in initDefaultUsers:', error);
    throw error;
  }
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
