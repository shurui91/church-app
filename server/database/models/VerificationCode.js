import { getDatabase, getCurrentTimestamp } from '../db.js';

/**
 * VerificationCode Model
 * Handles all database operations for verification_codes table
 */
export class VerificationCode {
  /**
   * Create a new verification code
   * @param {string} phoneNumber - Phone number
   * @param {string} code - 6-digit verification code
   * @param {number} expiresInMinutes - Expiration time in minutes (default: 5)
   * @returns {Promise<Object>} Created verification code object
   */
  static async create(phoneNumber, code, expiresInMinutes = 5) {
    const db = await getDatabase();
    const now = getCurrentTimestamp();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    try {
      // Delete any existing codes for this phone number
      await db.run('DELETE FROM verification_codes WHERE phoneNumber = ?', [phoneNumber]);

      // Insert new code
      const result = await db.run(
        `INSERT INTO verification_codes (phoneNumber, code, expiresAt, createdAt, attempts)
         VALUES (?, ?, ?, ?, 0)`,
        [phoneNumber, code, expiresAt, now]
      );

      return {
        id: result.lastID,
        phoneNumber,
        code,
        expiresAt,
        createdAt: now,
        attempts: 0,
      };
    } finally {
      await db.close();
    }
  }

  /**
   * Verify a code for a phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} code - Verification code to verify
   * @returns {Promise<{valid: boolean, message: string}>} Verification result
   */
  static async verify(phoneNumber, code) {
    const db = await getDatabase();
    try {
      // Find the latest code for this phone number
      const record = await db.get(
        'SELECT * FROM verification_codes WHERE phoneNumber = ? ORDER BY createdAt DESC LIMIT 1',
        [phoneNumber]
      );

      if (!record) {
        return {
          valid: false,
          message: '验证码不存在或已过期',
        };
      }

      // Check if code is expired
      const now = new Date();
      const expiresAt = new Date(record.expiresAt);
      if (now > expiresAt) {
        // Delete expired code
        await db.run('DELETE FROM verification_codes WHERE id = ?', [record.id]);
        return {
          valid: false,
          message: '验证码已过期',
        };
      }

      // Check attempts (max 5 attempts)
      if (record.attempts >= 5) {
        // Delete code after max attempts
        await db.run('DELETE FROM verification_codes WHERE id = ?', [record.id]);
        return {
          valid: false,
          message: '验证码尝试次数过多，请重新获取',
        };
      }

      // Verify code
      if (record.code !== code) {
        // Increment attempts
        await db.run(
          'UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?',
          [record.id]
        );
        return {
          valid: false,
          message: '验证码错误',
        };
      }

      // Code is valid, delete it
      await db.run('DELETE FROM verification_codes WHERE id = ?', [record.id]);

      return {
        valid: true,
        message: '验证成功',
      };
    } finally {
      await db.close();
    }
  }

  /**
   * Get verification code for a phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<Object|null>} Verification code object or null if not found
   */
  static async findByPhoneNumber(phoneNumber) {
    const db = await getDatabase();
    try {
      const record = await db.get(
        'SELECT * FROM verification_codes WHERE phoneNumber = ? ORDER BY createdAt DESC LIMIT 1',
        [phoneNumber]
      );
      return record || null;
    } finally {
      await db.close();
    }
  }

  /**
   * Delete expired verification codes (cleanup function)
   * @returns {Promise<number>} Number of deleted records
   */
  static async deleteExpired() {
    const db = await getDatabase();
    const now = getCurrentTimestamp();
    try {
      const result = await db.run(
        'DELETE FROM verification_codes WHERE expiresAt < ?',
        [now]
      );
      return result.changes;
    } finally {
      await db.close();
    }
  }

  /**
   * Delete all codes for a phone number
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<number>} Number of deleted records
   */
  static async deleteByPhoneNumber(phoneNumber) {
    const db = await getDatabase();
    try {
      const result = await db.run(
        'DELETE FROM verification_codes WHERE phoneNumber = ?',
        [phoneNumber]
      );
      return result.changes;
    } finally {
      await db.close();
    }
  }
}
