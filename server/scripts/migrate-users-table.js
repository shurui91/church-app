import { getDatabase } from '../database/db.js';

const columnsToAdd = [
  { name: 'namezh', definition: 'TEXT' },
  { name: 'namezhsimp', definition: 'TEXT' },
  { name: 'namezhtrad', definition: 'TEXT' },
  { name: 'nameen', definition: 'TEXT' },
  { name: 'district', definition: 'TEXT' },
  { name: 'groupnum', definition: 'TEXT' },
];

const indexes = ['district', 'groupnum', 'namezhsimp', 'namezhtrad'];

async function migrateUsersTable() {
  const db = await getDatabase();
  try {
    console.log('Connected to PostgreSQL for migration');

    for (const column of columnsToAdd) {
      const sql = `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`;
      await db.run(sql);
      console.log(`✅ Ensured column ${column.name}`);
    }

    console.log('Copying existing Chinese names to new columns');
    await db.run(
      `UPDATE users
       SET namezhsimp = COALESCE(namezhsimp, namezh),
           namezhtrad = COALESCE(namezhtrad, namezh)`
    );

    for (const indexColumn of indexes) {
      const indexName = `idx_users_${indexColumn}`;
      await db.run(`CREATE INDEX IF NOT EXISTS ${indexName} ON users (${indexColumn})`);
      console.log(`✅ Ensured index ${indexName}`);
    }

    await addNameTwColumn(db);

    console.log('PostgreSQL users migration completed');
  } finally {
    await db.close();
  }
}

async function addNameTwColumn(db) {
  await db.run('ALTER TABLE users ADD COLUMN IF NOT EXISTS nametw TEXT');
  await db.run('UPDATE users SET nametw = namezh WHERE nametw IS NULL AND namezh IS NOT NULL');
  console.log('✅ Ensured column nametw and copied existing Chinese names');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUsersTable()
    .then(() => {
      console.log('Database migration finished');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database migration failed:', err);
      process.exit(1);
    });
}

