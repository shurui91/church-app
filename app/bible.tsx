import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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

  // 根据语言选择字段
  const pickBookName = (verse: any) =>
    lang === 'zh-Hant' ? verse.book_trad : verse.book_simp;
  const pickAbbr = (verse: any) =>
    lang === 'zh-Hant' ? verse.abbr_trad : verse.abbr_simp;
  const pickVerseText = (verse: any) =>
    lang === 'zh-Hant' ? verse.text.zh_tw : verse.text.zh_cn;

  // 👇 放在 BibleScreen 组件内
  useEffect(() => {
    const today = new Date(); // ✅ 每次语言切换重新计算
    const dateKey = formatDateKey(today);

    const groupedOld = groupByChapter(oldTestament as any[]);
    const groupedNew = groupByChapter(newTestament as any[]);

    const totalOld = groupedOld.length;
    const totalNew = groupedNew.length;

    const dayOfYear = getDayOfYear(today); // 1–366

    // 📅 本地化日期与星期几
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

    // 📖 旧约：每天 3 章（循环）
    const oldStart = ((dayOfYear - 1) * 3) % totalOld;
    const selectedOld = [
      groupedOld[oldStart],
      groupedOld[(oldStart + 1) % totalOld],
      groupedOld[(oldStart + 2) % totalOld],
    ];

    // ✝️ 新约：每天 1 章（循环）
    const newIndex = (dayOfYear - 1) % totalNew;
    const selectedNew = [groupedNew[newIndex]];

    // ✅ 深拷贝数据，避免 React 缓存旧引用
    setOldChapters(JSON.parse(JSON.stringify(selectedOld)));
    setNewChapters(JSON.parse(JSON.stringify(selectedNew)));

    // 🪶 生成读经计划标题
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

    // 📍 检查当天是否已打卡
    AsyncStorage.getItem(`checkin-${dateKey}`).then((val) => {
      setCompleted(val === 'done');
    });
  }, [lang, i18n.language]);

  const handleCheckin = async () => {
    await AsyncStorage.setItem(`checkin-${dateKey}`, 'done');
    setCompleted(true);
  };

  const renderChapter = (
    chapter: any[],
    idx: number,
    labelKey: 'old_testament' | 'new_testament'
  ) => (
    <View
      key={idx}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
      ]}>
      {/* 📘 章节标题，例如「旧约 马太福音 第1章」 */}
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

      {/* 📖 渲染每节经文 */}
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
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { fontSize: fontSize * 1.2, color: colors.text },
            ]}>
            {t('bible.daily_reading')}
          </Text>

          {/* 日期（随语言本地化） */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize * 0.9,
              marginBottom: fontSize * 1.2,
              textAlign: 'center',
            }}>
            {formattedDate}
          </Text>

          {/* 今日读经进度（随语言本地化） */}
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

          {/* 打卡按钮（文本随语言本地化） */}
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
});
