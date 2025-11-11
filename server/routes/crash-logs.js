import express from 'express';
import { CrashLog } from '../database/models/CrashLog.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/crash-logs
 * Create a new crash log entry
 * This endpoint does NOT require authentication to allow crash reporting even when user is not logged in
 */
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      errorMessage,
      errorStack,
      errorName,
      deviceInfo,
      appVersion,
      osVersion,
      platform,
      screenName,
      userActions,
      additionalData,
    } = req.body;

    if (!errorMessage) {
      return res.status(400).json({
        success: false,
        message: 'errorMessage is required',
      });
    }

    // Try to get userId from token if not provided
    let finalUserId = userId;
    if (!finalUserId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        finalUserId = decoded.userId;
      } catch (err) {
        // If token is invalid, continue without userId
        console.log('[crash-logs] Could not extract userId from token:', err.message);
      }
    }

    const crashLog = await CrashLog.create({
      userId: finalUserId || null,
      errorMessage: errorMessage.substring(0, 5000), // Limit error message length
      errorStack: errorStack ? errorStack.substring(0, 10000) : null, // Limit stack trace length
      errorName,
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo).substring(0, 2000) : null,
      appVersion,
      osVersion,
      platform,
      screenName,
      userActions: userActions ? JSON.stringify(userActions).substring(0, 2000) : null,
      additionalData: additionalData ? JSON.stringify(additionalData).substring(0, 2000) : null,
    });

    res.status(201).json({
      success: true,
      message: 'Crash log created successfully',
      data: {
        crashLog,
      },
    });
  } catch (error) {
    console.error('[crash-logs POST] Error creating crash log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create crash log',
      error: error.message,
    });
  }
});

/**
 * GET /api/crash-logs
 * Get crash logs (requires authentication and admin role)
 * Query params:
 *   - userId: Filter by user ID
 *   - limit: Limit number of results (default: 100)
 *   - offset: Offset for pagination (default: 0)
 *   - startDate: Filter by start date (YYYY-MM-DD)
 *   - endDate: Filter by end date (YYYY-MM-DD)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // Only allow admins and super_admins to view crash logs
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此资源',
      });
    }

    const {
      userId,
      limit = 100,
      offset = 0,
      startDate,
      endDate,
    } = req.query;

    const options = {
      userId: userId ? parseInt(userId) : null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: startDate || null,
      endDate: endDate || null,
    };

    const [crashLogs, totalCount] = await Promise.all([
      CrashLog.findAll(options),
      CrashLog.count({ userId: options.userId }),
    ]);

    res.json({
      success: true,
      data: {
        crashLogs,
        total: totalCount,
        limit: options.limit,
        offset: options.offset,
      },
    });
  } catch (error) {
    console.error('[crash-logs GET] Error fetching crash logs:', error);
    res.status(500).json({
      success: false,
      message: '获取崩溃日志失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/crash-logs/:id
 * Get a specific crash log by ID (requires authentication and admin role)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Only allow admins and super_admins to view crash logs
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此资源',
      });
    }

    const { id } = req.params;
    const crashLog = await CrashLog.findById(parseInt(id));

    if (!crashLog) {
      return res.status(404).json({
        success: false,
        message: '崩溃日志不存在',
      });
    }

    res.json({
      success: true,
      data: {
        crashLog,
      },
    });
  } catch (error) {
    console.error('[crash-logs GET :id] Error fetching crash log:', error);
    res.status(500).json({
      success: false,
      message: '获取崩溃日志失败',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/crash-logs/:id
 * Delete a crash log by ID (requires authentication and super_admin role)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Only allow super_admins to delete crash logs
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '无权删除此资源',
      });
    }

    const { id } = req.params;
    const deleted = await CrashLog.deleteById(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '崩溃日志不存在',
      });
    }

    res.json({
      success: true,
      message: '崩溃日志已删除',
    });
  } catch (error) {
    console.error('[crash-logs DELETE :id] Error deleting crash log:', error);
    res.status(500).json({
      success: false,
      message: '删除崩溃日志失败',
      error: error.message,
    });
  }
});

export default router;

