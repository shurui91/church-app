// app/_layout.tsx
import { Stack } from 'expo-router';
import CustomTabBar from './components/CustomTabBar';
import { usePathname } from 'expo-router';

// 定义需要显示底部导航栏的路由白名单
const TAB_BAR_ROUTES = ['/home', '/profile'];

export default function RootLayout() {
  const pathname = usePathname();

  // 判断当前路由是否应该显示底部导航栏
  const shouldShowTabBar = TAB_BAR_ROUTES.includes(pathname);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 注册所有页面 */}
        <Stack.Screen name='index' options={{ headerShown: false }} />
        <Stack.Screen name='home' options={{ headerShown: false }} />
        <Stack.Screen name='profile' options={{ headerShown: false }} />
        <Stack.Screen
          name='settings'
          options={{
            headerShown: true,
            title: '应用设置',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name='privacy'
          options={{
            headerShown: true,
            title: '隐私条款',
            headerBackTitle: '返回',
          }}
        />
      </Stack>
      {shouldShowTabBar && <CustomTabBar />}
    </>
  );
}
