import { getDatabase } from '../db.js';

export class Session {
  static async create({ userId, token, deviceId, deviceInfo, expiresAt }) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      await db.run(
        `
        INSERT INTO sessions (userid, token, deviceid, deviceinfo, expiresat, revoked, createdat, updatedat)
        VALUES (?, ?, ?, ?, ?, FALSE, ?, ?)
      `,
        [userId, token, deviceId || null, deviceInfo || null, expiresAt, now, now]
      );
    } finally {
      await db.close();
    }
  }

  static async revokeOtherSessions(userId, deviceId) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      await db.run(
        `
        UPDATE sessions
        SET revoked = TRUE, updatedat = ?
        WHERE userid = ?
          AND revoked = FALSE
          AND ($3::text IS NULL OR deviceid IS NULL OR deviceid != $3::text)
      `,
        [now, userId, deviceId]
      );
    } finally {
      await db.close();
    }
  }

  static async findByToken(token) {
    const db = await getDatabase();
    try {
      const row = await db.get(
        `
        SELECT *
        FROM sessions
        WHERE token = ?
      `,
        [token]
      );
      return row;
    } finally {
      await db.close();
    }
  }

  static async revokeByToken(token) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      await db.run(
        `
        UPDATE sessions
        SET revoked = TRUE, updatedat = ?
        WHERE token = ?
      `,
        [now, token]
      );
    } finally {
      await db.close();
    }
  }
}

