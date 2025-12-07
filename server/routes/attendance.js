import express from 'express';
import { Attendance } from '../database/models/Attendance.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper function to check if user can access attendance features
 * Only member role cannot access, all other roles (including usher) can access
 */
function canAccessAttendance(user) {
  if (!user) return false;
  // Block only member role
  if (user.role === 'member') {
    return false;
  }
  // Allow all other roles: super_admin, admin, leader, usher, etc.
  return true;
}

/**
 * Helper function to check if user can access "view all attendance" feature
 * Only super_admin, admin, and leader can access
 */
function canViewAllAttendance(user) {
  if (!user) return false;
  // Only allow super_admin, admin, and leader
  return ['super_admin', 'admin', 'leader'].includes(user.role);
}

/**
 * Custom authorization middleware for attendance
 * Only blocks member role, all other roles can access
 */
function authorizeAttendance(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '未认证',
    });
  }

  if (!canAccessAttendance(req.user)) {
    return res.status(403).json({
      success: false,
      message: '权限不足，只有管理员和负责人可以访问此功能',
    });
  }

  next();
}

/**
 * GET /api/attendance/districts-groups
 * Get list of available districts and groups
 * Districts: A, B, C, D, E
 * Groups: 1, 2, 3, 4, 5
 */
router.get(
  '/districts-groups',
  authenticate,
  authorizeAttendance,
  async (req, res) => {
    try {
      // Hard-coded districts and groups
      const districts = ['A', 'B', 'C', 'D', 'E'];
      const groups = ['1', '2', '3', '4', '5'];

      res.json({
        success: true,
        data: {
          districts,
          groups,
        },
      });
    } catch (error) {
      console.error('Error getting districts and groups:', error);
      res.status(500).json({
        success: false,
        message: '获取大区和小组列表失败',
      });
    }
  }
);

/**
 * POST /api/attendance
 * Create or update an attendance record (covers update if exists)
 * Body: { date, meetingType, scope, scopeValue?, adultCount, youthChildCount, notes? }
 */
