import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useTranslation } from 'react-i18next';

export default function PursueHome() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>追求中心</Text>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push('/pursue/bible')}>
        <Text style={[styles.cardText, { color: colors.text }]}>
          📖 每日读经
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push('/pursue/life-study')}>
        <Text style={[styles.cardText, { color: colors.text }]}>
          📚 生命读经
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push('/pursue/witness-lee')}>
        <Text style={[styles.cardText, { color: colors.text }]}>
          🕊️ 李常受文集
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
