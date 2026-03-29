import { getDatabase } from '../db.js';

/**
 * 体育馆「不开放」日期：该日所有时段不接受预约，time-slots 返回不可用（非「已约」）。
 */
export class GymBlackout {
  static async isBlackoutDate(dateStr) {
    const db = await getDatabase();
    try {
      const row = await db.get(
        `SELECT 1 FROM gym_blackout_dates WHERE blackout_date = ?`,
        [dateStr]
      );
      return !!row;
    } finally {
      await db.close();
    }
  }

  /** @returns {Promise<string[]>} YYYY-MM-DD in [from, to] */
  static async findBetween(from, to) {
    const db = await getDatabase();
    try {
      const rows = await db.all(
        `SELECT blackout_date AS date FROM gym_blackout_dates
         WHERE blackout_date >= ? AND blackout_date <= ?
         ORDER BY blackout_date`,
        [from, to]
      );
      return rows.map((r) => r.date).filter(Boolean);
    } finally {
      await db.close();
    }
  }

  /** @param {string[]} dates YYYY-MM-DD */
  static async upsertDates(dates) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      for (const d of dates) {
        if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        await db.run(
          `INSERT INTO gym_blackout_dates (blackout_date, created_at) VALUES (?, ?)
           ON CONFLICT (blackout_date) DO NOTHING`,
          [d, now]
        );
      }
    } finally {
      await db.close();
    }
  }

  static async removeDate(dateStr) {
    const db = await getDatabase();
    try {
      await db.run(`DELETE FROM gym_blackout_dates WHERE blackout_date = ?`, [dateStr]);
    } finally {
      await db.close();
    }
  }
}
