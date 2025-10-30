import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PursueLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const segments = useSegments();

  const isRootPage =
    segments[segments.length - 1] === 'pursue' ||
    segments[segments.length - 1] === 'index';

  const isLeePage = segments.includes('lee');

  return (
    <Stack
      screenOptions={{
        headerShown: !isRootPage,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
        headerBackTitleVisible: false,

        // ✅ Lee 页面不显示默认 headerLeft
        headerLeft: ({ canGoBack }) => {
          if (isLeePage) return null;
          return canGoBack && !isRootPage ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}>
              <Ionicons name='arrow-back' size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null;
        },

        // ✅ 隐藏 Lee 页面的 TabBar
        tabBarStyle: isLeePage ? { display: 'none' } : undefined,
      }}>
      <Stack.Screen
        name='index'
        options={{
          title: '每日追求',
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name='bible' options={{ title: '一年读经' }} />
      <Stack.Screen name='hymns' options={{ title: '诗歌点歌' }} />
      <Stack.Screen name='life-study' options={{ title: '生命读经' }} />
      <Stack.Screen name='lee' options={{ title: '李常受文集' }} />
    </Stack>
  );
}
