import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  return (
    <>
      <Stack.Screen
        options={{
          title: '隐私条款',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: getFontSizeValue(18), // ✅ 原 fontSize * 0.9
          },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(24), // ✅ titleSize
                lineHeight: getFontSizeValue(34), // ✅ titleLineHeight
                marginBottom: getFontSizeValue(16), // ✅ titleSize * 0.67 (≈16)
              },
            ]}>
            隐私政策
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16), // ✅ paragraphSize
                lineHeight: getFontSizeValue(24), // ✅ paragraphLineHeight
                marginBottom: getFontSizeValue(16),
              },
            ]}>
            最后更新日期：{new Date().getFullYear()}年1月1日
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: getFontSizeValue(18), // ✅ subtitleSize
                lineHeight: getFontSizeValue(25), // ✅ subtitleLineHeight
                marginTop: getFontSizeValue(18),
                marginBottom: getFontSizeValue(8), // ✅ subtitleSize * 0.44 ≈8
              },
            ]}>
            1. 信息收集
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(24),
                marginBottom: getFontSizeValue(16),
              },
            ]}>
            我们致力于保护您的隐私。本应用仅收集必要的个人信息以提供更好的服务体验。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: getFontSizeValue(18),
                lineHeight: getFontSizeValue(25),
                marginTop: getFontSizeValue(18),
                marginBottom: getFontSizeValue(8),
              },
            ]}>
            2. 信息使用
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(24),
                marginBottom: getFontSizeValue(16),
              },
            ]}>
            收集的信息将用于：提供和维护服务、改善用户体验、开发新功能。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: getFontSizeValue(18),
                lineHeight: getFontSizeValue(25),
                marginTop: getFontSizeValue(18),
                marginBottom: getFontSizeValue(8),
              },
            ]}>
            3. 数据安全
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(24),
                marginBottom: getFontSizeValue(16),
              },
            ]}>
            我们采用合理的安全措施来保护您的个人信息免遭未经授权的访问、使用或披露。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: getFontSizeValue(18),
                lineHeight: getFontSizeValue(25),
                marginTop: getFontSizeValue(18),
                marginBottom: getFontSizeValue(8),
              },
            ]}>
            4. 联系我们
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(24),
              },
            ]}>
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
    fontWeight: 'bold',
  },
  subtitle: {
    fontWeight: '600',
  },
  paragraph: {},
});
