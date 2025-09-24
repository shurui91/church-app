// app/meeting.tsx
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
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// Zoom聚会数据
const zoomMeetings = [
  {
    id: 1,
    title: '主日聚会',
    time: '每主日上午 10:00am - 12:15pm',
    meetingId: '865 7676 6857',
    password: '603550',
    link: 'https://us02web.zoom.us/j/86576766857?pwd=bXFRSW4wR3grQlFibDB1Ry9lVkZ0Zz09',
  },
  {
    id: 2,
    title: '李常受文集聚会',
    time: '每主日下午 4:00 - 5:00pm',
    meetingId: '865 7676 6857',
    password: '603550',
    link: 'https://us02web.zoom.us/j/86576766857?pwd=bXFRSW4wR3grQlFibDB1Ry9lVkZ0Zz09',
  },
];

export default function MeetingScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const [modalVisible, setModalVisible] = useState(false);
  const [copiedMeeting, setCopiedMeeting] = useState<any>(null);

  // 复制所有会议信息到剪贴板
  const copyAllMeetingInfo = async (meeting: any) => {
    try {
      const meetingInfo = `会议标题: ${meeting.title}
会议ID: ${meeting.meetingId}
会议密码: ${meeting.password}
会议链接: ${meeting.link}`;

      await Clipboard.setStringAsync(meetingInfo);
      setCopiedMeeting(meeting);
      setModalVisible(true);

      // 2秒后自动关闭模态框
      setTimeout(() => {
        setModalVisible(false);
      }, 2000);
    } catch (error) {
      Alert.alert('复制失败', '请重试');
    }
  };

  // 打开 Zoom 会议
  const openZoomMeeting = async (meeting: any) => {
    try {
      // 尝试直接打开 Zoom App
      const zoomUrl = `zoomus://zoom.us/join?action=join&confno=${meeting.meetingId.replace(
        /\s/g,
        ''
      )}&pwd=${meeting.password}`;

      // 检查是否可以打开 Zoom App
      const canOpen = await Linking.canOpenURL(zoomUrl);

      if (canOpen) {
        await Linking.openURL(zoomUrl);
      } else {
        // 如果 Zoom App 未安装，打开网页版 Zoom
        await Linking.openURL(meeting.link);
      }
    } catch (error) {
      Alert.alert(
        '打开会议失败',
        '请确保已安装 Zoom App 或使用网页版参加聚会',
        [
          {
            text: '复制链接',
            onPress: () => Clipboard.setStringAsync(meeting.link),
          },
          { text: '确定', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '聚会',
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
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: getFontSizeValue(24),
                lineHeight: getFontSizeValue(24) * 1.4,
              },
            ]}>
            聚会活动 🎉
          </Text>

          <Text
            style={[
              styles.paragraph,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(16),
                lineHeight: getFontSizeValue(16) * 1.5,
                marginBottom: getFontSizeValue(24),
              },
            ]}>
            欢迎参加我们的聚会活动！以下是近期的Zoom会议信息。
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
                      : getFontSizeValue(16),
                },
              ]}>
              {/* 会议标题 */}
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

              {/* 会议时间 */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='time-outline'
                  size={getFontSizeValue(16)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(14),
                    },
                  ]}>
                  {meeting.time}
                </Text>
              </View>

              {/* 会议ID */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='key-outline'
                  size={getFontSizeValue(16)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(14),
                    },
                  ]}>
                  会议ID: {meeting.meetingId}
                </Text>
              </View>

              {/* 密码 */}
              <View style={styles.infoRow}>
                <Ionicons
                  name='lock-closed-outline'
                  size={getFontSizeValue(16)}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.infoText,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(14),
                    },
                  ]}>
                  密码: {meeting.password}
                </Text>
              </View>

              {/* 按钮容器 */}
              <View style={styles.buttonsContainer}>
                {/* 一键复制按钮 */}
                <TouchableOpacity
                  onPress={() => copyAllMeetingInfo(meeting)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary + '20' },
                  ]}>
                  <Ionicons
                    name='copy-outline'
                    size={getFontSizeValue(16)}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: colors.primary, fontSize: getFontSizeValue(14) },
                    ]}>
                    复制信息
                  </Text>
                </TouchableOpacity>

                {/* 前往聚会按钮 */}
                <TouchableOpacity
                  onPress={() => openZoomMeeting(meeting)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary },
                  ]}>
                  <Ionicons
                    name='videocam-outline'
                    size={getFontSizeValue(16)}
                    color='#FFFFFF'
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: '#FFFFFF', fontSize: getFontSizeValue(14) },
                    ]}>
                    前往聚会
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
        transparent={true}
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
              复制成功！
            </Text>
            <Text
              style={[
                styles.modalText,
                { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
              ]}>
              {copiedMeeting?.title} 的会议信息已复制到剪贴板
            </Text>
            <Text
              style={[
                styles.modalSubText,
                { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
              ]}>
              ID、密码和链接都已准备好分享
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40, // 增加底部内边距确保内容不被遮挡
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'center',
  },
  meetingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  meetingTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoText: {
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
  },
  // 按钮容器
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
  actionButtonText: {
    fontWeight: '600',
  },
  // 模态框样式
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubText: {
    textAlign: 'center',
  },
});
