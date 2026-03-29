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
  TouchableWithoutFeedback,
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

// 时间段类型（以60分钟为一个 slot）
const SLOT_DURATION = 60;
const OPENING_MINUTES = 8 * 60;
const CLOSING_MINUTES = 22 * 60;

interface TimeSlot {
  id: number;
  startTime: string; // HH:mm 格式，如 "09:00"
  endTime: string; // HH:mm 格式，如 "10:00"
  duration: number; // 时长（分钟），如 60
  isAvailable: boolean; // 是否可用
  isReserved: boolean; // 是否已被预约
  /** 闭馆日：全天不开放预约，与「已约」区分 */
  blackout?: boolean;
  reservedBy?: {
    reservationId?: number;
    status: string;
    primary?: ReservationUserInfo | null;
    helper?: ReservationUserInfo | null;
  };
}

interface ReservationUserInfo {
  id: number;
  name?: string;
  nameZh?: string;
  nameTw?: string;
  nameEn?: string;
  phoneNumber?: string;
  district?: string;
  groupNum?: string;
}
interface ReservationDetail {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  helper_user_id?: number | null;
  user_id?: number | null;
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
}

// 日期格式化函数
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WAIVER_TEXT = {
  en: `By signing this form, you waive and release all claims against the gymnasium, its owners, the Church in Cerritos and its members for any injury, loss, or damage sustained while on the premises, whether caused by negligence or otherwise to the fullest extent permitted by law. By using this gym, you assume full responsibility for any and all risks, damages, or injuries that may occur to you while using the gymnasium facilities, equipment, or engaging in any gym-related activities.\n\nOnly registered and authorized users are allowed access.\nGuests are only allowed with prior approval and must follow all gym rules.\nAll hosts must be 18 years or older and can invite up to 5 other guests or previously authorized groups and must always be present while their guest(s) are on the premises.\nA host can ask their guest(s) at any time for any reason.\nDo not use the gym if you have infectious disease(s), feel unwell, or prohibited by a physician.\nAppropriate athletic clothing and footwear must be worn at all times, and offensive/inappropriate attire is prohibited.\nAlways respect other users and staff; disruptive behavior, including loud noises, abusive language, or harassment, will not be tolerated.\nUse equipment only for its intended purpose and following posted instructions and return equipment to their designated areas after use.\nNo participants should adjust the basketball system and height. If the basketball system is out of alignment, do not use it, and contact Ken at 562-632-2777.\nNo food or drink (except water in closed containers) is allowed in the gym area and keep the gym clean and tidy; pick up and dispose of trash appropriately.\nRespect schedules, time limits, and game rules as determined by gym staff.\nChildren under the age of 18 are not allowed in the gym without adult supervision.\nThe 2nd level track level is off limit to non-staff personnel.\nThe gymnasium is not responsible for lost or stolen items.\nThe facility must be used respectfully; no loitering or inappropriate behavior is allowed.\nViolations of these rules may result in warning, suspension, or termination of gym privileges, and repeat offenses or serious violations may lead to permanent expulsion from the gym.`,
  zh: `签署本表格即表示：在法律允许的最大范围内，您就于场馆内遭受的任何伤害、损失或损害，放弃并对体育馆、其所有者、喜瑞都教会及其会友提出的一切索赔，无论该等情形是否因过失或其他原因所致。使用本体育馆即表示：您就使用体育馆设施、设备或参与任何与体育馆相关活动时可能发生在您身上的任何风险、损害或伤害，承担全部责任。\n\n仅限已登记且经授权的人员进入使用。\n访客须经事先批准方可进入，并须遵守全部体育馆规则。\n所有接待人须年满 18 周岁，最多可邀请 5 名其他访客或事先批准的团体；访客在场馆内期间，接待人须始终在场。\n接待人可随时以任何理由要求访客离开。\n若患有传染病、感到身体不适，或经医师禁止运动，请勿使用体育馆。\n须始终穿着合适的运动服装与鞋履；禁止穿着冒犯性或不恰当的服装。\n尊重其他使用者与工作人员；扰乱秩序的行为（包括大声喧哗、辱骂或骚扰）不予容忍。\n仅按器材既定用途使用，并遵守张贴说明；使用后请将器材放回指定区域。\n任何人不得调整篮球架系统与高度。若篮球架失准或错位，请勿使用，并请联系 Ken：562-632-2777。\n体育馆区域内禁止饮食（密封容器装的水除外）；请保持场馆整洁，并妥善清理与丢弃垃圾。\n遵守体育馆工作人员制定的时间安排、时限与游戏规则。\n未满 18 岁者不得在无人陪同的情况下进入体育馆。\n二楼跑道层非工作人员禁止进入。\n体育馆对遗失或被盗物品不承担责任。\n须文明使用场馆；禁止游荡或不当行为。\n违反本规则可能导致警告、暂停或终止体育馆使用权限；屡犯或严重违规者可能被永久禁止使用体育馆。`,
  'zh-Hant': `簽署本表格即表示：在法律允許的最大範圍內，您就於場館內遭受的任何傷害、損失或損害，放棄並對體育館、其所有者、喜瑞都教會及其會友提出的一切索賠，無論該等情形是否因過失或其他原因所致。使用本體育館即表示：您就使用體育館設施、設備或參與任何與體育館相關活動時可能發生在您身上的任何風險、損害或傷害，承擔全部責任。\n\n僅限已登記且經授權的人員進入使用。\n訪客須經事先批准方可進入，並須遵守全部體育館規則。\n所有接待人須年滿 18 歲，最多可邀請 5 名其他訪客或事先核准的團體；訪客在場館內期間，接待人須始終在場。\n接待人可隨時以任何理由要求訪客離開。\n若患有傳染病、感到身體不適，或經醫師禁止運動，請勿使用體育館。\n須始終穿著合適的運動服裝與鞋履；禁止穿著冒犯性或不恰當的服裝。\n尊重其他使用者與工作人員；擾亂秩序之行為（包括大聲喧嘩、辱罵或騷擾）不予容忍。\n僅按器材既定用途使用，並遵守張貼說明；使用後請將器材放回指定區域。\n任何人不得調整籃球架系統與高度。若籃球架失準或錯位，請勿使用，並請聯絡 Ken：562-632-2777。\n體育館區域內禁止飲食（密封容器裝的水除外）；請保持場館整潔，並妥善清理與丟棄垃圾。\n遵守體育館工作人員制定之時間安排、時限與遊戲規則。\n未滿 18 歲者不得在無人陪同的情況下進入體育館。\n二樓跑道層非工作人員禁止進入。\n體育館對遺失或被竊物品不承擔責任。\n須文明使用場館；禁止遊蕩或不當行為。\n違反本規則可能導致警告、暫停或終止體育館使用權限；屢犯或嚴重違規者可能被永久禁止使用體育館。`,
};

