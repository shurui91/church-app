import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import chSongs from '../../../assets/ch_songs.json';
import tsSongs from '../../../assets/ts_songs.json';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFontSize } from '../../src/context/FontSizeContext'; // ✅ 引入字体大小 Context

export default function HymnDetail() {
  const { id, book } = useLocalSearchParams();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize(); // ✅ 使用动态字号函数

  // ✅ 选择数据源
  const songsData = book === 'ts' ? tsSongs : chSongs;
  const hymn = songsData.find((s: any) => String(s.id) === String(id));

  if (!hymn) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, fontSize: getFontSizeValue(18) }}>
          找不到该诗歌（{book === 'ts' ? '补充本' : '大本'} {id}）。
        </Text>
      </View>
    );
  }

  // ✅ 自动识别 verses / lyrics
  const sections = hymn.verses || hymn.lyrics;

  return (
    <>
      <Stack.Screen
        options={{
          title: `${book === 'ts' ? '补充本诗歌' : '大本诗歌'} ${id}`,
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
              lineHeight: getFontSizeValue(24) * 1.3, // ✅ 稍小比例
            },
          ]}>
          {hymn.title}
        </Text>

        {/* 遍历歌词 */}
        {Array.isArray(sections) ? (
          sections.map((section: any, idx: number) => (
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
              {section.lines?.map((line: string, i: number) => (
                <Text
                  key={i}
                  style={{
                    color: colors.text,
                    fontSize: getFontSizeValue(20),
                    lineHeight: getFontSizeValue(20) * 1.6, // ✅ 动态行高
                    textAlign: 'center',
                  }}
                  selectable>
                  {line}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={{ color: colors.text, fontSize: getFontSizeValue(18) }}>
            暂无歌词内容。
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
