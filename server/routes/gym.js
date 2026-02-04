import express from 'express';
import { GymReservation } from '../database/models/GymReservation.js';
import { authenticate } from '../middleware/auth.js';
import { getDatabase } from '../database/db.js';

const router = express.Router();

// Debug logging for gym routes
router.use((req, res, next) => {
  console.log(`[Gym] ${req.method} ${req.originalUrl}`);
  next();
});

const skipGymAuth =
  process.env.SKIP_GYM_AUTH === 'true' && process.env.NODE_ENV !== 'production';
const gymAuthMiddleware = skipGymAuth ? [] : [authenticate];

const ensureGymUser = async (req, res, next) => {
  if (req.user) {
    return next();
  }

  const explicitId = Number(process.env.DEV_GYM_USER_ID || 0);
  let userId = explicitId > 0 ? explicitId : null;
  const db = await getDatabase();
  try {
    if (!userId) {
      const row = await db.get('SELECT id FROM users ORDER BY id LIMIT 1');
      if (row && row.id) {
        userId = row.id;
      }
    }
  } finally {
    await db.close();
  }

  if (!userId) {
    return res.status(500).json({ success: false, message: '无法找到默认用户' });
  }

  req.user = { id: userId };
  next();
};
const gymMiddleware = [...gymAuthMiddleware, ensureGymUser];
const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 22 * 60;
const HALF_HOUR = 30;

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * GET /api/gym/time-slots/:date
 * Get available time slots for a specific date
 */
router.get('/gym/time-slots/:date', gymMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return res.status(400).json({ success: false, message: '缺少日期' });
    }

    // Fetch existing reservations for this date
    const reservations = await GymReservation.findByDate(date);

    const slots = [];
    for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += HALF_HOUR) {
      const start = formatTime(minutes);
      const end = formatTime(minutes + HALF_HOUR);
      
      // Check if this specific slot is covered by any reservation
      const reservation = reservations.find(r => 
        (start >= r.start_time && start < r.end_time) || 
        (end > r.start_time && end <= r.end_time) ||
        (start <= r.start_time && end >= r.end_time)
      );

      slots.push({
        id: minutes,
        startTime: start,
        endTime: end,
        duration: HALF_HOUR,
        isAvailable: !reservation,
        isReserved: !!reservation,
        reservedBy: reservation ? {
          id: reservation.user_id,
          status: reservation.status
        } : null
      });
    }

    res.json({ success: true, data: { timeSlots: slots } });
  } catch (error) {
    console.error('[gym GET time-slots]', error);
    res.status(500).json({ success: false, message: '获取时间段失败' });
  }
});

/**
 * POST /api/gym/reservations
 * Create a new gym reservation (pending confirmation)
 */
router.post('/gym/reservations', gymMiddleware, async (req, res) => {
  try {
    const { date, startTime, duration, notes } = req.body;
    const MINUTES_PER_DAY = 24 * 60;
    const minDuration = 30;
    const maxDuration = 120;

    if (!date || !startTime || !duration) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    if (duration < minDuration || duration > maxDuration || duration % 30 !== 0) {
      return res.status(400).json({ success: false, message: '时长必须是30分钟的倍数，最多2小时' });
    }

    const [startHourStr, startMinuteStr] = startTime.split(':');
    if (startHourStr === undefined || startMinuteStr === undefined) {
      return res.status(400).json({ success: false, message: 'startTime 格式错误' });
    }

    const startHour = parseInt(startHourStr, 10);
    const startMinute = parseInt(startMinuteStr, 10);
    if (Number.isNaN(startHour) || Number.isNaN(startMinute)) {
      return res.status(400).json({ success: false, message: 'startTime 格式错误' });
    }

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = startTotalMinutes + duration;

    if (startTotalMinutes < OPENING_MINUTES || endTotalMinutes > CLOSING_MINUTES) {
      return res.status(400).json({ success: false, message: '预约必须在 7:00 - 22:00 范围内' });
    }

    if (endTotalMinutes >= MINUTES_PER_DAY) {
      return res.status(400).json({ success: false, message: '结束时间超出每日范围' });
    }

    if (await GymReservation.hasReservationOnDate(req.user.id, date)) {
      return res.status(400).json({ success: false, message: '每天只能预约一次' });
    }

    const endTime = formatTime(endTotalMinutes);

    const isAvailable = await GymReservation.isSlotAvailable(date, startTime, endTime);
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: '该时间段已被预约' });
    }

    const preferredLanguage = req.user?.preferredLanguage;
    const chineseName =
      preferredLanguage === 'zh-Hant' ? req.user?.nameTw : req.user?.nameZh;
    const userName =
      chineseName ||
      req.user?.name ||
      req.user?.phoneNumber ||
      '未知';
    const reservation = await GymReservation.create({
      userId: req.user.id,
      date,
      startTime,
      endTime,
      duration,
      notes,
      userName,
    });

    res.json({
      success: true,
      message: '预约成功，请在时间窗口内完成签到与签出',
      data: { reservation },
    });
  } catch (error) {
    console.error('[gym POST reservations]', error);
    res.status(500).json({ success: false, message: '创建预约失败' });
  }
});

