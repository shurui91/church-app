import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');

// Log database path on startup (helpful for debugging Railway deployment)
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  console.log(`[Database] Using database at: ${DB_PATH}`);
  console.log(`[Database] DB_PATH env var: ${process.env.DB_PATH || '(not set, using default)'}`);
}

/**
 * Get database connection
 * Returns a promise-based database instance
 */
export function getDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
    });

    // Convert callback-based methods to promise-based
    // Note: db.run() needs special handling to return {lastID, changes}
    const dbPromises = {
      get: promisify(db.get.bind(db)),
      all: promisify(db.all.bind(db)),
      run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          db.run(sql, params, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                lastID: this.lastID,
                changes: this.changes,
              });
            }
          });
        });
      },
      close: promisify(db.close.bind(db)),
      db: db, // Keep reference to original db for transaction support
    };

    resolve(dbPromises);
  });
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
  const dbPromises = await getDatabase();
  const db = dbPromises.db;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      callback(dbPromises)
        .then((result) => {
          db.run('COMMIT', (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              dbPromises.close();
              resolve(result);
            }
          });
        })
        .catch((err) => {
          db.run('ROLLBACK', () => {
            dbPromises.close();
            reject(err);
          });
        });
    });
  });
}
