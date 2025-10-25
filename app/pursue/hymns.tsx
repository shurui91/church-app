import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useThemeColors } from '../src/hooks/useThemeColors';
import chSongs from '../../assets/ch_songs.json'; // 大本诗歌
import tsSongs from '../../assets/ts_songs.json'; // 补充本诗歌
import { Ionicons } from '@expo/vector-icons';

export default function HymnsScreen() {
  const [input, setInput] = useState('');
  const [selectedBook, setSelectedBook] = useState<'ch' | 'ts'>('ch'); // ✅ 当前选中的歌本
  const router = useRouter();
  const colors = useThemeColors();

  const handlePress = (digit: string) => {
    if (input.length < 4) setInput((prev) => prev + digit);
  };

  const handleClear = () => setInput('');

  const handleConfirm = () => {
    if (!input) return;

    // ✅ 根据当前 tab 选择数据源
    const currentSongs = selectedBook === 'ch' ? chSongs : tsSongs;
    // ✅ 强制类型转为字符串，兼容数字 id
    const hymn = currentSongs.find(
      (song: any) => String(song.id) === String(input)
    );

    if (!hymn) {
      Alert.alert(
        '提示',
        `在${
          selectedBook === 'ch' ? '大本诗歌' : '补充本诗歌'
        }中找不到编号为 ${input} 的诗歌`
      );
      return;
    }

    // ✅ 跳转到详情页，并传递参数
    router.push({
      pathname: '/pursue/hymn/[id]',
      params: { id: input, book: selectedBook }, // 传入 book 参数
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '诗歌',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}>
              <Ionicons name='arrow-back' size={24} color={colors.text} />
            </TouchableOpacity>
          ),
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
                大本诗歌
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
                补充本诗歌
              </Text>
            </TouchableOpacity>
          </View>

          {/* 显示当前输入 */}
          <Text style={[styles.display, { color: colors.text }]}>
            {input || '请输入诗歌编号'}
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

		  {/* ✅ 仅在大本诗歌时显示这一段 */}
          {selectedBook === 'ch' && (
            <Text style={[styles.note, { color: colors.text }]}>注：附1 - 附5请输入 1001 - 1005</Text>
          )}

          {/* 底部操作 */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.clearBtn]}
              onPress={handleClear}>
              <Text style={styles.clearText}>清空</Text>
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
    paddingVertical: 18, // ✅ 原本是 12，改大一点
    paddingHorizontal: 50, // ✅ 原本是 30
    borderRadius: 12, // ✅ 稍微圆润一点
    minWidth: 140, // ✅ 增加按钮宽度，保证大小一致
    alignItems: 'center',
  },
  clearBtn: {
    backgroundColor: '#ccc',
  },
  clearText: {
    color: '#333',
    fontSize: 18, // ✅ 原本是 16
    fontWeight: '600', // ✅ 字体加粗
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
  },
  okText: {
    color: 'white',
    fontSize: 18, // ✅ 原本是 16
    fontWeight: '700',
  },
  note: {
    fontSize: 16,
    marginBottom: 10,
  },
});
