import { getDatabase } from '../db.js';

export class Session {
  static async create({ userId, token, deviceId, deviceInfo, expiresAt }) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      await db.run(
        `
        INSERT INTO sessions (userid, token, "deviceId", "deviceInfo", "expiresAt", revoked, "createdAt", "updatedAt")
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
        SET revoked = TRUE, "updatedAt" = ?
        WHERE userid = ?
          AND revoked = FALSE
          AND ($3::text IS NULL OR "deviceId" IS NULL OR "deviceId" != $3::text)
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
        SET revoked = TRUE, "updatedAt" = ?
        WHERE token = ?
      `,
        [now, token]
      );
    } finally {
      await db.close();
    }
  }
}

