import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  // 定义基准字体大小
  const baseSizes = {
    title: 24,
    subtitle: 18,
    paragraph: 16,
  };

  // 计算动态字体大小和行高
  const titleSize = getFontSizeValue(baseSizes.title);
  const subtitleSize = getFontSizeValue(baseSizes.subtitle);
  const paragraphSize = getFontSizeValue(baseSizes.paragraph);

  const titleLineHeight = titleSize * 1.4;
  const subtitleLineHeight = subtitleSize * 1.4;
  const paragraphLineHeight = paragraphSize * 1.5;

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
            fontSize: getFontSizeValue(18), // 头部标题也支持字体大小调整
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
                fontSize: titleSize,
                lineHeight: titleLineHeight,
                marginBottom: titleSize * 0.67, // 动态间距
              },
            ]}>
            隐私政策
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: paragraphSize,
                lineHeight: paragraphLineHeight,
                marginBottom: paragraphSize,
              },
            ]}>
            最后更新日期：{new Date().getFullYear()}年1月1日
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: subtitleSize,
                lineHeight: subtitleLineHeight,
                marginTop: subtitleSize,
                marginBottom: subtitleSize * 0.44,
              },
            ]}>
            1. 信息收集
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: paragraphSize,
                lineHeight: paragraphLineHeight,
                marginBottom: paragraphSize,
              },
            ]}>
            我们致力于保护您的隐私。本应用仅收集必要的个人信息以提供更好的服务体验。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: subtitleSize,
                lineHeight: subtitleLineHeight,
                marginTop: subtitleSize,
                marginBottom: subtitleSize * 0.44,
              },
            ]}>
            2. 信息使用
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: paragraphSize,
                lineHeight: paragraphLineHeight,
                marginBottom: paragraphSize,
              },
            ]}>
            收集的信息将用于：提供和维护服务、改善用户体验、开发新功能。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: subtitleSize,
                lineHeight: subtitleLineHeight,
                marginTop: subtitleSize,
                marginBottom: subtitleSize * 0.44,
              },
            ]}>
            3. 数据安全
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: paragraphSize,
                lineHeight: paragraphLineHeight,
                marginBottom: paragraphSize,
              },
            ]}>
            我们采用合理的安全措施来保护您的个人信息免遭未经授权的访问、使用或披露。
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.text,
                fontSize: subtitleSize,
                lineHeight: subtitleLineHeight,
                marginTop: subtitleSize,
                marginBottom: subtitleSize * 0.44,
              },
            ]}>
            4. 联系我们
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: paragraphSize,
                lineHeight: paragraphLineHeight,
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
  paragraph: {
    // 所有样式都移到内联样式，以便动态计算
  },
});
