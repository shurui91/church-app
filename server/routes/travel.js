import express from 'express';
import { TravelSchedule } from '../database/models/TravelSchedule.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/travel
 * Get all travel schedules (with optional filters)
 * Query params:
 *   - userId: Filter by user ID
 *   - startDate: Filter by start date (YYYY-MM-DD)
 *   - endDate: Filter by end date (YYYY-MM-DD)
 *   - date: Get schedules for a specific date (YYYY-MM-DD)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { userId, startDate, endDate, date } = req.query;

    let schedules;

    if (date) {
      // Get schedules for a specific date
      schedules = await TravelSchedule.findByDate(date, userId ? parseInt(userId) : null);
    } else if (startDate || endDate) {
      // Get schedules within a date range
      const start = startDate || '1900-01-01';
      const end = endDate || '9999-12-31';
      schedules = await TravelSchedule.findByDateRange(start, end, userId ? parseInt(userId) : null);
    } else {
      // Get all schedules with optional filters
      const filters = {};
      if (userId) filters.userId = parseInt(userId);
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      schedules = await TravelSchedule.findAll(filters);
    }

    res.json({
      success: true,
      data: {
        schedules,
        count: schedules.length,
      },
    });
  } catch (error) {
    console.error('Error getting travel schedules:', error);
    res.status(500).json({
      success: false,
      message: '获取行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/travel/my
 * Get current user's travel schedules
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const schedules = await TravelSchedule.findByUserId(userId);

    res.json({
      success: true,
      data: {
        schedules,
        count: schedules.length,
      },
    });
  } catch (error) {
    console.error('Error getting user travel schedules:', error);
    res.status(500).json({
      success: false,
      message: '获取我的行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/travel/date/:date
 * Get all travel schedules for a specific date
 * Date format: YYYY-MM-DD
 */
router.get('/date/:date', authenticate, async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    const schedules = await TravelSchedule.findByDate(date);

    res.json({
      success: true,
      data: {
        schedules,
        count: schedules.length,
        date,
      },
    });
  } catch (error) {
    console.error('Error getting travel schedules by date:', error);
    res.status(500).json({
      success: false,
      message: '获取行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/travel/:id
 * Get a specific travel schedule by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await TravelSchedule.findById(parseInt(id));

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: '行程记录不存在',
      });
    }

    res.json({
      success: true,
      data: {
        schedule,
      },
    });
  } catch (error) {
    console.error('Error getting travel schedule:', error);
    res.status(500).json({
      success: false,
      message: '获取行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/travel
 * Create a new travel schedule
 * Body:
 *   - startDate: Start date (YYYY-MM-DD) (required)
 *   - endDate: End date (YYYY-MM-DD) (required)
 *   - destination: Destination (optional)
 *   - notes: Notes (optional)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, destination, notes } = req.body;

    // Validate required fields
    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期',
      });
    }

    if (!endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供结束日期',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return res.status(400).json({
        success: false,
        message: '开始日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    if (!dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: '结束日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    // Validate date logic
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: '日期无效',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: '结束日期不能早于开始日期',
      });
    }

    // Check for overlapping schedules
    const overlappingSchedules = await TravelSchedule.findOverlappingSchedules(
      userId,
      startDate,
      endDate
    );

    if (overlappingSchedules.length > 0) {
      const firstOverlap = overlappingSchedules[0];
      const overlapStart = new Date(firstOverlap.startDate).toLocaleDateString('zh-CN');
      const overlapEnd = new Date(firstOverlap.endDate).toLocaleDateString('zh-CN');
      
      return res.status(400).json({
        success: false,
        message: `日期与现有行程重叠。您已有行程：${overlapStart} 至 ${overlapEnd}`,
        data: {
          overlappingSchedules: overlappingSchedules.map(s => ({
            id: s.id,
            startDate: s.startDate,
            endDate: s.endDate,
            destination: s.destination,
          })),
        },
      });
    }

    // Create travel schedule
    const schedule = await TravelSchedule.create(
      userId,
      startDate,
      endDate,
      destination || null,
      notes || null
    );

    res.status(201).json({
      success: true,
      message: '行程记录创建成功',
      data: {
        schedule,
      },
    });
  } catch (error) {
    console.error('Error creating travel schedule:', error);
    res.status(500).json({
      success: false,
      message: '创建行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/travel/:id
 * Update a travel schedule
 * Only the owner can update their own schedule
 * Body:
 *   - startDate: Start date (YYYY-MM-DD) (required)
 *   - endDate: End date (YYYY-MM-DD) (required)
 *   - destination: Destination (optional)
 *   - notes: Notes (optional)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { startDate, endDate, destination, notes } = req.body;

    // Check if schedule exists and belongs to user
    const existingSchedule = await TravelSchedule.findById(parseInt(id));

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: '行程记录不存在',
      });
    }

    // Convert both to numbers for comparison (handle type mismatch)
    const scheduleUserId = parseInt(existingSchedule.userId);
    const currentUserId = parseInt(userId);

    if (scheduleUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: '无权修改此行程记录',
      });
    }

    // Validate required fields
    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: '请提供开始日期',
      });
    }

    if (!endDate) {
      return res.status(400).json({
        success: false,
        message: '请提供结束日期',
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return res.status(400).json({
        success: false,
        message: '开始日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    if (!dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: '结束日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    // Validate date logic
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: '日期无效',
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: '结束日期不能早于开始日期',
      });
    }

    // Check for overlapping schedules (exclude current schedule)
    const overlappingSchedules = await TravelSchedule.findOverlappingSchedules(
      userId,
      startDate,
      endDate,
      parseInt(id)
    );

    if (overlappingSchedules.length > 0) {
      const firstOverlap = overlappingSchedules[0];
      const overlapStart = new Date(firstOverlap.startDate).toLocaleDateString('zh-CN');
      const overlapEnd = new Date(firstOverlap.endDate).toLocaleDateString('zh-CN');
      
      return res.status(400).json({
        success: false,
        message: `日期与现有行程重叠。您已有行程：${overlapStart} 至 ${overlapEnd}`,
        data: {
          overlappingSchedules: overlappingSchedules.map(s => ({
            id: s.id,
            startDate: s.startDate,
            endDate: s.endDate,
            destination: s.destination,
          })),
        },
      });
    }

    // Update travel schedule
    const schedule = await TravelSchedule.update(
      parseInt(id),
      startDate,
      endDate,
      destination || null,
      notes || null
    );

    res.json({
      success: true,
      message: '行程记录更新成功',
      data: {
        schedule,
      },
    });
  } catch (error) {
    console.error('Error updating travel schedule:', error);
    res.status(500).json({
      success: false,
      message: '更新行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/travel/:id
 * Delete a travel schedule
 * Only the owner can delete their own schedule
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if schedule exists and belongs to user
    const existingSchedule = await TravelSchedule.findById(parseInt(id));

    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: '行程记录不存在',
      });
    }

    // Convert both to numbers for comparison (handle type mismatch)
    const scheduleUserId = parseInt(existingSchedule.userId);
    const currentUserId = parseInt(userId);

    console.log('[Travel DELETE] Permission check:', {
      scheduleUserId,
      currentUserId,
      scheduleUserIdType: typeof scheduleUserId,
      currentUserIdType: typeof currentUserId,
      match: scheduleUserId === currentUserId,
      existingSchedule: JSON.stringify(existingSchedule),
    });

    if (scheduleUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此行程记录',
      });
    }

    // Delete travel schedule
    const deleted = await TravelSchedule.delete(parseInt(id));

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '删除行程记录失败',
      });
    }

    res.json({
      success: true,
      message: '行程记录删除成功',
    });
  } catch (error) {
    console.error('Error deleting travel schedule:', error);
    res.status(500).json({
      success: false,
      message: '删除行程记录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;

