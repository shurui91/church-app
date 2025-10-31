import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useTranslation } from 'react-i18next';
import BackButton from '@/app/components/BackButton';

// ✅ 旧约简称（简体 & 繁体）
const oldBooksSimplified = [
  '创', '出', '利', '民', '申', '书', '士', '得', '撒', '王', '代', '拉', '尼', '斯',
  '伯', '诗', '箴', '传', '歌', '赛', '耶', '哀', '结', '但', '何', '珥', '摩', '俄',
  '拿', '弥', '鸿', '哈', '番', '该', '亚', '玛',
];
const oldBooksTraditional = [
  '創', '出', '利', '民', '申', '書', '士', '得', '撒', '王', '代', '拉', '尼', '斯',
  '伯', '詩', '箴', '傳', '歌', '賽', '耶', '哀', '結', '但', '何', '珥', '摩', '俄',
  '拿', '彌', '鴻', '哈', '番', '該', '亞', '瑪',
];

// ✅ 新约简称（简体 & 繁体）
const newBooksSimplified = [
  '太', '可', '路', '约', '徒', '罗', '林前', '林后', '加', '弗', '腓', '西', '帖前',
  '帖后', '提前', '提后', '多', '门', '来', '雅', '彼前', '彼后', '约一', '约二', '约三',
  '犹', '启',
];
const newBooksTraditional = [
  '太', '可', '路', '約', '徒', '羅', '林前', '林後', '加', '弗', '腓', '西', '帖前',
  '帖後', '提前', '提後', '多', '門', '來', '雅', '彼前', '彼後', '約一', '約二', '約三',
  '猶', '啟',
];

export default function LifeStudyIndex() {
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // ✅ 判断当前语言是否繁体
  const isTraditional = i18n.language === 'zh-Hant';

  // ✅ 响应式列数
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth < 400 ? 4 : 5;

  const spacing = 10;
  const horizontalPadding = 16;
  const itemWidth =
    (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
    numColumns;

  // ✅ 根据语言动态选择书名
  const oldTestamentBooks = useMemo(
    () => (isTraditional ? oldBooksTraditional : oldBooksSimplified),
    [isTraditional]
  );
  const newTestamentBooks = useMemo(
    () => (isTraditional ? newBooksTraditional : newBooksSimplified),
    [isTraditional]
  );

  const renderGrid = (data: string[]) => (
    <View style={styles.grid}>
      {data.map((book, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          onPress={() => router.push(`/pursue/life-study/${book}`)}
          style={[
            styles.item,
            {
              backgroundColor: colors.card,
              width: itemWidth,
              height: itemWidth,
              marginRight: (index + 1) % numColumns === 0 ? 0 : spacing,
              marginBottom: spacing,
            },
          ]}>
          <Text style={[styles.text, { color: colors.text }]}>{book}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isTraditional ? '生命讀經' : '生命读经',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isTraditional ? '舊約' : '旧约'}
        </Text>
        {renderGrid(oldTestamentBooks)}

        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
          {isTraditional ? '新約' : '新约'}
        </Text>
        {renderGrid(newTestamentBooks)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
  },
});
