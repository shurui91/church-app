import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import chSongs from '../../../assets/ch_songs.json';
import tsSongs from '../../../assets/ts_songs.json';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFontSize } from '../../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next'; // ✅ 引入 i18n
import BackButton from '@/app/components/BackButton';

export default function HymnDetail() {
  const { id, book } = useLocalSearchParams();
  const colors = useThemeColors();
  const { fontSize: globalFontSize } = useFontSize();
  // 使用相对字号，比全局字号小 20%（即全局字号的 90%）
  const fontSize = Math.round(globalFontSize * 0.9);
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
        <Text style={{ color: colors.text, fontSize }}>
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
          headerShown: true, // ✅ 关键：启用 header
          title: titleText, // ✅ 动态标题（如 “大本诗歌 23”）
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackVisible: false, // ✅ 隐藏系统默认箭头
          headerLeft: () => <BackButton />, // ✅ 使用统一自定义返回按钮
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 10 }}>
        {/* ✅ 显示 “大本诗歌 1” 或 “补充本诗歌 1” */}
        <Text
          style={{
            color: colors.text,
            opacity: 0.7,
            fontSize,
            marginBottom: 20,
            textAlign: 'center',
          }}>
          {isTraditional ? hymn.hymn_num_trad : hymn.hymn_num_simp}
        </Text>

        {/* ✅ 显示诗歌标题（简/繁） */}
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize,
              lineHeight: fontSize * 1.3,
            },
          ]}>
          {isTraditional ? hymn.title_trad : hymn.title_simp}
        </Text>

        {/* ✅ 遍历歌词并根据语言选择 lines_simp / lines_trad */}
        {Array.isArray(sections) ? (
          sections.map((section: any, idx: number) => {
            const lines = isTraditional
              ? section.lines_trad || section.lines // fallback
              : section.lines_simp || section.lines; // fallback

            return (
              <View key={idx} style={{ marginBottom: 20 }}>
                {/* ✅ 如果是 chorus，显示“副” */}
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, fontSize },
                  ]}>
                  {section.type === 'chorus'
                    ? '副'
                    : section.number || section.label || idx + 1}
                </Text>

                {lines?.map((line: string, i: number) => (
                  <Text
                    key={i}
                    style={{
                      color: colors.text,
                      fontSize,
                      lineHeight: fontSize * 1.6,
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
          <Text style={{ color: colors.text, fontSize }}>
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
