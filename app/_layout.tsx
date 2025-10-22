import './src/i18n';
import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import { ThemeProvider } from './src/context/ThemeContext';
import { FontSizeProvider, useFontSize } from './src/context/FontSizeContext';
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
  '/pursue', // 原来是bible页面
];

function ThemedLayout() {
  const pathname = usePathname();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  // 简中/繁中切换
  const { t } = useTranslation();

  // 更健壮的 Tab 显示逻辑
  const shouldShowTabBar = TAB_BAR_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // 公共 header 配置函数
  const defaultHeaderOptions = (title: string) => ({
    headerShown: true,
    title,
    headerBackTitle: '返回',
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.text,
    headerTitleStyle: {
      color: colors.text,
      fontSize: getFontSizeValue(18), // ✅ 使用 context 并保证整数
    },
	headerLeft: () => <BackButton />, // ✅ 全局统一后退按钮
  });

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name='index' />
        <Stack.Screen name='home' />
        <Stack.Screen name='profile' />
        <Stack.Screen name='meeting' />
        <Stack.Screen name='announcement' />
        <Stack.Screen name='pursue' />

        {/* ✅ 示例：将 title 改为多语言 */}
        <Stack.Screen
          name='bible_one_year'
          options={defaultHeaderOptions('titles.bible_one_year')}
        />

        <Stack.Screen
          name='settings'
          options={defaultHeaderOptions('titles.settings')}
        />
        <Stack.Screen
          name='privacy'
          options={defaultHeaderOptions('titles.privacy')}
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
        <ThemedLayout />
      </FontSizeProvider>
    </ThemeProvider>
  );
}