// 获取月份的天数
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// 获取月份第一天是星期几（0=周日, 1=周一, ...）
const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

// 将 API 返回的 slots 标准化为 60 分钟间隔（8:00, 9:00, ... 21:00）
function normalizeTo60MinSlots(apiSlots: TimeSlot[]): TimeSlot[] {
  const parseMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const result: TimeSlot[] = [];
  for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += SLOT_DURATION) {
    const startHour = Math.floor(minutes / 60);
    const startMinute = minutes % 60;
    const startStr = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
    const endMinutes = minutes + SLOT_DURATION;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    const slotStart = minutes;
    const slotEnd = minutes + SLOT_DURATION;
    const overlapping = apiSlots.filter((s) => {
      const sStart = parseMinutes(s.startTime);
      const sEnd = sStart + (s.duration ?? 30);
      return sStart < slotEnd && sEnd > slotStart;
    });
    const blackout = overlapping.some((s) => s.blackout);
    const isReserved = !blackout && overlapping.some((s) => s.isReserved);
    const reservedBy = blackout
      ? undefined
      : overlapping.find((s) => s.reservedBy)?.reservedBy;

    result.push({
      id: minutes,
      startTime: startStr,
      endTime: endStr,
      duration: SLOT_DURATION,
      isAvailable: blackout ? false : !isReserved,
      isReserved,
      blackout: !!blackout,
      reservedBy,
    });
  }
  return result;
}

