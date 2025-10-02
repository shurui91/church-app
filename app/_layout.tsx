// app/_layout.tsx
import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import { ThemeProvider } from './src/context/ThemeContext';
import { useThemeColors } from './src/hooks/useThemeColors';
import { FontSizeProvider } from './src/context/FontSizeContext';

// 定义需要显示底部导航栏的路由白名单
const TAB_BAR_ROUTES = ['/home', '/profile', '/meeting', '/announcement', '/bible'];

function ThemedLayout() {
  const pathname = usePathname();
  const colors = useThemeColors();
  // 判断当前路由是否应该显示底部导航栏
  const shouldShowTabBar = TAB_BAR_ROUTES.includes(pathname);

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
          options={{
            headerShown: true,
            title: '应用设置',
            headerBackTitle: '返回',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
          }}
        />
        <Stack.Screen
          name='privacy'
          options={{
            headerShown: true,
            title: '隐私条款',
            headerBackTitle: '返回',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
          }}
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
