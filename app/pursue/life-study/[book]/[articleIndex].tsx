import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useFontSize } from '../../../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import BackButton from '@/app/components/BackButton';

// ✅ 静态导入所有 JSON 文件
import gen from '../../../../assets/data/ot/1_gen.json';
import exo from '../../../../assets/data/ot/2_exo.json';
import lev from '../../../../assets/data/ot/3_lev.json';
import num from '../../../../assets/data/ot/4_num.json';
import deu from '../../../../assets/data/ot/5_deu.json';
import jos from '../../../../assets/data/ot/6_jos.json';
import jud from '../../../../assets/data/ot/7_jud.json';
import ruth from '../../../../assets/data/ot/8_ruth.json';
import sam from '../../../../assets/data/ot/9_sam.json';
import king from '../../../../assets/data/ot/10_king.json';
import chr from '../../../../assets/data/ot/11_chr.json';
import ezr from '../../../../assets/data/ot/12_ezr.json';
import neh from '../../../../assets/data/ot/13_neh.json';
import est from '../../../../assets/data/ot/14_est.json';
import job from '../../../../assets/data/ot/15_job.json';
import psa from '../../../../assets/data/ot/16_psa.json';
import pro from '../../../../assets/data/ot/17_pro.json';
import ecc from '../../../../assets/data/ot/18_ecc.json';
import song from '../../../../assets/data/ot/19_song.json';
import isa from '../../../../assets/data/ot/20_isa.json';
import jer from '../../../../assets/data/ot/21_jer.json';
import lam from '../../../../assets/data/ot/22_lam.json';
import eze from '../../../../assets/data/ot/23_eze.json';
import dan from '../../../../assets/data/ot/24_dan.json';
import hos from '../../../../assets/data/ot/25_hos.json';
import joe from '../../../../assets/data/ot/26_joe.json';
import amos from '../../../../assets/data/ot/27_amos.json';
import oba from '../../../../assets/data/ot/28_oba.json';
import jona from '../../../../assets/data/ot/29_jona.json';
import mich from '../../../../assets/data/ot/30_mich.json';
import nahu from '../../../../assets/data/ot/31_nahu.json';
import haba from '../../../../assets/data/ot/32_haba.json';
import zeph from '../../../../assets/data/ot/33_zeph.json';
import hag from '../../../../assets/data/ot/34_hag.json';
import zech from '../../../../assets/data/ot/35_zech.json';
import mala from '../../../../assets/data/ot/36_mala.json';
import matt from '../../../../assets/data/ot/37_matt.json';
import mark from '../../../../assets/data/ot/38_mark.json';
import luke from '../../../../assets/data/ot/39_luke.json';
import john from '../../../../assets/data/ot/40_john.json';
import acts from '../../../../assets/data/ot/41_acts.json';
import roma from '../../../../assets/data/ot/42_roma.json';
import cor1 from '../../../../assets/data/ot/43_1cor.json';
import cor2 from '../../../../assets/data/ot/44_2cor.json';
import gal from '../../../../assets/data/ot/45_gal.json';
import ephi from '../../../../assets/data/ot/46_ephi.json';
import phil from '../../../../assets/data/ot/47_phil.json';
import col from '../../../../assets/data/ot/48_col.json';
import the1 from '../../../../assets/data/ot/49_1the.json';
import the2 from '../../../../assets/data/ot/50_2the.json';
import tim1 from '../../../../assets/data/ot/51_1tim.json';
import tim2 from '../../../../assets/data/ot/52_2tim.json';
import titu from '../../../../assets/data/ot/53_titu.json';
import phmn from '../../../../assets/data/ot/54_phmn.json';
import hebr from '../../../../assets/data/ot/55_hebr.json';
import jame from '../../../../assets/data/ot/56_jame.json';
import pet1 from '../../../../assets/data/ot/57_1pet.json';
import pet2 from '../../../../assets/data/ot/58_2pet.json';
import joh1 from '../../../../assets/data/ot/59_1joh.json';
import joh2 from '../../../../assets/data/ot/60_2joh.json';
import joh3 from '../../../../assets/data/ot/61_3joh.json';
import juda from '../../../../assets/data/ot/62_juda.json';
import rev from '../../../../assets/data/ot/63_rev.json';

