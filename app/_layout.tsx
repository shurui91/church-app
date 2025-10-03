import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import { ThemeProvider } from './src/context/ThemeContext';
import { FontSizeProvider, useFontSize } from './src/context/FontSizeContext';
import { useThemeColors } from './src/hooks/useThemeColors';

// 定义需要显示底部导航栏的路由白名单
const TAB_BAR_ROUTES = [
  '/home',
  '/profile',
  '/meeting',
  '/announcement',
  '/bible',
];

function ThemedLayout() {
  const pathname = usePathname();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

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
        <Stack.Screen name='bible' />

        <Stack.Screen
          name='settings'
          options={defaultHeaderOptions('应用设置')}
        />
        <Stack.Screen
          name='privacy'
          options={defaultHeaderOptions('隐私条款')}
        />
      </Stack>
      {shouldShowTabBar && <CustomTabBar />}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <ThemedLayout />
      </FontSizeProvider>
    </ThemeProvider>
  );
}
