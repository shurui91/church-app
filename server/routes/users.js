import express from 'express';
import { User } from '../database/models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Get all users (requires admin or super_admin role)
 * Query params: ?role=member (optional role filter)
 */
router.get('/', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { role } = req.query;
    
    // Get all users (with optional role filter)
    const users = await User.findAll(role || null);

    // Remove sensitive information before sending
    const sanitizedUsers = users.map(user => ({
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
    }));

    res.json({
      success: true,
      data: {
        users: sanitizedUsers,
        count: sanitizedUsers.length,
      },
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (requires admin or super_admin role)
 */
router.get('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

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
          groupNum: user.groupNum,  // 修复: 改为 groupNum
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
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
    });
  }
});

/**
 * PUT /api/users/:id/role
 * Update user role (requires admin or super_admin role)
 * Note: Only super_admin can change roles to/from super_admin
 * Body: { role: 'super_admin' | 'admin' | 'leader' | 'member' | 'usher' }
 */
router.put('/:id/role', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    const currentUser = req.user;

    // Validate input
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: '请提供角色',
      });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'leader', 'member', 'usher'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `无效的角色。有效角色：${validRoles.join(', ')}`,
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Permission check: Only super_admin can change roles to/from super_admin
    if (role === 'super_admin' || targetUser.role === 'super_admin') {
      if (currentUser.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: '只有超级管理员可以修改超级管理员角色',
        });
      }
    }

    // Prevent user from changing their own role
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        message: '不能修改自己的角色',
      });
    }

    // Update role
    const updatedUser = await User.updateRole(userId, role);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: '更新角色失败',
      });
    }

    res.json({
      success: true,
      message: '角色更新成功',
      data: {
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          nameZh: updatedUser.nameZh,
          nameEn: updatedUser.nameEn,
          role: updatedUser.role,
          district: updatedUser.district,
          groupNum: updatedUser.groupNum,
          email: updatedUser.email,
          status: updatedUser.status,
          gender: updatedUser.gender,
          birthdate: updatedUser.birthdate,
          joinDate: updatedUser.joinDate,
          preferredLanguage: updatedUser.preferredLanguage,
          notes: updatedUser.notes,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: '更新角色失败',
    });
  }
});

/**
 * PUT /api/users/:id/name
 * Update user name (users can update their own name, admins can update any)
 * Body: { name: string }
 */
router.put('/:id/name', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name } = req.body;
    const currentUser = req.user;

    // Validate input
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    if (name === undefined || name === null) {
      return res.status(400).json({
        success: false,
        message: '请提供姓名',
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Permission check: Users can only update their own name, admins can update any
    const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
    if (userId !== currentUser.id && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只能修改自己的姓名',
      });
    }

    // Update name
    const updatedUser = await User.updateName(userId, name);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: '更新姓名失败',
      });
    }

    res.json({
      success: true,
      message: '姓名更新成功',
      data: {
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          nameZh: updatedUser.nameZh,
          nameEn: updatedUser.nameEn,
          role: updatedUser.role,
          district: updatedUser.district,
          groupNum: updatedUser.groupNum,
          email: updatedUser.email,
          status: updatedUser.status,
          gender: updatedUser.gender,
          birthdate: updatedUser.birthdate,
          joinDate: updatedUser.joinDate,
          preferredLanguage: updatedUser.preferredLanguage,
          notes: updatedUser.notes,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user name:', error);
    res.status(500).json({
      success: false,
      message: '更新姓名失败',
    });
  }
});

/**
 * PUT /api/users/:id/names
 * Update user names (Chinese and English) (users can update their own, admins can update any)
 * Body: { nameZh?: string, nameEn?: string }
 */
router.put('/:id/names', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { nameZh, nameEn } = req.body;
    const currentUser = req.user;

    // Validate input
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Permission check: Users can only update their own names, admins can update any
    const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);
    if (userId !== currentUser.id && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只能修改自己的姓名',
      });
    }

    // Update names
    const updatedUser = await User.updateNames(userId, nameZh || null, nameEn || null);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: '更新姓名失败',
      });
    }

    res.json({
      success: true,
      message: '姓名更新成功',
      data: {
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          nameZh: updatedUser.nameZh,
          nameEn: updatedUser.nameEn,
          role: updatedUser.role,
          district: updatedUser.district,
          groupNum: updatedUser.groupNum,
          email: updatedUser.email,
          status: updatedUser.status,
          gender: updatedUser.gender,
          birthdate: updatedUser.birthdate,
          joinDate: updatedUser.joinDate,
          preferredLanguage: updatedUser.preferredLanguage,
          notes: updatedUser.notes,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user names:', error);
    res.status(500).json({
      success: false,
      message: '更新姓名失败',
    });
  }
});

/**
 * PUT /api/users/:id/district-group
 * Update user district and group number (requires admin or super_admin role)
 * Body: { district?: string, groupNum?: string }
 */
router.put('/:id/district-group', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { district, groupNum } = req.body;

    // Validate input
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Update district and group number
    const updatedUser = await User.updateDistrictAndGroup(userId, district || null, groupNum || null);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: '更新大区和小组失败',
      });
    }

    res.json({
      success: true,
      message: '大区和小组更新成功',
      data: {
        user: {
          id: updatedUser.id,
          phoneNumber: updatedUser.phoneNumber,
          name: updatedUser.name,
          nameZh: updatedUser.nameZh,
          nameEn: updatedUser.nameEn,
          role: updatedUser.role,
          district: updatedUser.district,
          groupNum: updatedUser.groupNum,
          email: updatedUser.email,
          status: updatedUser.status,
          gender: updatedUser.gender,
          birthdate: updatedUser.birthdate,
          joinDate: updatedUser.joinDate,
          preferredLanguage: updatedUser.preferredLanguage,
          notes: updatedUser.notes,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating user district and group:', error);
    res.status(500).json({
      success: false,
      message: '更新大区和小组失败',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (requires super_admin role only)
 */
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUser = req.user;

    // Validate input
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID',
      });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // Prevent user from deleting themselves
    if (userId === currentUser.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户',
      });
    }

    // Delete user
    const deleted = await User.delete(userId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: '删除用户失败',
      });
    }

    res.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败',
    });
  }
});

export default router;
