// app/bible.tsx
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BibleScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  // 示例经文内容
  const bibleVerses = [
    {
      book: '约翰福音',
      chapter: 3,
      verse: 16,
      text: '神爱世人，甚至将他的独生子赐给他们，叫一切信入他的，不至灭亡，反得永生。',
    },
    {
      book: '腓立比书',
      chapter: 4,
      verse: 6,
      text: '应当一无挂虑，只要凡事借着祷告、祈求，带着感谢，将你们所要的告诉神。',
    },
    {
      book: '罗马书',
      chapter: 8,
      verse: 28,
      text: '我们晓得万有都互相效力，叫爱神的人得益处，就是按他旨意被召的人。',
    },
    {
      book: '马太福音',
      chapter: 11,
      verse: 28,
      text: '凡劳苦担重担的人，可以到我这里来，我必使你们得安息。',
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '读经',
          headerLeft: () => null,
          headerShown: false,
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: getFontSizeValue(18),
          },
        }}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(24),
                lineHeight: getFontSizeValue(24) * 1.4,
              },
            ]}>
            每日读经 📖
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(16) * 1.5,
                marginBottom: getFontSizeValue(24),
              },
            ]}>
            精选经文，帮助你在主的话语中成长
          </Text>

          {/* 经文列表 */}
          {bibleVerses.map((verse, index) => (
            <View
              key={index}
              style={[
                styles.verseCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}>
              <Text
                style={[
                  styles.verseReference,
                  {
                    color: colors.primary,
                    fontSize: getFontSizeValue(18),
                  },
                ]}>
                {verse.book} {verse.chapter}:{verse.verse}
              </Text>

              <Text
                style={[
                  styles.verseText,
                  {
                    color: colors.text,
                    fontSize: getFontSizeValue(16),
                    lineHeight: getFontSizeValue(16) * 1.6,
                  },
                ]}>
                {verse.text}
              </Text>
            </View>
          ))}

          {/* 读经提示 */}
          <View
            style={[
              styles.tipContainer,
              { backgroundColor: colors.primary + '20' },
            ]}>
            <Text
              style={[
                styles.tipTitle,
                {
                  color: colors.primary,
                  fontSize: getFontSizeValue(18),
                },
              ]}>
              📌 读经提示
            </Text>
            <Text
              style={[
                styles.tipText,
                {
                  color: colors.textSecondary,
                  fontSize: getFontSizeValue(14),
                  lineHeight: getFontSizeValue(14) * 1.5,
                },
              ]}>
              每天花时间阅读神的话语，让圣经成为你生活的指南和力量的源泉。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  verseCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  verseReference: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  verseText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  tipContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  tipTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tipText: {
    textAlign: 'center',
  },
});
