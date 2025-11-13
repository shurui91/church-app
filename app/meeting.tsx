// app/meeting.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';

import meetingsZh from './src/data/zh/meetings.json';
import meetingsZhHant from './src/data/zh-Hant/meetings.json';

export default function MeetingScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const [modalVisible, setModalVisible] = useState(false);
  const [copiedMeeting, setCopiedMeeting] = useState<any>(null);

  // 根据当前语言加载对应会议数据
  const zoomMeetings = useMemo(() => {
    return i18n.resolvedLanguage === 'zh-Hant' ? meetingsZhHant : meetingsZh;
  }, [i18n.resolvedLanguage]);

  // 复制所有会议信息
  const copyAllMeetingInfo = async (meeting: any) => {
    try {
      const meetingInfo = [
        `${t('meeting.pageTitle')}: ${meeting.title}`,
        `${t('meeting.id') || 'ID'}: ${meeting.meetingId}`,
        `${t('meeting.password') || '密码'}: ${meeting.password}`,
        `${t('meeting.link') || '链接'}: ${meeting.link}`,
      ].join('\n');

      await Clipboard.setStringAsync(meetingInfo);
      setCopiedMeeting(meeting);
      setModalVisible(true);

      setTimeout(() => setModalVisible(false), 2000);
    } catch (error) {
      Alert.alert(t('meeting.copyFail'), t('meeting.retry'));
    }
  };

  // 打开 Zoom 会议
  const openZoomMeeting = async (meeting: any) => {
    try {
      const zoomUrl = `zoomus://zoom.us/join?action=join&confno=${meeting.meetingId.replace(
        /\s/g,
        ''
      )}&pwd=${meeting.password}`;

      const canOpen = await Linking.canOpenURL(zoomUrl);

      if (canOpen) {
        await Linking.openURL(zoomUrl);
      } else {
        await Linking.openURL(meeting.link);
      }
    } catch (error) {
      Alert.alert(t('meeting.openFail'), t('meeting.openFailTip'), [
        {
          text: t('meeting.copyLink'),
          onPress: () => Clipboard.setStringAsync(meeting.link),
        },
        { text: t('meeting.ok'), style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('meeting.pageTitle'),
          headerShown: false,
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: getFontSizeValue(18),
          },
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 页面标题 */}
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(20),
                lineHeight: getFontSizeValue(28),
              },
            ]}>
            {t('meeting.onlineTitle')}
          </Text>

          {/* 段落说明 */}
          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(20),
                lineHeight: getFontSizeValue(30),
                marginBottom: getFontSizeValue(30),
              },
            ]}>
            {t('meeting.welcome')}
          </Text>

          {/* Zoom会议列表 */}
          {zoomMeetings.map((meeting, index) => (
            <View
              key={meeting.id}
              style={[
                styles.meetingCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  marginBottom:
                    index === zoomMeetings.length - 1
                      ? 0
                      : getFontSizeValue(18),
                },
              ]}>
              <Text
                style={[
                  styles.meetingTitle,
                  {
                    color: colors.text,
                    fontSize: getFontSizeValue(20),
                  },
                ]}>
                {meeting.title}
              </Text>

              {/* 时间 */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='time-outline'
                  size={getFontSizeValue(20)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(18),
                    },
                  ]}>
                  {meeting.time}
                </Text>
              </View>

              {/* ID */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='key-outline'
                  size={getFontSizeValue(20)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(18),
                    },
                  ]}>
                  {t('meeting.idLabel')}: {meeting.meetingId}
                </Text>
              </View>

              {/* 密码 */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='lock-closed-outline'
                  size={getFontSizeValue(20)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(18),
                    },
                  ]}>
                  {t('meeting.passwordLabel') || '密码'}: {meeting.password}
                </Text>
              </View>

              {/* 特别说明 */}
              {meeting.special && (
                <View
                  style={[
                    styles.specialContainer,
                    { backgroundColor: colors.primary + '20' },
                  ]}>
                  <Ionicons
                    name='star'
                    size={getFontSizeValue(18)}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.specialText,
                      { color: colors.primary, fontSize: getFontSizeValue(16) },
                    ]}>
                    {meeting.special}
                  </Text>
                </View>
              )}

              {/* 按钮 */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  onPress={() => copyAllMeetingInfo(meeting)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary + '20' },
                  ]}>
                  <Ionicons
                    name='copy-outline'
                    size={getFontSizeValue(20)}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: colors.primary, fontSize: getFontSizeValue(18) },
                    ]}>
                    {t('meeting.copyInfo')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openZoomMeeting(meeting)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary },
                  ]}>
                  <Ionicons
                    name='videocam-outline'
                    size={getFontSizeValue(20)}
                    color='#FFFFFF'
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: '#FFFFFF', fontSize: getFontSizeValue(14) },
                    ]}>
                    {t('meeting.joinMeeting')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 复制成功模态框 */}
      <Modal
        animationType='fade'
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Ionicons
              name='checkmark-circle'
              size={getFontSizeValue(48)}
              color={colors.primary}
            />
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontSize: getFontSizeValue(18) },
              ]}>
              {t('meeting.copiedSuccess')}
            </Text>
            <Text
              style={[
                styles.modalText,
                { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
              ]}>
              {t('meeting.copiedInfo', { title: copiedMeeting?.title })}
            </Text>
            <Text
              style={[
                styles.modalSubText,
                { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
              ]}>
              {t('meeting.copiedDetail')}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  paragraph: { marginBottom: 12, textAlign: 'center' },
  meetingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  meetingTitle: { fontWeight: 'bold', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoText: { marginLeft: 8, marginRight: 12, flex: 1 },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: { fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: { textAlign: 'center', marginBottom: 8 },
  modalSubText: { textAlign: 'center' },
  specialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  specialText: { fontWeight: '700' },
});
