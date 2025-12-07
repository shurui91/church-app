import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API base URL - 可以根据环境配置
// Try multiple sources: expo-constants extra, env var, or default
const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000';

// Debug: Log the API URL being used
console.log('🔗 API_BASE_URL:', API_BASE_URL);
console.log('🔗 From expo-constants:', Constants.expoConfig?.extra?.apiUrl);
console.log('🔗 From env var:', process.env.EXPO_PUBLIC_API_URL);

// Storage keys
const TOKEN_KEY = '@auth_token';

/**
 * Get stored auth token
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Store auth token
 */
export async function storeToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
}

/**
 * Remove auth token
 */
export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

/**
 * API request wrapper with authentication
 */
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getStoredToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Parse API response
 */
async function parseResponse<T>(response: Response): Promise<T> {
  // Read response as text first to handle both JSON and non-JSON responses
  const text = await response.text();
  const contentType = response.headers.get('content-type');

  // Check if response is JSON
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Non-JSON response:', text.substring(0, 200));
    console.error('Response status:', response.status);
    console.error('Response URL:', response.url);
    throw new Error(
      `服务器返回了非JSON响应（状态码: ${response.status}）。请检查API服务器是否正常运行在 ${API_BASE_URL}`
    );
  }

  try {
    const data = JSON.parse(text);

    if (!response.ok) {
      // Include error details if available
      const errorMessage = data.message || data.error || '请求失败';
      const error = new Error(errorMessage);
      // Attach response data for debugging
      (error as any).responseData = data;
      (error as any).status = response.status;
      throw error;
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      console.error('JSON parse error. Response text:', text.substring(0, 200));
      throw new Error(
        `服务器响应格式错误。请确保API服务器运行在 ${API_BASE_URL} 且正常工作。响应内容: ${text.substring(0, 100)}`
      );
    }
    throw error;
  }
}

/**
 * API Client
 */
