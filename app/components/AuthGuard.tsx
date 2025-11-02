import { useEffect } from 'react';
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

  useEffect(() => {
    if (loading) {
      // Still loading auth state, don't do anything
      return;
    }

    // Check if current route is public
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname) || pathname === '/';

    if (!isAuthenticated) {
      // User is not authenticated
      if (!isPublicRoute) {
        // Trying to access protected route, redirect to login
        router.replace('/login');
      }
    } else {
      // User is authenticated
      if (pathname === '/login') {
        // On login page, redirect to home
        router.replace('/meeting');
      }
    }
  }, [isAuthenticated, loading, pathname]);

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
