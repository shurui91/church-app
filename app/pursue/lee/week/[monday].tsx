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
import { useFontSize } from '../../../src/context/FontSizeContext'; // ✅ 引入字体 Hook
import leeArchive from '../../../../assets/lee_archive.json';

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
  const { getFontSizeValue } = useFontSize();

  if (!monday)
    return (
      <View>
        <Text style={{ fontSize: getFontSizeValue(16) }}>加载中...</Text>
      </View>
    );

  const weekDays = getWeekYMDs(monday as string);
  const weekdayNames = ['一', '二', '三', '四', '五', '六', '日'];
  const todayStr = getTodayYMD_LA();

  const validDates = new Set(
    (leeArchive.articles || []).map((a) => a.reading_date)
  );

  // ✅ 动态盒子尺寸
  const baseFont = getFontSizeValue(16);
  const boxSize = baseFont * 5.5; // 原本大约90px，字体变大时也扩大

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: getFontSizeValue(22) },
          ]}>
          📅 本周进度
        </Text>

        <View style={styles.grid}>
          {weekDays.map((ymd, index) => {
            const display = displayMD(ymd);
            const isToday = ymd === todayStr;
            const isSunday = index === 6;
            const hasArticle = validDates.has(ymd);

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
                    {
                      backgroundColor: boxColor,
                      opacity,
                      width: boxSize,
                      height: boxSize,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.weekLabel,
                      { color: textColor, fontSize: getFontSizeValue(18) },
                    ]}>
                    {weekdayNames[index]}
                  </Text>
                  <Text
                    style={[
                      styles.dateLabel,
                      {
                        color: textColor,
                        fontWeight: isToday ? 'bold' : 'normal',
                        fontSize: getFontSizeValue(16),
                      },
                    ]}>
                    {display}
                  </Text>
                  {isToday && hasArticle && (
                    <Text
                      style={[
                        styles.todayTag,
                        { fontSize: getFontSizeValue(12) },
                      ]}>
                      今天
                    </Text>
                  )}
                  {isSunday && (
                    <Text
                      style={[
                        styles.noProgressTag,
                        { fontSize: getFontSizeValue(12) },
                      ]}>
                      无进度
                    </Text>
                  )}
                  {!hasArticle && !isSunday && (
                    <Text
                      style={[
                        styles.noProgressTag,
                        { fontSize: getFontSizeValue(12) },
                      ]}>
                      无内容
                    </Text>
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
  title: { fontWeight: 'bold', marginBottom: 16 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  dayBox: {
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
  weekLabel: { fontWeight: '600' },
  dateLabel: { marginTop: 6 },
  todayTag: {
    position: 'absolute',
    bottom: 6,
    color: '#fff',
    fontWeight: 'bold',
  },
  noProgressTag: {
    position: 'absolute',
    bottom: 6,
    color: '#555',
    fontWeight: 'bold',
  },
});
