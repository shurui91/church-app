import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useFontSize } from '../../../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import BackButton from '@/app/components/BackButton';

// 远程数据源 URL（与 day/[date].tsx 保持一致）
const LEE_ARCHIVE_URL = 'https://lcs-ops-production.up.railway.app/files/lee_archive.json';

// 缓存键（与 day/[date].tsx 保持一致）
const CACHE_KEY = 'lee_archive_cache';
const CACHE_TIMESTAMP_KEY = 'lee_archive_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

interface Article {
  id: string;
  title: string;
  reading_date: string;
  last_available_day: string;
  year: string;
  volume: number;
  topic: string;
  chapter: number;
  content: string;
}

interface LeeArchive {
  meta: {
    version: string;
    last_updated: string;
    total_articles: number;
  };
  articles: Article[];
}

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
  const { t } = useTranslation();
  // 防止重复点击的 ref
  const isNavigatingRef = useRef(false);

  // ✅ 数据加载状态
  const [loading, setLoading] = useState(true);
  const [validDates, setValidDates] = useState<Set<string>>(new Set());

  // ✅ 从缓存或远程获取数据
  useEffect(() => {
    const fetchArchive = async () => {
      try {
        setLoading(true);

        // 先检查缓存
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cacheTimestamp) {
          const timestamp = parseInt(cacheTimestamp, 10);
          const now = Date.now();
          
          // 如果缓存未过期，使用缓存
          if (now - timestamp < CACHE_DURATION) {
            const archive: LeeArchive = JSON.parse(cachedData);
            const dates = new Set(archive.articles.map((a) => a.reading_date));
            setValidDates(dates);
            setLoading(false);
            return;
          }
        }

        // 从远程获取数据
        const response = await fetch(`${LEE_ARCHIVE_URL}?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error(`获取数据失败: ${response.status}`);
        }
        
        const archive: LeeArchive = await response.json();
        
        // 保存到缓存
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(archive));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        
        // 提取有效日期
        const dates = new Set(archive.articles.map((a) => a.reading_date));
        setValidDates(dates);
      } catch (err: any) {
        console.error('加载李常受文集失败:', err);
        
        // 如果网络失败，尝试使用缓存（即使过期）
        try {
          const cachedData = await AsyncStorage.getItem(CACHE_KEY);
          if (cachedData) {
            const archive: LeeArchive = JSON.parse(cachedData);
            const dates = new Set(archive.articles.map((a) => a.reading_date));
            setValidDates(dates);
          }
        } catch (cacheErr) {
          console.error('读取缓存失败:', cacheErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, []);

  if (!monday)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: getFontSizeValue(18), marginTop: 16, color: colors.text }}>加载中...</Text>
      </View>
    );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: getFontSizeValue(18), marginTop: 16, color: colors.text }}>加载中...</Text>
      </View>
    );
  }

  const weekDays = getWeekYMDs(monday as string);
  const weekdayNames = ['一', '二', '三', '四', '五', '六', '日'];
  const todayStr = getTodayYMD_LA();

  // ✅ 动态盒子尺寸
  const baseFont = getFontSizeValue(18);
  const boxSize = baseFont * 5.5; // 原本大约90px，字体变大时也扩大

  // 防重复点击的导航处理函数
  const handleNavigation = (navigationFn: () => void) => {
    if (isNavigatingRef.current) {
      return; // 如果正在导航，忽略此次点击
    }
    isNavigatingRef.current = true;
    navigationFn();
    // 500ms 后重置状态，允许再次导航
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('titles.lee'),
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackVisible: false,
          headerLeft: () => <BackButton />, // ✅ 使用你自己的按钮
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.container}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontSize: getFontSizeValue(24) },
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
                onPress={() => handleNavigation(() => router.push(`/pursue/lee/day/${ymd}`))}
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
                      { color: textColor, fontSize: getFontSizeValue(20) },
                    ]}>
                    {weekdayNames[index]}
                  </Text>
                  <Text
                    style={[
                      styles.dateLabel,
                      {
                        color: textColor,
                        fontWeight: isToday ? 'bold' : 'normal',
                        fontSize: getFontSizeValue(18),
                      },
                    ]}>
                    {display}
                  </Text>
                  {isToday && hasArticle && (
                    <Text
                      style={[
                        styles.todayTag,
                        { fontSize: getFontSizeValue(14) },
                      ]}>
                      今天
                    </Text>
                  )}
                  {isSunday && (
                    <Text
                      style={[
                        styles.noProgressTag,
                        { fontSize: getFontSizeValue(14) },
                      ]}>
                      无进度
                    </Text>
                  )}
                  {!hasArticle && !isSunday && (
                    <Text
                      style={[
                        styles.noProgressTag,
                        { fontSize: getFontSizeValue(14) },
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
