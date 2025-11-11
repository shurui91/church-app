import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * CrashLog Model
 * Handles all database operations for crash_logs table
 */
export class CrashLog {
  /**
   * Normalize field names from database (handle PostgreSQL case sensitivity)
   */
  static normalizeCrashLogFields(log) {
    if (!log) return null;
    
    const fieldMap = {
      'userid': 'userId',
      'error_message': 'errorMessage',
      'error_stack': 'errorStack',
      'error_name': 'errorName',
      'device_info': 'deviceInfo',
      'app_version': 'appVersion',
      'os_version': 'osVersion',
      'screen_name': 'screenName',
      'user_actions': 'userActions',
      'additional_data': 'additionalData',
      'createdat': 'createdAt',
    };
    
    const normalized = {};
    for (const [key, value] of Object.entries(log)) {
      const cleanKey = key.replace(/"/g, '');
      const lowerKey = cleanKey.toLowerCase();
      
      if (fieldMap[lowerKey]) {
        normalized[fieldMap[lowerKey]] = value;
      } else {
        normalized[cleanKey] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Create a new crash log entry
   * @param {Object} logData - Crash log data
   * @param {number} [logData.userId] - User ID (optional)
   * @param {string} logData.errorMessage - Error message
   * @param {string} [logData.errorStack] - Error stack trace
   * @param {string} [logData.errorName] - Error name/type
   * @param {string} [logData.deviceInfo] - Device information (JSON string)
   * @param {string} [logData.appVersion] - App version
   * @param {string} [logData.osVersion] - OS version
   * @param {string} [logData.platform] - Platform (ios/android/web)
   * @param {string} [logData.screenName] - Screen name where crash occurred
   * @param {string} [logData.userActions] - User actions before crash (JSON string)
   * @param {string} [logData.additionalData] - Additional data (JSON string)
   * @returns {Promise<Object>} Created crash log object
   */
  static async create(logData) {
    const db = getDatabase();
    const timestamp = getCurrentTimestamp();
    
    const {
      userId = null,
      errorMessage,
      errorStack = null,
      errorName = null,
      deviceInfo = null,
      appVersion = null,
      osVersion = null,
      platform = null,
      screenName = null,
      userActions = null,
      additionalData = null,
    } = logData;

    if (!errorMessage) {
      throw new Error('errorMessage is required');
    }

    try {
      const result = await db.run(
        `INSERT INTO crash_logs (
          userid, error_message, error_stack, error_name,
          device_info, app_version, os_version, platform,
          screen_name, user_actions, additional_data, createdat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          userId,
          errorMessage,
          errorStack,
          errorName,
          deviceInfo,
          appVersion,
          osVersion,
          platform,
          screenName,
          userActions,
          additionalData,
          timestamp,
        ]
      );

      const logId = result.rows[0].id;
      return await this.findById(logId);
    } catch (error) {
      console.error('[CrashLog.create] Error creating crash log:', error);
      throw error;
    }
  }

  /**
   * Find crash log by ID
   * @param {number} id - Crash log ID
   * @returns {Promise<Object|null>} Crash log object or null
   */
  static async findById(id) {
    const db = getDatabase();
    
    try {
      const result = await db.get(
        `SELECT * FROM crash_logs WHERE id = $1`,
        [id]
      );

      if (!result) return null;
      return this.normalizeCrashLogFields(result);
    } catch (error) {
      console.error('[CrashLog.findById] Error finding crash log:', error);
      throw error;
    }
  }

  /**
   * Get all crash logs with optional filters
   * @param {Object} options - Query options
   * @param {number} [options.userId] - Filter by user ID
   * @param {number} [options.limit] - Limit number of results
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.startDate] - Filter by start date (YYYY-MM-DD)
   * @param {string} [options.endDate] - Filter by end date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of crash log objects
   */
  static async findAll(options = {}) {
    const db = getDatabase();
    const {
      userId = null,
      limit = 100,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;

    try {
      let query = 'SELECT * FROM crash_logs WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (userId !== null) {
        query += ` AND userid = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND createdat >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND createdat <= $${paramIndex}`;
        params.push(endDate + ' 23:59:59');
        paramIndex++;
      }

      query += ` ORDER BY createdat DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await db.all(query, params);
      return result.map(log => this.normalizeCrashLogFields(log));
    } catch (error) {
      console.error('[CrashLog.findAll] Error finding crash logs:', error);
      throw error;
    }
  }

  /**
   * Get crash log count
   * @param {Object} options - Query options
   * @param {number} [options.userId] - Filter by user ID
   * @returns {Promise<number>} Count of crash logs
   */
  static async count(options = {}) {
    const db = getDatabase();
    const { userId = null } = options;

    try {
      let query = 'SELECT COUNT(*) as count FROM crash_logs WHERE 1=1';
      const params = [];

      if (userId !== null) {
        query += ' AND userid = $1';
        params.push(userId);
      }

      const result = await db.get(query, params);
      return parseInt(result.count) || 0;
    } catch (error) {
      console.error('[CrashLog.count] Error counting crash logs:', error);
      throw error;
    }
  }

  /**
   * Delete crash log by ID
   * @param {number} id - Crash log ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async deleteById(id) {
    const db = getDatabase();
    
    try {
      const result = await db.run(
        `DELETE FROM crash_logs WHERE id = $1`,
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error('[CrashLog.deleteById] Error deleting crash log:', error);
      throw error;
    }
  }
}

