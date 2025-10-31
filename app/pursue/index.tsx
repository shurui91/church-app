import React from 'react';
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
  const { getFontSizeValue } = useFontSize(); // ✅ 获取动态字号函数

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
              fontSize: getFontSizeValue(20), // ✅ 全局控制
            },
          ]}>
          {t('pursue.title')}
        </Text>

        {/* 📖 一年读经 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/pursue/bible')}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: getFontSizeValue(16), // ✅ 全局控制
              },
            ]}>
            📖 {t('pursue.bible_one_year')}
          </Text>
        </TouchableOpacity>

        {/* 📚 生命读经 */}
        {/* <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/pursue/life-study')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              { color: colors.text, fontSize: getFontSizeValue(16) },
            ]}>
            📚 {t('pursue.life_study')}
          </Text>
        </TouchableOpacity> */}

        {/* 🚧 开发中 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => alert('此功能正在开发中，敬请期待！')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              { color: colors.text, fontSize: getFontSizeValue(16) },
            ]}>
            🚧 生命读经（开发中）
          </Text>
        </TouchableOpacity>

        {/* 🕊️ 李常受文集 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => {
            const mondayStr = getMondayYmd();
            router.push(`/pursue/lee/week/${mondayStr}`);
          }}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: getFontSizeValue(16), // ✅ 全局控制
              },
            ]}>
            🕊️ {t('pursue.witness_lee')}
          </Text>
        </TouchableOpacity>

        {/* 🎵 诗歌 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/pursue/hymns')}>
          <Text
            style={[
              styles.cardText,
              {
                color: colors.text,
                fontSize: getFontSizeValue(16), // ✅ 全局控制
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
