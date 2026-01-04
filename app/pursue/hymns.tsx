import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets(); // ✅ 获取安全区域信息
  // 防止重复点击的 ref
  const isNavigatingRef = useRef(false);

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
    // 防止重复点击
    if (isNavigatingRef.current) {
      return; // 如果正在导航，忽略此次点击
    }

    if (!input) return;

    const currentSongs = selectedBook === 'ch' ? chSongs : tsSongs;
    const hymn = currentSongs.find(
      (song: any) => String(song.id) === String(input)
    );

    if (!hymn) {
      Alert.alert(
        t('common.tip'), // ✅ "提示"
        `${t(selectedBook === 'ch' ? 'hymns.main' : 'hymns.supplement')} ${t(
          'hymns.notFound'
        )} ${input}`
      );
      return;
    }

    // 设置导航标志
    isNavigatingRef.current = true;
    router.push({
      pathname: '/pursue/hymn/[id]',
      params: { id: input, book: selectedBook },
    });
    // 500ms 后重置状态，允许再次导航
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
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
        edges={['bottom']}
        style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              // ✅ 添加底部 padding，确保内容不被 TabBar 遮挡
              // TabBar 高度约 60-70px，SafeAreaView 已处理底部安全区域
              paddingBottom: Platform.OS === 'android' 
                ? Math.max(insets.bottom + 70, 80) // Android: TabBar (~60px) + 安全区域
                : Math.max(insets.bottom + 70, 80), // iOS: TabBar (~60px) + 安全区域
              // ✅ 添加顶部 padding，确保内容有适当间距
              // Stack.Screen header 已处理导航栏空间，这里只需要少量间距
              paddingTop: Platform.OS === 'android' 
                ? 8 // Android: 少量顶部间距
                : 8, // iOS: 少量顶部间距
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}>
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
          <View 
            style={[
              styles.actions,
              {
                // ✅ 添加底部 padding，确保按钮不被 TabBar 遮挡
                marginBottom: Platform.OS === 'android' ? 20 : 10,
              }
            ]}>
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
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    // ✅ 确保内容可以滚动，即使内容不足一屏
  },
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    // ✅ 移除 minHeight，让内容自然流动
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
    gap: 20, // ✅ 减小按钮之间的间距
    width: '100%',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  actionBtn: {
    paddingVertical: 16, // ✅ 稍微减小垂直 padding
    paddingHorizontal: 40, // ✅ 减小水平 padding
    borderRadius: 12,
    minWidth: 120, // ✅ 减小最小宽度
    flex: 1, // ✅ 让按钮平均分配空间
    maxWidth: 160, // ✅ 限制最大宽度
    alignItems: 'center',
    justifyContent: 'center',
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