export const api = {
  /**
   * Check if phone number is in whitelist
   */
  async checkPhoneNumber(phoneNumber: string) {
    try {
      const response = await apiRequest('/api/auth/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
      return parseResponse<{
        success: boolean;
        isWhitelisted: boolean;
        message: string;
      }>(response);
    } catch (error: any) {
      // Improve error message for connection issues
      if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
        throw new Error('无法连接到服务器。请确保后端服务器正在运行。');
      }
      throw error;
    }
  },

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber: string) {
    const response = await apiRequest('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
    return parseResponse(response);
  },

  /**
   * Verify code and login
   */
  async verifyCode(phoneNumber: string, code: string) {
    const response = await apiRequest('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
    const data = await parseResponse<{
      success: boolean;
      message: string;
      data: {
        user: any;
        token: string;
      };
    }>(response);

    // Store token
    if (data.success && data.data.token) {
      await storeToken(data.data.token);
    }

    return data;
  },

  /**
   * Get current user information
   */
  async getCurrentUser() {
    const response = await apiRequest('/api/auth/me');
    return parseResponse<{
      success: boolean;
      data: { user: any };
    }>(response);
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors on logout
      console.log('Logout error (ignored):', error);
    } finally {
      await removeToken();
    }
  },

  /**
   * Get all users (admin only)
   */
  async getUsers(role?: string) {
    const url = role ? `/api/users?role=${role}` : '/api/users';
    const response = await apiRequest(url);
    return parseResponse<{
      success: boolean;
      data: { users: any[]; count: number };
    }>(response);
  },

  /**
   * Get user by ID (admin only)
   */
  async getUserById(id: number) {
    const response = await apiRequest(`/api/users/${id}`);
    return parseResponse<{
      success: boolean;
      data: { user: any };
    }>(response);
  },

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: number, role: string) {
    const response = await apiRequest(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return parseResponse(response);
  },

  /**
   * Update user name
   */
  async updateUserName(userId: number, name: string) {
    const response = await apiRequest(`/api/users/${userId}/name`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
    return parseResponse(response);
  },

  /**
   * Travel Schedule APIs
   */

  /**
   * Get all travel schedules (with optional filters)
   */
  async getTravelSchedules(filters?: {
    userId?: number;
    startDate?: string;
    endDate?: string;
    date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.date) params.append('date', filters.date);

    const url = `/api/travel${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiRequest(url);
    return parseResponse<{
      success: boolean;
      data: {
        schedules: any[];
        count: number;
      };
    }>(response);
  },

  /**
   * Get current user's travel schedules
   */
  async getMyTravelSchedules() {
    const response = await apiRequest('/api/travel/my');
    return parseResponse<{
      success: boolean;
      data: {
        schedules: any[];
        count: number;
      };
    }>(response);
  },

  /**
   * Get travel schedules for a specific date
   */
  async getTravelSchedulesByDate(date: string) {
    const response = await apiRequest(`/api/travel/date/${date}`);
    return parseResponse<{
      success: boolean;
      data: {
        schedules: any[];
        count: number;
        date: string;
      };
    }>(response);
  },

  /**
   * Get a specific travel schedule by ID
   */
  async getTravelScheduleById(id: number) {
    const response = await apiRequest(`/api/travel/${id}`);
    return parseResponse<{
      success: boolean;
      data: {
        schedule: any;
      };
    }>(response);
  },

  /**
   * Create a new travel schedule
   */
  async createTravelSchedule(data: {
    startDate: string;
    endDate: string;
    destination?: string;
    notes?: string;
  }) {
    const response = await apiRequest('/api/travel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseResponse<{
      success: boolean;
      message: string;
      data: {
        schedule: any;
      };
    }>(response);
  },

  /**
   * Update a travel schedule
   */
  async updateTravelSchedule(
    id: number,
    data: {
      startDate: string;
      endDate: string;
      destination?: string;
      notes?: string;
    }
  ) {
    const response = await apiRequest(`/api/travel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return parseResponse<{
      success: boolean;
      message: string;
      data: {
        schedule: any;
      };
    }>(response);
  },

  /**
   * Delete a travel schedule
   */
  async deleteTravelSchedule(id: number) {
    const response = await apiRequest(`/api/travel/${id}`, {
      method: 'DELETE',
    });
    return parseResponse<{
      success: boolean;
      message: string;
    }>(response);
  },

  /**
   * Delete user (super_admin only)
   */
  async deleteUser(userId: number) {
    const response = await apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    return parseResponse(response);
  },

  /**
   * Get available districts and groups
   */
  async getDistrictsAndGroups() {
    const response = await apiRequest('/api/attendance/districts-groups');
    return parseResponse<{
      success: boolean;
      data: { districts: string[]; groups: string[] };
    }>(response);
  },

  /**
   * Create or update attendance record
   */
  async createOrUpdateAttendance(data: {
    id?: number;
    date: string;
    meetingType: 'table' | 'homeMeeting' | 'prayer';
    scope: 'full_congregation' | 'district' | 'small_group';
    scopeValue?: string | null;
    adultCount: number;
    youthChildCount: number;
    notes?: string;
  }) {
    const response = await apiRequest('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseResponse<{
      success: boolean;
      message: string;
      data: { attendance: any };
    }>(response);
  },

  /**
   * Get attendance records
   */
  async getAttendanceRecords(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    const query = params.toString();
    const url = query ? `/api/attendance?${query}` : '/api/attendance';
    const response = await apiRequest(url);
    return parseResponse<{
      success: boolean;
      data: { records: any[]; count: number };
    }>(response);
  },

  /**
   * Delete attendance record
   */
  async deleteAttendance(id: number) {
    const response = await apiRequest(`/api/attendance/${id}`, {
      method: 'DELETE',
    });
    return parseResponse(response);
  },

  /**
   * Report a crash log to the server
   */
  async reportCrash(crashData: {
    errorMessage: string;
    errorStack?: string;
    errorName?: string;
    deviceInfo?: any;
    appVersion?: string;
    osVersion?: string;
    platform?: string;
    screenName?: string;
    userActions?: any;
    additionalData?: any;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await getStoredToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/crash-logs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(crashData),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[API] Failed to report crash:', error);
      // Don't throw error here - we don't want crash reporting to cause another crash
      return {
        success: false,
        message: error.message || 'Failed to report crash',
      };
    }
  },
};
