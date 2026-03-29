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
    // 如果是404错误，创建一个包含status的错误对象
    if (response.status === 404) {
      const error: any = new Error('API endpoint not found');
      error.status = 404;
      error.responseData = { success: false, message: 'API endpoint not found' };
      throw error;
    }
    
    console.error('Non-JSON response:', text.substring(0, 200));
    console.error('Response status:', response.status);
    console.error('Response URL:', response.url);
    const error: any = new Error(
      `服务器返回了非JSON响应（状态码: ${response.status}）。请检查API服务器是否正常运行在 ${API_BASE_URL}`
    );
    error.status = response.status;
    throw error;
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

/** 闭区间 [from, to] 的 YYYY-MM-DD 列表（用于健身房日历范围） */
function enumerateDateStringsInclusive(from: string, to: string): string[] {
  const result: string[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const end = new Date(to + 'T12:00:00');
  const cur = new Date(fy, fm - 1, fd);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/**
 * 当 GET /api/gym/days-with-reservations 尚未部署（404）时，按天请求已有接口推断「有预约」的日期。
 * 部署新接口后可改为单次请求，减轻负载。
 */
async function getGymDaysWithReservationsViaTimeSlots(
  from: string,
  to: string
): Promise<{ success: boolean; data: { dates: string[] } }> {
  const dateList = enumerateDateStringsInclusive(from, to);
  const dates: string[] = [];
  const BATCH = 6;
  for (let i = 0; i < dateList.length; i += BATCH) {
    const chunk = dateList.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map(async (dateStr) => {
        try {
          const response = await apiRequest(`/api/gym/time-slots/${dateStr}`);
          const data = await parseResponse<{
            success: boolean;
            data: { timeSlots: { isReserved?: boolean; blackout?: boolean }[] };
          }>(response);
          if (
            data.success &&
            data.data.timeSlots &&
            data.data.timeSlots.some((s) => s.isReserved || s.blackout)
          ) {
            return dateStr;
          }
        } catch {
          // 单日失败忽略
        }
        return null;
      })
    );
    for (const r of results) {
      if (r) dates.push(r);
    }
  }
  return { success: true, data: { dates } };
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
    const deviceId = Constants.installationId;
    const deviceInfo = `${Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web'} ${
      Constants.deviceName || 'device'
    }`;

    const response = await apiRequest('/api/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code, deviceId, deviceInfo }),
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
  async getAttendanceRecords(limit?: number, offset?: number, meetingType?: 'table' | 'homeMeeting' | 'prayer') {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    if (meetingType) params.append('meetingType', meetingType);
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
   * Gym Reservation APIs
   */

  /**
   * Get users for co-reservation dropdown (excludes current user)
   */
  async getGymUsers() {
    try {
      const response = await apiRequest('/api/gym/users');
      return parseResponse<{
        success: boolean;
        data: { users: { id: number; nameZh?: string; nameTw?: string; nameEn?: string; phoneNumber?: string }[] };
      }>(response);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
        return { success: true, data: { users: [] } };
      }
      throw error;
    }
  },

  /**
   * Get available time slots for a specific date
   */
  async getGymTimeSlots(date: string) {
    try {
      const response = await apiRequest(`/api/gym/time-slots/${date}`);
      return parseResponse<{
        success: boolean;
        data: {
      timeSlots: {
        id: number;
        startTime: string;
        endTime: string;
        duration: number;
        isAvailable: boolean;
        isReserved: boolean;
        blackout?: boolean;
        reservedBy?: {
          reservationId?: number;
          status: string;
          primary?: {
            id: number;
            name?: string;
            nameZh?: string;
            nameTw?: string;
            nameEn?: string;
            phoneNumber?: string;
            district?: string;
            groupNum?: string;
          };
          helper?: {
            id: number;
            name?: string;
            nameZh?: string;
            nameTw?: string;
            nameEn?: string;
            phoneNumber?: string;
            district?: string;
            groupNum?: string;
          };
        };
      }[];
        };
      }>(response);
    } catch (error: any) {
      // 如果API端点不存在（404），返回空的时间段列表
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Gym API endpoint not found, returning empty time slots');
        return {
          success: true,
          data: { timeSlots: [] },
        };
      }
      throw error;
    }
  },

  /**
   * Dates in [from, to] (YYYY-MM-DD) that have at least one non-cancelled reservation (calendar markers).
   */
  async getGymDaysWithReservations(from: string, to: string) {
    try {
      const q = new URLSearchParams({ from, to });
      const response = await apiRequest(`/api/gym/days-with-reservations?${q.toString()}`);
      return parseResponse<{
        success: boolean;
        data: { dates: string[] };
      }>(response);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn(
          '[gym] days-with-reservations 未部署(404)，回退为按日请求 time-slots 以标记日历红点'
        );
        return getGymDaysWithReservationsViaTimeSlots(from, to);
      }
      throw error;
    }
  },

  /**
   * Create a gym reservation
   */
  async createGymReservation(data: {
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    duration: number; // minutes
    coUserId: number; // 第二位预约人
    notes?: string;
  }) {
    try {
      const response = await apiRequest('/api/gym/reservations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return parseResponse<{
        success: boolean;
        message: string;
        data: {
          reservation: any;
        };
      }>(response);
    } catch (error: any) {
      // 如果API端点不存在（404），返回友好的错误信息
      if (error.status === 404 || error.message?.includes('404')) {
        throw new Error('体育馆预约功能暂未开放，请稍后再试');
      }
      throw error;
    }
  },

  /**
   * Get current user's gym reservations
   */
  async getMyGymReservations() {
    try {
      const response = await apiRequest('/api/gym/reservations/my');
      return parseResponse<{
        success: boolean;
        data: {
          reservations: any[];
          count: number;
        };
      }>(response);
    } catch (error: any) {
      // 如果API端点不存在（404），返回空的预约列表
      if (error.status === 404 || error.message?.includes('404')) {
        console.warn('Gym reservations API endpoint not found, returning empty list');
        return {
          success: true,
          data: { reservations: [], count: 0 },
        };
      }
      throw error;
    }
  },

  /**
   * Get gym reservation by ID
   */
  async getGymReservationById(id: number) {
    const response = await apiRequest(`/api/gym/reservations/${id}`);
    return parseResponse<{
      success: boolean;
      data: {
        reservation: {
          id: number;
          date: string;
          start_time: string;
          end_time: string;
          duration: number;
          status: string;
          helper_user_id?: number | null;
          user_id?: number | null;
          primary_namezh?: string;
          primary_nametw?: string;
          primary_nameen?: string;
          primary_name?: string;
          primary_phonenumber?: string;
          primary_district?: string;
          primary_groupnum?: string;
          helper_namezh?: string;
          helper_nametw?: string;
          helper_nameen?: string;
          helper_name?: string;
          helper_phonenumber?: string;
          helper_district?: string;
          helper_groupnum?: string;
        };
      };
    }>(response);
  },

  /**
   * Cancel a gym reservation
   */
  async cancelGymReservation(id: number) {
    try {
      const response = await apiRequest(`/api/gym/reservations/${id}/cancel`, {
        method: 'POST',
      });
      return parseResponse<{
        success: boolean;
        message: string;
      }>(response);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
        throw new Error('体育馆预约功能暂未开放，请稍后再试');
      }
      throw error;
    }
  },

  async confirmGymReservation(id: number) {
    const response = await apiRequest(`/api/gym/reservations/${id}/confirm`, {
      method: 'POST',
    });
    return parseResponse<{
      success: boolean;
      message: string;
      data: {
        reservation: any;
      };
    }>(response);
  },

  /**
   * Check in to a gym reservation
   */
  async checkInGymReservation(id: number) {
    try {
      const response = await apiRequest(`/api/gym/reservations/${id}/check-in`, {
        method: 'POST',
      });
      return parseResponse<{
        success: boolean;
        message: string;
        data: {
          reservation: any;
        };
      }>(response);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
        throw new Error('体育馆预约功能暂未开放，请稍后再试');
      }
      throw error;
    }
  },

  /**
   * Check out from a gym reservation
   */
  async checkOutGymReservation(id: number) {
    try {
      const response = await apiRequest(`/api/gym/reservations/${id}/check-out`, {
        method: 'POST',
      });
      return parseResponse<{
        success: boolean;
        message: string;
        data: {
          reservation: any;
        };
      }>(response);
    } catch (error: any) {
      if (error.status === 404 || error.message?.includes('404')) {
        throw new Error('体育馆预约功能暂未开放，请稍后再试');
      }
      throw error;
    }
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
