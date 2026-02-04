import { getDatabase } from '../database/db.js';

/**
 * Remove legacy simplified/traditional columns from users table.
 * Run via: node scripts/remove-chinese-variants.js
 */
export async function removeChineseVariantColumns() {
  const db = await getDatabase();
  try {
    await db.run(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS namezhsimp,
      DROP COLUMN IF EXISTS namezhtrad
    `);
    console.log('✅ namezhsimp and namezhtrad columns removed (if they existed).');
  } finally {
    await db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  removeChineseVariantColumns()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to remove columns:', err);
      process.exit(1);
    });
}
