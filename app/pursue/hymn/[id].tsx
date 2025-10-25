import React from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import chSongs from '../../../assets/ch_songs.json';
import tsSongs from '../../../assets/ts_songs.json';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function HymnDetail() {
  const { id, book } = useLocalSearchParams();
  const colors = useThemeColors();

  // ✅ 根据 book 参数选择数据源
  const songsData = book === 'ts' ? tsSongs : chSongs;

  // ✅ 兼容数字或字符串 ID
  const hymn = songsData.find((s: any) => String(s.id) === String(id));

  if (!hymn) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>
          找不到该诗歌（{book === 'ts' ? '补充本' : '大本'} {id}）。
        </Text>
      </View>
    );
  }

  // ✅ 自动识别使用 verses 或 lyrics
  const sections = hymn.verses || hymn.lyrics;

  return (
    <>
      {/* ✅ 动态标题 */}
      <Stack.Screen
        options={{
          title: `${book === 'ts' ? '补充本诗歌' : '大本诗歌'} ${id}`,
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 标题 */}
        <Text style={[styles.title, { color: colors.text }]}>{hymn.title}</Text>

        {/* ✅ 遍历每节（兼容不同结构） */}
        {Array.isArray(sections) ? (
          sections.map((section: any, idx: number) => (
            <View key={idx} style={{ marginBottom: 20 }}>
              {/* 节编号 */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.number || section.label || idx + 1}
              </Text>

              {/* 每行歌词 */}
              {section.lines?.map((line: string, i: number) => (
                <Text
                  key={i}
                  style={[styles.line, { color: colors.text }]}
                  selectable>
                  {line}
                </Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={{ color: colors.text }}>暂无歌词内容。</Text>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  line: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
});
