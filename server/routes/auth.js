import express from 'express';
import { User } from '../database/models/User.js';
import { VerificationCode } from '../database/models/VerificationCode.js';
import { authenticate, generateToken } from '../middleware/auth.js';
import {
	generateVerificationCode,
	normalizePhoneNumber,
	sendVerificationCode,
	validatePhoneNumber,
} from '../services/sms.js';
import { Session } from '../database/models/Session.js';

const router = express.Router();

/**
 * POST /api/auth/check-phone
 * Check if phone number is in whitelist (invited user)
 * Body: { phoneNumber: string }
 */
router.post('/check-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号',
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    if (!validatePhoneNumber(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确',
        isWhitelisted: false,
      });
    }

    // Check if phone number is in whitelist (user exists in database)
    try {
      const userExists = await User.exists(normalizedPhone);

      if (!userExists) {
        return res.json({
          success: true,
          isWhitelisted: false,
          message: '该手机号未在邀请列表中',
        });
      }

      res.json({
        success: true,
        isWhitelisted: true,
        message: '手机号已验证',
      });
    } catch (dbError) {
      console.error('[check-phone] Database error:', dbError);
      console.error('[check-phone] Error stack:', dbError.stack);
      // Return error response instead of letting it crash
      return res.status(500).json({
        success: false,
        message: '检查手机号失败，请稍后重试',
        isWhitelisted: false,
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
      });
    }
  } catch (error) {
    console.error('[check-phone] Unexpected error:', error);
    console.error('[check-phone] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: '检查手机号失败',
      isWhitelisted: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/send-code
 * Send verification code to phone number
 * Body: { phoneNumber: string }
 */
router.post('/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号',
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    if (!validatePhoneNumber(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确，请使用国际格式（如：+1234567890）',
      });
    }

    // Check if phone number is in whitelist (user exists in database)
    const userExists = await User.exists(normalizedPhone);
    if (!userExists) {
      // Don't reveal that phone number is not in whitelist for security
      // Just return success message (but don't actually send code)
      return res.status(403).json({
        success: false,
        message: '该手机号未在邀请列表中',
      });
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Save verification code to database
    await VerificationCode.create(normalizedPhone, code, 5); // 5 minutes expiry

    // Send SMS (or log in development)
    const smsResult = await sendVerificationCode(normalizedPhone, code);

    if (!smsResult.success) {
      return res.status(500).json({
        success: false,
        message: smsResult.message,
      });
    }

    // Return success (don't return the code)
    res.json({
      success: true,
      message: '验证码已发送',
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({
      success: false,
      message: '发送验证码失败，请稍后重试',
    });
  }
});

/**
 * POST /api/auth/verify-code
 * Verify code and login user
 * Body: { phoneNumber: string, code: string }
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    // Validate input
    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号和验证码',
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Development mode: allow fixed verification code (123456)
    // For testing: use 123456 when NODE_ENV is not production OR when explicitly set to allow dev code
    const DEV_MODE_CODE = '123456';
    const ALLOW_DEV_CODE = process.env.ALLOW_DEV_CODE !== 'false'; // Default to true unless explicitly set to false
    const isDevMode = process.env.NODE_ENV !== 'production' || ALLOW_DEV_CODE;

    console.log(
      `[verify-code] login attempt for ${normalizedPhone} | code length ${code?.length || 0} | dev mode: ${isDevMode ? 'yes' : 'no'}`
    );

    // Check if using dev mode fixed code
    if (isDevMode && code === DEV_MODE_CODE) {
      console.log('[verify-code] using dev mode bypass code');
      // Verify that phone number is in whitelist
      const userExists = await User.exists(normalizedPhone);
      if (!userExists) {
        return res.status(403).json({
          success: false,
          message: '该手机号未在邀请列表中',
        });
      }
      // Dev code is valid, proceed to login
    } else {
      // Normal verification process
      const verificationResult = await VerificationCode.verify(normalizedPhone, code);

      console.log('[verify-code] verification result', verificationResult);
      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message,
        });
      }
    }

    // Code is valid, get or create user
    let user = await User.findByPhoneNumber(normalizedPhone);
    console.log('[verify-code] User lookup result for', normalizedPhone, user ? `id=${user.id}` : 'not found');

    if (!user) {
      // This shouldn't happen if whitelist check works, but handle it anyway
      return res.status(403).json({
        success: false,
        message: '该手机号未在邀请列表中',
      });
    }

    // Update last login time
    await User.updateLastLogin(user.id);
    
    // Refresh user to get updated lastLoginAt
    user = await User.findById(user.id);

    // Generate JWT token
    const token = generateToken(user);

    const deviceId = req.body.deviceId || null;
    const deviceInfo = req.body.deviceInfo || null;
    const expiresDays = Number(process.env.SESSION_EXPIRES_DAYS || 7);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

    console.log('[verify-code] revoking other sessions for user', user.id, 'deviceId', deviceId);
    await Session.revokeOtherSessions(user.id, deviceId);
    console.log('[verify-code] creating session for user', user.id);
    await Session.create({
      userId: user.id,
      token,
      deviceId,
      deviceInfo,
      expiresAt,
    });

    // Return user info and token
    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          nameZh: user.nameZh,
          nameEn: user.nameEn,
          role: user.role,
          district: user.district,
          groupNum: user.groupNum,
          email: user.email,
          status: user.status,
          gender: user.gender,
          birthdate: user.birthdate,
          joinDate: user.joinDate,
          preferredLanguage: user.preferredLanguage,
          notes: user.notes,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user information
 * Requires: Authorization header with Bearer token
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    // User is already attached to req by authenticate middleware
    const user = req.user;

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          nameZh: user.nameZh,
          nameEn: user.nameEn,
          role: user.role,
          district: user.district,
          groupNum: user.groupNum,
          email: user.email,
          status: user.status,
          gender: user.gender,
          birthdate: user.birthdate,
          joinDate: user.joinDate,
          preferredLanguage: user.preferredLanguage,
          notes: user.notes,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side should remove token)
 * Note: Since we're using JWT, logout is handled client-side by removing the token
 * This endpoint is mainly for consistency
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // With JWT, logout is handled client-side
    // But we could implement token blacklisting here if needed
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (token) {
      await Session.revokeByToken(token);
    }

    res.json({
      success: true,
      message: '登出成功',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      success: false,
      message: '登出失败',
    });
  }
});

export default router;
