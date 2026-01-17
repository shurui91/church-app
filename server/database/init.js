import { getDatabase } from './db.js';

/**
 * Default users to create on database initialization
 * These users will be created if they don't already exist
 */
const DEFAULT_USERS = [
  {
    phoneNumber: '+15676983308',
    role: 'super_admin',
    nameZh: '刘书睿',
    nameEn: 'Aaron Liu',
    district: 'D',
    groupNum: '亲子',
    email: 'shurui91@gmail.com',
    status: 'active',
    gender: 'male',
    birthdate: '1991-02-08',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+15625199698',
    role: 'member',
    nameZh: '潘小麟',
    nameEn: 'Caroline Pan',
    district: 'Other',
    groupNum: null,
    email: 'shencaroline2006@gmail.com',
    status: 'active',
    gender: 'female',
    birthdate: '1969-06-06',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+16262274460',
    role: 'admin',
    nameZh: '刘云涛',
    nameEn: 'Kevin Liu',
    district: 'D',
    groupNum: '亲子',
    email: 'yuntaoyura@gmail.com',
    status: 'active',
    gender: 'male',
    birthdate: '1982-01-01',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+15622919164',
    role: 'member',
    nameZh: '伍玉涛',
    nameEn: 'Yutao Wu',
    district: 'D',
    groupNum: '亲子',
    email: 'yutaowu@gmail.com',
    status: 'active',
    gender: 'male',
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+16263999536',
    role: 'member',
    nameZh: '马崇博',
    nameEn: 'Chongbo Ma',
    district: 'D',
    groupNum: '亲子',
    email: 'bo.ma@example.com',
    status: 'active',
    gender: 'male',
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+19495161377',
    role: 'member',
    nameZh: '陈旸',
    nameEn: 'Sunny Chen',
    district: 'D',
    groupNum: '亲子',
    email: 'sunny.chen@example.com',
    status: 'active',
    gender: 'female',
    birthdate: '1980-01-01',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+16193125553',
    role: 'member',
    nameZh: '韩昱宸',
    nameEn: 'YuChen Han',
    district: 'D',
    groupNum: '亲子',
    email: 'yuchenhan@example.com',
    status: 'active',
    gender: 'male',
    birthdate: '1970-08-29',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+16263787077',
    role: 'usher',
    nameZh: '席月利',
    nameEn: 'Yueli Xi',
    district: 'D',
    groupNum: '亲子',
    email: 'yuelixi@example.com',
    status: 'active',
    gender: 'female',
    birthdate: '1970-08-29',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
  },
  {
    phoneNumber: '+18586634856',
    role: 'usher',
    nameZh: '张娟',
    nameEn: 'Joanne Zhang',
    district: 'A',
    groupNum: '4',
    email: 'joannezhang@example.com',
    status: 'active',
    gender: 'female',
    birthdate: '1970-08-29',
    joinDate: '2025-11-01',
    preferredLanguage: 'zh',
    notes: '',
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
 * Ensure attendance table has unique index for non-full_congregation scopes
 */
async function ensureAttendanceUniqueConstraint(db) {
  try {
    await db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_scope
      ON attendance(date, meetingtype, scope, scopevalue)
      WHERE scope != 'full_congregation'
    `, []);
    console.log('Ensured attendance unique index for small_group/district entries');
  } catch (error) {
    if (!error.message?.includes('already exists')) {
      console.error('Error ensuring attendance unique constraint:', error.message || error);
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
          role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('super_admin', 'admin', 'responsible_one', 'member', 'usher')),
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
        "deviceId" TEXT,
        "deviceInfo" TEXT,
        "expiresAt" TEXT NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      )
    `, []);
    console.log('Sessions table created or already exists');
    await ensureSessionsIdSerial(db);

    // Create indexes for sessions table
    // PostgreSQL stores field names in lowercase, so use lowercase field names
    await createIndexIfColumnExists(db, 'idx_sessions_userid', 'sessions', 'userid');
    await createIndexIfColumnExists(db, 'idx_sessions_token', 'sessions', 'token');
    await db.run(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS "deviceId" TEXT
    `, []);
    await db.run(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS "deviceInfo" TEXT
    `, []);
    await db.run(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS "expiresAt" TEXT NOT NULL DEFAULT ''
    `, []);
    await db.run(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE
    `, []);
    await db.run(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS "updatedAt" TEXT NOT NULL DEFAULT NOW()
    `, []);

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
      user_name TEXT,
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

    // Ensure unique constraint for small_group/district submissions
    await ensureAttendanceUniqueConstraint(db);

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

    // Create gym_reservations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS gym_reservations (
        id SERIAL PRIMARY KEY,
        primary_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        helper_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending_confirmation',
        confirmation_deadline TEXT,
        confirmed_at TEXT,
        confirmed_by INTEGER REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `, []);
    await createIndexIfColumnExists(db, 'idx_gym_reservations_primary_user', 'gym_reservations', 'primary_user_id');
    await createIndexIfColumnExists(db, 'idx_gym_reservations_helper_user', 'gym_reservations', 'helper_user_id');
    await createIndexIfColumnExists(db, 'idx_gym_reservations_status', 'gym_reservations', 'status');
    await createIndexIfColumnExists(db, 'idx_gym_reservations_date', 'gym_reservations', 'date');
    await db.run(`
      ALTER TABLE gym_reservations
      DROP CONSTRAINT IF EXISTS gym_reservations_status_check
    `, []);
    await db.run(`
      ALTER TABLE gym_reservations
      ADD CONSTRAINT gym_reservations_status_check
        CHECK (status IN ('pending', 'checked_in', 'checked_out', 'cancelled'))
    `, []);

    await db.run(`
      ALTER TABLE gym_reservations
      ADD COLUMN IF NOT EXISTS user_name TEXT
    `, []);

    // Create crash_logs table
    await db.run(`
      CREATE TABLE IF NOT EXISTS crash_logs (
        id SERIAL PRIMARY KEY,
        userid INTEGER,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        error_name TEXT,
        device_info TEXT,
        app_version TEXT,
        os_version TEXT,
        platform TEXT,
        screen_name TEXT,
        user_actions TEXT,
        additional_data TEXT,
        createdat TEXT NOT NULL,
        FOREIGN KEY (userid) REFERENCES users(id) ON DELETE SET NULL
      )
    `, []);
    console.log('Crash logs table created or already exists');

    // Create indexes for crash_logs table
    await createIndexIfColumnExists(db, 'idx_crash_logs_userid', 'crash_logs', 'userid');
    await createIndexIfColumnExists(db, 'idx_crash_logs_createdat', 'crash_logs', 'createdat');

    console.log('Database initialization completed');

    // Initialize default users after database tables are created
    await initDefaultUsers();
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

/**
 * Ensure sessions.id has SERIAL/sequence default so inserts auto-populate
 */
async function ensureSessionsIdSerial(db) {
  try {
    const columnInfo = await db.get(
      `SELECT column_default FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'id'`,
      []
    );

    if (!columnInfo || !columnInfo.column_default || !columnInfo.column_default.includes('nextval')) {
      await db.run(`CREATE SEQUENCE IF NOT EXISTS sessions_id_seq`, []);
      await db.run(
        `ALTER TABLE sessions ALTER COLUMN id SET DEFAULT nextval('sessions_id_seq')`,
        []
      );
      await db.run(
        `ALTER SEQUENCE sessions_id_seq OWNED BY sessions.id`,
        []
      );
      console.log('Ensured sessions.id uses sessions_id_seq serial default');
    }
  } catch (error) {
    console.error('Error ensuring sessions.id serial default:', error);
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
