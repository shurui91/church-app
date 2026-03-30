import express from 'express';
import { GymReservation } from '../database/models/GymReservation.js';
import { GymBlackout } from '../database/models/GymBlackout.js';
import { User } from '../database/models/User.js';
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
const OPENING_MINUTES = 8 * 60;
const CLOSING_MINUTES = 22 * 60;
const SLOT_DURATION = 60; // 以60分钟为一个 slot

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * GET /api/gym/users
 * List users for co-reservation dropdown (only super_admin, admin, responsible_one; current user excluded)
 */
router.get('/gym/users', gymMiddleware, async (req, res) => {
  try {
    const allowedRoles = ['super_admin', 'admin', 'responsible_one'];
    const users = await User.findByRoles(allowedRoles);
    const currentId = req.user?.id;
    const sanitized = users
      .filter((u) => u.id !== currentId)
      .map((u) => ({
        id: u.id,
        nameZh: u.nameZh,
        nameTw: u.nameTw,
        nameEn: u.nameEn,
        phoneNumber: u.phoneNumber,
        district: u.district,
        groupNum: u.groupNum,
      }));
    res.json({ success: true, data: { users: sanitized } });
  } catch (error) {
    console.error('[gym GET users]', error);
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

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

    const isBlackout = await GymBlackout.isBlackoutDate(date);
    if (isBlackout) {
      const slots = [];
      for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += SLOT_DURATION) {
        const start = formatTime(minutes);
        const end = formatTime(minutes + SLOT_DURATION);
        slots.push({
          id: minutes,
          startTime: start,
          endTime: end,
          duration: SLOT_DURATION,
          isAvailable: false,
          isReserved: false,
          blackout: true,
          reservedBy: null,
        });
      }
      return res.json({ success: true, data: { timeSlots: slots } });
    }

    // Fetch existing reservations for this date
    const reservations = await GymReservation.findByDate(date);

    const buildUserInfo = (reservation, role) => {
      if (!reservation) return null;
      const userId = role === 'primary' ? reservation.user_id : reservation.helper_user_id;
      if (!userId) return null;

      return {
        id: userId,
        nameZh: reservation[`${role}_namezh`] || undefined,
        nameTw: reservation[`${role}_nametw`] || undefined,
        nameEn: reservation[`${role}_nameen`] || undefined,
        name: reservation[`${role}_name`] || undefined,
        phoneNumber: reservation[`${role}_phonenumber`] || undefined,
        district: reservation[`${role}_district`] || undefined,
        groupNum: reservation[`${role}_groupnum`] || undefined,
      };
    };

    const slots = [];
    for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += SLOT_DURATION) {
      const start = formatTime(minutes);
      const end = formatTime(minutes + SLOT_DURATION);
      
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
        duration: SLOT_DURATION,
        isAvailable: !reservation,
        isReserved: !!reservation,
        blackout: false,
        reservedBy: reservation
          ? {
              reservationId: reservation.id,
              status: reservation.status,
              primary: buildUserInfo(reservation, 'primary'),
              helper: buildUserInfo(reservation, 'helper'),
            }
          : null,
      });
    }

    res.json({ success: true, data: { timeSlots: slots } });
  } catch (error) {
    console.error('[gym GET time-slots]', error);
    res.status(500).json({ success: false, message: '获取时间段失败' });
  }
});

/**
 * GET /api/gym/days-with-reservations?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Dates in range that have at least one active (non-cancelled) reservation — for calendar dots.
 */
router.get('/gym/days-with-reservations', gymMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      return res.status(400).json({ success: false, message: '缺少 from 或 to 日期' });
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(from) || !dateRe.test(to)) {
      return res.status(400).json({ success: false, message: '日期格式应为 YYYY-MM-DD' });
    }
    if (from > to) {
      return res.status(400).json({ success: false, message: 'from 不能晚于 to' });
    }

    const reservationDates = await GymReservation.findDatesWithReservationsBetween(from, to);
    const blackoutDates = await GymBlackout.findBetween(from, to);
    const merged = [...new Set([...reservationDates, ...blackoutDates])].sort();
    res.json({ success: true, data: { dates: merged } });
  } catch (error) {
    console.error('[gym GET days-with-reservations]', error);
    res.status(500).json({ success: false, message: '获取预约日期失败' });
  }
});

