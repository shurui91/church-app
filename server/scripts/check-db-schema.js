import { getDatabase } from '../database/db.js';

/**
 * Check database schema and field names
 */
async function checkDatabaseSchema() {
  const db = await getDatabase();
  
  try {
    console.log('Checking database schema...\n');
    
    // Check users table columns
    console.log('=== Users Table Columns ===');
    const userColumns = await db.all(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `, []);
    
    console.log('Column names in database:');
    userColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Check if we can query a user
    console.log('\n=== Testing User Query ===');
    try {
      const testUser = await db.get('SELECT * FROM users LIMIT 1', []);
      if (testUser) {
        console.log('Sample user object keys:');
        console.log('  ', Object.keys(testUser).join(', '));
        console.log('\nSample user data (first user):');
        console.log('  ', JSON.stringify(testUser, null, 2));
      } else {
        console.log('No users found in database');
      }
    } catch (err) {
      console.error('Error querying users:', err.message);
    }
    
    // Check attendance table
    console.log('\n=== Attendance Table Columns ===');
    try {
      const attendanceColumns = await db.all(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'attendance'
        ORDER BY ordinal_position
      `, []);
      
      console.log('Column names in database:');
      attendanceColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } catch (err) {
      console.error('Error checking attendance table:', err.message);
    }
    
    // Check verification_codes table
    console.log('\n=== Verification Codes Table Columns ===');
    try {
      const vcColumns = await db.all(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'verification_codes'
        ORDER BY ordinal_position
      `, []);
      
      console.log('Column names in database:');
      vcColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    } catch (err) {
      console.error('Error checking verification_codes table:', err.message);
    }
    
  } catch (error) {
    console.error('Error checking database schema:', error);
  } finally {
    await db.close();
  }
}

checkDatabaseSchema()
  .then(() => {
    console.log('\n✅ Schema check completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Schema check failed:', err);
    process.exit(1);
  });

