import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useTranslation } from 'react-i18next';
import { useFontSize } from '../../src/context/FontSizeContext';
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

// ✅ 繁体映射
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

// ✅ 获取书卷信息的辅助函数
function getBookInfo(book: string, isTraditional: boolean): { name: string; count: number } | null {
  const bookMap = isTraditional
    ? { ...oldBookMapTraditional, ...newBookMapTraditional }
    : { ...oldBookMap, ...newBookMap };

  const fileName = bookMap[book];
  if (!fileName) return null;

  const data = bookDataMap[fileName];
  if (!data) return null;

  return {
    name: data.book_name || book,
    count: data.articles?.length || 0,
  };
}

// ✅ 旧约简称（简体 & 繁体）
const oldBooksSimplified = [
  '创', '出', '利', '民', '申', '书', '士', '得', '撒', '王', '代', '拉', '尼', '斯',
  '伯', '诗', '箴', '传', '歌', '赛', '耶', '哀', '结', '但', '何', '珥', '摩', '俄',
  '拿', '弥', '鸿', '哈', '番', '该', '亚', '玛',
];
const oldBooksTraditional = [
  '創', '出', '利', '民', '申', '書', '士', '得', '撒', '王', '代', '拉', '尼', '斯',
  '伯', '詩', '箴', '傳', '歌', '賽', '耶', '哀', '結', '但', '何', '珥', '摩', '俄',
  '拿', '彌', '鴻', '哈', '番', '該', '亞', '瑪',
];

// ✅ 新约简称（简体 & 繁体）
const newBooksSimplified = [
  '太', '可', '路', '约', '徒', '罗', '林前', '林后', '加', '弗', '腓', '西', '帖前',
  '帖后', '提前', '提后', '多', '门', '来', '雅', '彼前', '彼后', '约一', '约二', '约三',
  '犹', '启',
];
const newBooksTraditional = [
  '太', '可', '路', '約', '徒', '羅', '林前', '林後', '加', '弗', '腓', '西', '帖前',
  '帖後', '提前', '提後', '多', '門', '來', '雅', '彼前', '彼後', '約一', '約二', '約三',
  '猶', '啟',
];

export default function LifeStudyIndex() {
  const colors = useThemeColors();
  const { i18n } = useTranslation();
  const { getFontSizeValue } = useFontSize();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  // 防止重复点击的 ref
  const isNavigatingRef = useRef(false);
  const isScrollingRef = useRef(false);

  // ✅ 判断当前语言是否繁体
  const isTraditional = i18n.language === 'zh-Hant';

  // ✅ 响应式列数
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth < 400 ? 4 : 5;

  const spacing = 10;
  const horizontalPadding = 16;
  const itemWidth =
    (screenWidth - horizontalPadding * 2 - spacing * (numColumns - 1)) /
    numColumns;

  // ✅ 根据语言动态选择书名
  const oldTestamentBooks = useMemo(
    () => (isTraditional ? oldBooksTraditional : oldBooksSimplified),
    [isTraditional]
  );
  const newTestamentBooks = useMemo(
    () => (isTraditional ? newBooksTraditional : newBooksSimplified),
    [isTraditional]
  );

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

  // 防重复点击的滚动处理函数
  const handleScrollToTop = () => {
    if (isScrollingRef.current) {
      return; // 如果正在滚动，忽略此次点击
    }
    isScrollingRef.current = true;
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    // 300ms 后重置状态，允许再次滚动
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  };

  const renderGrid = (data: string[]) => (
    <View style={styles.grid}>
      {data.map((book, index) => {
        const bookInfo = getBookInfo(book, isTraditional);
        const articleCount = bookInfo?.count || 0;

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            onPress={() => handleNavigation(() => router.push(`/pursue/life-study/${book}`))}
            style={[
              styles.item,
              {
                backgroundColor: colors.card,
                width: itemWidth,
                height: itemWidth,
                marginRight: (index + 1) % numColumns === 0 ? 0 : spacing,
                marginBottom: spacing,
              },
            ]}>
            <Text
              style={[
                styles.text,
                { color: colors.text, fontSize: getFontSizeValue(24) },
              ]}>
              {book}
            </Text>
            {articleCount > 0 && (
              <Text
                style={[
                  styles.countText,
                  {
                    color: colors.textSecondary,
                    fontSize: getFontSizeValue(16),
                  },
                ]}>
                ({articleCount})
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isTraditional ? '生命讀經' : '生命读经',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          // 当滚动超过 300 像素时显示返回顶部按钮
          setShowScrollTop(offsetY > 300);
        }}
        scrollEventThrottle={16}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isTraditional ? '舊約' : '旧约'}
        </Text>
        {renderGrid(oldTestamentBooks)}

        <Text
          style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
          {isTraditional ? '新約' : '新约'}
        </Text>
        {renderGrid(newTestamentBooks)}
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
          onPress={handleScrollToTop}
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  countText: {
    fontWeight: '500',
    textAlign: 'center',
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
