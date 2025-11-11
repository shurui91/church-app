import './src/i18n';
import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import BackButton from './components/BackButton';
import AuthGuard from './components/AuthGuard';
import { ThemeProvider } from './src/context/ThemeContext';
import { FontSizeProvider, useFontSize } from './src/context/FontSizeContext';
import { AuthProvider } from './src/context/AuthContext';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
  useEffect(() => {
    async function checkUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // 直接刷新，不弹提示
        }
      } catch (e) {
        console.log('检查更新失败', e);
      }
    }

    checkUpdate();
  }, []);

  return (
    <ThemeProvider>
      <FontSizeProvider>
        <AuthProvider>
          <AuthGuard>
            <ThemedLayout />
          </AuthGuard>
        </AuthProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}
