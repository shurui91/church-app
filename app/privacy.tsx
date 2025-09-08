import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './hooks/useThemeColors';

export default function PrivacyScreen() {
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen
        options={{
          title: '隐私条款',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>隐私政策</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            最后更新日期：{new Date().getFullYear()}年1月1日
          </Text>

          <Text style={[styles.subtitle, { color: colors.text }]}>
            1. 信息收集
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            我们致力于保护您的隐私。本应用仅收集必要的个人信息以提供更好的服务体验。
          </Text>

          <Text style={[styles.subtitle, { color: colors.text }]}>
            2. 信息使用
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            收集的信息将用于：提供和维护服务、改善用户体验、开发新功能。
          </Text>

          <Text style={[styles.subtitle, { color: colors.text }]}>
            3. 数据安全
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            我们采用合理的安全措施来保护您的个人信息免遭未经授权的访问、使用或披露。
          </Text>

          <Text style={[styles.subtitle, { color: colors.text }]}>
            4. 联系我们
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            如果您对隐私政策有任何疑问，请通过 email@example.com 与我们联系。
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
});
