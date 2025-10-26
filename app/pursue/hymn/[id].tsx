import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import chSongs from '../../../assets/ch_songs.json';
import tsSongs from '../../../assets/ts_songs.json';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFontSize } from '../../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next'; // ✅ 引入 i18n

export default function HymnDetail() {
  const { id, book } = useLocalSearchParams();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { i18n } = useTranslation(); // ✅ 获取语言状态

  // ✅ 当前语言判断（zh = 简中, zh-Hant = 繁中）
  const [isTraditional, setIsTraditional] = useState(
    i18n.language === 'zh-Hant'
  );

  // ✅ 当全局语言切换时，自动刷新
  useEffect(() => {
    const handleLangChange = () => {
      setIsTraditional(i18n.language === 'zh-Hant');
    };
    i18n.on('languageChanged', handleLangChange);
    return () => {
      i18n.off('languageChanged', handleLangChange);
    };
  }, [i18n]);

  // ✅ 选择数据源
  const songsData = book === 'ts' ? tsSongs : chSongs;
  const hymn = songsData.find((s: any) => String(s.id) === String(id));

  if (!hymn) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: getFontSizeValue(18) }}>
          {isTraditional
            ? `找不到詩歌（${book === 'ts' ? '補充本' : '大本'} ${id}）。`
            : `找不到该诗歌（${book === 'ts' ? '补充本' : '大本'} ${id}）。`}
        </Text>
      </View>
    );
  }

  // ✅ 自动识别 verses / lyrics
  const sections = hymn.verses || hymn.lyrics;

  // ✅ 根据语言切换标题
  const titleText = isTraditional
    ? `${book === 'ts' ? '補充本詩歌' : '大本詩歌'} ${id}`
    : `${book === 'ts' ? '补充本诗歌' : '大本诗歌'} ${id}`;

  return (
    <>
      <Stack.Screen
        options={{
          title: titleText,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 标题 */}
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: getFontSizeValue(24),
              lineHeight: getFontSizeValue(24) * 1.3,
            },
          ]}>
          {hymn.title}
        </Text>

        {/* ✅ 遍历歌词并根据语言选择 lines_simp / lines_trad */}
        {Array.isArray(sections) ? (
          sections.map((section: any, idx: number) => {
            const lines = isTraditional
              ? section.lines_trad || section.lines // fallback
              : section.lines_simp || section.lines; // fallback

            return (
              <View key={idx} style={{ marginBottom: 20 }}>
                {/* 节编号 */}
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, fontSize: getFontSizeValue(18) },
                  ]}>
                  {section.number || section.label || idx + 1}
                </Text>

                {/* 每行歌词 */}
                {lines?.map((line: string, i: number) => (
                  <Text
                    key={i}
                    style={{
                      color: colors.text,
                      fontSize: getFontSizeValue(20),
                      lineHeight: getFontSizeValue(20) * 1.6,
                      textAlign: 'center',
                    }}
                    selectable>
                    {line}
                  </Text>
                ))}
              </View>
            );
          })
        ) : (
          <Text style={{ color: colors.text, fontSize: getFontSizeValue(18) }}>
            {isTraditional ? '暫無歌詞內容。' : '暂无歌词内容。'}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  sectionTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  line: { lineHeight: 30, textAlign: 'center' },
});
