import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PursueLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const segments = useSegments(); // 👈 获取当前路由路径片段

  return (
    <Stack
      screenOptions={{
		headerShown: false,        // ⬅️ 关闭布局级 Header
        // （不要再在这里写 headerLeft / title）
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
        headerBackTitleVisible: false,
        headerLeft: ({ canGoBack }) => {
          const isRootPage =
            segments[segments.length - 1] === 'pursue' ||
            segments[segments.length - 1] === 'index';
          return canGoBack && !isRootPage ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}>
              <Ionicons name='arrow-back' size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null;
        },
      }}>
      {/* ✅ 永远不显示返回箭头，也禁用返回手势 */}
      <Stack.Screen
        name='index'
        options={{
          title: '每日追求',
          headerBackVisible: false,
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name='bible' options={{ title: '一年读经' }} />
      <Stack.Screen name='hymns' options={{ title: '诗歌点歌' }} />
      <Stack.Screen name='life-study' options={{ title: '生命读经' }} />
    </Stack>
  );
}
