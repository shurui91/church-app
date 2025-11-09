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
    // Extract column name without quotes and convert to lowercase for checking
    // PostgreSQL stores field names in lowercase
    const columnNameForCheck = columnName.replace(/"/g, '').toLowerCase();
    
    // Check if column exists (PostgreSQL stores table_name and column_name in lowercase in information_schema)
    const result = await db.get(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE LOWER(table_name) = LOWER($1) AND LOWER(column_name) = LOWER($2)`,
      [tableName, columnNameForCheck]
    );
    
    if (!result) {
      // Use lowercase column name when adding column
      await db.run(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnNameForCheck} ${columnDefinition}`,
        []
      );
      console.log(`  Added column ${columnNameForCheck} to ${tableName}`);
    }
  } catch (err) {
    // Column might already exist or other error
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists') && !err.message?.includes('duplicate key')) {
      console.error(`Error adding column ${columnName} to ${tableName}:`, err.message);
    }
  }
}

/**
 * Helper function to create index if column exists (PostgreSQL)
 */
async function createIndexIfColumnExists(db, indexName, tableName, columnName) {
  try {
    // Extract column name without quotes for checking
    const columnNameForCheck = columnName.replace(/"/g, '').toLowerCase();
    
    // Check if column exists (PostgreSQL stores table_name and column_name in lowercase in information_schema)
    const result = await db.get(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE LOWER(table_name) = LOWER($1) AND LOWER(column_name) = LOWER($2)`,
      [tableName, columnNameForCheck]
    );
    
    if (result) {
      // Column exists, create index using lowercase column name
      // PostgreSQL stores field names in lowercase, so use lowercase in index creation
      await db.run(
        `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnNameForCheck})`,
        []
      );
    } else {
      console.log(`  Skipping index ${indexName} - column ${columnNameForCheck} does not exist in table ${tableName}`);
    }
  } catch (err) {
    // Index might already exist or other error
    if (!err.message?.includes('already exists') && err.code !== '42703') {
      console.error(`Error creating index ${indexName}:`, err.message);
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

    // Check if users table exists
    const tableExists = await db.get(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `, []);

    if (!tableExists || !tableExists.exists) {
      // Create users table only if it doesn't exist
      await db.run(`
        CREATE TABLE users (
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
      console.log('Users table created');
    } else {
      console.log('Users table already exists, skipping creation');
    }

    // Add additional columns if they don't exist
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await addColumnIfNotExists(db, 'users', 'namezh', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'nameen', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'district', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'groupnum', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'email', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'lastloginat', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'status', 'TEXT DEFAULT \'active\' CHECK(status IN (\'active\', \'inactive\', \'suspended\'))');
    await addColumnIfNotExists(db, 'users', 'gender', 'TEXT CHECK(gender IN (\'male\', \'female\', \'other\'))');
    await addColumnIfNotExists(db, 'users', 'birthdate', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'joindate', 'TEXT');
    await addColumnIfNotExists(db, 'users', 'preferredlanguage', 'TEXT DEFAULT \'zh\'');
    await addColumnIfNotExists(db, 'users', 'notes', 'TEXT');

    // Create indexes for users table (only on columns that exist)
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await createIndexIfColumnExists(db, 'idx_users_phonenumber', 'users', 'phonenumber');
    await createIndexIfColumnExists(db, 'idx_users_role', 'users', 'role');
    await createIndexIfColumnExists(db, 'idx_users_district', 'users', 'district');
    await createIndexIfColumnExists(db, 'idx_users_groupnum', 'users', 'groupnum');
    await createIndexIfColumnExists(db, 'idx_users_email', 'users', 'email');
    await createIndexIfColumnExists(db, 'idx_users_status', 'users', 'status');

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
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await createIndexIfColumnExists(db, 'idx_verification_codes_phonenumber', 'verification_codes', 'phonenumber');
    await createIndexIfColumnExists(db, 'idx_verification_codes_expiresat', 'verification_codes', 'expiresat');

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
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await createIndexIfColumnExists(db, 'idx_sessions_userid', 'sessions', 'userid');
    await createIndexIfColumnExists(db, 'idx_sessions_token', 'sessions', 'token');

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
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await createIndexIfColumnExists(db, 'idx_attendance_date', 'attendance', 'date');
    await createIndexIfColumnExists(db, 'idx_attendance_meetingtype', 'attendance', 'meetingtype');
    await createIndexIfColumnExists(db, 'idx_attendance_createdby', 'attendance', 'createdby');
    
    // For composite index, check if all columns exist first
    try {
      const dateCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'attendance' AND LOWER(column_name) = 'date'`, []);
      const meetingTypeCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'attendance' AND LOWER(column_name) = 'meetingtype'`, []);
      const scopeCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'attendance' AND LOWER(column_name) = 'scope'`, []);
      const scopeValueCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'attendance' AND LOWER(column_name) = 'scopevalue'`, []);
      
      if (dateCol && meetingTypeCol && scopeCol && scopeValueCol) {
        await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date_type_scope ON attendance(date, meetingtype, scope, scopevalue)`, []);
      } else {
        console.log('  Skipping composite index idx_attendance_date_type_scope - some columns do not exist');
      }
    } catch (err) {
      if (err.code !== '42703' && !err.message?.includes('already exists')) {
        console.error('Error creating composite index idx_attendance_date_type_scope:', err.message);
      }
    }

    // Create travel_schedules table
    await db.run(`
      CREATE TABLE IF NOT EXISTS travel_schedules (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        startdate TEXT NOT NULL,
        enddate TEXT NOT NULL,
        destination TEXT,
        notes TEXT,
        createdat TEXT NOT NULL,
        updatedat TEXT NOT NULL,
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
      )
    `, []);
    console.log('Travel schedules table created or already exists');

    // Create indexes for travel_schedules table
    await createIndexIfColumnExists(db, 'idx_travel_schedules_userid', 'travel_schedules', 'userid');
    await createIndexIfColumnExists(db, 'idx_travel_schedules_startdate', 'travel_schedules', 'startdate');
    await createIndexIfColumnExists(db, 'idx_travel_schedules_enddate', 'travel_schedules', 'enddate');

    // Create composite index for date range queries
    try {
      const startDateCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'travel_schedules' AND LOWER(column_name) = 'startdate'`, []);
      const endDateCol = await db.get(`SELECT column_name FROM information_schema.columns WHERE LOWER(table_name) = 'travel_schedules' AND LOWER(column_name) = 'enddate'`, []);
      
      if (startDateCol && endDateCol) {
        await db.run(`CREATE INDEX IF NOT EXISTS idx_travel_schedules_date_range ON travel_schedules(startdate, enddate)`, []);
      }
    } catch (err) {
      if (err.code !== '42703' && !err.message?.includes('already exists')) {
        console.error('Error creating composite index idx_travel_schedules_date_range:', err.message);
      }
    }

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
