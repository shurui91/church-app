// app/gym/my-reservations.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import BackButton from '../components/BackButton';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';

type ReservationStatus = 'pending' | 'checked_in' | 'checked_out' | 'cancelled';

// 预约类型
interface Reservation {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // 分钟
  status: ReservationStatus;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
}

// 日期格式化（用于显示）
const toLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map((value) => Number(value));
  return new Date(year, month - 1, day);
};

// 日期格式化（用于API，YYYY-MM-DD）
const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime24 = (time: string): string => {
  if (!time) return '';
  const [hour, minute] = time.split(':').map((v) => Number(v));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const normalizeReservation = (raw: any): Reservation => ({
  id: raw.id,
  userId: raw.user_id,
  date: raw.date,
  startTime: raw.start_time,
  endTime: raw.end_time,
  duration: raw.duration,
  status: (raw.status as ReservationStatus) || 'pending',
  checkInAt: raw.check_in_at,
  checkOutAt: raw.check_out_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  notes: raw.notes,
});

const sortReservationsChronologically = (list: Reservation[]): Reservation[] => {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
};

export default function MyReservationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { getFontSizeValue } = useFontSize();

  const formatDateDisplay = useCallback(
    (dateString: string): string => {
      const date = toLocalDate(dateString);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekDays = [
        t('gym.weekdaySun'),
        t('gym.weekdayMon'),
        t('gym.weekdayTue'),
        t('gym.weekdayWed'),
        t('gym.weekdayThu'),
        t('gym.weekdayFri'),
        t('gym.weekdaySat'),
      ];
      const weekday = weekDays[date.getDay()];
      return t('gym.dateDisplayWeekday', { month, day, weekday });
    },
    [t]
  );

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 加载我的预约
  const loadReservations = async () => {
    setLoading(true);
    try {
      const response = await api.getMyGymReservations();
      if (response.success) {
        const normalized = response.data.reservations.map(normalizeReservation);
        const sorted = sortReservationsChronologically(normalized);
        setReservations(sorted);
      } else {
        setReservations([]);
      }
    } catch (error: any) {
      console.log('获取预约失败', error.message || error);
      setReservations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && reservations.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, reservations.length]);

  // 下拉刷新
  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  // 签入
  const handleCheckIn = async (reservation: Reservation) => {
    try {
      const response = await api.checkInGymReservation(reservation.id);
      if (response.success) {
        Alert.alert(t('common.success'), response.message || t('gym.checkInSuccess'));
        loadReservations();
      } else {
        throw new Error(response.message || t('gym.checkInFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('gym.checkInFailed'));
    }
  };

  // 签出
  const handleCheckOut = async (reservation: Reservation) => {
    try {
      const response = await api.checkOutGymReservation(reservation.id);
      if (response.success) {
        Alert.alert(t('common.success'), response.message || t('gym.checkOutSuccess'));
        loadReservations();
      } else {
        throw new Error(response.message || t('gym.checkOutFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('gym.checkOutFailed'));
    }
  };

  // 取消预约
  const handleCancel = async (reservation: Reservation) => {
    Alert.alert(
      t('gym.cancelConfirmTitle'),
      t('gym.cancelConfirmMessage', {
        dateDisplay: formatDateDisplay(reservation.date),
        timeRange: `${reservation.startTime}-${reservation.endTime}`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.cancelGymReservation(reservation.id);
              if (response.success) {
                Alert.alert(t('common.success'), response.message || t('gym.reservationCancelledDefault'));
                loadReservations();
              } else {
                throw new Error(response.message || t('gym.cancelReservationFailed'));
              }
            } catch (error: any) {
              // 如果是404错误（API未实现），模拟成功取消
              if (error.status === 404 || error.message?.includes('暂未开放')) {
                Alert.alert(t('common.success'), t('gym.cancelledDemoMode'));
                // 更新本地状态
                setReservations((prev) =>
                  prev.map((r) =>
                    r.id === reservation.id
                      ? { ...r, status: 'cancelled' as const }
                      : r
                  )
                );
              } else {
                Alert.alert(t('common.error'), error.message || t('gym.cancelReservationFailed'));
              }
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // 分离当前预约和历史预约
  const todayKey = formatDate(new Date());
  const upcomingReservations = reservations.filter(
    (r) => (r.status === 'pending' || r.status === 'checked_in') && formatDate(toLocalDate(r.date)) >= todayKey
  );

  const isPastDate = (dateString: string) => formatDate(toLocalDate(dateString)) < todayKey;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: t('gym.myReservationsStatusPending'), color: colors.primary };
      case 'checked_in':
        return { text: t('gym.statusCheckedIn'), color: colors.success || '#4CAF50' };
      case 'checked_out':
        return { text: t('gym.statusCheckedOut'), color: colors.textSecondary };
      case 'cancelled':
        return { text: t('gym.statusCancelled'), color: colors.error };
      default:
        return { text: t('gym.statusUnknown'), color: colors.textSecondary };
    }
  };

  // 检查是否可以签入（预约开始前15分钟）
  const canCheckIn = (reservation: Reservation): boolean => {
    const now = new Date();
    const reservationDateTime = new Date(
      `${reservation.date}T${reservation.startTime}:00`
    );
    const checkInTime = new Date(reservationDateTime);
    checkInTime.setMinutes(checkInTime.getMinutes() - 15); // 提前15分钟

    return now >= checkInTime && reservation.status === 'pending';
  };

  // 检查是否可以签出（已签入状态）
  const canCheckOut = (reservation: Reservation): boolean => {
    return reservation.status === 'checked_in';
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('gym.myReservations'),
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerBackVisible: false,
          headerLeft: () => <BackButton />,
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 65,
              paddingTop: 20,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          {/* 未来预约 */}
          {upcomingReservations.length > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text, fontSize: getFontSizeValue(20) },
                ]}>
                {t('gym.myReservationsUpcoming')}
              </Text>
              {upcomingReservations.map((reservation) => {
                const statusInfo = getStatusInfo(reservation.status);
                const isPast = isPastDate(reservation.date);
                const animatedStyle = {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                };
                return (
                  <Animated.View key={reservation.id} style={animatedStyle}>
                    <View
                      style={[
                        styles.reservationCard,
                        { backgroundColor: isPast ? colors.borderLight : colors.card },
                        isPast && styles.pastCard,
                      ]}>
                      <View style={styles.reservationHeader}>
                        <View style={styles.reservationInfo}>
                          <Text
                            style={[
                              styles.reservationDate,
                              { color: colors.text, fontSize: getFontSizeValue(18) },
                            ]}>
                            {formatDateDisplay(reservation.date)}
                          </Text>
                          <Text
                            style={[
                              styles.reservationTime,
                              { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
                            ]}>
                            {formatTime24(reservation.startTime)} - {formatTime24(reservation.endTime)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusInfo.color + '20' },
                          ]}>
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusInfo.color, fontSize: getFontSizeValue(14) },
                            ]}>
                            {statusInfo.text}
                          </Text>
                        </View>
                      </View>

                      {reservation.checkInAt && (
                        <Text
                          style={[
                            styles.checkInTime,
                            { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                          ]}>
                          {t('gym.checkInTimeLabel')}
                          {new Date(reservation.checkInAt).toLocaleString(
                            i18n.language === 'zh-Hant' ? 'zh-TW' : 'zh-CN'
                          )}
                        </Text>
                      )}

                      <View style={styles.actionArea}>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.checkInButton,
                              styles.largeButton,
                              {
                                backgroundColor: colors.primary,
                                opacity: canCheckIn(reservation) ? 1 : 0.4,
                              },
                            ]}
                            onPress={() => handleCheckIn(reservation)}
                            disabled={!canCheckIn(reservation)}>
                            <Ionicons name="checkmark-circle" size={24} color="#fff" />
                            <Text
                              style={[
                                styles.actionButtonText,
                                { fontSize: getFontSizeValue(16) },
                              ]}>
                              {t('gym.checkInButton')}
                            </Text>
                          </TouchableOpacity>

                          {reservation.status === 'pending' && (
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                styles.cancelButton,
                                styles.largeButton,
                                {
                                  backgroundColor: colors.error + '20',
                                  borderColor: colors.error,
                                },
                              ]}
                              onPress={() => handleCancel(reservation)}>
                              <Ionicons name="close-circle" size={20} color={colors.error} />
                              <Text
                                style={[
                                  styles.actionButtonText,
                                  { color: colors.error, fontSize: getFontSizeValue(16) },
                                ]}>
                                {t('gym.cancelReservationButton')}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {canCheckOut(reservation) && (
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                styles.checkOutButton,
                                styles.largeButton,
                                { backgroundColor: colors.success || '#4CAF50' },
                              ]}
                              onPress={() => handleCheckOut(reservation)}>
                              <Ionicons name="log-out" size={20} color="#fff" />
                              <Text
                                style={[
                                  styles.actionButtonText,
                                  { fontSize: getFontSizeValue(16) },
                                ]}>
                                {t('gym.checkOutButton')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {!canCheckIn(reservation) && reservation.status === 'pending' && (
                          <Text
                            style={[
                              styles.hintText,
                              { color: colors.textSecondary, fontSize: getFontSizeValue(12) },
                            ]}>
                            {t('gym.checkInWindowHint')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* 空状态 */}
          {!loading && upcomingReservations.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={colors.textTertiary} />
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.textSecondary, fontSize: getFontSizeValue(18) },
                ]}>
                {t('gym.emptyNoUpcoming')}
              </Text>
              <Text
                style={[
                  styles.emptySubText,
                  { color: colors.textTertiary, fontSize: getFontSizeValue(14) },
                ]}>
                {t('gym.emptyHintGoBook')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.back()}>
                <Text
                  style={[
                    styles.createButtonText,
                    { fontSize: getFontSizeValue(16) },
                  ]}>
                  {t('gym.goBookButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  reservationCard: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  pastCard: {
    borderColor: 'rgba(0,0,0,0.12)',
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reservationInfo: {
    flex: 1,
  },
  reservationDate: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  reservationTime: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkInTime: {
    fontSize: 14,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    flex: 1,
  },
  checkInButton: {},
  checkOutButton: {},
  cancelButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
  },
  actionArea: {
    width: '100%',
  },
  largeButton: {
    minHeight: 54,
    width: '100%',
    borderRadius: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  emptySubText: {
    fontSize: 14,
    marginBottom: 16,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

