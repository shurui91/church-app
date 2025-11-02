import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL - 可以根据环境配置
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
      throw new Error(data.message || '请求失败');
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
   * Delete user (super_admin only)
   */
  async deleteUser(userId: number) {
    const response = await apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    return parseResponse(response);
  },
};
