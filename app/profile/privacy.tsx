// app/privacy.tsx
import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import BackButton from '../components/BackButton';

// ✅ 导入本地 JS 文件（导出字符串）
import { policyZh } from '../src/data/policy/zh';
import { policyZhHant } from '../src/data/policy/zh-Hant';

export default function PrivacyScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t, i18n } = useTranslation();

  // ✅ 根据当前语言选择内容
  const content = useMemo(
    () => (i18n.resolvedLanguage === 'zh-Hant' ? policyZhHant : policyZh),
    [i18n.resolvedLanguage]
  );

  if (!content) {
    return <ActivityIndicator color={colors.primary} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('privacy.title') || '隐私条款',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerLeft: () => <BackButton />, // ✅ 使用同一个组件
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 20 }}>
        <Markdown
          style={{
            body: {
              color: colors.textSecondary,
              fontSize: getFontSizeValue(16),
              lineHeight: getFontSizeValue(24),
            },
            heading1: {
              color: colors.text,
              fontSize: getFontSizeValue(24),
              fontWeight: 'bold',
              marginBottom: 12,
            },
            heading2: {
              color: colors.text,
              fontSize: getFontSizeValue(18),
              fontWeight: '600',
              marginTop: 16,
              marginBottom: 8,
            },
            strong: { color: colors.text },
          }}>
          {content}
        </Markdown>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
