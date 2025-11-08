import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get PostgreSQL configuration from environment variables
 * Supports both DATABASE_URL (Railway/Heroku style) and individual PG* variables
 */
function getPostgreSQLConfig() {
  // If DATABASE_URL is provided, use it (Railway/Heroku style)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
    };
  }

  // Otherwise, use individual environment variables
  return {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
    database: process.env.DB_NAME || process.env.PGDATABASE || 'church_cerritos',
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
    ssl: process.env.DB_SSL === 'true' || process.env.RAILWAY_ENVIRONMENT 
      ? { rejectUnauthorized: false } 
      : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pgConfig = getPostgreSQLConfig();

// Log database connection info (without password)
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  console.log(`[Database] Connecting to PostgreSQL`);
  if (process.env.DATABASE_URL) {
    console.log(`[Database] Using DATABASE_URL (connection string)`);
  } else {
    console.log(`[Database] Host: ${pgConfig.host}, Port: ${pgConfig.port}, Database: ${pgConfig.database}, User: ${pgConfig.user}`);
  }
}

const pool = new Pool(pgConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Convert SQLite-style placeholders (?) to PostgreSQL placeholders ($1, $2, ...)
 */
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Get database connection
 * Returns a promise-based database instance compatible with SQLite API
 */
export async function getDatabase() {
  return {
    get: async (sql, params = []) => {
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    },
    all: async (sql, params = []) => {
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        return result.rows;
      } finally {
        client.release();
      }
    },
    run: async (sql, params = []) => {
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        // For INSERT with RETURNING id, extract the id
        if (result.rows && result.rows.length > 0 && result.rows[0].id) {
          return {
            lastID: result.rows[0].id,
            changes: result.rowCount || 0,
          };
        }
        return {
          lastID: null,
          changes: result.rowCount || 0,
        };
      } finally {
        client.release();
      }
    },
    close: async () => {
      // PostgreSQL connection pool doesn't need explicit close per query
      // The pool manages connections automatically
      return Promise.resolve();
    },
    pool: pool, // Expose pool for transaction support
  };
}

/**
 * Helper function to get current timestamp in ISO format
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Helper function to create a transaction
 */
export async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create a database-like object for the transaction
    const dbPromises = {
      get: async (sql, params = []) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        return result.rows[0] || null;
      },
      all: async (sql, params = []) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        return result.rows;
      },
      run: async (sql, params = []) => {
        const convertedSql = convertPlaceholders(sql);
        const result = await client.query(convertedSql, params);
        if (result.rows && result.rows.length > 0 && result.rows[0].id) {
          return {
            lastID: result.rows[0].id,
            changes: result.rowCount || 0,
          };
        }
        return {
          lastID: null,
          changes: result.rowCount || 0,
        };
      },
      close: async () => Promise.resolve(),
    };

    const result = await callback(dbPromises);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
