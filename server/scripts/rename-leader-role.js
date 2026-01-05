import { getDatabase } from '../database/db.js';

/**
 * Rename existing 'leader' role rows to 'responsible_one' and replace
 * the users.role CHECK constraint accordingly.
 *
 * Usage: NODE_ENV=production node server/scripts/rename-leader-role.js
 */
async function renameLeaderRole() {
  const db = await getDatabase();
  try {
    console.log('[rename-leader-role] Starting migration...');

    // Update existing rows
    await db.run(
      `UPDATE users
       SET role = 'responsible_one'
       WHERE role = 'leader'`
    );
    console.log('[rename-leader-role] Updated existing leader records.');

    // Find current CHECK constraint name (if any)
    const constraint = await db.get(
      `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
        AND constraint_type = 'CHECK'
        AND constraint_name ILIKE '%role%'
      ORDER BY constraint_name
      LIMIT 1
      `
    );

    if (constraint && constraint.constraint_name) {
      console.log(`[rename-leader-role] Dropping existing constraint ${constraint.constraint_name}`);
      await db.run(
        `ALTER TABLE users DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`
      );
    }

    console.log('[rename-leader-role] Adding updated role constraint');
    await db.run(
      `ALTER TABLE users ADD CONSTRAINT role_check
       CHECK (role IN ('super_admin', 'admin', 'responsible_one', 'member', 'usher'))`
    );

    console.log('[rename-leader-role] Migration completed successfully.');
  } catch (error) {
    console.error('[rename-leader-role] Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

renameLeaderRole();

