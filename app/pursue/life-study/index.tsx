import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  '撒上',
  '撒下',
  '王上',
  '王下',
  '代上',
  '代下',
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

  const renderGridItem = (book: string) => (
    <TouchableOpacity
      key={book}
      style={[styles.item, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/pursue/life-study/${book}`)}>
      <Text style={[styles.text, { color: colors.text }]}>{book}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '生命读经',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          // ✅ 使用统一的自定义返回按钮
          headerLeft: () => <BackButton />,
        }}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>旧约</Text>
      <FlatList
        data={oldTestamentBooks}
        numColumns={5}
        renderItem={({ item }) => renderGridItem(item)}
        keyExtractor={(item) => item}
        scrollEnabled={false}
      />

      <Text
        style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
        新约
      </Text>
      <FlatList
        data={newTestamentBooks}
        numColumns={5}
        renderItem={({ item }) => renderGridItem(item)}
        keyExtractor={(item) => item}
        scrollEnabled={false}
      />
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
  item: {
    flex: 1,
    margin: 6,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