/**
 * GET /api/gym/reservations/my
 * List current user's reservations
 */
router.get('/gym/reservations/my', gymMiddleware, async (req, res) => {
  try {
    const reservations = await GymReservation.findByUser(req.user.id);
    res.json({
      success: true,
      data: {
        reservations,
        count: reservations.length,
      },
    });
  } catch (error) {
    console.error('[gym GET my reservations]', error);
    res.status(500).json({ success: false, message: '获取预约列表失败' });
  }
});

/**
 * GET /api/gym/reservations/:id
 * Get reservation details
 */
router.get('/gym/reservations/:id', gymMiddleware, async (req, res) => {
  try {
    const reservation = await GymReservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }
    res.json({ success: true, data: { reservation } });
  } catch (error) {
    console.error('[gym GET reservation]', error);
    res.status(500).json({ success: false, message: '获取预约详情失败' });
  }
});

/**
 * POST /api/gym/reservations/:id/confirm
 * Confirm a pending reservation
 */
router.post('/gym/reservations/:id/confirm', gymMiddleware, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const reservation = await GymReservation.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }

    if (reservation.helper_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '只有第二预约人可以确认' });
    }

    const updated = await GymReservation.confirm(reservationId, req.user.id);
    if (!updated) {
      return res.status(400).json({ success: false, message: '确认失败，可能已过期或已被取消' });
    }

    res.json({ success: true, message: '预约已确认', data: { reservation: updated } });
  } catch (error) {
    console.error('[gym POST confirm]', error);
    res.status(500).json({ success: false, message: '确认失败' });
  }
});

/**
 * POST /api/gym/reservations/:id/check-in
 * Check in (can be done by primary or helper)
 */
router.post('/gym/reservations/:id/check-in', gymMiddleware, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const reservation = await GymReservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }

    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '只能为自己的预约签到' });
    }

    const now = new Date();
    const slotTime = GymReservation._parseSlotDatetime(reservation.date, reservation.start_time);
    if (!slotTime) {
      return res.status(400).json({ success: false, message: '预约时间解析失败' });
    }

    const windowStart = new Date(slotTime.getTime() - 15 * 60 * 1000);
    if (now < windowStart) {
      return res.status(400).json({ success: false, message: '签到时间未到，还需等待' });
    }

    const success = await GymReservation.checkIn(reservationId, req.user.id);
    if (!success) {
      return res.status(400).json({ success: false, message: '签入失败，预约状态不对' });
    }

    const updated = await GymReservation.findById(reservationId);
    res.json({ success: true, message: '签到成功', data: { reservation: updated } });
  } catch (error) {
    console.error('[gym POST check-in]', error);
    res.status(500).json({ success: false, message: '签入失败' });
  }
});

/**
 * POST /api/gym/reservations/:id/check-out
 */
router.post('/gym/reservations/:id/check-out', gymMiddleware, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const reservation = await GymReservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({ success: false, message: '预约不存在' });
    }

    if (reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: '只能为自己的预约签出' });
    }

    if (reservation.status !== 'checked_in') {
      return res.status(400).json({ success: false, message: '必须先完成签到才能签出' });
    }

    const success = await GymReservation.checkOut(reservationId, req.user.id);
    if (!success) {
      return res.status(400).json({ success: false, message: '签出失败' });
    }

    const updated = await GymReservation.findById(reservationId);
    res.json({ success: true, message: '签出成功', data: { reservation: updated } });
  } catch (error) {
    console.error('[gym POST check-out]', error);
    res.status(500).json({ success: false, message: '签出失败' });
  }
});

/**
 * POST /api/gym/reservations/:id/cancel
 */
router.post('/gym/reservations/:id/cancel', gymMiddleware, async (req, res) => {
  try {
    const reservationId = req.params.id;
    const success = await GymReservation.cancel(reservationId, req.user.id);
    
    if (!success) {
      return res.status(400).json({ success: false, message: '取消失败' });
    }

    res.json({ success: true, message: '预约已取消' });
  } catch (error) {
    console.error('[gym POST cancel]', error);
    res.status(500).json({ success: false, message: '取消失败' });
  }
});

export default router;
