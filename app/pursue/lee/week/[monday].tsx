import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import leeArchive from '../../../../assets/lee_archive.json'; // ✅ 本地JSON

function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return { y, m, d };
}
function addDaysYMD(ymd: string, days: number) {
  const { y, m, d } = parseYMD(ymd);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y2 = utc.getUTCFullYear();
  const m2 = `${utc.getUTCMonth() + 1}`.padStart(2, '0');
  const d2 = `${utc.getUTCDate()}`.padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}
function getWeekYMDs(mondayYMD: string) {
  return Array.from({ length: 7 }, (_, i) => addDaysYMD(mondayYMD, i));
}
function getTodayYMD_LA() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
function displayMD(ymd: string) {
  const { m, d } = parseYMD(ymd);
  return `${m}/${d}`;
}

export default function WeekPage() {
  const { monday } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();

  if (!monday)
    return (
      <View>
        <Text>加载中...</Text>
      </View>
    );

  const weekDays = getWeekYMDs(monday as string);
  const weekdayNames = ['一', '二', '三', '四', '五', '六', '日'];
  const todayStr = getTodayYMD_LA();

  // ✅ 从 JSON 中提取所有有内容的日期
  const validDates = new Set(
    (leeArchive.articles || []).map((a) => a.reading_date)
  );

  return (
    <>
      <Stack.Screen options={{ title: '李常受文集' }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>📅 本周进度</Text>

        <View style={styles.grid}>
          {weekDays.map((ymd, index) => {
            const display = displayMD(ymd);
            const isToday = ymd === todayStr;
            const isSunday = index === 6;
            const hasArticle = validDates.has(ymd);

            // ✅ 样式逻辑
            const boxColor = isSunday
              ? '#ccc'
              : hasArticle
              ? isToday
                ? colors.primary
                : colors.card
              : '#e0e0e0';
            const textColor = isSunday
              ? '#666'
              : hasArticle
              ? isToday
                ? '#fff'
                : colors.text
              : '#999';
            const opacity = hasArticle ? 1 : 0.6;

            return (
              <TouchableOpacity
                key={ymd}
                disabled={!hasArticle || isSunday}
                onPress={() => router.push(`/pursue/lee/day/${ymd}`)}
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.dayBox,
                    { backgroundColor: boxColor, opacity },
                  ]}>
                  <Text style={[styles.weekLabel, { color: textColor }]}>
                    {weekdayNames[index]}
                  </Text>
                  <Text
                    style={[
                      styles.dateLabel,
                      {
                        color: textColor,
                        fontWeight: isToday ? 'bold' : 'normal',
                      },
                    ]}>
                    {display}
                  </Text>
                  {isToday && hasArticle && (
                    <Text style={styles.todayTag}>今天</Text>
                  )}
                  {isSunday && <Text style={styles.noProgressTag}>无进度</Text>}
                  {!hasArticle && !isSunday && (
                    <Text style={styles.noProgressTag}>无内容</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  dayBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  weekLabel: { fontSize: 18, fontWeight: '600' },
  dateLabel: { fontSize: 16, marginTop: 6 },
  todayTag: {
    position: 'absolute',
    bottom: 6,
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  noProgressTag: {
    position: 'absolute',
    bottom: 6,
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
});