export default function GymScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const { getFontSizeValue } = useFontSize();
  const { user } = useAuth();

  // 状态管理
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showReservedDetail, setShowReservedDetail] = useState(false);
  const [reservedSlot, setReservedSlot] = useState<TimeSlot | null>(null);
  const [reservedDetail, setReservedDetail] = useState<ReservationDetail | null>(null);
  const [loadingReservedDetail, setLoadingReservedDetail] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [duration, setDuration] = useState(60); // 默认1小时
  const [notes, setNotes] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date());
  const [coUserId, setCoUserId] = useState<number | null>(null);
  const [gymUsers, setGymUsers] = useState<
    { id: number; nameZh?: string; nameTw?: string; nameEn?: string; district?: string; groupNum?: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCoUserDropdownOpen, setIsCoUserDropdownOpen] = useState(false);
  /** 当前日历网格日期范围内、已有预约的日期（用于格子上红点） */
  const [datesWithReservation, setDatesWithReservation] = useState<Set<string>>(() => new Set());
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const getUserDisplayName = (user: {
    nameZh?: string;
    nameTw?: string;
    nameEn?: string;
  }) =>
    (i18n?.language === 'zh-Hant' ? user.nameTw : user.nameZh) || user.nameEn || '';
  const getCoUserOptionLabel = (user: {
    id: number;
    nameZh?: string;
    nameTw?: string;
    nameEn?: string;
  }) => getUserDisplayName(user) || t('gym.userFallback', { id: user.id });
  const getCoUserTriggerLabel = (user: {
    id: number;
    district?: string;
    groupNum?: string;
    nameZh?: string;
    nameTw?: string;
    nameEn?: string;
  }) => {
    const name = getCoUserOptionLabel(user);
    const dg = [user.district, user.groupNum].filter(Boolean).join('');
    return dg ? `${name} (${dg})` : name;
  };
  const selectedCoUser = gymUsers.find(
    (user) => Number(user.id) === coUserId || String(user.id) === String(coUserId)
  );
  const coUserDisplayName = selectedCoUser
    ? getCoUserTriggerLabel(selectedCoUser)
    : t('gym.chooseCoUserPlaceholder');
  const canSubmitReservation =
    !!selectedSlot &&
    !!selectedDate &&
    !loadingUsers &&
    gymUsers.length > 0 &&
    coUserId != null;
  const waiverLanguage =
    i18n.language === 'zh-Hant'
      ? 'zh-Hant'
      : i18n.language.startsWith('zh')
      ? 'zh'
      : 'en';
  const waiverParagraphs = (WAIVER_TEXT[waiverLanguage] ?? WAIVER_TEXT.en)
    .split('\n')
    .filter(Boolean);
  const openWaiverModal = () => setShowWaiverModal(true);
  const closeWaiverModal = () => setShowWaiverModal(false);
  const getReservationUserDisplayName = (user?: ReservationUserInfo | null) => {
    if (!user) return '';
    const name =
      (i18n?.language === 'zh-Hant' ? user.nameTw : user.nameZh) ||
      user.nameZh ||
      user.name ||
      user.nameEn ||
      user.phoneNumber;
    return name || t('gym.userFallback', { id: user?.id ?? '' });
  };
  const getReservationDistrictGroup = (user?: ReservationUserInfo | null) => {
    if (!user) return '';
    return [user.district, user.groupNum].filter(Boolean).join(' ');
  };
  const getDetailUserDisplayName = (detail: ReservationDetail | null, role: 'primary' | 'helper') => {
    if (!detail) return '';
    const prefix = role === 'primary' ? 'primary' : 'helper';
    const name =
      detail[`${prefix}_namezh` as keyof ReservationDetail] ||
      detail[`${prefix}_nametw` as keyof ReservationDetail] ||
      detail[`${prefix}_nameen` as keyof ReservationDetail] ||
      detail[`${prefix}_name` as keyof ReservationDetail] ||
      detail[`${prefix}_phonenumber` as keyof ReservationDetail];
    return (name as string) || '';
  };
  const getDetailDistrictGroup = (detail: ReservationDetail | null, role: 'primary' | 'helper') => {
    if (!detail) return '';
    const prefix = role === 'primary' ? 'primary' : 'helper';
    const district = detail[`${prefix}_district` as keyof ReservationDetail] as string | undefined;
    const group = detail[`${prefix}_groupnum` as keyof ReservationDetail] as string | undefined;
    return [district, group].filter(Boolean).join(' ');
  };
  const getReservationStatusText = (status?: string) => {
    switch (status) {
      case 'pending':
        return t('gym.statusPending');
      case 'checked_in':
        return t('gym.statusCheckedIn');
      case 'checked_out':
        return t('gym.statusCheckedOut');
      case 'cancelled':
        return t('gym.statusCancelled');
      default:
        return status || t('gym.statusUnknown');
    }
  };

  const weekDayLabels = useMemo(
    () => [
      t('gym.weekdaySun'),
      t('gym.weekdayMon'),
      t('gym.weekdayTue'),
      t('gym.weekdayWed'),
      t('gym.weekdayThu'),
      t('gym.weekdayFri'),
      t('gym.weekdaySat'),
    ],
    [t]
  );

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

  // 拉取当前日历网格内「有预约」的日期，用于格子上红点
  useEffect(() => {
    let cancelled = false;
    if (calendarDays.length === 0) return;
    const from = calendarDays[0].dateString;
    const to = calendarDays[calendarDays.length - 1].dateString;
    api
      .getGymDaysWithReservations(from, to)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.dates) {
          setDatesWithReservation(new Set(res.data.dates));
        } else {
          setDatesWithReservation(new Set());
        }
      })
      .catch(() => {
        if (!cancelled) setDatesWithReservation(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [calendarDays]);

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
        const rawSlots = response.data.timeSlots.map((slot) => ({
          ...slot,
          isReserved: !!slot.isReserved,
          blackout: !!slot.blackout,
          reservedBy: slot.reservedBy,
        }));
        const slots60 = normalizeTo60MinSlots(rawSlots);
        setTimeSlots(slots60);
      } else {
        // 如果API返回空或失败，使用模拟数据展示UI效果
        const mockSlots: TimeSlot[] = [];
        for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += SLOT_DURATION) {
          const startHour = Math.floor(minutes / 60);
          const startMinute = minutes % 60;
          const endMinutes = minutes + SLOT_DURATION;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          mockSlots.push({
            id: minutes,
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
            duration: SLOT_DURATION,
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
        for (let minutes = OPENING_MINUTES; minutes < CLOSING_MINUTES; minutes += SLOT_DURATION) {
          const startHour = Math.floor(minutes / 60);
          const startMinute = minutes % 60;
          const endMinutes = minutes + SLOT_DURATION;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          mockSlots.push({
            id: minutes,
            startTime: `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
            duration: SLOT_DURATION,
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

  // 能否切换到上个月（仅当不在当月时，因过去日期不可预约）
  const canGoPrevMonth = (): boolean => {
    const today = new Date();
    return (
      currentMonth.getFullYear() > today.getFullYear() ||
      currentMonth.getMonth() > today.getMonth()
    );
  };

  // 能否切换到下个月（不能超过今天+30天）
  const canGoNextMonth = (): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return nextMonth <= maxDate;
  };

  // 切换月份
  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && !canGoPrevMonth()) return;
    if (direction === 'next' && !canGoNextMonth()) return;
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleReservedSlotPress = async (slot: TimeSlot) => {
    setReservedSlot(slot);
    setShowReservedDetail(true);
    if (slot.reservedBy?.reservationId) {
      setLoadingReservedDetail(true);
      try {
        const response = await api.getGymReservationById(slot.reservedBy.reservationId);
        if (response.success && response.data.reservation) {
          setReservedDetail(response.data.reservation);
        } else {
          setReservedDetail(null);
        }
      } catch {
        setReservedDetail(null);
      } finally {
        setLoadingReservedDetail(false);
      }
    } else {
      setReservedDetail(null);
    }
  };

  const closeReservedDetail = () => {
    setShowReservedDetail(false);
    setReservedSlot(null);
    setReservedDetail(null);
  };

  const detailPrimaryName = reservedDetail
    ? getDetailUserDisplayName(reservedDetail, 'primary')
    : getReservationUserDisplayName(reservedSlot?.reservedBy?.primary);
  const detailPrimaryDistrictGroup = reservedDetail
    ? getDetailDistrictGroup(reservedDetail, 'primary')
    : getReservationDistrictGroup(reservedSlot?.reservedBy?.primary);
  const detailHelperName = reservedDetail
    ? getDetailUserDisplayName(reservedDetail, 'helper')
    : getReservationUserDisplayName(reservedSlot?.reservedBy?.helper);
  const detailHelperDistrictGroup = reservedDetail
    ? getDetailDistrictGroup(reservedDetail, 'helper')
    : getReservationDistrictGroup(reservedSlot?.reservedBy?.helper);

  // 选择时间段并打开预约模态框
  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (!slot.isAvailable || slot.isReserved || slot.blackout) {
      return;
    }

    if (!selectedDate) {
      Alert.alert(t('common.tip'), t('gym.selectDateFirst'));
      return;
    }

    console.log('[Gym] Time slot tapped', { slot, selectedDate });
    console.log('[Gym] before opening modal, showReservationModal=', showReservationModal);

    setSelectedSlot(slot);
    setDuration(60); // 重置为默认1小时
    setNotes(''); // 清空备注
    setCoUserId(null); // 清空共同预约人
    setShowReservationModal(true);
  };

  // 打开预约模态框时加载用户列表
  useEffect(() => {
    console.log('[Gym] right before Modal opened,');
    if (showReservationModal) {
      console.log('[Gym] Modal opened, fetching gym users');
      setLoadingUsers(true);
      api
        .getGymUsers()
        .then((res) => {
          console.log('[Gym] gym users response', res);
          if (res.success && res.data.users && res.data.users.length > 0) {
            setGymUsers(res.data.users);
          } else {
            setGymUsers([]);
          }
        })
        .catch((err) => {
          console.log('[Gym] gym users error', err);
          setGymUsers([]);
        })
        .finally(() => {
          setLoadingUsers(false);
          console.log('[Gym] finished fetching gym users');
        });
    }
  }, [showReservationModal]);

  // 创建预约
  const handleCreateReservation = async () => {
    if (!selectedSlot || !selectedDate) {
      return;
    }
    if (coUserId == null) {
      Alert.alert(t('common.tip'), t('gym.selectCoUserRequired'));
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
        coUserId,
        notes: notes.trim() || undefined,
      });
      
      if (response.success) {
        Alert.alert(t('common.success'), response.message || t('gym.reservationCreatedDefault'));
        setShowReservationModal(false);
        // 重新加载时间段与日历红点
        if (selectedDate) {
          loadTimeSlots(selectedDate);
          const from = calendarDays[0]?.dateString;
          const to = calendarDays[calendarDays.length - 1]?.dateString;
          if (from && to) {
            api.getGymDaysWithReservations(from, to).then((r) => {
              if (r.success && r.data?.dates) {
                setDatesWithReservation(new Set(r.data.dates));
              }
            });
          }
        }
      } else {
        throw new Error(response.message || t('gym.createReservationFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('gym.createReservationFailed'));
    }
  };

  // 时长选项（60分钟、120分钟）
  const durationOptions = [60, 120];

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

  const getMonthName = (date: Date): string =>
    t('gym.monthYearLabel', { year: date.getFullYear(), month: date.getMonth() + 1 });

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('gym.title'),
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
              {t('gym.title')}
            </Text>
          </View>
          <Text
            style={[
              styles.gymDescription,
              { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
            ]}>
            {t('gym.openingHours')}
          </Text>
        </View>

        {/* 固定活动说明（场馆信息与日历之间） */}
        <View style={[styles.fixedScheduleCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.fixedScheduleHeader}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <Text
              style={[
                styles.fixedScheduleTitle,
                { color: colors.text, fontSize: getFontSizeValue(17) },
              ]}>
              {t('gym.fixedScheduleTitle')}
            </Text>
          </View>
          <Text
            style={[
              styles.fixedScheduleBody,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(14),
                lineHeight: Math.round(getFontSizeValue(14) * 1.55),
              },
            ]}>
            {t('gym.fixedScheduleBody')}
          </Text>
        </View>

        <View style={[styles.waiverCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={openWaiverModal}>
            <View style={styles.waiverRow}>
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              <Text
                style={[
                  styles.waiverLink,
                  { color: colors.text, fontSize: getFontSizeValue(16) },
                ]}>
                {t('gym.waiverLinkLabel')}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[
                styles.waiverHint,
                { color: colors.textSecondary, fontSize: getFontSizeValue(13) },
              ]}>
              {t('gym.waiverModalTitle')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 日历选择器 */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          {/* 月份导航 */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => changeMonth('prev')}
              style={styles.monthButton}
              disabled={!canGoPrevMonth()}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={canGoPrevMonth() ? colors.text : colors.textTertiary}
              />
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
              style={styles.monthButton}
              disabled={!canGoNextMonth()}>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={canGoNextMonth() ? colors.text : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* 星期标题 */}
          <View style={styles.weekDaysRow}>
            {weekDayLabels.map((day, index) => (
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
              const hasReservationMark =
                datesWithReservation.has(day.dateString);

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
                  <View style={styles.dateCellInner}>
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
                    {hasReservationMark ? (
                      <View style={[styles.reservationDot, { backgroundColor: '#E53935' }]} />
                    ) : null}
                  </View>
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
                {t('gym.timeSlotsTitle', { date: formatDate(selectedDate) })}
              </Text>
              <Text
                style={[
                  styles.timeSlotsHint,
                  { color: colors.textSecondary, fontSize: getFontSizeValue(13) },
                ]}>
                {t('gym.timeSlotsHint')}
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
                {t('gym.noSlotsThisDay')}
              </Text>
            ) : (
              <View style={styles.timeSlotsGrid}>
        {timeSlots.map((slot) => {
          const slotMinutes =
            parseInt(slot.startTime.split(':')[0], 10) * 60 +
            parseInt(slot.startTime.split(':')[1], 10);
          const isPastSlot = isSelectedDateToday && slotMinutes < currentMinutes;
          const disabled = isPastSlot || (!slot.isAvailable && !slot.isReserved);
          const isBlackout = !isPastSlot && !!slot.blackout;
          const backgroundColor = isPastSlot
            ? colors.borderLight
            : isBlackout
            ? colors.borderLight
            : slot.isReserved
            ? colors.error + '15'
            : slot.isAvailable
            ? colors.primary + '10'
            : colors.borderLight;
          const borderColor = isPastSlot
            ? colors.borderLight
            : isBlackout
            ? colors.textSecondary
            : slot.isReserved
            ? colors.error
            : slot.isAvailable
            ? colors.primary
            : colors.borderLight;
          const textColor = isPastSlot
            ? colors.textTertiary
            : isBlackout
            ? colors.textSecondary
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
                onPress={() =>
                  slot.isReserved ? handleReservedSlotPress(slot) : handleTimeSlotSelect(slot)
                }
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
                  {t('gym.pastTimeSlot')}
                </Text>
              ) : isBlackout ? (
                <Text
                  style={[
                    styles.timeSlotGridHint,
                    { color: colors.textSecondary, fontSize: getFontSizeValue(11) },
                  ]}>
                  {t('gym.slotBlackout')}
                </Text>
              ) : slot.isReserved ? (
                <Text
                  style={[
                    styles.timeSlotGridStatus,
                    { color: colors.error, fontSize: getFontSizeValue(11) },
                  ]}>
                  {t('gym.slotReserved')}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.timeSlotGridHint,
                    { color: colors.textTertiary, fontSize: getFontSizeValue(11) },
                  ]}>
                  {t('gym.slotAvailable')}
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
                {t('gym.createReservationTitle')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowReservationModal(false)}
                style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled">
            {selectedSlot && selectedDate && (
              <>
                <View style={styles.modalInfo}>
                  <Text
                    style={[
                      styles.modalInfoText,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {t('gym.modalDateLine', { date: formatDate(selectedDate) })}
                  </Text>
                  <Text
                    style={[
                      styles.modalInfoText,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {t('gym.modalStartTimeLine', { time: selectedSlot.startTime })}
                  </Text>
                </View>

                {/* 时长选择 */}
                <View style={styles.durationSection}>
                  <Text
                    style={[
                      styles.durationLabel,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {t('gym.durationSectionTitle')}
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
                            {t('gym.durationMinutes', { count: dur })}
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

                {/* 共同预约人选择 */}
                <View style={styles.coUserSection}>
                  <Text
                    style={[
                      styles.durationLabel,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {t('gym.coUserRequiredLabel')}
                  </Text>
                  {loadingUsers ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : gymUsers.length === 0 ? (
                    <Text
                      style={[
                        styles.coUserEmpty,
                        { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                      ]}>
                      {t('gym.noCoUsersWithRolesHint')}
                    </Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.coUserDropdown,
                          { borderColor: colors.borderLight, backgroundColor: colors.background },
                        ]}
                        onPress={() => setIsCoUserDropdownOpen(true)}>
                        <Text
                          style={[
                            styles.coUserDropdownText,
                            { color: coUserId ? colors.text : colors.textSecondary },
                          ]}>
                          {coUserDisplayName}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={colors.text} />
                      </TouchableOpacity>
                      <Modal
                        visible={isCoUserDropdownOpen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setIsCoUserDropdownOpen(false)}>
                        <TouchableWithoutFeedback onPress={() => setIsCoUserDropdownOpen(false)}>
                          <View style={styles.dropdownOverlay}>
                            <TouchableWithoutFeedback>
                              <View style={[styles.dropdownContainer, { backgroundColor: colors.card }]}>
                                <ScrollView>
                                  {gymUsers.map((u) => (
                                    <TouchableOpacity
                                      key={u.id}
                                      style={[
                                        styles.dropdownItem,
                                        {
                                          backgroundColor:
                                            Number(u.id) === coUserId || String(u.id) === String(coUserId)
                                              ? colors.primary + '10'
                                              : 'transparent',
                                        },
                                      ]}
                                      onPress={() => {
                                        setCoUserId(typeof u.id === 'string' ? Number(u.id) : u.id);
                                        setIsCoUserDropdownOpen(false);
                                      }}>
                                      <View>
                                        <Text
                                          style={[
                                            styles.dropdownItemText,
                                            {
                                              color:
                                                Number(u.id) === coUserId || String(u.id) === String(coUserId)
                                                  ? colors.primary
                                                  : colors.text,
                                            },
                                          ]}>
                                          {getCoUserOptionLabel(u)}
                                        </Text>
                                        {(u.district || u.groupNum) && (
                                          <Text
                                            style={[
                                              styles.dropdownItemMeta,
                                              { color: colors.textTertiary },
                                            ]}>
                                            {[
                                              u.district && `${t('gym.districtPrefix')}${u.district}`,
                                              u.groupNum && `${t('gym.groupPrefix')}${u.groupNum}`,
                                            ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                          </Text>
                                        )}
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            </TouchableWithoutFeedback>
                          </View>
                        </TouchableWithoutFeedback>
                      </Modal>
                    </>
                  )}
                </View>

                {/* 备注 */}
                <View style={styles.notesSection}>
                  <Text
                    style={[
                      styles.notesLabel,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {t('gym.notesOptionalLabel')}
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
                    placeholder={t('gym.notesPlaceholder')}
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
                    {t('gym.firstAppointmentPersonLabel')}
                  </Text>
                  <Text
                    style={[
                      styles.personValue,
                      { color: colors.textSecondary, fontSize: getFontSizeValue(16) },
                    ]}>
                    {user?.nameZh || user?.nameEn || user?.name || user?.phoneNumber || t('gym.currentUserFallback')}
                  </Text>
                  {(user?.district || user?.groupNum) && (
                    <View style={styles.personMeta}>
                      {user?.district && (
                        <Text
                          style={[
                            styles.personMetaText,
                            { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
                          ]}>
                          {t('gym.districtPrefix')}
                          {user.district}
                        </Text>
                      )}
                      {user?.groupNum && (
                        <Text
                          style={[
                            styles.personMetaText,
                            { color: colors.textTertiary, fontSize: getFontSizeValue(12) },
                          ]}>
                          {t('gym.groupPrefix')}
                          {user.groupNum}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* 确认按钮 */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: canSubmitReservation ? 1 : 0.45,
                    },
                  ]}
                  onPress={handleCreateReservation}
                  disabled={!canSubmitReservation}>
                  <Text
                    style={[
                      styles.confirmButtonText,
                      { fontSize: getFontSizeValue(18) },
                    ]}>
                    {t('gym.confirmReservation')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* 已预约详情模态框 */}
      <Modal
        visible={showReservedDetail}
        transparent
        animationType="fade"
        onRequestClose={closeReservedDetail}>
        <TouchableWithoutFeedback onPress={closeReservedDetail}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.reservedModalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.text, fontSize: getFontSizeValue(20) },
                    ]}>
                    {t('gym.reservationDetailTitle')}
                  </Text>
                  <TouchableOpacity
                    onPress={closeReservedDetail}
                    style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {reservedSlot && selectedDate && (
                  <>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                      ]}>
                      {t('gym.detailDateTimeLine', {
                        date: formatDate(selectedDate),
                        start: reservedSlot.startTime,
                        end: reservedSlot.endTime,
                      })}
                    </Text>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                      ]}>
                      {t('gym.reservationStatusLine', {
                        status: getReservationStatusText(reservedSlot.reservedBy?.status),
                      })}
                    </Text>
                    {loadingReservedDetail ? (
                      <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
                    ) : (
                      <View style={styles.detailSection}>
                        {detailPrimaryName && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailRowLabel, { color: colors.text }]}>
                              {t('gym.firstAppointmentPersonLabel')}
                            </Text>
                            <Text
                              style={[
                                styles.detailRowValue,
                                { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                              ]}>
                              {detailPrimaryName}
                              {detailPrimaryDistrictGroup
                                ? ` (${detailPrimaryDistrictGroup})`
                                : ''}
                            </Text>
                          </View>
                        )}
                        {detailHelperName && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailRowLabel, { color: colors.text }]}>
                              {t('gym.coUserLabel')}
                            </Text>
                            <Text
                              style={[
                                styles.detailRowValue,
                                { color: colors.textSecondary, fontSize: getFontSizeValue(14) },
                              ]}>
                              {detailHelperName}
                              {detailHelperDistrictGroup
                                ? ` (${detailHelperDistrictGroup})`
                                : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showWaiverModal}
        transparent
        animationType="slide"
        onRequestClose={closeWaiverModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeWaiverModal} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingVertical: 10 }]}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text, fontSize: getFontSizeValue(18) },
                ]}>
                {t('gym.waiverModalTitle')}
              </Text>
              <TouchableOpacity onPress={closeWaiverModal} style={styles.closeButton}>
                <Text
                  style={[
                    styles.waiverModalClose,
                    { color: colors.primary, fontSize: getFontSizeValue(14) },
                  ]}>
                  {t('gym.waiverModalClose')}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.waiverModalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}>
              {waiverParagraphs.map((paragraph, index) => (
                <Text
                  key={`${paragraph}-${index}`}
                  style={[
                    styles.waiverParagraph,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(14),
                      marginTop: index === 0 ? 0 : 14,
                    },
                  ]}>
                  {paragraph}
                </Text>
              ))}
            </ScrollView>
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
  fixedScheduleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  fixedScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fixedScheduleTitle: {
    fontWeight: '600',
    flex: 1,
  },
  fixedScheduleBody: {
    marginTop: 0,
  },
  waiverCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  waiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waiverLink: {
    fontWeight: '600',
  },
  waiverHint: {
    marginTop: 6,
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
  dateCellInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginHorizontal: 12,
  },
  reservedModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginHorizontal: 12,
    maxHeight: '80%',
  },
  detailLabel: {
    marginBottom: 8,
  },
  detailSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailRowValue: {
    fontSize: 14,
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
  modalScroll: {
    flexGrow: 1,
  },
  waiverModalContent: {
    flexGrow: 1,
  },
  waiverParagraph: {
    lineHeight: 22,
  },
  waiverModalClose: {
    fontWeight: '600',
  },
  coUserSection: {
    marginBottom: 20,
  },
  coUserList: {
    marginTop: 8,
    minHeight: 44,
  },
  coUserListContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  coUserChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  coUserChipText: {
    fontWeight: '500',
  },
  coUserEmpty: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  coUserDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  coUserDropdownText: {
    fontSize: 16,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    borderRadius: 12,
    maxHeight: '60%',
    padding: 8,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dropdownItemMeta: {
    fontSize: 12,
    marginTop: 2,
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

