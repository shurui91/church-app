// app/_layout.tsx
import { Stack, usePathname } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import { ThemeProvider } from './context/ThemeContext';
import { useThemeColors } from './hooks/useThemeColors';

// 定义需要显示底部导航栏的路由白名单
const TAB_BAR_ROUTES = ['/home', '/profile'];

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
        <Stack.Screen name='index' options={{ headerShown: false }} />
        <Stack.Screen name='home' options={{ headerShown: false }} />
        <Stack.Screen name='profile' options={{ headerShown: false }} />
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
      <ThemedLayout />
    </ThemeProvider>
  );
}
