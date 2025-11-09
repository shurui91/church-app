import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

/**
 * Get PostgreSQL configuration from environment variables
 * Supports both DATABASE_URL (Railway/Heroku style) and individual PG* variables
 */
function getPostgreSQLConfig() {
  // Check for DATABASE_URL first (Railway/Heroku style)
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRIVATE_URL;
  
  if (databaseUrl) {
    // Parse DATABASE_URL to check if it needs SSL
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      connectionString: databaseUrl,
      ssl: (isRailway || isProduction) ? { rejectUnauthorized: false } : false,
    };
  }

  // Check for Railway-specific PostgreSQL variables
  // Railway sometimes uses PGHOST, PGPORT, etc. when PostgreSQL service is added
  const host = process.env.PGHOST || process.env.DB_HOST || process.env.POSTGRES_HOST;
  const port = process.env.PGPORT || process.env.DB_PORT || process.env.POSTGRES_PORT;
  const database = process.env.PGDATABASE || process.env.DB_NAME || process.env.POSTGRES_DATABASE;
  const user = process.env.PGUSER || process.env.DB_USER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;

  // If we have Railway PostgreSQL variables, use them
  if (host && database && user && password) {
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
    
    return {
      host,
      port: parseInt(port || '5432'),
      database,
      user,
      password,
      ssl: isRailway ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  // Fallback to defaults (for local development)
  return {
    host: 'localhost',
    port: 5432,
    database: 'church_cerritos',
    user: 'postgres',
    password: '',
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pgConfig = getPostgreSQLConfig();

// Log database connection info (without password) - always log in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
if (isProduction) {
  console.log(`[Database] Connecting to PostgreSQL`);
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRIVATE_URL;
  if (databaseUrl) {
    // Mask password in connection string for logging
    const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`[Database] Using DATABASE_URL: ${maskedUrl}`);
  } else if (pgConfig.host) {
    console.log(`[Database] Using individual variables - Host: ${pgConfig.host}, Port: ${pgConfig.port}, Database: ${pgConfig.database}, User: ${pgConfig.user}`);
  } else {
    console.log(`[Database] Using connection string (SSL: ${pgConfig.ssl ? 'enabled' : 'disabled'})`);
  }
  
  // Debug: Log available PostgreSQL-related environment variables (without values)
  const pgVars = Object.keys(process.env).filter(key => 
    key.includes('POSTGRES') || key.includes('DATABASE') || key.includes('PG') || key.includes('DB_')
  );
  if (pgVars.length > 0) {
    console.log(`[Database] Available PostgreSQL env vars: ${pgVars.join(', ')}`);
  } else {
    console.log(`[Database] WARNING: No PostgreSQL environment variables found!`);
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
        console.log('[db.run] SQL:', convertedSql);
        console.log('[db.run] Params:', params);
        const result = await client.query(convertedSql, params);
        console.log('[db.run] Query result:', {
          rowCount: result.rowCount,
          rows: result.rows,
          command: result.command,
        });
        // For INSERT with RETURNING id, extract the id
        // PostgreSQL returns the id in the first row
        if (result.rows && result.rows.length > 0) {
          // Check for 'id' field (PostgreSQL returns lowercase field names)
          // Also check all possible key variations
          const row = result.rows[0];
          const id = row.id || row.ID || row.Id || row['id'] || row['ID'] || row['Id'];
          console.log('[db.run] Extracted id:', id, 'from row:', row);
          console.log('[db.run] Row keys:', Object.keys(row));
          if (id !== undefined && id !== null) {
            return {
              lastID: id,
              changes: result.rowCount || 0,
            };
          }
        }
        return {
          lastID: null,
          changes: result.rowCount || 0,
        };
      } catch (error) {
        console.error('[db.run] Error executing query:', error);
        console.error('[db.run] SQL:', sql);
        console.error('[db.run] Converted SQL:', convertPlaceholders(sql));
        console.error('[db.run] Params:', params);
        throw error;
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