/**
 * POST /api/gym/reservations
 * Create a new gym reservation (pending confirmation)
 */
router.post('/gym/reservations', gymMiddleware, async (req, res) => {
  try {
    const { date, startTime, duration, notes, coUserId } = req.body;
    const MINUTES_PER_DAY = 24 * 60;
    if (!date || !startTime || !duration) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    if (duration !== 60 && duration !== 120) {
      return res.status(400).json({ success: false, message: '时长只能是60分钟或120分钟' });
    }

    const dateStr = String(date);
    const ymdRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!ymdRe.test(dateStr)) {
      return res.status(400).json({ success: false, message: '日期格式错误' });
    }
    const [resY, resM, resD] = dateStr.split('-').map((n) => parseInt(n, 10));
    const reservationDay = new Date(resY, resM - 1, resD);
    reservationDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((reservationDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 31 || diffDays > 180) {
      return res.status(400).json({ success: false, message: '仅可预约未来第31天到第180天' });
    }

    const coUserIdNum = coUserId ? parseInt(String(coUserId), 10) : null;
    if (!coUserIdNum || Number.isNaN(coUserIdNum)) {
      return res.status(400).json({ success: false, message: '请选择第二位预约人' });
    }
    if (coUserIdNum === req.user.id) {
      return res.status(400).json({ success: false, message: '不能选择自己作为第二位预约人' });
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
      return res.status(400).json({ success: false, message: '预约必须在 8:00 - 22:00 范围内' });
    }

    if (endTotalMinutes >= MINUTES_PER_DAY) {
      return res.status(400).json({ success: false, message: '结束时间超出每日范围' });
    }

    if (await GymBlackout.isBlackoutDate(date)) {
      return res.status(400).json({ success: false, message: '该日期体育馆不开放预约' });
    }

    if (await GymReservation.hasReservationOnDate(req.user.id, date)) {
      return res.status(400).json({ success: false, message: '您当天已有预约' });
    }
    if (await GymReservation.hasReservationOnDate(coUserIdNum, date)) {
      return res.status(400).json({ success: false, message: '第二位预约人当天已有预约' });
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
      coUserId: coUserIdNum,
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

    const uid = Number(req.user.id);
    const isPrimary = Number(reservation.user_id) === uid;
    const isHelper =
      reservation.helper_user_id != null && Number(reservation.helper_user_id) === uid;
    if (!isPrimary && !isHelper) {
      return res.status(403).json({ success: false, message: '只能为自己的预约签到' });
    }

    const slotTime = GymReservation._parseSlotDatetime(reservation.date, reservation.start_time);
    if (!slotTime) {
      return res.status(400).json({ success: false, message: '预约时间解析失败' });
    }

    // 暂不限制「开始前 15 分钟才能签入」，便于测试签入/签出；恢复时取消下面注释并校验 now >= windowStart
    // const now = new Date();
    // const windowStart = new Date(slotTime.getTime() - 15 * 60 * 1000);
    // if (now < windowStart) {
    //   return res.status(400).json({ success: false, message: '签到时间未到，还需等待' });
    // }

    const success = await GymReservation.checkIn(reservationId, req.user.id);
    if (!success) {
      return res.status(400).json({ success: false, message: '签入失败，预约状态不对' });
    }

    const updated = await GymReservation.findById(reservationId);
    const bothIn =
      updated?.primary_checked_in_at && updated?.helper_checked_in_at;
    res.json({
      success: true,
      message: bothIn ? '签到成功' : '已记录你的签到，等待另一人',
      data: { reservation: updated },
    });
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

    const uid = Number(req.user.id);
    const isPrimary = Number(reservation.user_id) === uid;
    const isHelper =
      reservation.helper_user_id != null && Number(reservation.helper_user_id) === uid;
    if (!isPrimary && !isHelper) {
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
    const bothOut =
      updated?.primary_checked_out_at && updated?.helper_checked_out_at;
    res.json({
      success: true,
      message: bothOut ? '签出成功' : '已记录你的签出，等待另一人',
      data: { reservation: updated },
    });
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
