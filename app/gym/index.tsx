// app/gym/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useAuth } from '../src/context/AuthContext';
import BackButton from '../components/BackButton';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';

// 时间段类型
const HALF_HOUR = 30;
const OPENING_MINUTES = 7 * 60;
const CLOSING_MINUTES = 22 * 60;

interface TimeSlot {
  id: number;
  startTime: string; // HH:mm 格式，如 "09:00"
  endTime: string; // HH:mm 格式，如 "10:00"
  duration: number; // 时长（分钟），如 60
  isAvailable: boolean; // 是否可用
  isReserved: boolean; // 是否已被预约
  reservedBy?: {
    id: number;
    name: string;
    phoneNumber: string;
  };
}

// 日期格式化函数
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取月份的天数
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// 获取月份第一天是星期几（0=周日, 1=周一, ...）
const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

export default function GymScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { getFontSizeValue } = useFontSize();
  const { user } = useAuth();

  // 状态管理
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [duration, setDuration] = useState(60); // 默认1小时
  const [notes, setNotes] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date());

  // 计算日历天数
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);

    const days: { date: Date; isCurrentMonth: boolean; dateString: string }[] = [];

    // 添加上个月的日期
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        dateString: formatDate(date),
      });
    }

    // 添加当月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        dateString: formatDate(date),
      });
    }

    // 添加下个月的日期以填满网格
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        dateString: formatDate(date),
      });
    }

    return days;
  }, [currentMonth]);

  // 检查日期是否可选（今天起30天内）
  const isDateSelectable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30); // 最多提前30天

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= today && checkDate <= maxDate;
  };

  // 加载时间段
  const loadTimeSlots = useCallback(async (date: Date) => {
    if (!isDateSelectable(date)) {
      setTimeSlots([]);
      return;
    }

    setLoadingSlots(true);
    try {
      const dateString = formatDate(date);
      const response = await api.getGymTimeSlots(dateString);
      if (response.success && response.data.timeSlots.length > 0) {
        const normalizedSlots = response.data.timeSlots.map((slot) => ({
          ...slot,
          isReserved: false,
          reservedBy: undefined,
        }));
        setTimeSlots(normalizedSlots);
      } else {
        // 如果API返回空或失败，使用模拟数据展示UI效果
        const mockSlots: TimeSlot[] = [];
        for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += HALF_HOUR) {
          const startHour = Math.floor(minutes / 60);
          const startMinute = minutes % 60;
          const endMinutes = minutes + HALF_HOUR;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          mockSlots.push({
            id: minutes,
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
            duration: HALF_HOUR,
            isAvailable: true,
            isReserved: false,
          });
        }
        setTimeSlots(mockSlots);
      }
    } catch (error: any) {
      console.log('使用模拟数据展示UI效果', error);
      // 使用模拟数据
      const mockSlots: TimeSlot[] = [];
        for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += HALF_HOUR) {
          const startHour = Math.floor(minutes / 60);
          const startMinute = minutes % 60;
          const endMinutes = minutes + HALF_HOUR;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          mockSlots.push({
            id: minutes,
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
            duration: HALF_HOUR,
            isAvailable: true,
            isReserved: false,
          });
        }
      setTimeSlots(mockSlots);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // 选择日期
  const handleDateSelect = (date: Date) => {
    if (!isDateSelectable(date)) {
      return;
    }
    setSelectedDate(date);
    loadTimeSlots(date);
  };

  // 切换月份
  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // 选择时间段并打开预约模态框
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable || slot.isReserved) {
      return;
    }

    if (!selectedDate) {
      Alert.alert('提示', '请先选择日期');
      return;
    }

    console.log('[Gym] Time slot tapped', { slot, selectedDate });

    setSelectedSlot(slot);
    setDuration(60); // 重置为默认1小时
    setNotes(''); // 清空备注
    setShowReservationModal(true);
  };

  // 创建预约
  const handleCreateReservation = async () => {
    if (!selectedSlot || !selectedDate) {
      return;
    }

    // 计算结束时间
    const [startHour, startMinute] = selectedSlot.startTime.split(':').map(Number);
    const endTime = new Date(selectedDate);
    endTime.setHours(startHour, startMinute + duration, 0, 0);
    const endTimeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

    try {
      const response = await api.createGymReservation({
        date: formatDate(selectedDate),
        startTime: selectedSlot.startTime,
        endTime: endTimeString,
        duration,
        notes: notes.trim() || undefined,
      });
      
      if (response.success) {
        Alert.alert('成功', response.message || '预约已创建');
        setShowReservationModal(false);
        // 重新加载时间段
        if (selectedDate) {
          loadTimeSlots(selectedDate);
        }
      } else {
        throw new Error(response.message || '创建预约失败');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '创建预约失败');
    }
  };

  // 时长选项（60分钟、90分钟、120分钟）
  const durationOptions = [60, 90, 120];

  // 初始化：选择今天
  useEffect(() => {
    const today = new Date();
    if (isDateSelectable(today)) {
      setSelectedDate(today);
      loadTimeSlots(today);
    }
  }, [loadTimeSlots]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = formatDate(currentTimestamp);
  const currentMinutes = currentTimestamp.getHours() * 60 + currentTimestamp.getMinutes();
  const isSelectedDateToday = selectedDate ? formatDate(selectedDate) === todayKey : false;

  // 获取月份名称
  const getMonthName = (date: Date): string => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('gym.title') || '体育馆',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/gym/my-reservations')}
              style={{ marginRight: 16 }}>
              <Ionicons name="list-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.demoNotice, { backgroundColor: colors.primary + '15' }]}>
        <Text
          style={[
            styles.demoNoticeText,
            { color: colors.primary, fontWeight: '700' },
          ]}>
          此功能仅作演示使用
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 65,
            paddingTop: 20,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* 场馆信息 */}
        <View style={[styles.gymInfoCard, { backgroundColor: colors.card }]}>
          <View style={styles.gymInfoHeader}>
            <Ionicons name="basketball-outline" size={32} color={colors.primary} />
            <Text
              style={[
                styles.gymName,
                { color: colors.text, fontSize: getFontSizeValue(22) },
              ]}>
              体育馆
            </Text>
          </View>
          <Text
            style={[
              styles.gymDescription,
              { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
            ]}>
            开放时间：7:00 - 22:00
          </Text>
        </View>

        {/* 日历选择器 */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          {/* 月份导航 */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => changeMonth('prev')}
              style={styles.monthButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={[
                styles.monthText,
                { color: colors.text, fontSize: getFontSizeValue(20) },
              ]}>
              {getMonthName(currentMonth)}
            </Text>
            <TouchableOpacity
              onPress={() => changeMonth('next')}
              style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* 星期标题 */}
          <View style={styles.weekDaysRow}>
            {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
              <View key={index} style={styles.weekDayCell}>
                <Text
                  style={[
                    styles.weekDayText,
                    { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                  ]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* 日期网格 */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const isSelectable = isDateSelectable(day.date);
              const isSelected =
                selectedDate &&
                formatDate(selectedDate) === day.dateString;
              const isToday =
                formatDate(new Date()) === day.dateString;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCell,
                    !day.isCurrentMonth && styles.dateCellOtherMonth,
                    !isSelectable && styles.dateCellDisabled,
                    isSelected && {
                      backgroundColor: colors.primary,
                    },
                    isToday && !isSelected && {
                      borderWidth: 2,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleDateSelect(day.date)}
                  disabled={!isSelectable}>
                  <Text
                    style={[
                      styles.dateText,
                      {
                        color: !day.isCurrentMonth
                          ? colors.textTertiary
                          : !isSelectable
                          ? colors.textTertiary
                          : isSelected
                          ? '#fff'
                          : colors.text,
                        fontSize: getFontSizeValue(16),
                      },
                    ]}>
                    {day.date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 时间段列表 */}
        {selectedDate && (
          <View style={[styles.timeSlotsCard, { backgroundColor: colors.card }]}>
            <View style={styles.timeSlotsHeader}>
              <Text
                style={[
                  styles.timeSlotsTitle,
                  { color: colors.text, fontSize: getFontSizeValue(20) },
                ]}>
                {formatDate(selectedDate)} 可用开始时间
              </Text>
              <Text
                style={[
                  styles.timeSlotsHint,
                  { color: colors.textSecondary, fontSize: getFontSizeValue(13) },
                ]}>
                选择开始时间后，可选择60分钟-2小时
              </Text>
            </View>

            {loadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : timeSlots.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
                ]}>
                该日期没有可用时间段
              </Text>
            ) : (
              <View style={styles.timeSlotsGrid}>
        {timeSlots.map((slot) => {
          const slotMinutes =
            parseInt(slot.startTime.split(':')[0], 10) * 60 +
            parseInt(slot.startTime.split(':')[1], 10);
          const isPastSlot = isSelectedDateToday && slotMinutes < currentMinutes;
          const disabled = !slot.isAvailable || slot.isReserved || isPastSlot;
          const backgroundColor = isPastSlot
            ? colors.borderLight
            : slot.isReserved
            ? colors.error + '15'
            : slot.isAvailable
            ? colors.primary + '10'
            : colors.borderLight;
          const borderColor = isPastSlot
            ? colors.borderLight
            : slot.isReserved
            ? colors.error
            : slot.isAvailable
            ? colors.primary
            : colors.borderLight;
          const textColor = isPastSlot
            ? colors.textTertiary
            : slot.isReserved
            ? colors.error
            : slot.isAvailable
            ? colors.primary
            : colors.textSecondary;

          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.timeSlotGridItem,
                {
                  backgroundColor,
                  borderColor,
                },
              ]}
              onPress={() => handleTimeSlotSelect(slot)}
              disabled={disabled}>
              <Text
                style={[
                  styles.timeSlotGridTime,
                  {
                    color: textColor,
                    fontSize: getFontSizeValue(18),
                    fontWeight: '600',
                  },
                ]}>
                {slot.startTime}
              </Text>
              {isPastSlot ? (
                <Text
                  style={[
                    styles.timeSlotGridHint,
                    { color: colors.textTertiary, fontSize: getFontSizeValue(11) },
                  ]}>
                  {t('gym.pastTimeSlot') || '已过'}
                </Text>
              ) : slot.isReserved ? (
                <Text
                  style={[
                    styles.timeSlotGridStatus,
                    { color: colors.error, fontSize: getFontSizeValue(11) },
                  ]}>
                  已约
                </Text>
              ) : (
                <Text
                  style={[
                    styles.timeSlotGridHint,
                    { color: colors.textTertiary, fontSize: getFontSizeValue(11) },
                  ]}>
                  可选
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 创建预约模态框 */}
      <Modal
        visible={showReservationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReservationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text, fontSize: getFontSizeValue(20) },
                ]}>
                创建预约
              </Text>
              <TouchableOpacity
                onPress={() => setShowReservationModal(false)}
                style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedSlot && selectedDate && (
              <>
                <View style={styles.modalInfo}>
                  <Text
                    style={[
                      styles.modalInfoText,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    日期：{formatDate(selectedDate)}
                  </Text>
                  <Text
                    style={[
                      styles.modalInfoText,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    开始时间：{selectedSlot.startTime}
                  </Text>
                </View>

                {/* 时长选择 */}
                <View style={styles.durationSection}>
                  <Text
                    style={[
                      styles.durationLabel,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    预约时长
                  </Text>
                  <View style={styles.durationOptions}>
                    {durationOptions.map((dur) => {
                      const [endHour, endMinute] = selectedSlot.startTime
                        .split(':')
                        .map(Number);
                      const endTime = new Date(selectedDate);
                      endTime.setHours(endHour, endMinute + dur, 0, 0);
                      const endTimeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

                      // 检查是否超出22:00
                      const isDisabled = endTime.getHours() > 22 || 
                        (endTime.getHours() === 22 && endTime.getMinutes() > 0);

                      return (
                        <TouchableOpacity
                          key={dur}
                          style={[
                            styles.durationOption,
                            {
                              backgroundColor:
                                duration === dur
                                  ? colors.primary
                                  : colors.background,
                              borderColor:
                                duration === dur ? colors.primary : colors.borderLight,
                            },
                            isDisabled && styles.durationOptionDisabled,
                          ]}
                          onPress={() => !isDisabled && setDuration(dur)}
                          disabled={isDisabled}>
                          <Text
                            style={[
                              styles.durationOptionText,
                              {
                                color:
                                  duration === dur
                                    ? '#fff'
                                    : isDisabled
                                    ? colors.textTertiary
                                    : colors.text,
                                fontSize: getFontSizeValue(16),
                              },
                            ]}>
                            {dur}分钟
                          </Text>
                          {!isDisabled && (
                            <Text
                              style={[
                                styles.durationOptionTime,
                                {
                                  color:
                                    duration === dur
                                      ? '#fff'
                                      : colors.textSecondary,
                                  fontSize: getFontSizeValue(12),
                                },
                              ]}>
                              {selectedSlot.startTime} - {endTimeString}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 备注 */}
                <View style={styles.notesSection}>
                  <Text
                    style={[
                      styles.notesLabel,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    备注（可选）
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderColor: colors.borderLight,
                        fontSize: getFontSizeValue(16),
                      },
                    ]}
                    placeholder="请输入备注信息"
                    placeholderTextColor={colors.textTertiary}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* 预约人信息 */}
                <View style={styles.personSection}>
                  <Text
                    style={[
                      styles.personLabel,
                      { color: colors.text, fontSize: getFontSizeValue(14) },
                    ]}>
                    {t('gym.firstAppointmentPersonLabel') || '预约人'}
                  </Text>
                  <Text
                    style={[
                      styles.personValue,
                      { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
                    ]}>
                    {user?.nameZh || user?.nameEn || user?.name || user?.phoneNumber || '当前用户'}
                  </Text>
                  {(user?.district || user?.groupNum) && (
                    <View style={styles.personMeta}>
                      {user?.district && (
                        <Text
                          style={[
                            styles.personMetaText,
                            { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
                          ]}>
                          大区：{user.district}
                        </Text>
                      )}
                      {user?.groupNum && (
                        <Text
                          style={[
                            styles.personMetaText,
                            { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
                          ]}>
                          小排：{user.groupNum}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* 确认按钮 */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCreateReservation}>
                  <Text
                    style={[
                      styles.confirmButtonText,
                      { fontSize: getFontSizeValue(18) },
                    ]}>
                    确认预约
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    gap: 16,
  },
  gymInfoCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  gymInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gymName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  gymDescription: {
    fontSize: 16,
    marginTop: 4,
  },
  calendarCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginTop: 2,
  },
  dateCellOtherMonth: {
    opacity: 0.3,
  },
  dateCellDisabled: {
    opacity: 0.3,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeSlotsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeSlotsHeader: {
    marginBottom: 16,
  },
  timeSlotsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  timeSlotsHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlotGridItem: {
    width: '22%', // 每行4个，留出gap空间
    minWidth: 70,
    aspectRatio: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timeSlotGridTime: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeSlotGridStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeSlotGridHint: {
    fontSize: 11,
  },
  demoNotice: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFC107',
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  demoNoticeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalInfoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  durationSection: {
    marginBottom: 20,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  durationOptions: {
    gap: 12,
  },
  durationOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  durationOptionDisabled: {
    opacity: 0.5,
  },
  durationOptionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  durationOptionTime: {
    fontSize: 12,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  personSection: {
    marginBottom: 16,
  },
  personLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  personValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  personMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  personMetaText: {
    fontSize: 12,
  },
});

