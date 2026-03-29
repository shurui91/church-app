// app/gym/my-reservations.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Modal,
  Pressable,
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

type ReservationStatus = 'pending' | 'checked_in' | 'checked_out' | 'cancelled';

/** 列表项（含列表接口返回的简要姓名） */
interface Reservation {
  id: number;
  userId: number;
  helperUserId?: number | null;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: ReservationStatus;
  checkInAt?: string;
  checkOutAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
  userNameZh?: string | null;
  helperNameZh?: string | null;
  primary_checked_in_at?: string | null;
  helper_checked_in_at?: string | null;
}

/** GET /api/gym/reservations/:id 返回结构（蛇形字段） */
interface ReservationDetailPayload {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  user_id?: number | null;
  helper_user_id?: number | null;
  notes?: string | null;
  check_in_at?: string;
  check_out_at?: string;
  created_at?: string;
  primary_namezh?: string;
  primary_nametw?: string;
  primary_nameen?: string;
  primary_name?: string;
  primary_phonenumber?: string;
  primary_district?: string;
  primary_groupnum?: string;
  helper_namezh?: string;
  helper_nametw?: string;
  helper_nameen?: string;
  helper_name?: string;
  helper_phonenumber?: string;
  helper_district?: string;
  helper_groupnum?: string;
  primary_checked_in_at?: string | null;
  helper_checked_in_at?: string | null;
  primary_checked_out_at?: string | null;
  helper_checked_out_at?: string | null;
}

const toLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map((value) => Number(value));
  return new Date(year, month - 1, day);
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
  helperUserId: raw.helper_user_id ?? null,
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
  userNameZh: raw.user_name ?? null,
  helperNameZh: raw.helper_name ?? null,
  primary_checked_in_at: raw.primary_checked_in_at,
  helper_checked_in_at: raw.helper_checked_in_at,
});

const sortReservationsChronologically = (list: Reservation[]): Reservation[] => {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.startTime.localeCompare(b.startTime);
  });
};

const sortHistoryNewestFirst = (list: Reservation[]): Reservation[] => {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.startTime.localeCompare(a.startTime);
  });
};

function pickLocalizedName(
  detail: ReservationDetailPayload | null,
  role: 'primary' | 'helper',
  lang: string,
  fallbackList?: Reservation
): string {
  const zh = role === 'primary' ? detail?.primary_namezh : detail?.helper_namezh;
  const tw = role === 'primary' ? detail?.primary_nametw : detail?.helper_nametw;
  const en = role === 'primary' ? detail?.primary_nameen : detail?.helper_nameen;
  const plain = role === 'primary' ? detail?.primary_name : detail?.helper_name;
  if (lang === 'zh-Hant' && tw) return tw;
  if (zh) return zh;
  if (lang.startsWith('zh') && tw) return tw;
  if (en) return en;
  if (plain) return plain;
  if (fallbackList) {
    const fb = role === 'primary' ? fallbackList.userNameZh : fallbackList.helperNameZh;
    if (fb) return fb;
  }
  return '';
}

