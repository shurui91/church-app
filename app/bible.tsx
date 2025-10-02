import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import oldTestament from '../assets/old.json';
import newTestament from '../assets/new.json';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 获取当年的第几天 (1-365)
function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// 格式化日期字符串 (YYYY-MM-DD)
function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0]; // 2025-10-01
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

export default function BibleScreen() {
  const colors = useThemeColors();
  const { fontSize } = useFontSize();
  const [oldChapters, setOldChapters] = useState<any[]>([]);
  const [newChapters, setNewChapters] = useState<any[]>([]);
  const [formattedDate, setFormattedDate] = useState('');
  const [readingPlan, setReadingPlan] = useState('');
  const [completed, setCompleted] = useState(false); // ✅ 打卡状态

  const today = new Date();
  const dateKey = formatDateKey(today);

  useEffect(() => {
    const groupedOld = groupByChapter(oldTestament);
    const groupedNew = groupByChapter(newTestament);

    const totalOld = groupedOld.length;
    const totalNew = groupedNew.length;

    const dayOfYear = getDayOfYear(today); // 1–365

    // 日期 + 星期几
    const datePart = today.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const weekdayPart = today.toLocaleDateString('zh-CN', { weekday: 'long' });
    setFormattedDate(`${datePart}   ${weekdayPart}`);

    // 旧约：每天 3 章
    const oldStart = ((dayOfYear - 1) * 3) % totalOld;
    const selectedOld = [
      groupedOld[oldStart],
      groupedOld[(oldStart + 1) % totalOld],
      groupedOld[(oldStart + 2) % totalOld],
    ];

    // 新约：每天 1 章
    const newIndex = (dayOfYear - 1) % totalNew;
    const selectedNew = [groupedNew[newIndex]];

    setOldChapters(selectedOld);
    setNewChapters(selectedNew);

    // 生成书签文本
    const oldLabel = selectedOld
      .map((c) => `${c[0].book} ${c[0].chapter}`)
      .join('，');
    const newLabel = selectedNew
      .map((c) => `${c[0].book} ${c[0].chapter}`)
      .join('，');
    setReadingPlan(`旧约：${oldLabel}\n新约：${newLabel}`);

    // ✅ 检查当天是否已打卡
    AsyncStorage.getItem(`checkin-${dateKey}`).then((val) => {
      if (val === 'done') setCompleted(true);
    });
  }, []);

  // ✅ 打卡
  const handleCheckin = async () => {
    await AsyncStorage.setItem(`checkin-${dateKey}`, 'done');
    setCompleted(true);
  };

  const renderChapter = (chapter: any[], idx: number, label: string) => (
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
        {label} {chapter[0].book} 第 {chapter[0].chapter} 章
      </Text>
      {chapter.map((verse) => (
        <Text
          key={verse.verse}
          style={{
            fontSize,
            lineHeight: fontSize * 1.5,
            color: colors.text,
            marginBottom: 4,
          }}>
          {chapter[0].chapter}:{verse.verse} {verse.text}
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
            📖 今日读经
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
            renderChapter(chapter, idx, '旧约')
          )}
          {newChapters.map((chapter, idx) =>
            renderChapter(chapter, idx, '新约')
          )}

          {/* ✅ 打卡按钮 */}
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
              {completed ? '已打卡' : '打卡完成'}
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
