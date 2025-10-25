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
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
        headerBackTitleVisible: false,
        // ✅ 仅当不是 pursue 首页时显示返回按钮
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
      {/* ✅ 首页不显示返回按钮 */}
      <Stack.Screen name='index' options={{ title: '每日追求' }} />
      <Stack.Screen name='bible' options={{ title: '一年读经' }} />
      <Stack.Screen name='hymns' options={{ title: '诗歌点歌' }} />
      <Stack.Screen name='life-study' options={{ title: '生命读经' }} />
    </Stack>
  );
}
