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
  UIManager,
  findNodeHandle,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import oldTestament from '../../assets/old_multilang.json';
import newTestament from '../../assets/new_multilang.json';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';

// 工具函数
function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}
function groupByChapter(data: any[]) {
  const grouped: Record<number, any[]> = {};
  for (const verse of data) {
    if (!grouped[verse.chapter_index]) grouped[verse.chapter_index] = [];
    grouped[verse.chapter_index].push(verse);
  }
  return Object.values(grouped);
}
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
function splitToSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？!?])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

  const [scrollProgress] = useState(new Animated.Value(0));
  const [scrollPercent, setScrollPercent] = useState(0);
  const [progressOpacity] = useState(new Animated.Value(0));
  const [scrollThumbHeight, setScrollThumbHeight] = useState(0);
  const [scrollThumbY] = useState(new Animated.Value(0));
  const scrollViewRef = useRef<ScrollView>(null);
  let fadeTimeout: NodeJS.Timeout;

  // ✅ 让语音在静音/震动模式下也能播放
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1, // 混合模式
          playsInSilentModeIOS: true, // ✅ 核心：静音模式下也出声
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.log('Audio mode setup error', e);
      }
    })();
  }, []);

  // ✅ 听书模式
  const [isListeningMode, setIsListeningMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sentences, setSentences] = useState<{ key: string; text: string }[]>(
    []
  );
  const [activeSentence, setActiveSentence] = useState<string | null>(null);
  const sentenceRefs = useRef<Map<string, any>>(new Map());
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  // ✅ 防止屏幕熄灭（只在听书模式启用）
  useEffect(() => {
    if (isListeningMode) {
      const {
        activateKeepAwakeAsync,
        deactivateKeepAwake,
      } = require('expo-keep-awake');
      activateKeepAwakeAsync('bible-reading');
      return () => deactivateKeepAwake('bible-reading');
    }
  }, [isListeningMode]);

  // 滚动条逻辑
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const totalHeight = contentSize.height - layoutMeasurement.height;
    const p = totalHeight > 0 ? contentOffset.y / totalHeight : 0;
    Animated.timing(scrollProgress, {
      toValue: p,
      duration: 100,
      useNativeDriver: false,
    }).start();
    setScrollPercent(Math.min(Math.round(p * 100), 100));

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

    const visibleRatio = layoutMeasurement.height / contentSize.height;
    const thumbHeight = Math.max(visibleRatio * layoutMeasurement.height, 40);
    setScrollThumbHeight(thumbHeight);
    Animated.timing(scrollThumbY, {
      toValue: p * (layoutMeasurement.height - thumbHeight),
      duration: 50,
      useNativeDriver: false,
    }).start();

    const today = new Date();
    AsyncStorage.setItem(
      `scrollPos-${formatDateKey(today)}`,
      contentOffset.y.toString()
    );
  };

  const progressWidth = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // 初始化每日经文
  useEffect(() => {
    const today = new Date();
    const dateKey = formatDateKey(today);
    const groupedOld = groupByChapter(oldTestament as any[]);
    const groupedNew = groupByChapter(newTestament as any[]);
    const totalOld = groupedOld.length;
    const totalNew = groupedNew.length;
    const dayOfYear = getDayOfYear(today);

    const formatter = new Intl.DateTimeFormat(
      lang === 'zh-Hant' ? 'zh-Hant' : 'zh',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      }
    );
    setFormattedDate(formatter.format(today));

    const oldStart = ((dayOfYear - 1) * 3) % totalOld;
    const selectedOld = [
      groupedOld[oldStart],
      groupedOld[(oldStart + 1) % totalOld],
      groupedOld[(oldStart + 2) % totalOld],
    ];
    const newIndex = (dayOfYear - 1) % totalNew;
    const selectedNew = [groupedNew[newIndex]];
    setOldChapters(selectedOld);
    setNewChapters(selectedNew);

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
    AsyncStorage.getItem(`checkin-${dateKey}`).then((val) =>
      setCompleted(val === 'done')
    );

    setTimeout(async () => {
      const savedY = await AsyncStorage.getItem(`scrollPos-${dateKey}`);
      if (savedY && scrollViewRef.current)
        scrollViewRef.current.scrollTo({
          y: parseFloat(savedY),
          animated: false,
        });
    }, 500);
  }, [lang, i18n.language]);

  // 构建句子队列
  useEffect(() => {
    const all: { key: string; text: string }[] = [];
    [...oldChapters, ...newChapters].forEach((chapter) => {
      chapter.forEach((verse: any) => {
        const vtext = lang === 'zh-Hant' ? verse.text.zh_tw : verse.text.zh_cn;
        splitToSentences(vtext).forEach((p, idx) =>
          all.push({ key: `${verse.chapter}-${verse.verse}-${idx}`, text: p })
        );
      });
    });
    setSentences(all);
  }, [oldChapters, newChapters, lang]);

  // ✅ 朗读逻辑
  const speakSentence = (index: number) => {
    if (index >= sentences.length || !isPlayingRef.current) {
      setActiveSentence(null);
      setIsListeningMode(false);
      return;
    }

    const current = sentences[index];
    setActiveSentence(current.key);
    currentIndexRef.current = index;

    const element = sentenceRefs.current.get(current.key);
    if (element && scrollViewRef.current) {
      if (Platform.OS === 'web') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const scrollNode = findNodeHandle(scrollViewRef.current);
        const elementNode = findNodeHandle(element);
        if (scrollNode && elementNode) {
          UIManager.measureLayout(
            elementNode,
            scrollNode,
            () => {},
            (_x, y) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - 250),
                animated: true,
              });
            }
          );
        }
      }
    }

    Speech.speak(current.text, {
      language: lang === 'zh-Hant' ? 'zh-TW' : 'zh-CN',
      rate: 1.0,
      pitch: 1.0,
      onDone: () => {
        if (isPlayingRef.current) speakSentence(index + 1);
      },
    });
  };

  // 控制函数
  const startListening = () => {
    setIsListeningMode(true);
    isPlayingRef.current = true;
    speakSentence(currentIndexRef.current);
  };
  const stopListening = () => {
    Speech.stop();
    isPlayingRef.current = false;
    setIsListeningMode(false);
    setActiveSentence(null);
  };
  const pauseOrResume = () => {
    if (isPaused) {
      setIsPaused(false);
      isPlayingRef.current = true;
      speakSentence(currentIndexRef.current);
    } else {
      Speech.stop();
      setIsPaused(true);
      isPlayingRef.current = false;
    }
  };
  const playNext = () => {
    isPlayingRef.current = false;
    Speech.stop();

    const next = Math.min(sentences.length - 1, currentIndexRef.current + 1);

    setTimeout(() => {
      isPlayingRef.current = true;
      speakSentence(next);
    }, 150);
  };

  const playPrev = () => {
    isPlayingRef.current = false; // ✅ 阻止上一个 onDone()
    Speech.stop();

    const prev = Math.max(0, currentIndexRef.current - 1);

    setTimeout(() => {
      isPlayingRef.current = true;
      speakSentence(prev);
    }, 150); // ✅ 稍微延迟启动，确保 stop 已完成
  };

  const handleCheckin = async () => {
    const today = new Date();
    await AsyncStorage.setItem(`checkin-${formatDateKey(today)}`, 'done');
    setCompleted(true);
  };

  const renderChapter = (chapter: any[], idx: number, labelKey: string) => (
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
        {t(labelKey)}{' '}
        {lang === 'zh-Hant' ? chapter[0].book_trad : chapter[0].book_simp}{' '}
        {chapter[0].chapter} {t('bible.chapter')}
      </Text>
      {chapter.map((verse) => {
        const vtext = lang === 'zh-Hant' ? verse.text.zh_tw : verse.text.zh_cn;
        return (
          <View key={`${verse.verse}-${lang}`} style={{ marginBottom: 4 }}>
            {splitToSentences(vtext).map((s, idx2) => {
              const key = `${verse.chapter}-${verse.verse}-${idx2}`;
              const isActive = key === activeSentence;
              return (
                <Text
                  key={key}
                  ref={(ref) => ref && sentenceRefs.current.set(key, ref)}
                  style={{
                    fontSize,
                    lineHeight: fontSize * 1.5,
                    color: isActive ? colors.primary : colors.text,
                    backgroundColor: isActive
                      ? 'rgba(0,122,255,0.1)'
                      : 'transparent',
                  }}>
                  {chapter[0].chapter}:{verse.verse} {s}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 阅读进度条 */}
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

      {/* 主体内容 */}
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isListeningMode}>
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
                  fontSize,
                  fontWeight: '600',
                }}>
                {completed
                  ? t('bible.checkin_done')
                  : t('bible.checkin_complete')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 自定义滚动条 */}
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

        {/* 🎧 悬浮按钮 */}
        {!isListeningMode && (
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: colors.primary }]}
            onPress={startListening}>
            <Text style={{ color: 'white', fontSize: 22 }}>🎧</Text>
          </TouchableOpacity>
        )}

        {/* ⏮⏸⏭ 控制栏（底部） */}
        {isListeningMode && (
          <View
            style={[styles.audioControls, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={playPrev}>
              <Ionicons
                name='play-skip-back'
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={pauseOrResume}>
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext}>
              <Ionicons
                name='play-skip-forward'
                size={26}
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* ⏻ Power Button → 退出听书模式 */}
            <TouchableOpacity onPress={stopListening}>
              <Ionicons name='power' size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
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
  progressBarFill: { height: 6, borderRadius: 3 },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  customScrollbar: {
    position: 'absolute',
    right: 3,
    width: 5,
    borderRadius: 3,
    opacity: 0.6,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  audioControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    borderTopWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
  },
});
