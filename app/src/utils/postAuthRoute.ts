import { Platform } from 'react-native';

/**
 * Web 端静态站挂在 /admin（见 app.json experiments.baseUrl）时，
 * 登录后应进入管理页 /users（即 /admin/users），而不是 App 主入口 /meeting。
 */
export function getPostAuthHomeRoute(): '/users' | '/meeting' {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return '/meeting';
  }
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  if (p === '/admin' || p.startsWith('/admin/login')) {
    return '/users';
  }
  return '/meeting';
}
