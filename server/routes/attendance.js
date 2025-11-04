import express from 'express';
import { Attendance } from '../database/models/Attendance.js';
import { User } from '../database/models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDatabase } from '../database/db.js';

const router = express.Router();

/**
 * Helper function to check if user can access attendance features
 * Members and 'other' role cannot access
 */
function canAccessAttendance(user) {
  if (!user) return false;
  // Block member and other roles
  if (user.role === 'member' || user.role === 'other') {
    return false;
  }
  // Allow super_admin, admin, leader
  return ['super_admin', 'admin', 'leader'].includes(user.role);
}

/**
 * Custom authorization middleware for attendance
 * Only allows super_admin, admin, leader (not member or other)
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
 */
router.get('/districts-groups', authenticate, authorizeAttendance, async (req, res) => {
  try {
    const db = await getDatabase();
    
    // Get distinct districts
    const districts = await db.all(
      'SELECT DISTINCT district FROM users WHERE district IS NOT NULL AND district != "" ORDER BY district'
    );
    
    // Get distinct groups
    const groups = await db.all(
      'SELECT DISTINCT groupNum FROM users WHERE groupNum IS NOT NULL AND groupNum != "" ORDER BY groupNum'
    );
    
    await db.close();

    res.json({
      success: true,
      data: {
        districts: districts.map(row => row.district),
        groups: groups.map(row => row.groupNum),
      },
    });
  } catch (error) {
    console.error('Error getting districts and groups:', error);
    res.status(500).json({
      success: false,
      message: '获取大区和小组列表失败',
    });
  }
});

/**
 * POST /api/attendance
 * Create or update an attendance record (covers update if exists)
 * Body: { date, meetingType, scope, scopeValue?, adultCount, youthChildCount, notes? }
 */
router.post('/', authenticate, authorizeAttendance, async (req, res) => {
  try {
    const { date, meetingType, scope, scopeValue, adultCount, youthChildCount, notes } = req.body;
    const user = req.user;

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

    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recordDate = new Date(date);
    recordDate.setHours(0, 0, 0, 0);

    if (recordDate > today) {
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

    if (typeof adultCount !== 'number' || adultCount < 0 || !Number.isInteger(adultCount)) {
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

    if (typeof youthChildCount !== 'number' || youthChildCount < 0 || !Number.isInteger(youthChildCount)) {
      return res.status(400).json({
        success: false,
        message: '青少年或儿童数量必须是大于等于0的整数',
      });
    }

    // Get user's district if available
    const district = user.district || null;

    // Create or update attendance record
    const attendance = await Attendance.createOrUpdate(
      date,
      meetingType,
      scope,
      scopeValue || null,
      adultCount,
      youthChildCount,
      user.id,
      district,
      notes || null
    );

    res.json({
      success: true,
      message: '出席记录已保存',
      data: {
        attendance,
      },
    });
  } catch (error) {
    console.error('Error creating/updating attendance:', error);
    res.status(500).json({
      success: false,
      message: '保存出席记录失败',
    });
  }
});

/**
 * GET /api/attendance
 * Get attendance records for current user
 * Query params: ?limit=50&offset=0 (optional)
 */
router.get('/', authenticate, authorizeAttendance, async (req, res) => {
  try {
    const user = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // Check if user is admin (can see all records) or just their own
    const isAdmin = ['super_admin', 'admin'].includes(user.role);

    let records;
    if (isAdmin) {
      // Admins can see all records
      records = await Attendance.findAll(limit, offset);
    } else {
      // Regular users can only see their own records
      records = await Attendance.findByUser(user.id, limit, offset);
    }

    res.json({
      success: true,
      data: {
        records,
        count: records.length,
      },
    });
  } catch (error) {
    console.error('Error getting attendance records:', error);
    res.status(500).json({
      success: false,
      message: '获取出席记录失败',
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

