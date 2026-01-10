import { getDatabase } from '../db.js';

export class GymReservation {
  /**
   * Create a new reservation for a user.
   */
  static async create({ userId, date, startTime, endTime, duration, notes, userName }) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      const result = await db.run(
        `INSERT INTO gym_reservations (
           user_id,
           date,
           start_time,
           end_time,
           duration,
           notes,
           status,
           user_name,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
         RETURNING id`,
        [userId, date, startTime, endTime, duration, notes || null, userName || null, now, now]
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
        SELECT r.*, u.namezh AS user_name
        FROM gym_reservations r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `,
        [id]
      );
    } finally {
      await db.close();
    }
  }

  /**
   * List reservations for a single user.
   */
  static async findByUser(userId) {
    const db = await getDatabase();
    try {
      return await db.all(
        `
        SELECT r.*, u.namezh AS user_name
        FROM gym_reservations r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.user_id = ?
        ORDER BY r.date DESC, r.start_time DESC
      `,
        [userId]
      );
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
        `SELECT * FROM gym_reservations WHERE date = ? AND status != 'cancelled'`,
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
   * Check whether the user already has a reservation on the same date.
   */
  static async hasReservationOnDate(userId, date) {
    const db = await getDatabase();
    try {
      const row = await db.get(
        `
        SELECT COUNT(*) AS count
        FROM gym_reservations
        WHERE user_id = ?
          AND date = ?
          AND status != 'cancelled'
      `,
        [userId, date]
      );
      return row?.count > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Move a reservation from pending to checked_in.
   */
  static async checkIn(id, userId) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      const result = await db.run(
        `
        UPDATE gym_reservations
        SET status = 'checked_in',
            check_in_at = ?,
            updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status = 'pending'
      `,
        [now, now, id, userId]
      );
      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Mark a checked-in reservation as checked-out.
   */
  static async checkOut(id, userId) {
    const db = await getDatabase();
    try {
      const now = new Date().toISOString();
      const result = await db.run(
        `
        UPDATE gym_reservations
        SET status = 'checked_out',
            check_out_at = ?,
            updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status = 'checked_in'
      `,
        [now, now, id, userId]
      );
      return result.changes > 0;
    } finally {
      await db.close();
    }
  }

  /**
   * Cancel an individual reservation (soft delete style).
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
          AND user_id = ?
          AND status != 'cancelled'
      `,
        [now, id, userId]
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
