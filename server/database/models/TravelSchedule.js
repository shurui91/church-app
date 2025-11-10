import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * TravelSchedule Model
 * Handles all database operations for travel_schedules table
 */
export class TravelSchedule {
  /**
   * Normalize field names from database (handle PostgreSQL case sensitivity)
   * PostgreSQL returns field names in lowercase, this function converts them to camelCase
   */
  static normalizeTravelScheduleFields(schedule) {
    if (!schedule) return null;
    
    // Map various field name formats to camelCase
    const fieldMap = {
      'userid': 'userId',
      'startdate': 'startDate',
      'enddate': 'endDate',
      'createdat': 'createdAt',
      'updatedat': 'updatedAt',
    };
    
    const normalized = {};
    for (const [key, value] of Object.entries(schedule)) {
      // Remove quotes if present
      const cleanKey = key.replace(/"/g, '');
      const lowerKey = cleanKey.toLowerCase();
      
      // Check if we have a mapping for this field
      if (fieldMap[lowerKey]) {
        normalized[fieldMap[lowerKey]] = value;
      } else {
        // Keep original key for fields that don't need normalization (id, destination, notes)
        normalized[cleanKey] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Create a new travel schedule
   * @param {number} userId - User ID
   * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
   * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
   * @param {string} [destination] - Destination (optional)
   * @param {string} [notes] - Notes (optional)
   * @returns {Promise<Object>} Created travel schedule object
   */
  static async create(userId, startDate, endDate, destination = null, notes = null) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      // PostgreSQL stores field names in lowercase
      const result = await db.run(
        `INSERT INTO travel_schedules (userid, startdate, enddate, destination, notes, createdat, updatedat)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [userId, startDate, endDate, destination, notes, now, now]
      );

      if (!result.lastID) {
        throw new Error('Failed to get inserted record ID');
      }

      return await this.findById(result.lastID);
    } finally {
      await db.close();
    }
  }

  /**
   * Update an existing travel schedule
   * @param {number} id - Travel schedule ID
   * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
   * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
   * @param {string} [destination] - Destination (optional)
   * @param {string} [notes] - Notes (optional)
   * @returns {Promise<Object>} Updated travel schedule object
   */
  static async update(id, startDate, endDate, destination = null, notes = null) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      await db.run(
        `UPDATE travel_schedules 
         SET startdate = ?, enddate = ?, destination = ?, notes = ?, updatedat = ?
         WHERE id = ?`,
        [startDate, endDate, destination, notes, now, id]
      );

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Delete a travel schedule
   * @param {number} id - Travel schedule ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async delete(id) {
    const db = await getDatabase();

    try {
      const result = await db.run(
        `DELETE FROM travel_schedules WHERE id = ?`,
        [id]
      );

      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Find travel schedule by ID
   * @param {number} id - Travel schedule ID
   * @returns {Promise<Object|null>} Travel schedule object or null if not found
   */
  static async findById(id) {
    const db = await getDatabase();

    try {
      const schedule = await db.get(
        `SELECT ts.*, u.namezh, u.nameen, u.name, u.phonenumber
         FROM travel_schedules ts
         JOIN users u ON ts.userid = u.id
         WHERE ts.id = ?`,
        [id]
      );

      if (!schedule) return null;

      const normalized = this.normalizeTravelScheduleFields(schedule);
      
      // Ensure userId is set (in case normalization didn't work)
      if (!normalized.userId && schedule.userid) {
        normalized.userId = parseInt(schedule.userid);
      }
      
      // Add user info
      normalized.user = {
        id: schedule.userid,
        nameZh: schedule.namezh,
        nameEn: schedule.nameen,
        name: schedule.name,
        phoneNumber: schedule.phonenumber,
      };

      console.log('[TravelSchedule.findById] Raw schedule:', schedule);
      console.log('[TravelSchedule.findById] Normalized schedule:', normalized);

      return normalized;
    } finally {
      await db.close();
    }
  }

  /**
   * Find all travel schedules for a specific user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of travel schedule objects
   */
  static async findByUserId(userId) {
    const db = await getDatabase();

    try {
      const schedules = await db.all(
        `SELECT ts.*, u.namezh, u.nameen, u.name, u.phonenumber
         FROM travel_schedules ts
         JOIN users u ON ts.userid = u.id
         WHERE ts.userid = ?
         ORDER BY ts.startdate ASC, ts.enddate ASC`,
        [userId]
      );

      return schedules.map(schedule => {
        const normalized = this.normalizeTravelScheduleFields(schedule);
        normalized.user = {
          id: schedule.userid,
          nameZh: schedule.namezh,
          nameEn: schedule.nameen,
          name: schedule.name,
          phoneNumber: schedule.phonenumber,
        };
        return normalized;
      });
    } finally {
      await db.close();
    }
  }

  /**
   * Find all travel schedules within a date range
   * @param {string} startDate - Start date in ISO format (YYYY-MM-DD)
   * @param {string} endDate - End date in ISO format (YYYY-MM-DD)
   * @param {number} [userId] - Optional user ID to filter by
   * @returns {Promise<Array>} Array of travel schedule objects
   */
  static async findByDateRange(startDate, endDate, userId = null) {
    const db = await getDatabase();

    try {
      let sql = `
        SELECT ts.*, u.namezh, u.nameen, u.name, u.phonenumber
        FROM travel_schedules ts
        JOIN users u ON ts.userid = u.id
        WHERE (ts.startdate <= ? AND ts.enddate >= ?)
      `;
      const params = [endDate, startDate];

      if (userId) {
        sql += ` AND ts.userid = ?`;
        params.push(userId);
      }

      sql += ` ORDER BY ts.startdate ASC, ts.enddate ASC`;

      const schedules = await db.all(sql, params);

      return schedules.map(schedule => {
        const normalized = this.normalizeTravelScheduleFields(schedule);
        normalized.user = {
          id: schedule.userid,
          nameZh: schedule.namezh,
          nameEn: schedule.nameen,
          name: schedule.name,
          phoneNumber: schedule.phonenumber,
        };
        return normalized;
      });
    } finally {
      await db.close();
    }
  }

  /**
   * Find all travel schedules for a specific date
   * @param {string} date - Date in ISO format (YYYY-MM-DD)
   * @param {number} [userId] - Optional user ID to filter by
   * @returns {Promise<Array>} Array of travel schedule objects
   */
  static async findByDate(date, userId = null) {
    const db = await getDatabase();

    try {
      let sql = `
        SELECT ts.*, u.namezh, u.nameen, u.name, u.phonenumber
        FROM travel_schedules ts
        JOIN users u ON ts.userid = u.id
        WHERE ts.startdate <= ? AND ts.enddate >= ?
      `;
      const params = [date, date];

      if (userId) {
        sql += ` AND ts.userid = ?`;
        params.push(userId);
      }

      sql += ` ORDER BY ts.startdate ASC, ts.enddate ASC`;

      const schedules = await db.all(sql, params);

      return schedules.map(schedule => {
        const normalized = this.normalizeTravelScheduleFields(schedule);
        normalized.user = {
          id: schedule.userid,
          nameZh: schedule.namezh,
          nameEn: schedule.nameen,
          name: schedule.name,
          phoneNumber: schedule.phonenumber,
        };
        return normalized;
      });
    } finally {
      await db.close();
    }
  }

  /**
   * Find all travel schedules (with optional filters)
   * @param {Object} [filters] - Optional filters
   * @param {number} [filters.userId] - Filter by user ID
   * @param {string} [filters.startDate] - Filter by start date (YYYY-MM-DD)
   * @param {string} [filters.endDate] - Filter by end date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of travel schedule objects
   */
  static async findAll(filters = {}) {
    const db = await getDatabase();

    try {
      let sql = `
        SELECT ts.*, u.namezh, u.nameen, u.name, u.phonenumber
        FROM travel_schedules ts
        JOIN users u ON ts.userid = u.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.userId) {
        sql += ` AND ts.userid = ?`;
        params.push(filters.userId);
      }

      if (filters.startDate) {
        sql += ` AND ts.enddate >= ?`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        sql += ` AND ts.startdate <= ?`;
        params.push(filters.endDate);
      }

      sql += ` ORDER BY ts.startdate ASC, ts.enddate ASC`;

      const schedules = await db.all(sql, params);

      return schedules.map(schedule => {
        const normalized = this.normalizeTravelScheduleFields(schedule);
        normalized.user = {
          id: schedule.userid,
          nameZh: schedule.namezh,
          nameEn: schedule.nameen,
          name: schedule.name,
          phoneNumber: schedule.phonenumber,
        };
        return normalized;
      });
    } finally {
      await db.close();
    }
  }
}

