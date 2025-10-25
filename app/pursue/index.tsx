import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ 加上这行
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useTranslation } from 'react-i18next';

export default function PursueHome() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();

  // 通用“开发中”提示
  const handleComingSoon = () => {
    Alert.alert('提示', '功能开发中，敬请期待！');
  };

  return (
    // ✅ 使用 SafeAreaView 包裹整个内容
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('pursue.title')}
        </Text>

        {/* ✅ 可用模块 */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/pursue/bible')}>
          <Text style={[styles.cardText, { color: colors.text }]}>
            📖 {t('pursue.bible_one_year')}
          </Text>
        </TouchableOpacity>

        {/* 🚧 生命读经（开发中） */}
        <TouchableOpacity
          style={[styles.card, styles.disabledCard]}
          onPress={handleComingSoon}
          activeOpacity={0.7}>
          <Text style={[styles.cardText, styles.disabledText]}>
            📚 {t('pursue.life_study')}（开发中）
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.disabledCard]}
          onPress={handleComingSoon}
          activeOpacity={0.7}>
          <Text style={[styles.cardText, styles.disabledText]}>
            🕊️ {t('pursue.witness_lee')}（开发中）
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => router.push('/pursue/hymns')}>
          <Text style={[styles.cardText, { color: colors.text }]}>
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
    fontSize: 20,
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
    fontSize: 16,
  },
  disabledCard: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});
