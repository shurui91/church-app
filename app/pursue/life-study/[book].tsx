import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useFontSize } from '../../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import BackButton from '@/app/components/BackButton';

// ✅ 静态导入所有 JSON 文件
import gen from '../../../assets/data/ot/1_gen.json';
import exo from '../../../assets/data/ot/2_exo.json';
import lev from '../../../assets/data/ot/3_lev.json';
import num from '../../../assets/data/ot/4_num.json';
import deu from '../../../assets/data/ot/5_deu.json';
import jos from '../../../assets/data/ot/6_jos.json';
import jud from '../../../assets/data/ot/7_jud.json';
import ruth from '../../../assets/data/ot/8_ruth.json';
import sam from '../../../assets/data/ot/9_sam.json';
import king from '../../../assets/data/ot/10_king.json';
import chr from '../../../assets/data/ot/11_chr.json';
import ezr from '../../../assets/data/ot/12_ezr.json';
import neh from '../../../assets/data/ot/13_neh.json';
import est from '../../../assets/data/ot/14_est.json';
import job from '../../../assets/data/ot/15_job.json';
import psa from '../../../assets/data/ot/16_psa.json';
import pro from '../../../assets/data/ot/17_pro.json';
import ecc from '../../../assets/data/ot/18_ecc.json';
import song from '../../../assets/data/ot/19_song.json';
import isa from '../../../assets/data/ot/20_isa.json';
import jer from '../../../assets/data/ot/21_jer.json';
import lam from '../../../assets/data/ot/22_lam.json';
import eze from '../../../assets/data/ot/23_eze.json';
import dan from '../../../assets/data/ot/24_dan.json';
import hos from '../../../assets/data/ot/25_hos.json';
import joe from '../../../assets/data/ot/26_joe.json';
import amos from '../../../assets/data/ot/27_amos.json';
import oba from '../../../assets/data/ot/28_oba.json';
import jona from '../../../assets/data/ot/29_jona.json';
import mich from '../../../assets/data/ot/30_mich.json';
import nahu from '../../../assets/data/ot/31_nahu.json';
import haba from '../../../assets/data/ot/32_haba.json';
import zeph from '../../../assets/data/ot/33_zeph.json';
import hag from '../../../assets/data/ot/34_hag.json';
import zech from '../../../assets/data/ot/35_zech.json';
import mala from '../../../assets/data/ot/36_mala.json';
import matt from '../../../assets/data/ot/37_matt.json';
import mark from '../../../assets/data/ot/38_mark.json';
import luke from '../../../assets/data/ot/39_luke.json';
import john from '../../../assets/data/ot/40_john.json';
import acts from '../../../assets/data/ot/41_acts.json';
import roma from '../../../assets/data/ot/42_roma.json';
import cor1 from '../../../assets/data/ot/43_1cor.json';
import cor2 from '../../../assets/data/ot/44_2cor.json';
import gal from '../../../assets/data/ot/45_gal.json';
import ephi from '../../../assets/data/ot/46_ephi.json';
import phil from '../../../assets/data/ot/47_phil.json';
import col from '../../../assets/data/ot/48_col.json';
import the1 from '../../../assets/data/ot/49_1the.json';
import the2 from '../../../assets/data/ot/50_2the.json';
import tim1 from '../../../assets/data/ot/51_1tim.json';
import tim2 from '../../../assets/data/ot/52_2tim.json';
import titu from '../../../assets/data/ot/53_titu.json';
import phmn from '../../../assets/data/ot/54_phmn.json';
import hebr from '../../../assets/data/ot/55_hebr.json';
import jame from '../../../assets/data/ot/56_jame.json';
import pet1 from '../../../assets/data/ot/57_1pet.json';
import pet2 from '../../../assets/data/ot/58_2pet.json';
import joh1 from '../../../assets/data/ot/59_1joh.json';
import joh2 from '../../../assets/data/ot/60_2joh.json';
import joh3 from '../../../assets/data/ot/61_3joh.json';
import juda from '../../../assets/data/ot/62_juda.json';
import rev from '../../../assets/data/ot/63_rev.json';

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

// ✅ 书卷简称到文件名的映射（旧约）
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

// ✅ 新约书卷映射
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

// ✅ 繁体映射（只映射不同的）
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

// ✅ 加载 JSON 数据的辅助函数
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

export default function BookArticlesScreen() {
  const { book } = useLocalSearchParams<{ book: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { i18n, t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [bookData, setBookData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTraditional = useMemo(
    () => i18n.language === 'zh-Hant',
    [i18n.language]
  );

  useEffect(() => {
    if (!book) return;

    setLoading(true);
    setError(null);
    try {
      const data = loadBookData(book, isTraditional);
      setBookData(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [book, isTraditional]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: book || '加载中...',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            加载中...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !bookData) {
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
            {error || '未找到数据'}
          </Text>
        </View>
      </View>
    );
  }

  const articles = bookData.articles || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: bookData.book_name
            ? `${bookData.book_name} ${t('pursue.life_study')}`
            : book,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          // 当滚动超过 300 像素时显示返回顶部按钮
          setShowScrollTop(offsetY > 300);
        }}
        scrollEventThrottle={16}>
        {articles.length === 0 ? (
          <View style={styles.center}>
            <Text
              style={[
                styles.emptyText,
                { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
              ]}>
              暂无文章
            </Text>
          </View>
        ) : (
          articles.map((article: any, index: number) => (
            <TouchableOpacity
              key={article.article_index || index}
              style={[
                styles.articleItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() =>
                router.push(
                  `/pursue/life-study/${book}/${article.article_index}`
                )
              }
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.articleTitle,
                  {
                    color: colors.text,
                    fontSize: getFontSizeValue(17),
                  },
                ]}>
                {article.article_title || article.msg_title}
              </Text>
              {article.ls_title && (
                <Text
                  style={[
                    styles.articleSubtitle,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(11),
                    },
                  ]}
                  numberOfLines={2}>
                  {article.ls_title}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ✅ 返回顶部悬浮按钮 */}
      {showScrollTop && (
        <TouchableOpacity
          style={[
            styles.scrollTopButton,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.text,
            },
          ]}
          onPress={() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }}
          activeOpacity={0.8}>
          <Ionicons name="arrow-up" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
  articleItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  articleTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  articleSubtitle: {
    marginTop: 4,
    opacity: 0.8,
  },
  scrollTopButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});

