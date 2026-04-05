import { Platform } from 'react-native';

/**
 * Web 端静态站挂在 /admin（见 app.json experiments.baseUrl）时，
 * 登录后应进入管理页 /users（即 /admin/users），而不是 App 主入口 /meeting。
 */
const ADMIN_BASE_PATH = '/admin-xt7f9z';

export function getPostAuthHomeRoute(): '/users' | '/meeting' {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return '/meeting';
  }
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  if (p === ADMIN_BASE_PATH || p.startsWith(`${ADMIN_BASE_PATH}/login`)) {
    return '/users';
  }
  return '/meeting';
}
