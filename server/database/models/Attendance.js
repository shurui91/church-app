import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * Attendance Model
 * Handles all database operations for attendance table
 */
export class Attendance {
  /**
   * Create or update an attendance record
   * If a record with the same date, meetingType, and createdBy exists, it will be updated
   * @param {string} date - Date in ISO format (YYYY-MM-DD)
   * @param {string} meetingType - Meeting type: 'table'/'homeMeeting'/'prayer'
   * @param {number} adultCount - Number of adults
   * @param {number} youthChildCount - Number of youth/children
   * @param {number} createdBy - User ID who created the record
   * @param {string} [district] - District (optional)
   * @param {string} [notes] - Notes (optional)
   * @returns {Promise<Object>} Created or updated attendance object
   */
  static async createOrUpdate(
    date,
    meetingType,
    adultCount,
    youthChildCount,
    createdBy,
    district = null,
    notes = null
  ) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      // Check if record already exists
      const existing = await db.get(
        'SELECT id FROM attendance WHERE date = ? AND meetingType = ? AND createdBy = ?',
        [date, meetingType, createdBy]
      );

      if (existing) {
        // Update existing record
        await db.run(
          `UPDATE attendance 
           SET adultCount = ?, youthChildCount = ?, district = ?, notes = ?, updatedAt = ?
           WHERE id = ?`,
          [adultCount, youthChildCount, district, notes, now, existing.id]
        );
        return await this.findById(existing.id);
      } else {
        // Insert new record
        const result = await db.run(
          `INSERT INTO attendance (date, meetingType, adultCount, youthChildCount, createdBy, district, notes, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [date, meetingType, adultCount, youthChildCount, createdBy, district, notes, now, now]
        );

        return await this.findById(result.lastID);
      }
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
      return attendance || null;
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
      let sql = 'SELECT * FROM attendance WHERE createdBy = ? ORDER BY date DESC, createdAt DESC';
      const params = [createdBy];

      if (limit !== null) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const records = await db.all(sql, params);
      return records || [];
    } finally {
      await db.close();
    }
  }

  /**
   * Find all attendance records (admin only)
   * @param {number} [limit] - Limit number of records
   * @param {number} [offset] - Offset for pagination
   * @returns {Promise<Array>} Array of attendance records
   */
  static async findAll(limit = null, offset = 0) {
    const db = await getDatabase();
    try {
      let sql = 'SELECT * FROM attendance ORDER BY date DESC, createdAt DESC';
      const params = [];

      if (limit !== null) {
        sql += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      const records = await db.all(sql, params);
      return records || [];
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
      const result = await db.get(
        'SELECT COUNT(*) as count FROM attendance WHERE createdBy = ?',
        [createdBy]
      );
      return result?.count || 0;
    } finally {
      await db.close();
    }
  }
}

