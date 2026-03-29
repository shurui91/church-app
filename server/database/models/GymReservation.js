import { getDatabase } from '../db.js';

/** 统一比较用户 id（PostgreSQL / JWT 可能为 number 或 string） */
function sameUserId(a, b) {
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

export class GymReservation {
  /**
   * Create a new reservation for two users (primary + co-user).
   */
  static async create({ userId, coUserId, date, startTime, endTime, duration, notes, userName }) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      const result = await db.run(
        `INSERT INTO gym_reservations (
           user_id,
           helper_user_id,
           date,
           start_time,
           end_time,
           duration,
           notes,
           status,
           user_name,
           check_in_at,
           check_out_at,
           primary_checked_in_at,
           helper_checked_in_at,
           primary_checked_out_at,
           helper_checked_out_at,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)
         RETURNING id`,
        [userId, coUserId || null, date, startTime, endTime, duration, notes || null, userName || null, now, now]
      );
      return await this.findById(result.lastID);
    } finally {
      await db.close();
    }
  }

  /**
   * Get a reservation along with the user's display name.
   */
  static async findById(id) {
    const db = await getDatabase();
    try {
      return await db.get(
        `
        SELECT
          r.*,
          u.namezh AS primary_namezh,
          u.nametw AS primary_nametw,
          u.nameen AS primary_nameen,
          u.name AS primary_name,
          u.phonenumber AS primary_phonenumber,
          u.district AS primary_district,
          u.groupnum AS primary_groupnum,
          helper.namezh AS helper_namezh,
          helper.nametw AS helper_nametw,
          helper.nameen AS helper_nameen,
          helper.name AS helper_name,
          helper.phonenumber AS helper_phonenumber,
          helper.district AS helper_district,
          helper.groupnum AS helper_groupnum
        FROM gym_reservations r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users helper ON r.helper_user_id = helper.id
        WHERE r.id = ?
      `,
        [id]
      );
    } finally {
      await db.close();
    }
  }

  /**
   * List reservations for a single user (as primary or co-user).
   */
  static async findByUser(userId) {
    const db = await getDatabase();
    try {
      return await db.all(
        `
        SELECT
          r.*,
          u.namezh AS user_name,
          helper.namezh AS helper_name
        FROM gym_reservations r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users helper ON r.helper_user_id = helper.id
        WHERE r.user_id = ? OR r.helper_user_id = ?
        ORDER BY r.date DESC, r.start_time DESC
      `,
        [userId, userId]
      );
    } finally {
      await db.close();
    }
  }

  /**
   * Distinct calendar dates in [fromDate, toDate] that have at least one non-cancelled reservation.
   * @param {string} fromDate YYYY-MM-DD
   * @param {string} toDate YYYY-MM-DD
   * @returns {Promise<string[]>}
   */
  static async findDatesWithReservationsBetween(fromDate, toDate) {
    const db = await getDatabase();
    try {
      const rows = await db.all(
        `
        SELECT DISTINCT date
        FROM gym_reservations
        WHERE date >= ?
          AND date <= ?
          AND status != 'cancelled'
        ORDER BY date
        `,
        [fromDate, toDate]
      );
      return rows.map((r) => r.date).filter(Boolean);
    } finally {
      await db.close();
    }
  }

  /**
   * 删除指定日期上的全部预约（任意状态），用于闭馆前清理占位数据。
   * @param {string[]} dates YYYY-MM-DD
   * @returns {Promise<number>} 删除行数
   */
  static async deleteAllForDates(dates) {
    if (!dates?.length) return 0;
    const db = await getDatabase();
    try {
      const placeholders = dates.map(() => '?').join(', ');
      const result = await db.run(
        `DELETE FROM gym_reservations WHERE date IN (${placeholders})`,
        dates
      );
      return result.changes ?? 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Get all reservations on a particular date (excluding cancelled ones).
   */
  static async findByDate(date) {
    const db = await getDatabase();
    try {
      return await db.all(
        `
        SELECT
          r.*,
          u.namezh AS primary_namezh,
          u.nametw AS primary_nametw,
          u.nameen AS primary_nameen,
          u.name AS primary_name,
          u.phonenumber AS primary_phonenumber,
          u.district AS primary_district,
          u.groupnum AS primary_groupnum,
          helper.namezh AS helper_namezh,
          helper.nametw AS helper_nametw,
          helper.nameen AS helper_nameen,
          helper.name AS helper_name,
          helper.phonenumber AS helper_phonenumber,
          helper.district AS helper_district,
          helper.groupnum AS helper_groupnum
        FROM gym_reservations r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN users helper ON r.helper_user_id = helper.id
        WHERE r.date = ? AND r.status != 'cancelled'
        `,
        [date]
      );
    } finally {
      await db.close();
    }
  }

  /**
   * Determine whether the requested slot overlaps with existing bookings.
   */
  static async isSlotAvailable(date, startTime, endTime) {
    const db = await getDatabase();
    try {
      const existing = await db.get(
        `
        SELECT id FROM gym_reservations
         WHERE date = ?
           AND status != 'cancelled'
           AND (
             (start_time <= ? AND end_time > ?)
             OR (start_time < ? AND end_time >= ?)
             OR (start_time >= ? AND end_time <= ?)
           )
      `,
        [date, startTime, startTime, endTime, endTime, startTime, endTime]
      );
      return !existing;
    } finally {
      await db.close();
    }
  }

  /**
   * Check whether the user (or co-user) already has a reservation on the same date.
   */
  static async hasReservationOnDate(userId, date) {
    const db = await getDatabase();
    try {
      const row = await db.get(
        `
        SELECT COUNT(*) AS count
        FROM gym_reservations
        WHERE (user_id = ? OR helper_user_id = ?)
          AND date = ?
          AND status != 'cancelled'
      `,
        [userId, userId, date]
      );
      return row?.count > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Move a reservation from pending to checked_in (primary or co-user can do it).
   */
  static async checkIn(id, userId) {
    const db = await getDatabase();
    try {
      const reservation = await db.get(
        `
        SELECT user_id, helper_user_id, primary_checked_in_at, helper_checked_in_at, status
        FROM gym_reservations
        WHERE id = ?
      `,
        [id]
      );
      if (!reservation) return false;

      const now = new Date().toISOString();
      let targetColumn = null;
      if (sameUserId(reservation.user_id, userId)) {
        targetColumn = 'primary_checked_in_at';
      } else if (sameUserId(reservation.helper_user_id, userId)) {
        targetColumn = 'helper_checked_in_at';
      }
      if (!targetColumn) return false;
      if (reservation[targetColumn]) return false;

      await db.run(
        `
        UPDATE gym_reservations
        SET ${targetColumn} = ?,
            updated_at = ?
        WHERE id = ?
      `,
        [now, now, id]
      );

      const updated = await db.get(
        `
        SELECT primary_checked_in_at, helper_checked_in_at
        FROM gym_reservations
        WHERE id = ?
      `,
        [id]
      );

      const duoComplete =
        updated.primary_checked_in_at && updated.helper_checked_in_at;
      const soloComplete =
        !reservation.helper_user_id && updated.primary_checked_in_at;

      if (duoComplete || soloComplete) {
        await db.run(
          `
          UPDATE gym_reservations
          SET status = 'checked_in',
              check_in_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
          [now, now, id]
        );
      }

      return true;
    } finally {
      await db.close();
    }
  }

  /**
   * Mark a checked-in reservation as checked-out (primary or co-user can do it).
   */
  static async checkOut(id, userId) {
    const db = await getDatabase();
    try {
      const reservation = await db.get(
        `
        SELECT user_id, helper_user_id, primary_checked_out_at, helper_checked_out_at, status
        FROM gym_reservations
        WHERE id = ?
      `,
        [id]
      );
      if (!reservation || reservation.status !== 'checked_in') return false;

      const now = new Date().toISOString();
      let targetColumn = null;
      if (sameUserId(reservation.user_id, userId)) {
        targetColumn = 'primary_checked_out_at';
      } else if (sameUserId(reservation.helper_user_id, userId)) {
        targetColumn = 'helper_checked_out_at';
      }
      if (!targetColumn) return false;
      if (reservation[targetColumn]) return false;

      await db.run(
        `
        UPDATE gym_reservations
        SET ${targetColumn} = ?,
            updated_at = ?
        WHERE id = ?
      `,
        [now, now, id]
      );

      const updated = await db.get(
        `
        SELECT primary_checked_out_at, helper_checked_out_at
        FROM gym_reservations
        WHERE id = ?
      `,
        [id]
      );

      const duoComplete =
        updated.primary_checked_out_at && updated.helper_checked_out_at;
      const soloComplete =
        !reservation.helper_user_id && updated.primary_checked_out_at;

      if (duoComplete || soloComplete) {
        await db.run(
          `
          UPDATE gym_reservations
          SET status = 'checked_out',
              check_out_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
          [now, now, id]
        );
      }

      return true;
    } finally {
      await db.close();
    }
  }

  /**
   * Cancel an individual reservation (primary or co-user can do it).
   */
  static async cancel(id, userId) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      const result = await db.run(
        `
        UPDATE gym_reservations
        SET status = 'cancelled',
            updated_at = ?
        WHERE id = ?
          AND (user_id = ? OR helper_user_id = ?)
          AND status != 'cancelled'
      `,
        [now, id, userId, userId]
      );
      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Cancel pending reservations that missed their check-in window.
   */
  static async cancelPendingExpired(cutoffTimestamp) {
    const db = await getDatabase();
    try {
      const pendings = await db.all(
        `SELECT id, date, start_time FROM gym_reservations WHERE status = 'pending'`
      );

      const cutoff = new Date(cutoffTimestamp || new Date().toISOString());
      const idsToCancel = pendings
        .filter((reservation) => {
          const startMoment = this._parseSlotDatetime(reservation.date, reservation.start_time);
          return startMoment && cutoff > new Date(startMoment.getTime() + 15 * 60 * 1000);
        })
        .map((reservation) => reservation.id);

      for (const id of idsToCancel) {
        await db.run(
          `
          UPDATE gym_reservations
          SET status = 'cancelled',
              updated_at = ?
          WHERE id = ?
        `,
          [cutoff.toISOString(), id]
        );
      }
      return idsToCancel.length;
    } finally {
      await db.close();
    }
  }

  /**
   * Helper: build a Date from a date string + time string.
   */
  static _parseSlotDatetime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const normalized = `${dateStr}T${timeStr.padStart(5, '0')}:00`;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
