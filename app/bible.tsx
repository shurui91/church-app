import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import oldTestament from '../assets/old_multilang.json';
import newTestament from '../assets/new_multilang.json';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// 获取当年的第几天 (1-366)
function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// 格式化日期字符串 (YYYY-MM-DD)
function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

// 按 chapter_index 分组
function groupByChapter(data: any[]) {
  const grouped: Record<number, any[]> = {};
  for (const verse of data) {
    if (!grouped[verse.chapter_index]) {
      grouped[verse.chapter_index] = [];
    }
    grouped[verse.chapter_index].push(verse);
  }
  return Object.values(grouped);
}

// 归一化 i18n 语言到我们数据使用的键
function normalizeLang(i18nLang: string) {
  const l = i18nLang?.toLowerCase() || 'zh';
  if (
    l.includes('hant') ||
    l.includes('tw') ||
    l.includes('hk') ||
    l.includes('zh-hant')
  )
    return 'zh-Hant';
  if (l.startsWith('zh')) return 'zh';
  return 'zh';
}

export default function BibleScreen() {
  const colors = useThemeColors();
  const { fontSize: rawFontSize } = useFontSize();
  const fontSize = rawFontSize || 16;

  const { t, i18n } = useTranslation();
  const lang = useMemo(() => normalizeLang(i18n.language), [i18n.language]);

  const [oldChapters, setOldChapters] = useState<any[]>([]);
  const [newChapters, setNewChapters] = useState<any[]>([]);
  const [formattedDate, setFormattedDate] = useState('');
  const [readingPlan, setReadingPlan] = useState('');
  const [completed, setCompleted] = useState(false);

  // 滚动进度
  const [scrollProgress, setScrollProgress] = useState(new Animated.Value(0));
  const [scrollPercent, setScrollPercent] = useState(0);
  const [progressOpacity] = useState(new Animated.Value(0));
  let fadeTimeout: NodeJS.Timeout;

  // ✅ 垂直滚动条状态
  const [scrollThumbHeight, setScrollThumbHeight] = useState(0);
  const [scrollThumbY] = useState(new Animated.Value(0));
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalHeight = contentSize.height - layoutMeasurement.height;
    const progress = totalHeight > 0 ? contentOffset.y / totalHeight : 0;

    // 顶部水平进度条
    Animated.timing(scrollProgress, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
    setScrollPercent(Math.min(Math.round(progress * 100), 100));

    // 顶部进度条淡入淡出
    Animated.timing(progressOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();

    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, 2000);

    // ✅ 计算垂直滚动条高度和位置
    const visibleRatio = layoutMeasurement.height / contentSize.height;
    const thumbHeight = Math.max(visibleRatio * layoutMeasurement.height, 40); // 最小40
    setScrollThumbHeight(thumbHeight);

    Animated.timing(scrollThumbY, {
      toValue: progress * (layoutMeasurement.height - thumbHeight),
      duration: 50,
      useNativeDriver: false,
    }).start();

    const today = new Date();
    const dateKey = formatDateKey(today);
    AsyncStorage.setItem(`scrollPos-${dateKey}`, contentOffset.y.toString());
  };

  const progressWidth = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  useEffect(() => {
    const today = new Date();
    const dateKey = formatDateKey(today);

    const groupedOld = groupByChapter(oldTestament as any[]);
    const groupedNew = groupByChapter(newTestament as any[]);
    const totalOld = groupedOld.length;
    const totalNew = groupedNew.length;
    const dayOfYear = getDayOfYear(today);

    try {
      const formatter = new Intl.DateTimeFormat(
        lang === 'zh-Hant' ? 'zh-Hant' : 'zh',
        { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
      );
      setFormattedDate(formatter.format(today));
    } catch {
      const datePart = today.toLocaleDateString(
        lang === 'zh-Hant' ? 'zh-Hant' : 'zh',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
      const weekdayPart = today.toLocaleDateString(
        lang === 'zh-Hant' ? 'zh-Hant' : 'zh',
        { weekday: 'long' }
      );
      setFormattedDate(`${datePart}   ${weekdayPart}`);
    }

    const oldStart = ((dayOfYear - 1) * 3) % totalOld;
    const selectedOld = [
      groupedOld[oldStart],
      groupedOld[(oldStart + 1) % totalOld],
      groupedOld[(oldStart + 2) % totalOld],
    ];

    const newIndex = (dayOfYear - 1) % totalNew;
    const selectedNew = [groupedNew[newIndex]];

    setOldChapters(JSON.parse(JSON.stringify(selectedOld)));
    setNewChapters(JSON.parse(JSON.stringify(selectedNew)));

    const oldLabel = selectedOld
      .map(
        (c) =>
          `${lang === 'zh-Hant' ? c[0].abbr_trad : c[0].abbr_simp} ${
            c[0].chapter
          }`
      )
      .join('，');
    const newLabel = selectedNew
      .map(
        (c) =>
          `${lang === 'zh-Hant' ? c[0].abbr_trad : c[0].abbr_simp} ${
            c[0].chapter
          }`
      )
      .join('，');
    setReadingPlan(
      `${t('bible.old_testament')}：${oldLabel}\n${t(
        'bible.new_testament'
      )}：${newLabel}`
    );

    AsyncStorage.getItem(`checkin-${dateKey}`).then((val) => {
      setCompleted(val === 'done');
    });

    // 📍 恢复上次阅读位置
    setTimeout(async () => {
      const today = new Date();
      const dateKey = formatDateKey(today);
      const savedY = await AsyncStorage.getItem(`scrollPos-${dateKey}`);
      if (savedY && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          y: parseFloat(savedY),
          animated: false,
        });
      }
    }, 500); // 延迟半秒确保内容加载完毕
  }, [lang, i18n.language]);

  const handleCheckin = async () => {
    const today = new Date();
    const dateKey = formatDateKey(today);
    await AsyncStorage.setItem(`checkin-${dateKey}`, 'done');
    setCompleted(true);
  };

  const renderChapter = (
    chapter: any[],
    idx: number,
    labelKey: 'bible.old_testament' | 'bible.new_testament'
  ) => (
    <View
      key={idx}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
      ]}>
      <Text
        style={{
          fontWeight: 'bold',
          fontSize,
          color: colors.primary,
          marginBottom: 8,
          textAlign: 'center',
        }}>
        {t(`${labelKey}`)}{' '}
        {lang === 'zh-Hant' ? chapter[0].book_trad : chapter[0].book_simp}{' '}
        {chapter[0].chapter} {t('bible.chapter')}
      </Text>

      {chapter.map((verse) => (
        <Text
          key={`${verse.verse}-${lang}`}
          style={{
            fontSize,
            lineHeight: fontSize * 1.5,
            color: colors.text,
            marginBottom: 4,
          }}>
          {chapter[0].chapter}:{verse.verse}{' '}
          {lang === 'zh-Hant' ? verse.text.zh_tw : verse.text.zh_cn}
        </Text>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部进度条 */}
      <Animated.View
        style={[styles.progressContainer, { opacity: progressOpacity }]}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: progressWidth, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {scrollPercent}%
        </Text>
      </Animated.View>

      {/* ✅ 包裹 ScrollView 与垂直滚动条 */}
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                { fontSize: fontSize * 1.2, color: colors.text },
              ]}>
              {t('bible.daily_reading')}
            </Text>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize * 0.9,
                marginBottom: fontSize * 1.2,
                textAlign: 'center',
              }}>
              {formattedDate}
            </Text>

            <View style={styles.planContainer}>
              <Text style={{ color: colors.primary, fontSize: fontSize * 0.8 }}>
                {readingPlan}
              </Text>
            </View>

            {oldChapters.map((chapter, idx) =>
              renderChapter(chapter, idx, 'bible.old_testament')
            )}
            {newChapters.map((chapter, idx) =>
              renderChapter(chapter, idx, 'bible.new_testament')
            )}

            <TouchableOpacity
              style={[
                styles.checkinButton,
                {
                  backgroundColor: completed
                    ? colors.borderLight
                    : colors.primary,
                },
              ]}
              onPress={handleCheckin}
              disabled={completed}>
              <Text
                style={{
                  color: completed ? colors.textSecondary : '#fff',
                  fontSize: fontSize,
                  fontWeight: '600',
                }}>
                {completed
                  ? t('bible.checkin_done')
                  : t('bible.checkin_complete')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ✅ 自定义垂直滚动条 */}
        <Animated.View
          style={[
            styles.customScrollbar,
            {
              backgroundColor: colors.primary,
              height: scrollThumbHeight,
              transform: [{ translateY: scrollThumbY }],
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  planContainer: {
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignSelf: 'center',
  },
  checkinButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
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
    fontSize: 12,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  // ✅ 自定义垂直滚动条
  customScrollbar: {
    position: 'absolute',
    right: 3,
    width: 5,
    borderRadius: 3,
    opacity: 0.6, // 半透明常显
  },
});
