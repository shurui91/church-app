import { Stack } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';

export default function GymLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        presentation: 'card',
      }}>
      <Stack.Screen name="index" options={{ title: '体育馆' }} />
      <Stack.Screen name="my-reservations" options={{ title: '我的预约' }} />
    </Stack>
  );
}

