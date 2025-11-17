import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useTranslation } from 'react-i18next';
import { useFontSize } from '../src/context/FontSizeContext'; // ✅ 引入全局字体钩子

export default function PursueHome() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { fontSize: globalFontSize } = useFontSize();
  // 使用相对字号，比全局字号小 20%（即全局字号的 80%）
  const baseFontSize = Math.round(globalFontSize * 0.8);
  // 防止重复点击的 ref
  const isNavigatingRef = useRef(false);

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

  const handleComingSoon = () => {
    Alert.alert('提示', '功能开发中，敬请期待！');
  };

  const getMondayYmd = (now = new Date()) => {
    const d = new Date(now);
    const w = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (w - 1));
    d.setHours(12, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: Math.round(baseFontSize * (28 / 30)), // 全局字号的80%
            },
          ]}>
          {t('pursue.title')}
        </Text>

        {/* 📖 一年读经 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => handleNavigation(() => router.push('/pursue/bible'))}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: Math.round(baseFontSize * (24 / 30)), // 全局字号的80%
              },
            ]}>
            📖 {t('pursue.bible_one_year')}
		</Text>
        </TouchableOpacity>

        {/* 📚 生命读经 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => handleNavigation(() => router.push('/pursue/life-study'))}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              { color: colors.text, fontSize: Math.round(baseFontSize * (24 / 30)) }, // 全局字号的70%
            ]}>
            📚 {t('pursue.life_study')}
          </Text>
        </TouchableOpacity>

        {/* 📚 开发中 */}
        {/* <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => alert('此功能正在开发中，敬请期待！')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              { color: colors.text, fontSize: getFontSizeValue(16) },
            ]}>
            📚 生命读经（开发中）
          </Text>
        </TouchableOpacity> */}

        {/* 🕊️ 李常受文集 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => handleNavigation(() => {
            const mondayStr = getMondayYmd();
            router.push(`/pursue/lee/week/${mondayStr}`);
          })}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: Math.round(baseFontSize * (24 / 30)), // 全局字号的80%
              },
            ]}>
            🕊️ {t('pursue.witness_lee')}
          </Text>
        </TouchableOpacity>

        {/* 🎵 诗歌 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => handleNavigation(() => router.push('/pursue/hymns'))}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: Math.round(baseFontSize * (24 / 30)), // 全局字号的80%
              },
            ]}>
            🎵 {t('pursue.hymns')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginVertical: 20,
  },
  card: {
    width: '90%',
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    elevation: 2,
  },
  cardText: {
    // fontSize 已由动态计算决定
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});