// ✅ JSON 数据映射表
const bookDataMap: Record<string, any> = {
  '1_gen': gen,
  '2_exo': exo,
  '3_lev': lev,
  '4_num': num,
  '5_deu': deu,
  '6_jos': jos,
  '7_jud': jud,
  '8_ruth': ruth,
  '9_sam': sam,
  '10_king': king,
  '11_chr': chr,
  '12_ezr': ezr,
  '13_neh': neh,
  '14_est': est,
  '15_job': job,
  '16_psa': psa,
  '17_pro': pro,
  '18_ecc': ecc,
  '19_song': song,
  '20_isa': isa,
  '21_jer': jer,
  '22_lam': lam,
  '23_eze': eze,
  '24_dan': dan,
  '25_hos': hos,
  '26_joe': joe,
  '27_amos': amos,
  '28_oba': oba,
  '29_jona': jona,
  '30_mich': mich,
  '31_nahu': nahu,
  '32_haba': haba,
  '33_zeph': zeph,
  '34_hag': hag,
  '35_zech': zech,
  '36_mala': mala,
  '37_matt': matt,
  '38_mark': mark,
  '39_luke': luke,
  '40_john': john,
  '41_acts': acts,
  '42_roma': roma,
  '43_1cor': cor1,
  '44_2cor': cor2,
  '45_gal': gal,
  '46_ephi': ephi,
  '47_phil': phil,
  '48_col': col,
  '49_1the': the1,
  '50_2the': the2,
  '51_1tim': tim1,
  '52_2tim': tim2,
  '53_titu': titu,
  '54_phmn': phmn,
  '55_hebr': hebr,
  '56_jame': jame,
  '57_1pet': pet1,
  '58_2pet': pet2,
  '59_1joh': joh1,
  '60_2joh': joh2,
  '61_3joh': joh3,
  '62_juda': juda,
  '63_rev': rev,
};

// ✅ 书卷映射（与 [book].tsx 保持一致）
const oldBookMap: Record<string, string> = {
  创: '1_gen',
  出: '2_exo',
  利: '3_lev',
  民: '4_num',
  申: '5_deu',
  书: '6_jos',
  士: '7_jud',
  得: '8_ruth',
  撒: '9_sam',
  王: '10_king',
  代: '11_chr',
  拉: '12_ezr',
  尼: '13_neh',
  斯: '14_est',
  伯: '15_job',
  诗: '16_psa',
  箴: '17_pro',
  传: '18_ecc',
  歌: '19_song',
  赛: '20_isa',
  耶: '21_jer',
  哀: '22_lam',
  结: '23_eze',
  但: '24_dan',
  何: '25_hos',
  珥: '26_joe',
  摩: '27_amos',
  俄: '28_oba',
  拿: '29_jona',
  弥: '30_mich',
  鸿: '31_nahu',
  哈: '32_haba',
  番: '33_zeph',
  该: '34_hag',
  亚: '35_zech',
  玛: '36_mala',
};

const newBookMap: Record<string, string> = {
  太: '37_matt',
  可: '38_mark',
  路: '39_luke',
  约: '40_john',
  徒: '41_acts',
  罗: '42_roma',
  林前: '43_1cor',
  林后: '44_2cor',
  加: '45_gal',
  弗: '46_ephi',
  腓: '47_phil',
  西: '48_col',
  帖前: '49_1the',
  帖后: '50_2the',
  提前: '51_1tim',
  提后: '52_2tim',
  多: '53_titu',
  门: '54_phmn',
  来: '55_hebr',
  雅: '56_jame',
  彼前: '57_1pet',
  彼后: '58_2pet',
  约一: '59_1joh',
  约二: '60_2joh',
  约三: '61_3joh',
  犹: '62_juda',
  启: '63_rev',
};

const oldBookMapTraditional: Record<string, string> = {
  ...oldBookMap,
  創: '1_gen',
  書: '6_jos',
  詩: '16_psa',
  傳: '18_ecc',
  賽: '20_isa',
  結: '23_eze',
};

