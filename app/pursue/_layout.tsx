import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import BackButton from '../components/BackButton'; // ✅ 自定义返回按钮

export default function PursueLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={({ route }) => {
        const isRootPage = route.name === 'index';
        return {
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
          headerBackTitleVisible: false,
          headerLeft: isRootPage ? () => null : () => <BackButton />,
        };
      }}>
      <Stack.Screen name='index' options={{ title: '每日追求' }} />
      <Stack.Screen name='bible' options={{ title: '一年读经' }} />
      <Stack.Screen name='hymns' options={{ title: '诗歌点歌' }} />
      <Stack.Screen name='life-study' options={{ title: '生命读经' }} />
      <Stack.Screen name='lee' options={{ title: '李常受文集' }} />{' '}
      {/* ✅ 不隐藏 header */}
      <Stack.Screen name='week/[monday]' options={{ title: '周历' }} />
    </Stack>
  );
}
