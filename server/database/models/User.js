import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * User Model
 * Handles all database operations for users table
 */
export class User {
  /**
   * Create a new user
   * @param {string} phoneNumber - User's phone number
  * @param {string} role - User role (super_admin, admin, responsible_one, member, usher)
   * @param {string} [name] - User's name (optional, kept for backward compatibility)
   * @param {string} [nameZh] - User's Chinese name (optional)
   * @param {string} [nameTw] - User's Traditional Chinese name (optional)
   * @param {string} [district] - User's district (optional)
   * @param {string} [groupNum] - User's group number (optional)
   * @param {string} [email] - User's email (optional)
   * @param {string} [status] - User status (default: 'active')
   * @param {string} [gender] - User gender (optional)
   * @param {string} [birthdate] - User birthdate (optional)
   * @param {string} [joinDate] - User join date (optional)
   * @param {string} [preferredLanguage] - Preferred language (default: 'zh')
   * @param {string} [notes] - Admin notes (optional)
   * @returns {Promise<Object>} Created user object
   */
  static async create(
    phoneNumber,
    role = 'member',
    name = null,
    nameZh = null,
    nameEn = null,
    district = null,
    groupNum = null,
    email = null,
    status = 'active',
    gender = null,
    birthdate = null,
    joinDate = null,
    preferredLanguage = 'zh',
    notes = null,
    nameTw = null
  ) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      // PostgreSQL stores field names in lowercase, so use lowercase field names
      const result = await db.run(
        `INSERT INTO users (phonenumber, name, namezh, nametw, nameen, role, district, groupnum, email, status, gender, birthdate, joindate, preferredlanguage, notes, createdat, updatedat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [phoneNumber, name, nameZh, nameTw, nameEn, role, district, groupNum, email, status, gender, birthdate, joinDate, preferredLanguage, notes, now, now]
      );

      return {
        id: result.lastID,
        phoneNumber,
        name,
        nameZh,
        nameTw,
        nameEn,
        role,
        district,
        groupNum,
        email,
        status,
        gender,
        birthdate,
        joinDate,
        preferredLanguage,
        notes,
        createdAt: now,
        updatedAt: now,
      };
    } finally {
      await db.close();
    }
  }

  /**
   * Get role statistics for debugging
   */
  static async getRoleStats() {
    const db = await getDatabase();
    try {
      return await db.all('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    } finally {
      await db.close();
    }
  }

  /**
   * Helper to get database instance
   */
  static async getDb() {
    return await getDatabase();
  }

  /**
   * Find user by phone number
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByPhoneNumber(phoneNumber) {
    const db = await getDatabase();
    try {
      // PostgreSQL stores field names in lowercase, so use lowercase field names
      const user = await db.get(
        'SELECT * FROM users WHERE phonenumber = ?',
        [phoneNumber]
      );
      return this.normalizeUserFields(user);
    } catch (error) {
      console.error('[User.findByPhoneNumber] Error:', error);
      console.error('[User.findByPhoneNumber] Error code:', error.code);
      console.error('[User.findByPhoneNumber] Error message:', error.message);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Normalize field names from database (handle PostgreSQL case sensitivity)
   * PostgreSQL may return field names in different cases depending on how they were created
   * This function handles: lowercase, camelCase, and quoted identifiers
   */
  static normalizeUserFields(user) {
    if (!user) return null;
    
    // Map lowercase field names to camelCase
    // PostgreSQL may return field names in lowercase if they weren't created with quotes
    const fieldMap = {
      'phonenumber': 'phoneNumber',
      'namezh': 'nameZh',
      'nametw': 'nameTw',
      'nameen': 'nameEn',
      'groupnum': 'groupNum',
      'createdat': 'createdAt',
      'updatedat': 'updatedAt',
      'lastloginat': 'lastLoginAt',
      'joindate': 'joinDate',
      'preferredlanguage': 'preferredLanguage',
    };
    
    const normalized = {};
    for (const [key, value] of Object.entries(user)) {
      const lowerKey = key.toLowerCase();
      
      // If the key is lowercase and we have a mapping, use the mapped camelCase name
      if (fieldMap[lowerKey] && key === lowerKey) {
        normalized[fieldMap[lowerKey]] = value;
      } else {
        // Keep original key (already in correct format: camelCase, quoted, or simple fields)
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(id) {
    const db = await getDatabase();
    try {
      // PostgreSQL stores field names in lowercase, so use SELECT * to get all fields
      const user = await db.get(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return this.normalizeUserFields(user);
    } catch (error) {
      console.error('Error in User.findById:', error);
      console.error('Query parameters:', { id });
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Get all users (with optional role filter)
   * @param {string} [role] - Optional role filter
   * @returns {Promise<Array>} Array of user objects
   */
  static async findAll(role = null) {
    const db = await getDatabase();
    try {
      let users;
      if (role) {
        users = await db.all('SELECT * FROM users WHERE role = ? ORDER BY createdat DESC', [role]);
      } else {
        users = await db.all('SELECT * FROM users ORDER BY createdat DESC');
      }
      return users.map(user => this.normalizeUserFields(user));
    } catch (error) {
      console.error('Error in User.findAll:', error);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Find users by multiple roles
   * @param {Array<string>} roles - Array of roles
   * @returns {Promise<Array>} Array of user objects
   */
  static async findByRoles(roles) {
    const db = await getDatabase();
    try {
      if (!roles || roles.length === 0) return [];
      const placeholders = roles.map(() => '?').join(',');
      const users = await db.all(
        `SELECT * FROM users WHERE role IN (${placeholders}) ORDER BY namezh ASC`,
        roles
      );
      return users.map(user => this.normalizeUserFields(user));
    } finally {
      await db.close();
    }
  }

  /**
   * Update user role
   * @param {number} id - User ID
   * @param {string} role - New role
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  static async updateRole(id, role) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET role = ?, updatedat = ? WHERE id = ?',
        [role, now, id]
      );

      if (result.changes === 0) {
        return null;
      }

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Update user name (backward compatibility)
   * @param {number} id - User ID
   * @param {string} name - New name
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  static async updateName(id, name) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET name = ?, updatedat = ? WHERE id = ?',
        [name, now, id]
      );

      if (result.changes === 0) {
        return null;
      }

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Update user names (Chinese and English)
   * @param {number} id - User ID
   * @param {string} [nameZh] - Chinese name
   * @param {string} [nameEn] - English name
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  static async updateNames(id, nameZh = null, nameEn = null, nameTw = null) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET namezh = ?, nameen = ?, nametw = ?, updatedat = ? WHERE id = ?',
        [nameZh, nameEn, nameTw, now, id]
      );

      if (result.changes === 0) {
        return null;
      }

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Update user district and group number
   * @param {number} id - User ID
   * @param {string} [district] - District
   * @param {string} [groupNum] - Group number
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  static async updateDistrictAndGroup(id, district = null, groupNum = null) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET district = ?, groupnum = ?, updatedat = ? WHERE id = ?',
        [district, groupNum, now, id]
      );

      if (result.changes === 0) {
        return null;
      }

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Update user last login time
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} Updated user object or null if not found
   */
  static async updateLastLogin(id) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET lastloginat = ?, updatedat = ? WHERE id = ?',
        [now, now, id]
      );

      if (result.changes === 0) {
        return null;
      }

      return await this.findById(id);
    } finally {
      await db.close();
    }
  }

  /**
   * Find users by district
   * @param {string} district - District name
   * @returns {Promise<Array>} Array of user objects
   */
  static async findByDistrict(district) {
    const db = await getDatabase();
    try {
      const users = await db.all(
        'SELECT * FROM users WHERE district = ? ORDER BY groupnum, createdat DESC',
        [district]
      );
      return users.map(user => this.normalizeUserFields(user));
    } catch (error) {
      console.error('Error in User.findByDistrict:', error);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Find users by district and group number
   * @param {string} district - District name
   * @param {string} groupNum - Group number
   * @returns {Promise<Array>} Array of user objects
   */
  static async findByDistrictAndGroup(district, groupNum) {
    const db = await getDatabase();
    try {
      const users = await db.all(
        'SELECT * FROM users WHERE district = ? AND groupnum = ? ORDER BY createdat DESC',
        [district, groupNum]
      );
      return users.map(user => this.normalizeUserFields(user));
    } catch (error) {
      console.error('Error in User.findByDistrictAndGroup:', error);
      throw error;
    } finally {
      await db.close();
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async delete(id) {
    const db = await getDatabase();
    try {
      const result = await db.run('DELETE FROM users WHERE id = ?', [id]);
      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Check if phone number exists in database (for whitelist check)
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<boolean>} True if exists, false otherwise
   */
  static async exists(phoneNumber) {
    try {
      const user = await this.findByPhoneNumber(phoneNumber);
      return user !== null;
    } catch (error) {
      console.error('[User.exists] Error checking if phone number exists:', error);
      // Return false on error to prevent blocking the login flow
      // But log the error for debugging
      return false;
    }
  }
}
