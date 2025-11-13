import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useFontSize } from '../../../src/context/FontSizeContext';
import leeArchive from '../../../../assets/lee_archive.json';
import BackButton from '@/app/components/BackButton';

// ✅ 去除 HTML 标签与常见实体
function stripHTML(html: string) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&apos;/g, "'")
    .trim();
}

// ✅ 动态行距计算函数
function getLineHeight(fontSize: number) {
  if (fontSize <= 16) return fontSize * 1.6;
  if (fontSize <= 20) return fontSize * 1.5;
  return fontSize * 1.4;
}

export default function LeeDayPage() {
  const { date } = useLocalSearchParams();
  const colors = useThemeColors();
  const { fontSize, getFontSizeValue } = useFontSize(); // 直接使用全局字号设定

  const [scrollPercent, setScrollPercent] = useState(0);
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ 找出对应日期的文章
  const article = (leeArchive.articles || []).find(
    (a) => a.reading_date === date
  );

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text
          style={{
            color: colors.text,
            fontSize,
          }}>
          ❌ 没有找到 {date} 的内容
        </Text>
      </View>
    );
  }

  const storageKey = `lee-scroll-${date}`;

  // ✅ 页面加载后自动恢复滚动位置
  useEffect(() => {
    const restoreScroll = async () => {
      try {
        const savedY = await AsyncStorage.getItem(storageKey);
        if (savedY && scrollViewRef.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: parseFloat(savedY),
              animated: false,
            });
          }, 400);
        }
      } catch (err) {
        console.warn('无法读取上次阅读位置', err);
      }
    };
    restoreScroll();
  }, [date]);

  // ✅ 格式化显示文字
  const collectionTitle = `李常受文集 ${article.year} 年第 ${article.volume} 册`;
  const topicLine = `主题：${article.topic || ''}`;
  const chapterLine = `第${article.chapter}章  ${article.title || ''}`;
  const cleanContent = stripHTML(article.content || '');

  // ✅ 动态字号与行距
  const titleFontSize = getFontSizeValue(26); // 标题使用较小的基础字号
  const contentFontSize = getFontSizeValue(24); // 正文使用较小的基础字号
  const lineContent = getLineHeight(contentFontSize);

  // ✅ 滚动事件：计算进度 + 保存位置
  const handleScroll = async (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalHeight = contentSize.height - layoutMeasurement.height;
    const ratio = totalHeight > 0 ? contentOffset.y / totalHeight : 0;
    const percent = Math.min(Math.round(ratio * 100), 100);

    Animated.timing(scrollProgress, {
      toValue: ratio,
      duration: 100,
      useNativeDriver: false,
    }).start();
    setScrollPercent(percent);

    try {
      await AsyncStorage.setItem(storageKey, contentOffset.y.toString());
    } catch (err) {
      console.warn('保存阅读位置失败', err);
    }

    // ✅ 动画淡入淡出逻辑
    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();

    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, 2000);
  };

  const progressWidth = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: article.reading_date || '每日信息',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackVisible: false,
          headerLeft: () => <BackButton />, // ✅ 显示返回按钮
        }}
      />

      {/* ✅ 顶部进度条 + 百分比 */}
      <Animated.View
        style={[
          styles.progressContainer,
          {
            opacity: progressOpacity,
            backgroundColor: colors.background,
          },
        ]}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: progressWidth, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Text
          style={[
            styles.progressText,
            {
              color: colors.textSecondary,
              fontSize: 12,
            },
          ]}>
          {scrollPercent}%
        </Text>
      </Animated.View>

      {/* ✅ ScrollView 主体内容 */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 顶部标题 */}
        <Text
          style={[
            styles.collectionTitle,
            {
              color: colors.text,
              fontSize: titleFontSize,
              lineHeight: getLineHeight(titleFontSize),
            },
          ]}>
          {collectionTitle}
        </Text>

        {/* 主题 */}
        <Text
          style={[
            styles.topic,
            {
              color: colors.text,
              fontSize: titleFontSize,
              lineHeight: getLineHeight(titleFontSize),
            },
          ]}>
          {topicLine}
        </Text>

        {/* 章节标题 */}
        <Text
          style={[
            styles.chapterTitle,
            {
              color: colors.text,
              fontSize: titleFontSize,
              lineHeight: getLineHeight(titleFontSize),
            },
          ]}>
          {chapterLine}
        </Text>

        {/* 正文内容 */}
        <Text
          style={[
            styles.content,
            {
              color: colors.text,
              fontSize: contentFontSize,
              lineHeight: lineContent,
            },
          ]}>
          {cleanContent}
        </Text>
      </ScrollView>
    </View>
  );
}

// --- 样式 ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 0 : 4,
    paddingBottom: 6,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  collectionTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  topic: {
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  chapterTitle: {
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
