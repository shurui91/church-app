import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PursueLayout() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <Stack
      screenOptions={({ route, navigation }) => {
        // ✅ 判断当前是否为 pursue 根页面（index）
        const isRootPage = route.name === 'index';

        return {
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, fontWeight: 'bold' },
          headerBackTitleVisible: false,

          // ✅ 根页面不显示返回按钮
          headerLeft: isRootPage
            ? () => null
            : ({ canGoBack }) =>
                canGoBack ? (
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ marginLeft: 10 }}>
                    <Ionicons name='arrow-back' size={24} color={colors.text} />
                  </TouchableOpacity>
                ) : null,
        };
      }}>
      <Stack.Screen name='index' options={{ title: '每日追求' }} />
      <Stack.Screen name='bible' options={{ title: '一年读经' }} />
      <Stack.Screen name='hymns' options={{ title: '诗歌点歌' }} />
      <Stack.Screen name='life-study' options={{ title: '生命读经' }} />
      <Stack.Screen name='week/[monday]' options={{ title: '周历' }} />
    </Stack>
  );
}
