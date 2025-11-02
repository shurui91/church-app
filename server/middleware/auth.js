import jwt from 'jsonwebtoken';
import { User } from '../database/models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

/**
 * Generate JWT token for user
 * @param {Object} user - User object with id, phoneNumber, role
 * @returns {string} JWT token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '无效或过期的令牌',
      });
    }

    // Fetch user from database to ensure user still exists
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Attach user to request object
    req.user = user;
    req.token = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: '认证过程出错',
    });
  }
}

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 * @param {...string} roles - Required roles
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
      });
    }

    next();
  };
}
