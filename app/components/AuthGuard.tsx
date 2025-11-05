import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login'];

/**
 * Auth Guard Component
 * Redirects unauthenticated users to login page
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();
  
  // 使用 ref 存储最新值，确保在 setTimeout 回调中使用最新状态
  const isAuthenticatedRef = useRef(isAuthenticated);
  const pathnameRef = useRef(pathname);
  
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    pathnameRef.current = pathname;
    console.log('[AuthGuard] Ref updated - isAuthenticated:', isAuthenticated, 'pathname:', pathname);
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    console.log('[AuthGuard] useEffect triggered - loading:', loading, 'isAuthenticated:', isAuthenticated, 'pathname:', pathname);
    
    if (loading) {
      // Still loading auth state, don't do anything
      console.log('[AuthGuard] Still loading, skipping...');
      return;
    }

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname === '/';
    console.log('[AuthGuard] isPublicRoute:', isPublicRoute);

    if (!isAuthenticated) {
      // User is not authenticated
      console.log('[AuthGuard] User not authenticated');
      if (!isPublicRoute) {
        // Trying to access protected route, redirect to login
        console.log('[AuthGuard] Redirecting to /login (protected route)');
        router.replace('/login');
      } else {
        console.log('[AuthGuard] User not authenticated but already on public route, no action needed');
      }
      // 如果用户未认证且已经在登录页，不需要做任何事情
    } else {
      // User is authenticated
      console.log('[AuthGuard] User authenticated');
      if (isAuthenticated && pathname === '/login') {
        console.log('[AuthGuard] User authenticated but on /login, setting timeout to redirect to /meeting');
        // 添加一个延迟，确保状态已经完全更新
        // 这样可以避免在登出过程中状态更新导致的误判
        const timeoutId = setTimeout(() => {
          console.log('[AuthGuard] Timeout callback - isAuthenticatedRef.current:', isAuthenticatedRef.current, 'pathnameRef.current:', pathnameRef.current);
          // 使用 ref 获取最新值，确保检查的是当前状态
          // 如果用户在登出过程中，isAuthenticated 可能已经变为 false
          if (isAuthenticatedRef.current && pathnameRef.current === '/login') {
            console.log('[AuthGuard] Redirecting to /meeting (user still authenticated on login page)');
            router.replace('/meeting');
          } else {
            console.log('[AuthGuard] Not redirecting - user may have logged out or navigated away');
          }
        }, 200); // 增加到 200ms，给状态更新更多时间
        
        return () => {
          console.log('[AuthGuard] Clearing timeout');
          clearTimeout(timeoutId);
        };
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