router.post('/', authenticate, authorizeAttendance, async (req, res) => {
  try {
    // Log the entire request body first to debug
    console.error('[attendance POST] Full request body:', JSON.stringify(req.body));
    console.error('[attendance POST] Request body keys:', Object.keys(req.body || {}));
    
    const {
      id,
      date,
      meetingType,
      scope,
      scopeValue,
      adultCount,
      youthChildCount,
      notes,
    } = req.body;
    const user = req.user;
    
    console.error('[attendance POST] Extracted id:', id, 'type:', typeof id, 'value:', id);
    
    // Only log when id is provided (for debugging updates)
    if (id !== undefined && id !== null && id !== '') {
      console.log('[attendance POST] UPDATE request - id:', id, 'type:', typeof id);
    }

    // Validate input
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请提供日期',
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: '日期格式无效，请使用 YYYY-MM-DD 格式',
      });
    }

    // ✅ 使用 UTC 比较，避免服务器时区造成“今天误判为未来”的问题
    const submittedDate = new Date(`${date}T00:00:00Z`);
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // 只禁止未来的日期
    if (submittedDate > todayUTC) {
      return res.status(400).json({
        success: false,
        message: '不能提交未来日期的数据',
      });
    }

    if (!meetingType) {
      return res.status(400).json({
        success: false,
        message: '请提供聚会类型',
      });
    }

    const validMeetingTypes = ['table', 'homeMeeting', 'prayer'];
    if (!validMeetingTypes.includes(meetingType)) {
      return res.status(400).json({
        success: false,
        message: `无效的聚会类型。有效类型：${validMeetingTypes.join(', ')}`,
      });
    }

    if (!scope) {
      return res.status(400).json({
        success: false,
        message: '请提供统计层级',
      });
    }

    const validScopes = ['full_congregation', 'district', 'small_group'];
    if (!validScopes.includes(scope)) {
      return res.status(400).json({
        success: false,
        message: `无效的统计层级。有效层级：${validScopes.join(', ')}`,
      });
    }

    // Validate scopeValue based on scope
    if (scope !== 'full_congregation' && !scopeValue) {
      return res.status(400).json({
        success: false,
        message: '选择大区或小排时，必须提供具体值',
      });
    }

    if (adultCount === undefined || adultCount === null) {
      return res.status(400).json({
        success: false,
        message: '请提供成年人数量',
      });
    }

    if (
      typeof adultCount !== 'number' ||
      adultCount < 0 ||
      !Number.isInteger(adultCount)
    ) {
      return res.status(400).json({
        success: false,
        message: '成年人数量必须是大于等于0的整数',
      });
    }

    if (youthChildCount === undefined || youthChildCount === null) {
      return res.status(400).json({
        success: false,
        message: '请提供青少年或儿童数量',
      });
    }

    if (
      typeof youthChildCount !== 'number' ||
      youthChildCount < 0 ||
      !Number.isInteger(youthChildCount)
    ) {
      return res.status(400).json({
        success: false,
        message: '青少年或儿童数量必须是大于等于0的整数',
      });
    }

    // Get user's district if available
    const district = user.district || null;

    // If id is provided, validate it's a number
    let recordId = null;
    
    // Check if id is provided and valid
    // id can be number or string, but must be a valid positive integer
    if (id !== undefined && id !== null && id !== '') {
      // Parse id to number (handle both string and number types)
      const parsedId = typeof id === 'number' ? id : parseInt(String(id), 10);
      
      // Validate that parsedId is a valid positive number
      if (!isNaN(parsedId) && parsedId > 0 && Number.isInteger(parsedId)) {
        recordId = parsedId;
        console.error('[attendance POST] UPDATE MODE - id:', recordId, 'original:', id, 'type:', typeof id);
      } else {
        console.error('[attendance POST] ERROR: Invalid id format:', id, 'parsed to:', parsedId);
        return res.status(400).json({
          success: false,
          message: '无效的记录ID',
        });
      }
    } else {
      console.error('[attendance POST] CREATE MODE - id was:', id, 'type:', typeof id, 'isUndefined:', id === undefined, 'isNull:', id === null);
    }

    // Create or update attendance record
    console.error('[attendance POST] Calling createOrUpdate with recordId:', recordId, 'type:', typeof recordId);
    const attendance = await Attendance.createOrUpdate(
      date,
      meetingType,
      scope,
      scopeValue || null,
      adultCount,
      youthChildCount,
      user.id,
      district,
      notes || null,
      recordId
    );
    console.error('[attendance POST] createOrUpdate returned id:', attendance?.id, 'requested:', recordId);
    
    // Only log when updating (for debugging)
    if (recordId) {
      console.log('[attendance POST] Updated record id:', attendance?.id, '(requested:', recordId, ')');
    }

    res.json({
      success: true,
      message: '出席记录已保存',
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error('[attendance POST] Error creating/updating attendance:', error);
    console.error('[attendance POST] Error code:', error.code);
    console.error('[attendance POST] Error message:', error.message);
    console.error('[attendance POST] Error stack:', error.stack);
    
    // Always include error details in response for debugging
    const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT;
    res.status(500).json({
      success: false,
      message: '保存出席记录失败',
      error: error.message || 'Unknown error',
      errorCode: error.code,
      details: isDevelopment ? {
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }
});

/**
 * GET /api/attendance
 * Get attendance records for current user
 * Query params: ?limit=50&offset=0 (optional)
 * Note: For "view all" feature, only super_admin, admin, leader can see all records
 */
router.get('/', authenticate, authorizeAttendance, async (req, res) => {
  try {
    const user = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const meetingType = req.query.meetingType || null; // Optional filter by meeting type

    // Validate meetingType if provided
    if (meetingType) {
      const validMeetingTypes = ['table', 'homeMeeting', 'prayer'];
      if (!validMeetingTypes.includes(meetingType)) {
        return res.status(400).json({
          success: false,
          message: `无效的聚会类型。有效类型：${validMeetingTypes.join(', ')}`,
        });
      }
    }

    // Check if user can see all records (admin, super_admin, leader) or just their own
    const canSeeAllRecords = canViewAllAttendance(user);

    let records;
    if (canSeeAllRecords) {
      // Admins and leaders can see all records (optionally filtered by meetingType)
      records = await Attendance.findAll(limit, offset, meetingType);
    } else {
      // Regular users (including usher) can only see their own records
      // But for "view all" feature, usher should not access this endpoint
      // This is handled by frontend, but we keep this for backward compatibility
      records = await Attendance.findByUser(user.id, limit, offset);
    }

    res.json({
      success: true,
      data: {
        records: records || [],
        count: records?.length || 0,
      },
    });
  } catch (error) {
    console.error('[attendance GET] Error getting attendance records:', error);
    console.error('[attendance GET] Error code:', error.code);
    console.error('[attendance GET] Error message:', error.message);
    console.error('[attendance GET] Error stack:', error.stack);
    const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT;
    res.status(500).json({
      success: false,
      message: '获取出席记录失败',
      error: error.message || 'Unknown error',
      errorCode: error.code,
      details: isDevelopment ? {
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }
});

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record
 * Users can only delete their own records, admins can delete any
 */
router.delete('/:id', authenticate, authorizeAttendance, async (req, res) => {
  try {
    const attendanceId = parseInt(req.params.id);
    const user = req.user;

    if (isNaN(attendanceId)) {
      return res.status(400).json({
        success: false,
        message: '无效的记录ID',
      });
    }

    const isAdmin = ['super_admin', 'admin'].includes(user.role);
    const deleted = await Attendance.delete(attendanceId, user.id, isAdmin);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '记录不存在或无权限删除',
      });
    }

    res.json({
      success: true,
      message: '记录已删除',
    });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({
      success: false,
      message: '删除记录失败',
    });
  }
});

export default router;
