import { getDatabase } from '../database/db.js';

/**
 * Migration to deduplicate attendance records and add unique constraint for non-full_congregation rows.
 * Usage: node server/scripts/migrate-add-attendance-unique-constraint.js
 */
async function runMigration() {
  const db = await getDatabase();
  try {
    console.log('\n📦 Running attendance unique constraint migration...');
    console.log('➡️ Deduplicating existing small_group/district records...');

    await db.run(`
      WITH duplicates AS (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY date, meetingtype, scope, scopevalue
                   ORDER BY updatedat DESC, id DESC
                 ) AS rn
          FROM attendance
          WHERE scope != 'full_congregation'
        ) ranked
        WHERE ranked.rn > 1
      )
      DELETE FROM attendance
      WHERE id IN (SELECT id FROM duplicates)
    `);

    console.log('✅ Deduplication completed');

    console.log('➡️ Creating unique index for small_group/district entries...');
    await db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_scope
      ON attendance(date, meetingtype, scope, scopevalue)
      WHERE scope != 'full_congregation'
    `);

    console.log('✅ Unique constraint ensured');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

runMigration().catch((err) => {
  console.error('Migration script error:', err);
  process.exit(1);
});
