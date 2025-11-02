import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, getStoredToken } from '../services/api';

export interface User {
  id: number;
  phoneNumber: string;
  name: string | null;
  nameZh?: string | null;
  nameEn?: string | null;
  role: 'super_admin' | 'admin' | 'leader' | 'member';
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
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token might be invalid, remove it
      await api.logout();
      setUser(null);
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
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
    }
  };

  /**
   * Refresh user information
   */
  const refreshUser = async () => {
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.data.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
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

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    sendVerificationCode,
    refreshUser,
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
