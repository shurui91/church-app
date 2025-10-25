import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useThemeColors';

export default function LifeStudyScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const [modalVisible, setModalVisible] = useState(false);
  const [note, setNote] = useState('');
  const [progress] = useState(new Animated.Value(0.85));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 0.85,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, []);

  const today = '2025年10月23日 · 周四';
  const title = '主题：基督是生命的粮';
  const verse = '「我是生命的粮；到我这里来的，必定不饿。」（约6:35）';
  const summary =
    '今天的信息提醒我们，真正的满足不在外面的供应，而在主的自己。祂愿意成为我们的生命，并将祂自己分赐到我们里面，使我们享受祂作生命的丰富。';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '生命读经',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />

      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            📖 生命读经笔记
          </Text>
        </View>

        {/* Week Section */}
        <View style={styles.weekSection}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>
            第 43 周
          </Text>

          <View style={styles.dayRow}>
            {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
              <View
                key={d}
                style={[
                  styles.dayCircle,
                  i === 3
                    ? { backgroundColor: colors.primary }
                    : i === 6
                    ? { backgroundColor: colors.border }
                    : { backgroundColor: colors.card },
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    i === 6
                      ? { color: colors.border }
                      : i === 3
                      ? { color: '#fff', fontWeight: 'bold' }
                      : { color: colors.text },
                  ]}>
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressContainer,
              { backgroundColor: colors.border },
            ]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.primary,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scroll}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, shadowColor: colors.border },
            ]}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {today}
            </Text>
            <Text style={[styles.titleText, { color: colors.text }]}>
              {title}
            </Text>
            <Text style={[styles.verseText, { color: colors.text }]}>
              {verse}
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {summary}
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: colors.primary },
                ]}>
                <Text style={[styles.btnPrimaryText]}>阅读全文</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: colors.primary }]}
                onPress={() => setModalVisible(true)}>
                <Text
                  style={[styles.btnOutlineText, { color: colors.primary }]}>
                  记录感想 ✍️
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.historyTitle, { color: colors.text }]}>
            🕯️ 本周已读
          </Text>
          <View style={styles.historyList}>
            {[
              '周一 · 罗马书 第3章',
              '周二 · 罗马书 第4章',
              '周三 · 罗马书 第5章',
            ].map((text) => (
              <TouchableOpacity
                key={text}
                style={[styles.historyItem, { backgroundColor: colors.card }]}>
                <Text style={[styles.historyText, { color: colors.text }]}>
                  {text}
                </Text>
                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={colors.text}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Modal */}
        <Modal visible={modalVisible} animationType='fade' transparent>
          <View style={styles.modalBackdrop}>
            <View
              style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                ✍️ 我的灵修笔记
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder='写下你今天的感想吧...'
                placeholderTextColor={colors.border}
                multiline
                value={note}
                onChangeText={setNote}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => setModalVisible(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>
                    关闭
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    { backgroundColor: colors.primary, marginLeft: 10 },
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    setNote('');
                  }}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    保存
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  weekSection: { alignItems: 'center', marginTop: 4 },
  weekTitle: { fontSize: 16, marginBottom: 6 },
  dayRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13 },
  progressContainer: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    marginBottom: 10,
  },
  progressBar: { height: 6, borderRadius: 3 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    padding: 18,
    marginVertical: 12,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateText: { fontSize: 13, marginBottom: 4 },
  titleText: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  verseText: { fontSize: 14, fontStyle: 'italic', marginBottom: 10 },
  divider: { height: 1, marginVertical: 10 },
  bodyText: { fontSize: 15, lineHeight: 24 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  btnPrimary: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 },
  btnPrimaryText: { color: '#fff', fontSize: 15 },
  btnOutline: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  btnOutlineText: { fontSize: 15 },
  historyTitle: { marginTop: 20, fontSize: 16, fontWeight: '500' },
  historyList: { marginTop: 8 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    justifyContent: 'space-between',
  },
  historyText: { fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { width: '85%', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 10 },
  textInput: {
    minHeight: 100,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  modalBtnText: { fontSize: 15 },
});
