import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackButton from '../components/BackButton';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TravelSchedule {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  destination: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    nameZh: string | null;
    nameEn: string | null;
    name: string | null;
    phoneNumber: string;
  };
}

export default function TravelScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Force re-render when language changes
  // Use a state variable to trigger re-render when language changes
  const [lang, setLang] = useState(i18n.resolvedLanguage || i18n.language);
  
  useEffect(() => {
    const updateLang = () => {
      setLang(i18n.resolvedLanguage || i18n.language);
    };
    i18n.on('languageChanged', updateLang);
    return () => {
      i18n.off('languageChanged', updateLang);
    };
  }, [i18n]);
  
  // Use lang variable to ensure component re-renders (suppress unused warning)
  void lang;

  // Keyboard height state for dynamic padding
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Form state
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [destination, setDestination] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Records state
  const [schedules, setSchedules] = useState<TravelSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TravelSchedule | null>(null);
  const [showForm, setShowForm] = useState(false);

  // View mode: 'my' (my schedules), 'all' (all schedules), or 'availability' (availability view)
  const [viewMode, setViewMode] = useState<'my' | 'all' | 'availability'>('my');

  // Availability view state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availabilityData, setAvailabilityData] = useState<{
    date: string;
    users: {
      id: number;
      name: string;
      nameZh: string | null;
      nameEn: string | null;
      isAvailable: boolean;
      schedule: TravelSchedule | null;
    }[];
  } | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Load all users for availability view
  const loadAllUsers = useCallback(async (): Promise<any[]> => {
    try {
      console.log('[Travel] Loading all users...');
      const response = await api.getUsers();
      if (response.success) {
        const users = response.data.users || [];
        console.log('[Travel] Loaded users:', users.length);
        setAllUsers(users);
        // Don't load availability here - let useEffect handle it
        // This avoids race conditions and ensures proper state updates
        return users;
      } else {
        console.error('[Travel] Failed to load users:', response);
        const errorMessage = (response as any).message || t('travel.loadUsersFailed') || '无法加载用户列表';
        Alert.alert(
          t('travel.loadAvailabilityFailed') || '加载出城信息失败',
          errorMessage
        );
        return [];
      }
    } catch (error: any) {
      console.error('[Travel] Failed to load users:', error);
      Alert.alert(
        t('travel.loadAvailabilityFailed') || '加载出城信息失败',
        error.message || t('travel.loadUsersFailed') || '无法加载用户列表'
      );
      return [];
    }
  }, [t]);

  const loadSchedules = useCallback(async () => {
    try {
      setLoadingSchedules(true);
      let response;
      if (viewMode === 'my') {
        response = await api.getMyTravelSchedules();
      } else {
        response = await api.getTravelSchedules();
      }

      if (response.success) {
        const schedules = response.data.schedules || [];
        console.log('[Travel] Loaded schedules:', schedules);
        console.log('[Travel] Current user id:', user?.id);
        setSchedules(schedules);
      } else {
          Alert.alert(
            t('travel.loadFailed') || '加载失败',
            (response as any).message || t('travel.unknownError') || '未知错误'
          );
      }
    } catch (error: any) {
      console.error('[Travel] Failed to load schedules:', error);
      const errorMessage = error.responseData?.error || error.message || t('travel.networkError') || '网络错误';
      Alert.alert(t('travel.loadFailed') || '加载失败', errorMessage);
    } finally {
      setLoadingSchedules(false);
    }
  }, [viewMode, user?.id, t]);


  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDisplayDate = (dateString: string): string => {
    const date = parseDate(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateString: string): string => {
    const date = parseDate(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    });
  };

  // Load availability for a specific date
  const loadAvailabilityForDate = useCallback(async (date: string) => {
    try {
      // Ensure users are loaded before loading availability
      let usersToUse = allUsers;
      if (usersToUse.length === 0) {
        console.log('[Travel] Users not loaded yet, loading users first...');
        usersToUse = await loadAllUsers();
        if (usersToUse.length === 0) {
          throw new Error('无法加载用户列表');
        }
      }
      
      setLoadingAvailability(true);
      console.log('[Travel] Loading availability for date:', date);
      console.log('[Travel] All users count:', usersToUse.length);
      
      // Get all schedules for this date
      const schedulesResponse = await api.getTravelSchedulesByDate(date);
      console.log('[Travel] Schedules response:', schedulesResponse);
      
      if (schedulesResponse.success) {
        const schedules = schedulesResponse.data.schedules || [];
        console.log('[Travel] Schedules for date:', date);
        console.log('[Travel] Raw schedules response:', JSON.stringify(schedules, null, 2));
        console.log('[Travel] All users:', allUsers.map(u => ({ id: u.id, idType: typeof u.id, name: u.nameZh || u.nameEn || u.name })));
        
        // Create a map of userId -> schedule for quick lookup
        // Use both string and number keys to handle type mismatches
        const scheduleMap = new Map<number | string, TravelSchedule>();
        schedules.forEach((schedule: any) => {
          // Get userId from schedule - check multiple possible field names
          let userId = schedule.userId || schedule.userid || (schedule.user && schedule.user.id) || null;
          
          if (!userId) {
            console.warn('[Travel] Schedule missing userId. Schedule keys:', Object.keys(schedule));
            console.warn('[Travel] Full schedule:', JSON.stringify(schedule, null, 2));
            return;
          }
          
          // Normalize userId to number
          const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
          
          // Get date fields - check multiple possible field names
          const startDate = schedule.startDate || schedule.startdate;
          const endDate = schedule.endDate || schedule.enddate;
          
          if (!startDate || !endDate) {
            console.warn('[Travel] Schedule missing dates. Schedule:', schedule);
            return;
          }
          
          // Verify the date is actually within the schedule's date range
          const scheduleStart = parseDate(startDate);
          const scheduleEnd = parseDate(endDate);
          const checkDate = parseDate(date);
          
          console.log('[Travel] Checking schedule:', {
            userId: userId,
            userIdNum: userIdNum,
            startDate: startDate,
            endDate: endDate,
            checkDate: date,
            scheduleStart: scheduleStart.toISOString(),
            scheduleEnd: scheduleEnd.toISOString(),
            checkDateObj: checkDate.toISOString(),
            inRange: checkDate >= scheduleStart && checkDate <= scheduleEnd
          });
          
          if (checkDate >= scheduleStart && checkDate <= scheduleEnd) {
            // Store with both number and string keys to handle type mismatches
            scheduleMap.set(userIdNum, schedule);
            scheduleMap.set(userId, schedule);
            console.log('[Travel] ✓ User', userId, '(num:', userIdNum, ') has schedule on', date, ':', startDate, 'to', endDate);
          } else {
            console.log('[Travel] ✗ User', userId, 'schedule does not match date:', startDate, 'to', endDate, 'checking', date);
          }
        });
        
        console.log('[Travel] Schedule map size:', scheduleMap.size);
        console.log('[Travel] Schedule map keys:', Array.from(scheduleMap.keys()));
        console.log('[Travel] Schedule map entries:', Array.from(scheduleMap.entries()).map(([id, s]: [any, any]) => ({ 
          userId: id, 
          userIdType: typeof id,
          startDate: s.startDate || s.startdate, 
          endDate: s.endDate || s.enddate 
        })));

        // Build availability data - use the users we have (either from state or just loaded)
        const usersWithAvailability = usersToUse.map((user) => {
          // Ensure user.id is a number for comparison
          const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
          
          // Try to get schedule with both string and number keys
          const schedule = scheduleMap.get(userId) || scheduleMap.get(user.id) || null;
          const displayName = user.nameZh || user.nameEn || user.name || user.phoneNumber;
          
          console.log('[Travel] User', user.id, '(parsed:', userId, ')', displayName, 'isAvailable:', !schedule, 'schedule:', schedule);
          console.log('[Travel] Schedule map keys:', Array.from(scheduleMap.keys()));
          
          return {
            id: user.id,
            name: displayName,
            nameZh: user.nameZh,
            nameEn: user.nameEn,
            isAvailable: !schedule, // Available if no schedule
            schedule: schedule,
          };
        });

        console.log('[Travel] Users with availability:', usersWithAvailability);

        // Filter to only show users who are unavailable (out of town)
        const unavailableUsers = usersWithAvailability.filter(user => !user.isAvailable);

        setAvailabilityData({
          date,
          users: unavailableUsers.sort((a, b) => {
            // Sort by name
            return a.name.localeCompare(b.name, 'zh-CN');
          }),
        });
      } else {
        console.error('[Travel] Failed to get schedules:', schedulesResponse);
      }
    } catch (error: any) {
      console.error('[Travel] Failed to load availability:', error);
      Alert.alert(
        t('travel.loadAvailabilityFailed') || '加载出城信息失败',
        error.message || t('travel.networkError') || '网络错误'
      );
    } finally {
      setLoadingAvailability(false);
    }
  }, [allUsers, t, loadAllUsers]);

  // Load schedules on mount
  useEffect(() => {
    if (viewMode === 'availability') {
      // Always load users first when switching to availability view
      loadAllUsers();
    } else {
      loadSchedules();
    }
  }, [viewMode, loadAllUsers, loadSchedules]);

  // Load availability when users are loaded or date changes
  useEffect(() => {
    if (viewMode === 'availability' && allUsers.length > 0) {
      // Add a small delay to ensure state is fully updated
      const timer = setTimeout(() => {
        loadAvailabilityForDate(formatDate(selectedDate));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedDate, allUsers.length, loadAvailabilityForDate]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getCalendarDays = (): { date: Date; isCurrentMonth: boolean; dateString: string }[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);

    const days: { date: Date; isCurrentMonth: boolean; dateString: string }[] = [];

    // Add days from previous month
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

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        dateString: formatDate(date),
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        dateString: formatDate(date),
      });
    }

    return days;
  };

  // Check if a date has any schedules (for calendar marking)
  const dateHasSchedules = async (dateString: string): Promise<boolean> => {
    try {
      const response = await api.getTravelSchedulesByDate(dateString);
      return response.success && (response.data.schedules?.length || 0) > 0;
    } catch {
      return false;
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    // Ensure users are loaded before loading availability
    if (allUsers.length === 0) {
      // Load users first, then availability will be loaded by useEffect
      await loadAllUsers();
    }
    // Availability will be loaded automatically by useEffect when selectedDate changes
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const resetForm = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setDestination('');
    setNotes('');
    setEditingSchedule(null);
    setShowForm(false);
    setKeyboardHeight(0);
  };

  const openForm = (schedule?: TravelSchedule) => {
    // Reset keyboard height when opening modal
    setKeyboardHeight(0);
    if (schedule) {
      // Check if the schedule has completely passed (end date is before today)
      const endDate = parseDate(schedule.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = endDate < today;
      
      // Prevent editing past schedules in "my" view mode
      if (isPast && viewMode === 'my') {
        Alert.alert(
          t('common.tip') || '提示',
          '已过去的行程不能修改'
        );
        return;
      }
      
      setEditingSchedule(schedule);
      setStartDate(parseDate(schedule.startDate));
      setEndDate(parseDate(schedule.endDate));
      setDestination(schedule.destination || '');
      setNotes(schedule.notes || '');
    } else {
      setEditingSchedule(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setDestination('');
      setNotes('');
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    // Validate dates
    if (endDate < startDate) {
      Alert.alert(
        t('travel.invalidDate') || '日期无效',
        t('travel.endDateBeforeStart') || '结束日期不能早于开始日期'
      );
      return;
    }

    // Prevent editing past schedules in "my" view mode
    if (editingSchedule && viewMode === 'my') {
      const originalEndDate = parseDate(editingSchedule.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = originalEndDate < today;
      
      if (isPast) {
        Alert.alert(
          t('common.tip') || '提示',
          '已过去的行程不能修改'
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const data = {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        destination: destination.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingSchedule) {
        await api.updateTravelSchedule(editingSchedule.id, data);
        Alert.alert(
          t('common.success') || '成功',
          t('travel.updateSuccess') || '行程更新成功',
          [{ text: t('common.ok') || '确定', onPress: () => {
            resetForm();
            loadSchedules();
          }}]
        );
      } else {
        await api.createTravelSchedule(data);
        Alert.alert(
          t('common.success') || '成功',
          t('travel.createSuccess') || '行程创建成功',
          [{ text: t('common.ok') || '确定', onPress: () => {
            resetForm();
            loadSchedules();
          }}]
        );
      }
    } catch (error: any) {
      console.error('[Travel] Failed to submit:', error);
      
      // Check if it's a date overlap error
      if (error.responseData?.message && error.responseData.message.includes('重叠')) {
        Alert.alert(
          t('travel.dateOverlap') || '日期重叠',
          error.responseData.message
        );
      } else {
        const errorMessage = error.responseData?.error || error.responseData?.message || error.message || t('travel.saveFailed') || '保存失败';
        Alert.alert(t('travel.saveFailed') || '保存失败', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (schedule: TravelSchedule) => {
    // Prevent deleting past schedules in "my" view mode
    if (viewMode === 'my') {
      const endDate = parseDate(schedule.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = endDate < today;
      
      if (isPast) {
        Alert.alert(
          t('common.tip') || '提示',
          '已过去的行程不能删除'
        );
        return;
      }
    }
    
    Alert.alert(
      t('common.confirm') || '确认',
      t('travel.confirmDelete') || '确定要删除这条行程吗？',
      [
        { text: t('common.cancel') || '取消', style: 'cancel' },
        {
          text: t('common.delete') || '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTravelSchedule(schedule.id);
              Alert.alert(
                t('common.success') || '成功',
                t('travel.deleteSuccess') || '行程删除成功',
                [{ text: t('common.ok') || '确定', onPress: loadSchedules }]
              );
            } catch (error: any) {
              console.error('[Travel] Failed to delete:', error);
              const errorMessage = error.responseData?.error || error.message || t('travel.deleteFailed') || '删除失败';
              Alert.alert(t('travel.deleteFailed') || '删除失败', errorMessage);
            }
          },
        },
      ]
    );
  };

  const getUserDisplayName = (schedule: TravelSchedule): string => {
    if (schedule.user) {
      return schedule.user.nameZh || schedule.user.nameEn || schedule.user.name || schedule.user.phoneNumber;
    }
    return '';
  };

  // Filter schedules based on view mode
  // In "all" view mode, filter out past schedules
  const filteredSchedules = useMemo(() => {
    if (viewMode === 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare dates only
      return schedules.filter(schedule => {
        const endDate = parseDate(schedule.endDate);
        return endDate >= today; // Only show schedules that haven't completely passed
      });
    }
    return schedules; // In "my" view mode, show all schedules (including past ones)
  }, [schedules, viewMode]);

  const renderScheduleItem = ({ item }: { item: TravelSchedule }) => {
    // In "my" view mode, all schedules belong to the current user
    // In "all" view mode, check if the schedule belongs to current user
    const isMySchedule = viewMode === 'my' || item.userId === user?.id;
    const displayName = getUserDisplayName(item);

    // Check if the schedule has completely passed (end date is before today)
    const endDate = parseDate(item.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    const isPast = endDate < today;

    // Debug log
    console.log('[Travel] renderScheduleItem:', {
      itemUserId: item.userId,
      userid: user?.id,
      isMySchedule,
      viewMode,
      isPast,
    });

    return (
      <View style={[
        styles.scheduleItem, 
        { backgroundColor: colors.card, borderColor: colors.border },
        isPast && viewMode === 'my' && { opacity: 0.5 }
      ]}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleInfo}>
            <Text style={[
              styles.scheduleDate, 
              { 
                color: isPast && viewMode === 'my' ? colors.textSecondary : colors.text, 
                fontSize: getFontSizeValue(16) 
              }
            ]}>
              {formatDisplayDate(item.startDate)} - {formatDisplayDate(item.endDate)}
            </Text>
            {viewMode === 'all' && displayName && (
              <Text style={[styles.scheduleUser, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {displayName}
              </Text>
            )}
          </View>
          {isMySchedule && !(isPast && viewMode === 'my') && (
            <View style={styles.scheduleActions}>
              <TouchableOpacity
                onPress={() => openForm(item)}
                style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              >
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={[styles.actionButton, { backgroundColor: '#ff4444' + '20' }]}
              >
                <Ionicons name="trash" size={18} color="#ff4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {item.destination && (
          <Text style={[
            styles.scheduleDestination, 
            { 
              color: isPast && viewMode === 'my' ? colors.textSecondary : colors.text, 
              fontSize: getFontSizeValue(14) 
            }
          ]}>
            <Ionicons name="location" size={14} color={isPast && viewMode === 'my' ? colors.textSecondary : colors.primary} /> {item.destination}
          </Text>
        )}
        {item.notes && (
          <Text style={[styles.scheduleNotes, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
            {item.notes}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Stack.Screen
        options={{
          title: t('travel.title') || '行程表',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />, // 使用统一的返回按钮组件
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* View Mode Toggle */}
        <View style={[styles.viewModeContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'my' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('my')}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'my' ? '#fff' : colors.text, fontSize: getFontSizeValue(14) },
              ]}
            >
              {t('travel.mySchedules', { defaultValue: '我的行程' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'all' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('all')}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'all' ? '#fff' : colors.text, fontSize: getFontSizeValue(14) },
              ]}
            >
              {t('travel.allSchedules', { defaultValue: '全部行程' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === 'availability' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('availability')}
          >
            <Text
              style={[
                styles.viewModeText,
                { color: viewMode === 'availability' ? '#fff' : colors.text, fontSize: getFontSizeValue(14) },
              ]}
            >
              {t('travel.availability', { defaultValue: '出城的人' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        {viewMode === 'my' && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => openForm()}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={[styles.addButtonText, { fontSize: getFontSizeValue(16) }]}>
              {t('travel.addSchedule') || '添加行程'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Availability View */}
        {viewMode === 'availability' && (
          <ScrollView 
            style={styles.availabilityContainer}
            contentContainerStyle={styles.availabilityContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Calendar */}
            <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Month Navigation */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth('prev')}>
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.calendarMonth, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                  {currentMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
                </Text>
                <TouchableOpacity onPress={() => changeMonth('next')}>
                  <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Weekday Headers */}
              <View style={styles.calendarWeekdays}>
                {(t('travel.weekdays', { returnObjects: true }) as string[] || ['日', '一', '二', '三', '四', '五', '六']).map((day, index) => (
                  <Text key={index} style={[styles.calendarWeekday, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Days */}
              <View style={styles.calendarDays}>
                {getCalendarDays().map((day, index) => {
                  const isSelected = formatDate(day.date) === formatDate(selectedDate);
                  const isToday = formatDate(day.date) === formatDate(new Date());
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        !day.isCurrentMonth && { opacity: 0.3 },
                        isSelected && { backgroundColor: colors.primary },
                        isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                      ]}
                      onPress={() => handleDateSelect(day.date)}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          { color: day.isCurrentMonth ? colors.text : colors.textSecondary, fontSize: getFontSizeValue(16) },
                          isSelected && { color: '#fff' },
                        ]}
                      >
                        {day.date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Availability List */}
            {loadingAvailability ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(16) }]}>
                  {t('travel.loading') || '加载中...'}
                </Text>
              </View>
            ) : availabilityData ? (
              <View style={styles.availabilityList}>
                <Text style={[styles.availabilityDateTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                  {formatDisplayDate(availabilityData.date)} {t('travel.availability') || '出城的人'}
                </Text>
                <FlatList
                  data={availabilityData.users}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={[styles.availabilityItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.availabilityItemHeader}>
                        <View style={styles.availabilityStatus}>
                          <Ionicons name="airplane-outline" size={20} color={colors.primary} />
                          <Text style={[styles.availabilityName, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                            {item.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.availabilityStatusText,
                            { color: colors.primary, fontSize: getFontSizeValue(14) },
                          ]}
                        >
                          {t('travel.unavailable') || '出城'}
                        </Text>
                      </View>
                      {item.schedule && (
                        <View style={[styles.availabilityDetails, { borderTopColor: colors.border }]}>
                          <Text style={[styles.availabilityDestination, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                            <Ionicons name="location" size={14} color={colors.textSecondary} />{' '}
                            {item.schedule.destination || t('travel.noDestination') || '未指定目的地'}
                          </Text>
                          <Text style={[styles.availabilityDateRange, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                            {formatDisplayDate(item.schedule.startDate)} - {formatDisplayDate(item.schedule.endDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(16) }]}>
                  {t('travel.selectDate') || '请选择日期查看出城情况'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Schedules List - Only show when NOT in availability view */}
        {viewMode !== 'availability' && (
          <>
            {loadingSchedules ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredSchedules.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(16) }]}>
                  {t('travel.noSchedules') || '暂无行程记录'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredSchedules}
                renderItem={renderScheduleItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshing={loadingSchedules}
                onRefresh={loadSchedules}
              />
            )}
          </>
        )}

        {/* Form Modal */}
        <Modal
          key={showForm ? 'modal-open' : 'modal-closed'}
          visible={showForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowForm(false);
            setKeyboardHeight(0);
          }}
          statusBarTranslucent={false}
        >
          <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={styles.modalKeyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.background,
                    paddingTop: 0,
                    marginTop: 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.modalHeader,
                    { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 0) },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setShowForm(false);
                      setKeyboardHeight(0);
                    }}
                    style={styles.modalHeaderButton}
                  >
                    <Text style={[styles.modalHeaderButtonText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                      {t('common.cancel') || '取消'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                    {editingSchedule
                      ? t('travel.editSchedule') || '编辑行程'
                      : t('travel.addSchedule') || '添加行程'}
                  </Text>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={styles.modalHeaderButton}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.modalHeaderButtonText, { color: colors.primary, fontSize: getFontSizeValue(16) }]}>
                        {t('common.save') || '保存'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.formContent}
                  contentContainerStyle={[
                    styles.formContentContainer,
                    { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 16 },
                  ]}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled={true}
                >
                {/* Start Date */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {t('travel.startDate') || '开始日期'} *
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                      {formatDisplayDate(formatDate(startDate))}
                    </Text>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setStartDate(selectedDate);
                          if (selectedDate > endDate) {
                            setEndDate(selectedDate);
                          }
                        }
                      }}
                    />
                  )}
                </View>

                {/* End Date */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {t('travel.endDate') || '结束日期'} *
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                      {formatDisplayDate(formatDate(endDate))}
                    </Text>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      minimumDate={startDate}
                      onChange={(event, selectedDate) => {
                        setShowEndDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setEndDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>

                {/* Destination */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {t('travel.destination') || '目的地'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, fontSize: getFontSizeValue(16) }]}
                    value={destination}
                    onChangeText={setDestination}
                    placeholder={t('travel.destinationPlaceholder') || '请输入目的地（可选）'}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {t('travel.notes') || '备注'}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, fontSize: getFontSizeValue(16) },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t('travel.notesPlaceholder') || '请输入备注（可选）'}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Delete Button - Only show when editing */}
                {editingSchedule && (
                  <View style={[styles.deleteButtonContainer, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.deleteButton, { borderColor: '#ff4444' }]}
                      onPress={() => {
                        setShowForm(false);
                        setKeyboardHeight(0);
                        handleDelete(editingSchedule);
                      }}
                      disabled={submitting}
                    >
                      <Ionicons name="trash" size={18} color="#ff4444" />
                      <Text style={[styles.deleteButtonText, { color: '#ff4444', fontSize: getFontSizeValue(16) }]}>
                        {t('common.delete') || '删除'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 8,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewModeText: {
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  scheduleItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDate: {
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleUser: {
  },
  scheduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDestination: {
    marginTop: 8,
  },
  scheduleNotes: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-start',
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    marginTop: 0,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalHeaderButton: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  modalHeaderButtonText: {
    fontWeight: '500',
  },
  modalTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  formContent: {
    flex: 1,
  },
  formContentContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
  },
  deleteButtonContainer: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    width: '100%',
  },
  deleteButtonText: {
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Availability view styles
  availabilityContainer: {
    flex: 1,
  },
  availabilityContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  calendarContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 350, // Ensure calendar has enough height
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonth: {
    fontWeight: '600',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    minHeight: 40, // Minimum height for calendar days
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  calendarDayText: {
    fontWeight: '500',
  },
  availabilityList: {
    padding: 16,
  },
  availabilityDateTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  availabilityItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  availabilityItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityName: {
    fontWeight: '500',
  },
  availabilityStatusText: {
    fontWeight: '500',
  },
  availabilityDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  availabilityDestination: {
    marginBottom: 4,
  },
  availabilityDateRange: {
  },
});


