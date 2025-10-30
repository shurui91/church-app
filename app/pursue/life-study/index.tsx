import React from 'react';
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

const oldTestamentBooks = [
  '创',
  '出',
  '利',
  '民',
  '申',
  '书',
  '士',
  '得',
  '撒',
  '王',
  '代',
  '拉',
  '尼',
  '斯',
  '伯',
  '诗',
  '箴',
  '传',
  '歌',
  '赛',
  '耶',
  '哀',
  '结',
  '但',
  '何',
  '珥',
  '摩',
  '俄',
  '拿',
  '弥',
  '鸿',
  '哈',
  '番',
  '该',
  '亚',
  '玛',
];

const newTestamentBooks = [
  '太',
  '可',
  '路',
  '约',
  '徒',
  '罗',
  '林前',
  '林后',
  '加',
  '弗',
  '腓',
  '西',
  '帖前',
  '帖后',
  '提前',
  '提后',
  '多',
  '门',
  '来',
  '雅',
  '彼前',
  '彼后',
  '约一',
  '约二',
  '约三',
  '犹',
  '启',
];

export default function LifeStudyIndex() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const router = useRouter();

  // ✅ 响应式列数
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth < 400 ? 4 : 5;

  // ✅ 每个宫格之间的间距（px）
  const spacing = 10;
  const horizontalPadding = 16;

  // ✅ 计算每个 item 的宽度
  const itemWidth =
    (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
    numColumns;

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
              marginRight: (index + 1) % numColumns === 0 ? 0 : spacing, // ✅ 右边距控制
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
          title: '生命读经',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>旧约</Text>
        {renderGrid(oldTestamentBooks)}

        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
          新约
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