const newBookMapTraditional: Record<string, string> = {
  ...newBookMap,
  約: '40_john',
  羅: '42_roma',
  林後: '44_2cor',
  帖後: '50_2the',
  提後: '52_2tim',
  來: '55_hebr',
  彼後: '58_2pet',
  約一: '59_1joh',
  約二: '60_2joh',
  約三: '61_3joh',
  啟: '63_rev',
};

function loadBookData(book: string, isTraditional: boolean): any {
  const bookMap = isTraditional
    ? { ...oldBookMapTraditional, ...newBookMapTraditional }
    : { ...oldBookMap, ...newBookMap };

  const fileName = bookMap[book];
  if (!fileName) {
    throw new Error(`找不到书卷: ${book}`);
  }

  const data = bookDataMap[fileName];
  if (!data) {
    throw new Error(`未找到数据文件: ${fileName}`);
  }

  return data;
}

// ✅ 去除 HTML 标签并格式化文本
function stripHTML(html: string): string {
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
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&apos;/g, "'")
    .trim();
}

// ✅ 动态行距计算
function getLineHeight(fontSize: number): number {
  if (fontSize <= 20) return fontSize * 1.5;
  return fontSize * 1.4;
}

export default function ArticleDetailScreen() {
  const { book, articleIndex } = useLocalSearchParams<{
    book: string;
    articleIndex: string;
  }>();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t, i18n } = useTranslation();

  const [bookData, setBookData] = useState<any>(null);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scrollPercent, setScrollPercent] = useState(0);
  const scrollProgress = useRef(new Animated.Value(0)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTraditional = i18n.language === 'zh-Hant';
  const articleIdx = parseInt(articleIndex || '0', 10);

  useEffect(() => {
    if (!book || !articleIndex) return;

    setLoading(true);
    setError(null);
    try {
      const data = loadBookData(book, isTraditional);
      setBookData(data);

      const foundArticle = (data.articles || []).find(
        (a: any) => a.article_index === articleIdx
      );
      if (foundArticle) {
        setArticle(foundArticle);
      } else {
        setError('未找到该文章');
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [book, articleIndex, isTraditional, articleIdx]);

  // ✅ 恢复滚动位置
  useEffect(() => {
    if (!book || !articleIndex || !scrollViewRef.current) return;

    const storageKey = `life-study-scroll-${book}-${articleIndex}`;
    const restoreScroll = async () => {
      try {
        const savedY = await AsyncStorage.getItem(storageKey);
        if (savedY) {
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
  }, [book, articleIndex]);

  // ✅ 滚动事件处理
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

    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      Animated.timing(progressOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, 2000);

    // ✅ 保存滚动位置
    if (book && articleIndex) {
      const storageKey = `life-study-scroll-${book}-${articleIndex}`;
      AsyncStorage.setItem(storageKey, contentOffset.y.toString());
    }
  };

  const progressWidth = scrollProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: '加载中...',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            加载中...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: book || '错误',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || '未找到文章'}
          </Text>
        </View>
      </View>
    );
  }

  const cleanContent = stripHTML(article.ls_text || '');
  const fontContent = getFontSizeValue(16);
  const lineContent = getLineHeight(fontContent);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: article.article_title || article.msg_title || '文章',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />

      {/* ✅ 阅读进度条 */}
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
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {scrollPercent}%
        </Text>
      </Animated.View>

      {/* ✅ 正文内容 */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}>
        {/* 标题 */}
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: getFontSizeValue(22),
              lineHeight: getLineHeight(getFontSizeValue(22)),
            },
          ]}>
          {article.article_title || article.msg_title}
        </Text>

        {/* 副标题 */}
        {article.ls_title && (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getLineHeight(getFontSizeValue(16)),
              },
            ]}>
            {article.ls_title}
          </Text>
        )}

        {/* 正文 */}
        <Text
          style={[
            styles.content,
            {
              color: colors.text,
              fontSize: fontContent,
              lineHeight: lineContent,
            },
          ]}>
          {cleanContent}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 0 : 4,
    paddingBottom: 6,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  content: {
    paddingHorizontal: 20,
  },
});

