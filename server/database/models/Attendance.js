import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * Attendance Model
 * Handles all database operations for attendance table
 */
export class Attendance {
  /**
   * Normalize field names from database (handle PostgreSQL case sensitivity)
   * PostgreSQL returns field names with quotes (e.g., "meetingType", "scopeValue")
   * This function converts them to camelCase for the application layer
   */
  static normalizeAttendanceFields(attendance) {
    if (!attendance) return null;
    
    // Map various field name formats to camelCase
    // PostgreSQL may return: lowercase, camelCase, or quoted identifiers
    const fieldMap = {
      'meetingtype': 'meetingType',
      'scopevalue': 'scopeValue',
      'adultcount': 'adultCount',
      'youthchildcount': 'youthChildCount',
      'createdby': 'createdBy',
      'createdat': 'createdAt',
      'updatedat': 'updatedAt',
    };
    
    const normalized = {};
    for (const [key, value] of Object.entries(attendance)) {
      // Remove quotes if present
      const cleanKey = key.replace(/"/g, '');
      const lowerKey = cleanKey.toLowerCase();
      
      // Check if we have a mapping for this field (try lowercase first, then original)
      if (fieldMap[lowerKey]) {
        normalized[fieldMap[lowerKey]] = value;
      } else if (fieldMap[cleanKey]) {
        normalized[fieldMap[cleanKey]] = value;
      } else {
        // Keep original key for fields that don't need normalization (id, date, scope, district, notes)
        normalized[cleanKey] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Create or update an attendance record
   * Logic:
   * - If id is provided, update the record with that id directly
   * - For full_congregation: Allows multiple records (same date + meetingType can have multiple entries)
   * - For small_group/district: If same date + meetingType + scopeValue exists, update it; otherwise insert new
   * @param {string} date - Date in ISO format (YYYY-MM-DD)
   * @param {string} meetingType - Meeting type: 'table'/'homeMeeting'/'prayer'
   * @param {string} scope - Scope: 'full_congregation'/'district'/'small_group'
   * @param {string} [scopeValue] - Scope value (district name or group number, optional)
   * @param {number} adultCount - Number of adults
   * @param {number} youthChildCount - Number of youth/children
   * @param {number} createdBy - User ID who created the record
   * @param {string} [district] - District (optional, kept for backward compatibility)
   * @param {string} [notes] - Notes (optional)
   * @param {number} [id] - Record ID (optional, if provided, update this record directly)
   * @returns {Promise<Object>} Created or updated attendance object
   */
  static async createOrUpdate(
    date,
    meetingType,
    scope,
    scopeValue,
    adultCount,
    youthChildCount,
    createdBy,
    district = null,
    notes = null,
    id = null
  ) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    // Normalize scopeValue: null for full_congregation (define outside try block for use in catch)
    const normalizedScopeValue = scope === 'full_congregation' ? null : (scopeValue || null);

    try {
      // If id is provided, update the record directly by ID
      // Convert id to number if it's a string
      const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
      
      // Use console.error for higher priority logging to avoid rate limiting
      console.error('[Attendance.createOrUpdate] CHECK - id:', id, 'numericId:', numericId, 'type:', typeof id, 'isValid:', numericId !== null && numericId !== undefined && !isNaN(numericId) && numericId > 0);
      
      if (numericId !== null && numericId !== undefined && !isNaN(numericId) && numericId > 0) {
        // Verify the record exists and belongs to the user (or user has permission)
        const existing = await this.findById(numericId);
        if (!existing) {
          console.error('[Attendance.createOrUpdate] ERROR: Record with id not found:', numericId);
          throw new Error(`Record with id ${numericId} not found`);
        }
        
        console.error('[Attendance.createOrUpdate] UPDATE START - id:', numericId, 'date:', date);
        
        // Update all fields including date, meetingType, scope, scopeValue
        const updateResult = await db.run(
          `UPDATE attendance 
           SET date = ?, meetingtype = ?, scope = ?, scopevalue = ?, adultcount = ?, youthchildcount = ?, createdby = ?, district = ?, notes = ?, updatedat = ?
           WHERE id = ?`,
          [date, meetingType, scope, normalizedScopeValue, adultCount, youthChildCount, createdBy, district, notes, now, numericId]
        );
        
        console.error('[Attendance.createOrUpdate] UPDATE RESULT - rowsAffected:', updateResult?.changes || 'unknown');
        
        const updated = await this.findById(numericId);
        console.error('[Attendance.createOrUpdate] UPDATE SUCCESS - returned id:', updated?.id);
        return updated;
      }
      
      console.error('[Attendance.createOrUpdate] CREATE MODE - id was:', id, 'numericId was:', numericId);

      // PostgreSQL stores field names in lowercase
      if (scope === 'full_congregation') {
        // For full_congregation, always insert new record (allow multiple records)
        // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
        // Note: id is SERIAL PRIMARY KEY, so it's automatically generated and should not be included in INSERT
        const result = await db.run(
          `INSERT INTO attendance (date, meetingtype, scope, scopevalue, adultcount, youthchildcount, createdby, district, notes, createdat, updatedat)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
          [date, meetingType, scope, normalizedScopeValue, adultCount, youthChildCount, createdBy, district, notes, now, now]
        );
        console.log('[Attendance.createOrUpdate] Insert result:', result);
        if (!result.lastID) {
          throw new Error('Failed to get inserted record ID');
        }
        return await this.findById(result.lastID);
      } else {
        // For small_group/district, check if record with same date + meetingType + scope + scopeValue exists
        // (regardless of createdBy - new data overwrites old)
        // PostgreSQL requires explicit type handling for NULL comparisons
        // Use quoted field names to match table schema
        let existing;
        if (normalizedScopeValue === null || normalizedScopeValue === undefined) {
          existing = await db.get(
            `SELECT id FROM attendance 
             WHERE date = ? AND meetingtype = ? AND scope = ? 
             AND scopevalue IS NULL`,
            [date, meetingType, scope]
          );
        } else {
          existing = await db.get(
            `SELECT id FROM attendance 
             WHERE date = ? AND meetingtype = ? AND scope = ? 
             AND scopevalue = ?`,
            [date, meetingType, scope, normalizedScopeValue]
          );
        }

        if (existing) {
          // Get the id (PostgreSQL returns lowercase field names)
          const existingId = existing.id || existing.ID || existing.Id;
          console.log('[Attendance.createOrUpdate] Found existing record with id:', existingId);
          
          // Update existing record (overwrite with new data)
          // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
          await db.run(
            `UPDATE attendance 
             SET adultcount = ?, youthchildcount = ?, createdby = ?, district = ?, notes = ?, updatedat = ?
             WHERE id = ?`,
            [adultCount, youthChildCount, createdBy, district, notes, now, existingId]
          );
          return await this.findById(existingId);
        } else {
          // Insert new record
          // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
          // Note: id is SERIAL PRIMARY KEY, so it's automatically generated and should not be included in INSERT
          const result = await db.run(
            `INSERT INTO attendance (date, meetingtype, scope, scopevalue, adultcount, youthchildcount, createdby, district, notes, createdat, updatedat)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            [date, meetingType, scope, normalizedScopeValue, adultCount, youthChildCount, createdBy, district, notes, now, now]
          );
          console.log('[Attendance.createOrUpdate] Insert result:', result);
          if (!result.lastID) {
            throw new Error('Failed to get inserted record ID');
          }
          return await this.findById(result.lastID);
        }
      }
    } catch (error) {
      console.error('[Attendance.createOrUpdate] Error:', error);
      console.error('[Attendance.createOrUpdate] Error code:', error.code);
      console.error('[Attendance.createOrUpdate] Error message:', error.message);
      console.error('[Attendance.createOrUpdate] Parameters:', {
        date,
        meetingType,
        scope,
        scopeValue: normalizedScopeValue,
        adultCount,
        youthChildCount,
        createdBy,
        district,
      });
      
      // Handle UNIQUE constraint violation (fallback)
      if (error.message && (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key'))) {
        // Try to find and update the existing record
        // Use quoted field names to match table schema
        // PostgreSQL requires explicit type handling for NULL comparisons
        let existing;
        if (normalizedScopeValue === null || normalizedScopeValue === undefined) {
          existing = await db.get(
            `SELECT id FROM attendance 
             WHERE date = ? AND meetingtype = ? AND scope = ? 
             AND scopevalue IS NULL`,
            [date, meetingType, scope]
          );
        } else {
          existing = await db.get(
            `SELECT id FROM attendance 
             WHERE date = ? AND meetingtype = ? AND scope = ? 
             AND scopevalue = ?`,
            [date, meetingType, scope, normalizedScopeValue]
          );
        }
        
        if (existing) {
          // Get the id (PostgreSQL returns lowercase field names)
          const existingId = existing.id || existing.ID || existing.Id;
          console.log('[Attendance.createOrUpdate] Found existing record (fallback) with id:', existingId);
          
          // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
          await db.run(
            `UPDATE attendance 
             SET adultcount = ?, youthchildcount = ?, createdby = ?, district = ?, notes = ?, updatedat = ?
             WHERE id = ?`,
            [adultCount, youthChildCount, createdBy, district, notes, now, existingId]
          );
          return await this.findById(existingId);
        }
      }
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Find attendance record by ID
   * @param {number} id - Attendance ID
   * @returns {Promise<Object|null>} Attendance object or null if not found
   */
  static async findById(id) {
    const db = await getDatabase();
    try {
      const attendance = await db.get(
        'SELECT * FROM attendance WHERE id = ?',
        [id]
      );
      return this.normalizeAttendanceFields(attendance);
    } finally {
      await db.close();
    }
  }

  /**
   * Find all attendance records for a user
   * @param {number} createdBy - User ID
   * @param {number} [limit] - Limit number of records
   * @param {number} [offset] - Offset for pagination
   * @returns {Promise<Array>} Array of attendance records
   */
  static async findByUser(createdBy, limit = null, offset = 0) {
    const db = await getDatabase();
    try {
      // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
      let sql = 'SELECT * FROM attendance WHERE createdby = ? ORDER BY date DESC, createdat DESC';
      const params = [createdBy];

      if (limit !== null) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const records = await db.all(sql, params);
      
      if (!records || records.length === 0) {
        return [];
      }
      
      const normalized = records.map(record => this.normalizeAttendanceFields(record));
      return normalized;
    } catch (error) {
      console.error('[Attendance.findByUser] Error:', error);
      console.error('[Attendance.findByUser] Error code:', error.code);
      console.error('[Attendance.findByUser] Error message:', error.message);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Find all attendance records (admin only)
   * @param {number} [limit] - Limit number of records
   * @param {number} [offset] - Offset for pagination
   * @param {string} [meetingType] - Optional filter by meeting type ('table', 'homeMeeting', 'prayer')
   * @returns {Promise<Array>} Array of attendance records
   */
  static async findAll(limit = null, offset = 0, meetingType = null) {
    const db = await getDatabase();
    try {
      // Use lowercase field names (PostgreSQL converts unquoted identifiers to lowercase)
      let sql = 'SELECT * FROM attendance';
      const params = [];

      // Add meetingType filter if provided
      if (meetingType) {
        sql += ' WHERE meetingtype = ?';
        params.push(meetingType);
      }

      sql += ' ORDER BY date DESC, createdat DESC';

      if (limit !== null) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const records = await db.all(sql, params);
      
      if (!records || records.length === 0) {
        return [];
      }
      
      const normalized = records.map(record => this.normalizeAttendanceFields(record));
      return normalized;
    } catch (error) {
      console.error('[Attendance.findAll] Error:', error);
      console.error('[Attendance.findAll] Error code:', error.code);
      console.error('[Attendance.findAll] Error message:', error.message);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Delete attendance record
   * @param {number} id - Attendance ID
   * @param {number} userId - User ID (for permission check)
   * @param {boolean} isAdmin - Whether user is admin
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async delete(id, userId, isAdmin = false) {
    const db = await getDatabase();
    try {
      // Check if record exists and user has permission
      const record = await this.findById(id);
      if (!record) {
        return false;
      }

      // Only allow deletion if user created the record or is admin
      if (record.createdBy !== userId && !isAdmin) {
        return false;
      }

      const result = await db.run(
        'DELETE FROM attendance WHERE id = ?',
        [id]
      );

      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Get count of attendance records for a user
   * @param {number} createdBy - User ID
   * @returns {Promise<number>} Count of records
   */
  static async countByUser(createdBy) {
    const db = await getDatabase();
    try {
      // PostgreSQL stores field names in lowercase
      const result = await db.get(
        'SELECT COUNT(*) as count FROM attendance WHERE createdby = ?',
        [createdBy]
      );
      return result?.count || 0;
    } finally {
      await db.close();
    }
  }
}

