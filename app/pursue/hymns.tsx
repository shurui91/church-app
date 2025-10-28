import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import chSongs from '../../assets/ch_songs.json'; // 大本诗歌
import tsSongs from '../../assets/ts_songs.json'; // 补充本诗歌
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/app/components/BackButton';
import { useTranslation } from 'react-i18next'; // ✅ 引入多语言钩子

export default function HymnsScreen() {
  const [input, setInput] = useState('');
  const [selectedBook, setSelectedBook] = useState<'ch' | 'ts'>('ch');
  const router = useRouter();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation(); // ✅ 获取翻译函数与当前语言

  // ✅ 当页面重新获得焦点时，清空输入框
  useFocusEffect(
    useCallback(() => {
      setInput('');
    }, [])
  );

  const handlePress = (digit: string) => {
    if (input.length < 4) setInput((prev) => prev + digit);
  };

  const handleClear = () => setInput('');

  const handleConfirm = () => {
    if (!input) return;

    const currentSongs = selectedBook === 'ch' ? chSongs : tsSongs;
    const hymn = currentSongs.find(
      (song: any) => String(song.id) === String(input)
    );

    if (!hymn) {
      Alert.alert(
        t('common.tip'), // ✅ “提示”
        `${t(selectedBook === 'ch' ? 'hymns.main' : 'hymns.supplement')} ${t(
          'hymns.notFound'
        )} ${input}`
      );
      return;
    }

    router.push({
      pathname: '/pursue/hymn/[id]',
      params: { id: input, book: selectedBook },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true, // ✅ 必须加这一行
          title: t('hymns.title'),
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
        }}
      />

      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          {/* ✅ Tab 选择区 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedBook === 'ch' && { backgroundColor: '#007AFF' },
              ]}
              onPress={() => setSelectedBook('ch')}>
              <Text
                style={[
                  styles.tabText,
                  { color: selectedBook === 'ch' ? 'white' : colors.text },
                ]}>
                {t('hymns.main')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                selectedBook === 'ts' && { backgroundColor: '#007AFF' },
              ]}
              onPress={() => setSelectedBook('ts')}>
              <Text
                style={[
                  styles.tabText,
                  { color: selectedBook === 'ts' ? 'white' : colors.text },
                ]}>
                {t('hymns.supplement')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 显示当前输入 */}
          <Text style={[styles.display, { color: colors.text }]}>
            {input || t('hymns.enterNumber')}
          </Text>

          {/* 数字键盘 */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(
              (num, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.key, { backgroundColor: colors.card }]}
                  onPress={() => handlePress(num)}
                  activeOpacity={0.7}>
                  <Text style={[styles.keyText, { color: colors.text }]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* ✅ 说明文字（仅大本） */}
          <View
            style={{
              height: 28,
              justifyContent: 'center',
              marginBottom: 10,
            }}>
            {selectedBook === 'ch' && (
              <Text style={[styles.note, { color: colors.text }]}>
                {t('hymns.appendixNote')}
              </Text>
            )}
          </View>

          {/* 底部操作 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.clearBtn]}
              onPress={handleClear}>
              <Text style={styles.clearText}>{t('common.clear')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={handleConfirm}>
              <Text style={styles.okText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  display: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 30,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '80%',
    justifyContent: 'center',
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 40,
  },
  actionBtn: {
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  clearBtn: {
    backgroundColor: '#ccc',
  },
  clearText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
  },
  okText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  note: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 5,
  },
});
