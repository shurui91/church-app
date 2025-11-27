import './src/i18n';
import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import BackButton from './components/BackButton';
import AuthGuard from './components/AuthGuard';
import UpdateChecker from './components/UpdateChecker';
import { ThemeProvider } from './src/context/ThemeContext';
import { FontSizeProvider, useFontSize } from './src/context/FontSizeContext';
import { AuthProvider } from './src/context/AuthContext';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useState } from 'react';

// 定义需要显示底部导航栏的路由白名单
const TAB_BAR_ROUTES = [
  '/home',
  '/meeting',
  '/announcement',
  '/profile',
  '/pursue',
];

function ThemedLayout() {
  const pathname = usePathname(); // ✅ 提前在组件顶层调用
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  // Don't show tab bar on login or index (splash) page
  const shouldShowTabBar =
    pathname !== '/login' &&
    pathname !== '/' &&
    TAB_BAR_ROUTES.some((route) => pathname.startsWith(route));

  // ✅ 把 pathname 当作参数传入
  const defaultHeaderOptions = (title: string, pathname: string) => {
    const isTabRoot = TAB_BAR_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    return {
      headerShown: true,
      title,
      headerBackTitle: '返回',
      headerStyle: { backgroundColor: colors.card },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontSize: getFontSizeValue(18),
      },
      headerLeft: isTabRoot ? undefined : () => <BackButton />, // ✅ 条件显示
    };
  };

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name='index' />
        <Stack.Screen name='login' options={{ headerShown: false }} />
        <Stack.Screen name='home' />
        <Stack.Screen name='profile' />
        <Stack.Screen name='meeting' />
        <Stack.Screen name='announcement' />
        <Stack.Screen name='pursue' />
        <Stack.Screen 
          name='attendance' 
          options={{
            headerShown: true,
            presentation: 'card',
          }}
        />
        <Stack.Screen 
          name='travel' 
          options={{
            headerShown: true,
            presentation: 'card',
          }}
        />

        {/* ✅ 调用时传入 pathname */}
        <Stack.Screen
          name='bible_one_year'
          options={defaultHeaderOptions('titles.bible_one_year', pathname)}
        />
        <Stack.Screen
          name='settings'
          options={defaultHeaderOptions('titles.settings', pathname)}
        />
        <Stack.Screen
          name='privacy'
          options={defaultHeaderOptions('titles.privacy', pathname)}
        />
      </Stack>
      {shouldShowTabBar && <CustomTabBar />}
    </>
  );
}

export default function RootLayout() {
  const [isUpdateChecking, setIsUpdateChecking] = useState(true);
  const [shouldShowApp, setShouldShowApp] = useState(false);

  // 🔧 模拟模式：设置为 true 可以模拟大量更新下载（用于测试）
  // 设置为 false 或删除此行以使用真实的更新检查
  const SIMULATE_LARGE_UPDATE = false; // 改为 false 以禁用模拟模式

  const handleUpdateComplete = () => {
    // 更新完成，reload 会自动触发，这里不需要做任何事情
    // 但如果 reload 没有立即生效，继续显示应用
    setIsUpdateChecking(false);
    setShouldShowApp(true);
  };

  const handleUpdateSkipped = () => {
    // 没有更新或更新检查失败，直接显示应用
    setIsUpdateChecking(false);
    setShouldShowApp(true);
  };

  return (
    <ThemeProvider>
      <FontSizeProvider>
        {isUpdateChecking ? (
          <UpdateChecker
            onUpdateComplete={handleUpdateComplete}
            onUpdateSkipped={handleUpdateSkipped}
            simulateLargeUpdate={SIMULATE_LARGE_UPDATE}
          />
        ) : shouldShowApp ? (
          <AuthProvider>
            <AuthGuard>
              <ThemedLayout />
            </AuthGuard>
          </AuthProvider>
        ) : null}
      </FontSizeProvider>
    </ThemeProvider>
  );
}
