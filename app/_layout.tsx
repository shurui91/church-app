import { Stack } from 'expo-router';
import { Text } from '@react-navigation/elements';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Your screens will automatically inherit the headerShown: false option */}
      </Stack>
    </>
  );
}