export default function MyReservationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { getFontSizeValue } = useFontSize();
  const { user } = useAuth();

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

  const localeTag = i18n.language === 'zh-Hant' ? 'zh-TW' : 'zh-CN';

  const formatIsoLocal = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString(localeTag);
    } catch {
      return iso;
    }
  };

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [checkPrompt, setCheckPrompt] = useState<{
    type: 'checkIn' | 'checkOut' | null;
    reservation: Reservation | null;
  }>({ type: null, reservation: null });
  const [checkAnswers, setCheckAnswers] = useState<{ clean: 'yes' | 'no'; equipment: 'yes' | 'no' }>({
    clean: 'yes',
    equipment: 'yes',
  });

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedForDetail, setSelectedForDetail] = useState<Reservation | null>(null);
  const [detailFull, setDetailFull] = useState<ReservationDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const refetchDetailIfOpen = async (reservationId: number) => {
    if (!detailModalVisible || selectedForDetail?.id !== reservationId) return;
    try {
      const res = await api.getGymReservationById(reservationId);
      if (res.success && res.data?.reservation) {
        setDetailFull(res.data.reservation as ReservationDetailPayload);
      }
    } catch {
      // ignore
    }
  };

  const openDetail = async (r: Reservation) => {
    setSelectedForDetail(r);
    setDetailFull(null);
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await api.getGymReservationById(r.id);
      if (res.success && res.data?.reservation) {
        setDetailFull(res.data.reservation as ReservationDetailPayload);
      }
    } catch (e) {
      console.log('加载预约详情失败', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailModalVisible(false);
    setSelectedForDetail(null);
    setDetailFull(null);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const mergeReservationFromApi = (raw: any) => {
    const merged = normalizeReservation(raw);
    setReservations((prev) =>
      sortReservationsChronologically(prev.map((r) => (r.id === merged.id ? merged : r)))
    );
    setSelectedForDetail((sel) => (sel?.id === merged.id ? merged : sel));
    setDetailFull((d) => {
      if (!d || d.id !== merged.id) return d;
      return { ...d, ...raw } as ReservationDetailPayload;
    });
  };

  const handleCheckIn = async (reservation: Reservation) => {
    try {
      const response = await api.checkInGymReservation(reservation.id);
      if (response.success) {
        Alert.alert(t('common.success'), response.message || t('gym.checkInSuccess'));
        if (response.data?.reservation) {
          mergeReservationFromApi(response.data.reservation);
        }
        await loadReservations();
        await refetchDetailIfOpen(reservation.id);
      } else {
        throw new Error(response.message || t('gym.checkInFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('gym.checkInFailed'));
    }
  };

  const handleCheckOut = async (reservation: Reservation) => {
    try {
      const response = await api.checkOutGymReservation(reservation.id);
      if (response.success) {
        Alert.alert(t('common.success'), response.message || t('gym.checkOutSuccess'));
        if (response.data?.reservation) {
          mergeReservationFromApi(response.data.reservation);
        }
        await loadReservations();
        await refetchDetailIfOpen(reservation.id);
      } else {
        throw new Error(response.message || t('gym.checkOutFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('gym.checkOutFailed'));
    }
  };

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
                await loadReservations();
                await refetchDetailIfOpen(reservation.id);
              } else {
                throw new Error(response.message || t('gym.cancelReservationFailed'));
              }
            } catch (error: any) {
              if (error.status === 404 || error.message?.includes('暂未开放')) {
                Alert.alert(t('common.success'), t('gym.cancelledDemoMode'));
                setReservations((prev) =>
                  prev.map((r) =>
                    r.id === reservation.id ? { ...r, status: 'cancelled' as const } : r
                  )
                );
                await refetchDetailIfOpen(reservation.id);
              } else {
                Alert.alert(t('common.error'), error.message || t('gym.cancelReservationFailed'));
              }
            }
          },
        },
      ]
    );
  };

  /** 详情接口（蛇形字段）优先，避免弹窗内仍用打开时的列表快照导致「已签到」不更新 */
  const getSignedInCount = (
    reservation: Reservation,
    detailOverride?: ReservationDetailPayload | null
  ) => {
    const primary = detailOverride?.primary_checked_in_at ?? reservation.primary_checked_in_at;
    const helper = detailOverride?.helper_checked_in_at ?? reservation.helper_checked_in_at;
    return Number(!!primary) + Number(!!helper);
  };

  const openCheckPrompt = (reservation: Reservation, type: 'checkIn' | 'checkOut') => {
    setCheckPrompt({ type, reservation });
    setCheckAnswers({ clean: 'yes', equipment: 'yes' });
  };
  const closeCheckPrompt = () => {
    setCheckPrompt({ type: null, reservation: null });
  };
  const confirmCheckPrompt = async () => {
    if (!checkPrompt.type || !checkPrompt.reservation) return;
    const { type, reservation } = checkPrompt;
    closeCheckPrompt();
    console.log('[Gym] check prompt answers', { type, answers: checkAnswers });
    if (type === 'checkIn') {
      await handleCheckIn(reservation);
    } else {
      await handleCheckOut(reservation);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const todayKey = formatDate(new Date());

  const isUpcomingReservation = useCallback(
    (r: Reservation) =>
      (r.status === 'pending' || r.status === 'checked_in') &&
      formatDate(toLocalDate(r.date)) >= todayKey,
    [todayKey]
  );

  const { upcomingReservations, historyReservations } = useMemo(() => {
    const upcoming = reservations.filter(isUpcomingReservation);
    const history = sortHistoryNewestFirst(reservations.filter((r) => !isUpcomingReservation(r)));
    return { upcomingReservations: upcoming, historyReservations: history };
  }, [reservations, isUpcomingReservation]);

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

  const canCheckIn = (reservation: Reservation): boolean => {
    return reservation.status === 'pending';
  };

  const canCheckOut = (reservation: Reservation): boolean => {
    return reservation.status === 'checked_in';
  };

  const detailSource = detailFull;
  const detailStatus = detailSource?.status ?? selectedForDetail?.status;
  const statusInfoDetail = detailStatus ? getStatusInfo(detailStatus) : null;

  const myRoleLabel = useMemo(() => {
    if (!user?.id || !selectedForDetail) return '';
    if (selectedForDetail.userId === user.id) return t('gym.myRolePrimary');
    if (selectedForDetail.helperUserId != null && selectedForDetail.helperUserId === user.id) {
      return t('gym.myRoleHelper');
    }
    return '';
  }, [user?.id, selectedForDetail, t]);

  /** 详情弹层内：历史预约不可签入、取消（与列表一致）；仍使用中时可签出 */
  const detailHistoryLocksSignInCancel =
    selectedForDetail != null && !isUpcomingReservation(selectedForDetail);

  const renderPersonBlock = (
    role: 'primary' | 'helper',
    detail: ReservationDetailPayload | null,
    listFallback: Reservation
  ) => {
    const name = pickLocalizedName(detail, role, i18n.language, listFallback);
    const phone =
      role === 'primary' ? detail?.primary_phonenumber : detail?.helper_phonenumber;
    const district = role === 'primary' ? detail?.primary_district : detail?.helper_district;
    const groupNum = role === 'primary' ? detail?.primary_groupnum : detail?.helper_groupnum;
    const hasAny = name || phone || district || groupNum;
    if (!hasAny) {
      return (
        <Text style={[styles.detailMuted, { color: colors.textTertiary, fontSize: getFontSizeValue(14) }]}>
          —
        </Text>
      );
    }
    return (
      <View style={styles.detailPersonBlock}>
        <Text style={[styles.detailPersonName, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
          {name || '—'}
        </Text>
        {phone ? (
          <Text style={{ color: colors.textSecondary, fontSize: getFontSizeValue(14), marginTop: 4 }}>
            {phone}
          </Text>
        ) : null}
        {district ? (
          <Text style={{ color: colors.textSecondary, fontSize: getFontSizeValue(13), marginTop: 2 }}>
            {t('gym.districtPrefix')}
            {district}
          </Text>
        ) : null}
        {groupNum ? (
          <Text style={{ color: colors.textSecondary, fontSize: getFontSizeValue(13), marginTop: 2 }}>
            {t('gym.groupPrefix')}
            {groupNum}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderReservationCard = (reservation: Reservation, animatedStyle: object, muted?: boolean) => {
    /** 历史预约：不允许签入、取消（灰显）；仍「使用中」时允许签出 */
    const historyLocksSignInCancel = !!muted;
    const statusInfo = getStatusInfo(reservation.status);
    const isPast = isPastDate(reservation.date);
    return (
      <Animated.View key={reservation.id} style={animatedStyle}>
        <View
          style={[
            styles.reservationCard,
            {
              backgroundColor: muted || isPast ? colors.borderLight : colors.card,
              opacity: muted ? 0.97 : 1,
            },
            (muted || isPast) && styles.pastCard,
          ]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => openDetail(reservation)}
            style={styles.cardTapZone}>
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
                <Text
                  style={[
                    styles.signedInCountText,
                    { color: colors.textSecondary, fontSize: getFontSizeValue(12) },
                  ]}>
                  {t('gym.signedInCount', {
                    count: getSignedInCount(reservation),
                    defaultValue: `${getSignedInCount(reservation)} signed in`,
                  })}
                </Text>
                <Text
                  style={[
                    styles.tapHint,
                    { color: colors.textTertiary, fontSize: getFontSizeValue(11), marginTop: 6 },
                  ]}>
                  {t('gym.tapCardForDetail')}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusInfo.color, fontSize: getFontSizeValue(14) },
                    ]}>
                    {statusInfo.text}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginTop: 8 }} />
              </View>
            </View>

            {reservation.checkInAt && (
              <Text
                style={[
                  styles.checkInTime,
                  { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                ]}>
                {t('gym.checkInTimeLabel')}
                {formatIsoLocal(reservation.checkInAt)}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.actionArea}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.checkInButton,
                  styles.largeButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: historyLocksSignInCancel
                      ? 0.38
                      : canCheckIn(reservation)
                        ? 1
                        : 0.4,
                  },
                ]}
                onPress={() => openCheckPrompt(reservation, 'checkIn')}
                disabled={historyLocksSignInCancel || !canCheckIn(reservation)}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={[styles.actionButtonText, { fontSize: getFontSizeValue(16) }]}>
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
                      opacity: historyLocksSignInCancel ? 0.38 : 1,
                    },
                  ]}
                  onPress={() => handleCancel(reservation)}
                  disabled={historyLocksSignInCancel}>
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
                    {
                      backgroundColor: colors.success || '#4CAF50',
                      opacity: canCheckOut(reservation) ? 1 : 0.4,
                    },
                  ]}
                  onPress={() => openCheckPrompt(reservation, 'checkOut')}
                  disabled={!canCheckOut(reservation)}>
                  <Ionicons name="log-out" size={20} color="#fff" />
                  <Text style={[styles.actionButtonText, { fontSize: getFontSizeValue(16) }]}>
                    {t('gym.checkOutButton')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
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
          {upcomingReservations.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('gym.myReservationsUpcoming')}
              </Text>
              {upcomingReservations.map((r) => renderReservationCard(r, animatedStyle))}
            </View>
          )}

          {historyReservations.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('gym.myReservationsHistory')}
              </Text>
              {historyReservations.map((r) => renderReservationCard(r, animatedStyle, true))}
            </View>
          )}

          {!loading && reservations.length === 0 && (
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
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => router.back()}>
                <Text style={[styles.createButtonText, { fontSize: getFontSizeValue(16) }]}>
                  {t('gym.goBookButton')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetail} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalGrabber, { backgroundColor: colors.borderLight }]} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('gym.reservationDetailTitle')}
              </Text>
              <TouchableOpacity onPress={closeDetail} hitSlop={12}>
                <Text style={{ color: colors.primary, fontSize: getFontSizeValue(16) }}>{t('gym.detailClose')}</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={styles.detailLoadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">
                {myRoleLabel ? (
                  <View style={[styles.roleChip, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={{ color: colors.primary, fontSize: getFontSizeValue(13), fontWeight: '600' }}>
                      {myRoleLabel}
                    </Text>
                  </View>
                ) : null}

                {selectedForDetail && (
                  <>
                    <Text style={[styles.detailLine, { color: colors.text, fontSize: getFontSizeValue(17) }]}>
                      {t('gym.detailDateTimeLine', {
                        date: formatDateDisplay(selectedForDetail.date),
                        start: formatTime24(detailSource?.start_time ?? selectedForDetail.startTime),
                        end: formatTime24(detailSource?.end_time ?? selectedForDetail.endTime),
                      })}
                    </Text>
                    <Text style={[styles.detailLine, { color: colors.textSecondary, fontSize: getFontSizeValue(14), marginTop: 6 }]}>
                      {t('gym.durationSectionTitle')}：{t('gym.durationMinutes', { count: detailSource?.duration ?? selectedForDetail.duration })}
                    </Text>
                    {statusInfoDetail && (
                      <Text style={[styles.detailLine, { color: colors.textSecondary, fontSize: getFontSizeValue(14), marginTop: 6 }]}>
                        {t('gym.reservationStatusLine', { status: statusInfoDetail.text })}
                      </Text>
                    )}
                  <Text
                    style={[
                      styles.detailLine,
                      { color: colors.textSecondary, fontSize: getFontSizeValue(12), marginTop: 6 },
                    ]}>
                    {t('gym.signedInCount', {
                      count: getSignedInCount(selectedForDetail, detailFull),
                      defaultValue: `${getSignedInCount(selectedForDetail, detailFull)} signed in`,
                    })}
                  </Text>
                  </>
                )}

                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary, fontSize: getFontSizeValue(13) }]}>
                    {t('gym.firstAppointmentPersonLabel')}
                  </Text>
                  {selectedForDetail &&
                    renderPersonBlock('primary', detailFull, selectedForDetail)}
                </View>

                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textSecondary, fontSize: getFontSizeValue(13) }]}>
                    {t('gym.secondAppointmentPersonLabel')}
                  </Text>
                  {selectedForDetail &&
                    renderPersonBlock('helper', detailFull, selectedForDetail)}
                </View>

                {detailSource?.notes ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textSecondary, fontSize: getFontSizeValue(13) }]}>
                      {t('gym.notesLabel')}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: getFontSizeValue(15), marginTop: 4 }}>{detailSource.notes}</Text>
                  </View>
                ) : null}

                {detailSource?.check_in_at ? (
                  <Text style={[styles.detailMeta, { color: colors.textSecondary, fontSize: getFontSizeValue(13) }]}>
                    {t('gym.checkInTimeLabel')}
                    {formatIsoLocal(detailSource.check_in_at)}
                  </Text>
                ) : null}
                {detailSource?.check_out_at ? (
                  <Text
                    style={[
                      styles.detailMeta,
                      { color: colors.textSecondary, fontSize: getFontSizeValue(13), marginTop: 4 },
                    ]}>
                    {t('gym.checkOutTimeLabel')}
                    {formatIsoLocal(detailSource.check_out_at)}
                  </Text>
                ) : null}

                {selectedForDetail && (
                  <View style={styles.modalActions}>
                    {canCheckIn(selectedForDetail) && (
                      <TouchableOpacity
                        style={[
                          styles.modalActionBtn,
                          {
                            backgroundColor: colors.primary,
                            opacity: detailHistoryLocksSignInCancel ? 0.38 : 1,
                          },
                        ]}
                        onPress={() => openCheckPrompt(selectedForDetail, 'checkIn')}
                        disabled={detailHistoryLocksSignInCancel}>
                        <Text style={[styles.modalActionBtnText, { fontSize: getFontSizeValue(16) }]}>
                          {t('gym.checkInButton')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {selectedForDetail.status === 'pending' && (
                      <TouchableOpacity
                        style={[
                          styles.modalActionBtn,
                          {
                            backgroundColor: colors.error + '22',
                            borderWidth: 1,
                            borderColor: colors.error,
                            opacity: detailHistoryLocksSignInCancel ? 0.38 : 1,
                          },
                        ]}
                        onPress={() => handleCancel(selectedForDetail)}
                        disabled={detailHistoryLocksSignInCancel}>
                        <Text style={[styles.modalActionBtnText, { color: colors.error, fontSize: getFontSizeValue(16) }]}>
                          {t('gym.cancelReservationButton')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {canCheckOut(selectedForDetail) && (
                      <TouchableOpacity
                        style={[
                          styles.modalActionBtn,
                          {
                            backgroundColor: colors.success || '#4CAF50',
                            opacity: canCheckOut(selectedForDetail) ? 1 : 0.4,
                          },
                        ]}
                        onPress={() => openCheckPrompt(selectedForDetail, 'checkOut')}
                        disabled={!canCheckOut(selectedForDetail)}>
                        <Text style={[styles.modalActionBtnText, { fontSize: getFontSizeValue(16) }]}>
                          {t('gym.checkOutButton')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!checkPrompt.type}
        transparent
        animationType="fade"
        onRequestClose={closeCheckPrompt}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeCheckPrompt} />
          <View style={[styles.checkModalSheet, { backgroundColor: colors.card }]}>
            <Text
              style={[
                styles.checkModalTitle,
                { color: colors.text, fontSize: getFontSizeValue(18) },
              ]}>
              {checkPrompt.type === 'checkIn' ? t('gym.checkInButton') : t('gym.checkOutButton')}
            </Text>
            <Text
              style={[
                styles.checkModalSubtitle,
                { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
              ]}>
              {t(
                'gym.checkPromptSubtitle',
                'Please confirm the following items:'
              )}
            </Text>
            <View style={styles.checkQuestion}>
              <Text
                style={[
                  styles.checkQuestionLabel,
                  { color: colors.text, fontSize: getFontSizeValue(14) },
                ]}>
                {t(
                  'gym.cleanQuestion',
                  'Is the gym cleaned?'
                )}
              </Text>
              <View style={styles.checkOptionRow}>
                {['yes', 'no'].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.checkOption,
                      {
                        borderColor:
                          checkAnswers.clean === value ? colors.primary : colors.borderLight,
                        backgroundColor:
                          checkAnswers.clean === value ? colors.primary + '20' : 'transparent',
                      },
                      checkAnswers.clean === value && styles.checkOptionActive,
                    ]}
                    onPress={() =>
                      setCheckAnswers((prev) => ({
                        ...prev,
                        clean: value as 'yes' | 'no',
                      }))
                    }>
                    <Text
                      style={[
                        styles.checkOptionText,
                        {
                          color:
                            checkAnswers.clean === value ? colors.primary : colors.textSecondary,
                          fontSize: getFontSizeValue(13),
                        },
                      ]}>
                      {t(
                        value === 'yes' ? 'gym.answerYes' : 'gym.answerNo',
                        value === 'yes' ? 'Yes' : 'No'
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.checkQuestion}>
              <Text
                style={[
                  styles.checkQuestionLabel,
                  { color: colors.text, fontSize: getFontSizeValue(14) },
                ]}>
                {t(
                  'gym.equipmentQuestion',
                  'Are there any equipment left out?'
                )}
              </Text>
              <View style={styles.checkOptionRow}>
                {['yes', 'no'].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.checkOption,
                      {
                        borderColor:
                          checkAnswers.equipment === value ? colors.primary : colors.borderLight,
                        backgroundColor:
                          checkAnswers.equipment === value ? colors.primary + '20' : 'transparent',
                      },
                      checkAnswers.equipment === value && styles.checkOptionActive,
                    ]}
                    onPress={() =>
                      setCheckAnswers((prev) => ({
                        ...prev,
                        equipment: value as 'yes' | 'no',
                      }))
                    }>
                    <Text
                      style={[
                        styles.checkOptionText,
                        {
                          color:
                            checkAnswers.equipment === value
                              ? colors.primary
                              : colors.textSecondary,
                          fontSize: getFontSizeValue(13),
                        },
                      ]}>
                      {t(
                        value === 'yes' ? 'gym.answerYes' : 'gym.answerNo',
                        value === 'yes' ? 'Yes' : 'No'
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.checkModalActions}>
              <TouchableOpacity
                style={[styles.checkModalButton, { backgroundColor: colors.borderLight }]}
                onPress={closeCheckPrompt}>
                <Text style={{ color: colors.textSecondary, fontSize: getFontSizeValue(14) }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.checkModalButton, { backgroundColor: colors.primary }]}
                onPress={confirmCheckPrompt}>
                <Text style={{ color: '#fff', fontSize: getFontSizeValue(14) }}>
                  {t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
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
  cardTapZone: {
    marginBottom: 4,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  reservationInfo: {
    flex: 1,
    paddingRight: 8,
  },
  reservationDate: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  reservationTime: {
    fontSize: 16,
  },
  tapHint: {
    fontSize: 11,
  },
  signedInCountText: {
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  checkModalSheet: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
  },
  checkModalTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  checkModalSubtitle: {
    marginBottom: 12,
  },
  checkQuestion: {
    marginBottom: 16,
  },
  checkQuestionLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  checkOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  checkOptionActive: {},
  checkOptionText: {
    fontWeight: '600',
  },
  checkModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: '700',
    flex: 1,
  },
  modalScroll: {
    maxHeight: 520,
  },
  detailLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  roleChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailLine: {
    lineHeight: 24,
  },
  detailSection: {
    marginTop: 18,
  },
  detailSectionTitle: {
    fontWeight: '600',
    textTransform: 'none',
    marginBottom: 6,
  },
  detailPersonBlock: {
    marginTop: 2,
  },
  detailPersonName: {
    fontWeight: '600',
  },
  detailMuted: {},
  detailMeta: {},
  modalActions: {
    marginTop: 24,
    marginBottom: 8,
    gap: 10,
  },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
