import { getDatabase } from './db.js';

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
 * Helper function to add column if it doesn't exist (PostgreSQL)
 */
async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
  try {
    // Extract column name without quotes for checking
    const columnNameForCheck = columnName.replace(/"/g, '');
    
    // Check if column exists (PostgreSQL stores column names in lowercase in information_schema)
    const result = await db.get(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND LOWER(column_name) = LOWER($2)`,
      [tableName, columnNameForCheck]
    );
    
    if (!result) {
      await db.run(
        `ALTER TABLE "${tableName}" ADD COLUMN ${columnName} ${columnDefinition}`,
        []
      );
      console.log(`  Added column ${columnName} to ${tableName}`);
    }
  } catch (err) {
    // Column might already exist or other error
    if (!err.message.includes('duplicate column') && !err.message.includes('already exists') && !err.message.includes('duplicate key')) {
      console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
    }
  }
}

/**
 * Initialize database and create tables
 */
export async function initDatabase() {
  const db = await getDatabase();
  
  try {
    console.log('Connected to PostgreSQL database');

    // Create users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "phoneNumber" TEXT NOT NULL UNIQUE,
        name TEXT,
        "nameZh" TEXT,
        "nameEn" TEXT,
        role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('super_admin', 'admin', 'leader', 'member', 'usher')),
        district TEXT,
        "groupNum" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `, []);
    console.log('Users table created or already exists');

    // Add additional columns if they don't exist
    await addColumnIfNotExists(db, 'users', '"nameZh"', 'TEXT');
    await addColumnIfNotExists(db, 'users', '"nameEn"', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'district', 'TEXT');
    await addColumnIfNotExists(db, 'users', '"groupNum"', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'email', 'TEXT');
    await addColumnIfNotExists(db, 'users', '"lastLoginAt"', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'status', 'TEXT DEFAULT \'active\' CHECK(status IN (\'active\', \'inactive\', \'suspended\'))');
    await addColumnIfNotExists(db, 'users', 'gender', 'TEXT CHECK(gender IN (\'male\', \'female\', \'other\'))');
    await addColumnIfNotExists(db, 'users', 'birthdate', 'TEXT');
    await addColumnIfNotExists(db, 'users', '"joinDate"', 'TEXT');
    await addColumnIfNotExists(db, 'users', '"preferredLanguage"', 'TEXT DEFAULT \'zh\'');
    await addColumnIfNotExists(db, 'users', 'notes', 'TEXT');

    // Create indexes for users table
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_phoneNumber ON users("phoneNumber")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_district ON users(district)`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_groupNum ON users("groupNum")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`, []);

    // Create verification_codes table
    await db.run(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id SERIAL PRIMARY KEY,
        "phoneNumber" TEXT NOT NULL,
        code TEXT NOT NULL,
        "expiresAt" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      )
    `, []);
    console.log('Verification codes table created or already exists');

    // Create indexes for verification_codes table
    await db.run(`CREATE INDEX IF NOT EXISTS idx_verification_codes_phoneNumber ON verification_codes("phoneNumber")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_verification_codes_expiresAt ON verification_codes("expiresAt")`, []);

    // Create sessions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "deviceInfo" TEXT,
        "expiresAt" TEXT NOT NULL,
        "createdAt" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `, []);
    console.log('Sessions table created or already exists');

    // Create indexes for sessions table
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions("userId")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`, []);

    // Create attendance table
    await db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        "meetingType" TEXT NOT NULL CHECK("meetingType" IN ('table', 'homeMeeting', 'prayer')),
        scope TEXT NOT NULL CHECK(scope IN ('full_congregation', 'district', 'small_group')),
        "scopeValue" TEXT,
        "adultCount" INTEGER NOT NULL CHECK("adultCount" >= 0),
        "youthChildCount" INTEGER NOT NULL CHECK("youthChildCount" >= 0),
        "createdBy" INTEGER NOT NULL,
        district TEXT,
        notes TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE CASCADE
      )
    `, []);
    console.log('Attendance table created or already exists');

    // Create indexes for attendance table
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_meetingType ON attendance("meetingType")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_createdBy ON attendance("createdBy")`, []);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date_type_scope ON attendance(date, "meetingType", scope, "scopeValue")`, []);

    console.log('Database initialization completed');

    // Initialize default users after database tables are created
    await initDefaultUsers();
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
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
        if (error.message && (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key'))) {
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
