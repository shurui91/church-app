import { getCurrentTimestamp, getDatabase } from '../db.js';

/**
 * User Model
 * Handles all database operations for users table
 */
export class User {
  /**
   * Create a new user
   * @param {string} phoneNumber - User's phone number
   * @param {string} role - User role (super_admin, admin, leader, member, usher)
   * @param {string} [name] - User's name (optional, kept for backward compatibility)
   * @param {string} [nameZh] - User's Chinese name (optional)
   * @param {string} [nameEn] - User's English name (optional)
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
    notes = null
  ) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        `INSERT INTO users ("phoneNumber", name, "nameZh", "nameEn", role, district, "groupNum", email, status, gender, birthdate, "joinDate", "preferredLanguage", notes, "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [phoneNumber, name, nameZh, nameEn, role, district, groupNum, email, status, gender, birthdate, joinDate, preferredLanguage, notes, now, now]
      );

      return {
        id: result.lastID,
        phoneNumber,
        name,
        nameZh,
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
   * Find user by phone number
   * @param {string} phoneNumber - User's phone number
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findByPhoneNumber(phoneNumber) {
    const db = await getDatabase();
    try {
      const user = await db.get(
        'SELECT * FROM users WHERE "phoneNumber" = ?',
        [phoneNumber]
      );
      return user || null;
    } finally {
      await db.close();
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   */
  static async findById(id) {
    const db = await getDatabase();
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      return user || null;
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
      if (role) {
        const users = await db.all('SELECT * FROM users WHERE role = ? ORDER BY "createdAt" DESC', [role]);
        return users;
      } else {
        const users = await db.all('SELECT * FROM users ORDER BY "createdAt" DESC');
        return users;
      }
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
        'UPDATE users SET role = ?, "updatedAt" = ? WHERE id = ?',
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
        'UPDATE users SET name = ?, "updatedAt" = ? WHERE id = ?',
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
  static async updateNames(id, nameZh = null, nameEn = null) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();

    try {
      const result = await db.run(
        'UPDATE users SET "nameZh" = ?, "nameEn" = ?, "updatedAt" = ? WHERE id = ?',
        [nameZh, nameEn, now, id]
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
        'UPDATE users SET district = ?, "groupNum" = ?, "updatedAt" = ? WHERE id = ?',
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
        'UPDATE users SET "lastLoginAt" = ?, "updatedAt" = ? WHERE id = ?',
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
        'SELECT * FROM users WHERE district = ? ORDER BY "groupNum", "createdAt" DESC',
        [district]
      );
      return users;
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
        'SELECT * FROM users WHERE district = ? AND "groupNum" = ? ORDER BY "createdAt" DESC',
        [district, groupNum]
      );
      return users;
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
    const user = await this.findByPhoneNumber(phoneNumber);
    return user !== null;
  }
}
