// app/(tabs)/home.tsx
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useThemeColors } from './src/hooks/useThemeColors';

export default function HomeScreen() {
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>首页内容 🏠</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          欢迎使用我们的应用
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60, // 为底部导航栏留出空间
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
  },
});
