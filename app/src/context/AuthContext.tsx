import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, getStoredToken, removeToken } from '../services/api';

export interface User {
  id: number;
  phoneNumber: string;
  name: string | null;
  nameZh?: string | null;
  nameEn?: string | null;
  role: 'super_admin' | 'admin' | 'leader' | 'member' | 'usher';
  district?: string | null;
  groupNum?: string | null;
  email?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
  gender?: 'male' | 'female' | 'other' | null;
  birthdate?: string | null;
  joinDate?: string | null;
  preferredLanguage?: string;
  notes?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  sendVerificationCode: (phoneNumber: string) => Promise<{ success: boolean; message?: string }>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Check if user is authenticated and load user info
   */
  const checkAuth = async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Try to get current user info
      const response = await api.getCurrentUser();
      if (response.success && response.data.user) {
        setUser(response.data.user);
      } else {
        // Token might be invalid, remove it
        await api.logout();
        setUser(null);
      }
    } catch (error: any) {
      // Only logout if token is actually invalid (401 Unauthorized)
      // Don't logout for network errors, timeouts, or other connection issues
      const isTokenError = 
        error?.status === 401 || 
        error?.message?.includes('无效或过期的令牌') ||
        error?.message?.includes('未提供认证令牌') ||
        error?.message?.includes('Unauthorized');
      
      if (isTokenError) {
        console.log('Auth check failed: Token is invalid, logging out');
        await api.logout();
        setUser(null);
      } else {
        // Network error or other connection issue - keep user logged in
        // Token might still be valid, just couldn't verify it right now
        console.log('Auth check failed (network/connection issue, keeping user logged in):', error?.message || error);
        // Don't logout - user might still have a valid token
        // Just don't update user info for now
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send verification code
   */
  const sendVerificationCode = async (phoneNumber: string) => {
    try {
      const response = await api.sendVerificationCode(phoneNumber);
      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '发送验证码失败',
      };
    }
  };

  /**
   * Login with phone number and verification code
   */
  const login = async (phoneNumber: string, code: string) => {
    try {
      const response = await api.verifyCode(phoneNumber, code);
      if (response.success && response.data.user) {
        setUser(response.data.user);
        return {
          success: true,
          message: response.message,
        };
      } else {
        return {
          success: false,
          message: response.message || '登录失败',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '登录失败',
      };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    console.log('[AuthContext] logout() called');
    
    // 立即删除 token，防止 refreshUser 或其他操作重新获取用户信息
    // 必须在设置 user = null 之前或同时删除 token
    try {
      console.log('[AuthContext] Removing token from storage...');
      await removeToken();
      console.log('[AuthContext] Token removed from storage');
    } catch (error) {
      console.log('[AuthContext] Failed to remove token (ignored):', error);
    }
    
    // 然后清除本地状态，确保立即触发 AuthGuard 导航
    console.log('[AuthContext] Setting user to null...');
    setUser(null);
    console.log('[AuthContext] User set to null, isAuthenticated should now be false');
    
    // 最后尝试调用 API 登出（不阻塞，即使失败也继续）
    // 注意：api.logout() 会在 finally 中再次删除 token，但这不会造成问题
    try {
      console.log('[AuthContext] Calling API logout...');
      // 添加超时，避免 API 调用卡住
      const logoutPromise = api.logout();
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve(null), 2000); // 2秒超时
      });
      await Promise.race([logoutPromise, timeoutPromise]);
      console.log('[AuthContext] API logout completed');
    } catch (error) {
      // 忽略错误，本地状态已清除
      console.log('[AuthContext] Logout API call failed (ignored):', error);
    }
  };

  /**
   * Refresh user information
   */
  const refreshUser = async () => {
    try {
      console.log('[AuthContext] refreshUser() called');
      // 检查是否有 token，如果没有则跳过（可能是登出后调用）
      const token = await getStoredToken();
      if (!token) {
        // 没有 token，可能是用户已登出，不执行刷新
        console.log('[AuthContext] refreshUser() - No token, skipping');
        // 如果 token 不存在但 user 还存在，清除 user
        if (user) {
          console.log('[AuthContext] refreshUser() - No token but user exists, clearing user');
          setUser(null);
        }
        return;
      }

      console.log('[AuthContext] refreshUser() - Token exists, fetching user info...');
      const response = await api.getCurrentUser();
      if (response.success && response.data.user) {
        console.log('[AuthContext] refreshUser() - User info fetched, setting user');
        setUser(response.data.user);
      } else {
        console.log('[AuthContext] refreshUser() - Failed to fetch user info');
        // 如果获取用户信息失败，清除 user
        setUser(null);
      }
    } catch (error: any) {
      // 只在非 token 缺失错误时记录日志
      // token 缺失错误（401）在登出时是正常的，不需要记录
      if (error.message && !error.message.includes('未提供认证令牌') && !error.message.includes('无效或过期的令牌')) {
        console.error('[AuthContext] refreshUser() - Error:', error);
      } else {
        console.log('[AuthContext] refreshUser() - Token error (expected after logout):', error.message);
        // 如果是 token 错误，清除 user
        setUser(null);
      }
    }
  };

  /**
   * Check if user has one of the required roles
   */
  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if user is admin
   */
  const isAdmin = user ? ['admin', 'super_admin'].includes(user.role) : false;

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = user?.role === 'super_admin';

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // 使用 useCallback 包装 refreshUser，避免不必要的重新创建
  // 注意：refreshUser 不依赖 user，因为它在函数内部会检查 user
  const refreshUserMemoized = useCallback(refreshUser, []);
  
  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    sendVerificationCode,
    refreshUser: refreshUserMemoized,
    hasRole,
    isAdmin,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
