import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackButton from '../components/BackButton';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type MeetingType = 'table' | 'homeMeeting' | 'prayer';
type Scope = 'full_congregation' | 'district' | 'small_group';

interface AttendanceRecord {
  id: number;
  date: string;
  meetingType: MeetingType;
  scope: Scope;
  scopeValue: string | null;
  adultCount: number;
  youthChildCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Permission check: only member role cannot access, all other roles can access
  const canAccess = user?.role !== 'member';

  // Redirect if no permission
  useEffect(() => {
    if (user && !canAccess) {
      Alert.alert(
        t('common.tip') || '提示',
        '权限不足，只有管理员和负责人可以访问此功能',
        [
          {
            text: t('common.cancel') || '确定',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [user, canAccess, router, t]);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [showMeetingTypePicker, setShowMeetingTypePicker] = useState(false);
  const [scope, setScope] = useState<Scope | null>(null);
  const [scopeValue, setScopeValue] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [adultCount, setAdultCount] = useState<string>('');
  const [youthChildCount, setYouthChildCount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Data state - hard-coded districts and groups
  const districts = ['A', 'B', 'C', 'D', 'E'];
  
  // Get groups based on selected district
  const getGroupsForDistrict = (district: string | null): string[] => {
    if (district === 'A') {
      return ['1', '2', '3', '4', '5', '亲子排'];
    }
    if (district === 'B') {
      return ['1', '2', '3', '4'];
    }
    if (district === 'C') {
      return ['1', '2', '3', '4'];
    }
    if (district === 'D') {
      return ['1', '2', '亲子'];
    }
    return ['1', '2', '3', '4', '5'];
  };

  // Records state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  
  // ScrollView ref for scrolling to top when editing
  const scrollViewRef = useRef<ScrollView>(null);

  // Load records on mount
  useEffect(() => {
    if (canAccess) {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // Auto-set scope when meeting type changes
  // Don't reset district/group when editing an existing record
  useEffect(() => {
    // Skip auto-reset if we're editing a record (to preserve existing values)
    if (editingRecord) {
      return;
    }
    
    if (meetingType === 'table') {
      // 主日聚会 → 默认"全会众"
      setScope('full_congregation');
      setScopeValue(null);
      setSelectedDistrict(null);
      setSelectedGroup(null);
    } else if (meetingType === 'homeMeeting' || meetingType === 'prayer') {
      // 小排聚会和祷告聚会 → 都需要选择大区
      // 祷告聚会+B大区 → 只需要大区，不需要小排
      // 其他情况 → 需要大区+小排
      setScopeValue(null);
      setSelectedDistrict(null);
      setSelectedGroup(null);
      // Scope will be set based on district selection
    } else {
      setScope(null);
      setScopeValue(null);
      setSelectedDistrict(null);
      setSelectedGroup(null);
    }
  }, [meetingType, editingRecord]);

  // Update scope and scopeValue based on meeting type and district selection
  useEffect(() => {
    if (editingRecord) {
      return;
    }
    
    if (meetingType === 'prayer' && (selectedDistrict === 'B' || selectedDistrict === 'D')) {
      // 祷告聚会+B大区或D大区 → 只统计大区级别
      setScope('district');
      setScopeValue(selectedDistrict);
      setSelectedGroup(null); // Clear group selection
    } else if (meetingType === 'homeMeeting' || meetingType === 'prayer') {
      // 小排聚会或其他祷告聚会 → 需要小排
      if (selectedDistrict && selectedGroup) {
        setScope('small_group');
        setScopeValue(`${selectedDistrict}${selectedGroup}`);
      } else if (selectedDistrict) {
        // District selected but group not selected yet
        setScope('small_group');
        setScopeValue(null);
      } else {
        setScope('small_group');
        setScopeValue(null);
      }
    }
  }, [meetingType, selectedDistrict, selectedGroup, editingRecord]);

  // Note: scopeValue is now updated in the useEffect above based on meeting type and district

  // Reset group selection when district changes
  useEffect(() => {
    if (selectedDistrict) {
      const availableGroups = getGroupsForDistrict(selectedDistrict);
      // If current selected group is not in the new list, reset it
      if (selectedGroup && !availableGroups.includes(selectedGroup)) {
        setSelectedGroup(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);


  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      console.log('[Attendance] Loading records...');
      const response = await api.getAttendanceRecords(50, 0);
      console.log('[Attendance] Response:', response);
      if (response.success) {
        console.log('[Attendance] Records loaded:', response.data.records?.length || 0);
        setRecords(response.data.records || []);
      } else {
        console.error('[Attendance] Response not successful:', response);
        Alert.alert(t('attendance.loadRecordsFailed') || '加载记录失败', (response as any).message || '未知错误');
      }
    } catch (error: any) {
      console.error('[Attendance] Failed to load records:', error);
      console.error('[Attendance] Error details:', {
        message: error.message,
        status: error.status,
        responseData: error.responseData,
      });
      // Show more detailed error message if available
      const errorMessage = error.responseData?.error || error.message || '网络错误';
      Alert.alert(t('attendance.loadRecordsFailed') || '加载记录失败', errorMessage);
    } finally {
      setLoadingRecords(false);
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter records to show only those within the last 3 days
  const getFilteredRecords = (): AttendanceRecord[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
    
    return records.filter((record) => {
      // Parse record date manually to avoid timezone issues
      // record.date is in format "YYYY-MM-DD", parse it as local date
      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day); // month is 0-indexed
      recordDate.setHours(0, 0, 0, 0);
      
      // Calculate days difference
      const daysDiff = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Show records within the last 3 days (0, 1, 2 days ago)
      // If today is Nov 7, a record from Nov 4 (3 days ago) should be hidden
      return daysDiff < 3;
    });
  };

  // Check if district and group selectors should be shown
  const shouldShowDistrictAndGroup = (): boolean => {
    return meetingType === 'homeMeeting' || meetingType === 'prayer';
  };

  // Check if group selector should be shown
  // Hide group selector for prayer meeting + B or D district
  const shouldShowGroup = (): boolean => {
    if (!shouldShowDistrictAndGroup()) {
      return false;
    }
    // For prayer meeting with B or D district, don't show group selector
    if (meetingType === 'prayer' && (selectedDistrict === 'B' || selectedDistrict === 'D')) {
      return false;
    }
    return true;
  };

  const validateForm = (): boolean => {
    if (!date) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidDate') || '请选择日期');
      return false;
    }

    // Check if date is in the future (compare date strings to avoid timezone issues)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Block future dates
    if (selectedDate > today) {
      Alert.alert(t('common.tip') || '提示', t('attendance.futureDateNotAllowed') || '不能选择未来日期');
      return false;
    }
    
    // Check if date is more than 3 days ago
    const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 3) {
      Alert.alert(t('common.tip') || '提示', t('attendance.tooLateToSubmit') || '提交太晚了，只能提交最近3天的记录');
      return false;
    }

    if (!meetingType) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidMeetingType') || '请选择聚会类型');
      return false;
    }

    if (!scope) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidScope') || '请选择统计层级');
      return false;
    }

    if (shouldShowDistrictAndGroup()) {
      if (!selectedDistrict) {
        Alert.alert(t('common.tip') || '提示', t('attendance.invalidDistrict') || '请选择大区');
        return false;
      }
      // Only require group selection if group selector should be shown
      if (shouldShowGroup() && !selectedGroup) {
        Alert.alert(t('common.tip') || '提示', t('attendance.invalidGroup') || '请选择小排');
        return false;
      }
    }

    const adultCountNum = parseInt(adultCount);
    if (isNaN(adultCountNum) || adultCountNum < 0) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidAdultCount') || '请输入有效的成年人数量');
      return false;
    }

    const youthChildCountNum = parseInt(youthChildCount);
    if (isNaN(youthChildCountNum) || youthChildCountNum < 0) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidYouthChildCount') || '请输入有效的青少年或儿童数量');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const response = await api.createOrUpdateAttendance({
        date: formatDate(date),
        meetingType: meetingType!,
        scope: scope!,
        scopeValue: scope === 'full_congregation' ? null : scopeValue,
        adultCount: parseInt(adultCount),
        youthChildCount: parseInt(youthChildCount),
      });

      if (response.success) {
        Alert.alert(t('common.tip') || '提示', t('attendance.submitSuccess') || '提交成功');
        // Clear form
        setDate(new Date());
        setMeetingType(null);
        setScope(null);
        setScopeValue(null);
        setSelectedDistrict(null);
        setSelectedGroup(null);
        setAdultCount('');
        setYouthChildCount('');
        setEditingRecord(null);
        // Reload records
        loadRecords();
      } else {
        Alert.alert(t('attendance.submitFailed') || '提交失败', (response as any).message || '未知错误');
      }
    } catch (error: any) {
      console.error('Failed to submit attendance:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        responseData: error.responseData,
      });
      // Show more detailed error message if available
      const errorMessage = error.responseData?.error || error.message || '网络错误';
      Alert.alert(t('attendance.submitFailed') || '提交失败', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    // Set editingRecord first to prevent useEffect from resetting district/group
    setEditingRecord(record);
    
    // Parse date string manually to avoid timezone issues
    // record.date is in format "YYYY-MM-DD", parse it as local date
    const [year, month, day] = record.date.split('-').map(Number);
    const recordDate = new Date(year, month - 1, day); // month is 0-indexed
    setDate(recordDate);
    
    // Set meetingType, scope, and scopeValue first
    setMeetingType(record.meetingType);
    setScope(record.scope);
    setScopeValue(record.scopeValue);
    
    // Parse scopeValue to extract district and group
    // For prayer meeting + B district, scopeValue is just the district (e.g., 'B')
    // For other cases, scopeValue is district + group (e.g., 'A1', 'B2')
    if (record.scope === 'district' && record.scopeValue) {
      // District-level scope (prayer + B district)
      setSelectedDistrict(record.scopeValue);
      setSelectedGroup(null);
    } else if (record.scopeValue && record.scopeValue.length >= 2) {
      // Small group scope
      const district = record.scopeValue[0];
      const group = record.scopeValue.substring(1);
      setSelectedDistrict(district);
      setSelectedGroup(group);
    } else {
      setSelectedDistrict(null);
      setSelectedGroup(null);
    }
    
    setAdultCount(record.adultCount.toString());
    setYouthChildCount(record.youthChildCount.toString());
    
    // Scroll to top of form
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const handleDelete = (record: AttendanceRecord) => {
    Alert.alert(
      t('common.tip') || '提示',
      t('attendance.deleteConfirm') || '确定要删除这条记录吗？',
      [
        {
          text: t('common.cancel') || '取消',
          style: 'cancel',
        },
        {
          text: t('attendance.deleteRecord') || '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteAttendance(record.id) as { success: boolean; message?: string };
              if (response.success) {
                Alert.alert(t('common.tip') || '提示', t('attendance.deleteSuccess') || '删除成功');
                loadRecords();
              } else {
                Alert.alert(t('attendance.deleteFailed') || '删除失败', response.message || '未知错误');
              }
            } catch (error: any) {
              console.error('Failed to delete record:', error);
              Alert.alert(t('attendance.deleteFailed') || '删除失败', error.message || '网络错误');
            }
          },
        },
      ]
    );
  };

  const getMeetingTypeLabel = (type: MeetingType): string => {
    return t(`attendance.meetingType.${type}`) || type;
  };


  if (!canAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.noPermissionContainer}>
          <Text style={[styles.noPermissionText, { color: colors.text }]}>权限不足</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Stack.Screen
        options={{
          title: t('attendance.title') || '人数统计',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />, // 使用统一的返回按钮组件
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Form Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(24) }]}>
                {editingRecord ? (t('attendance.editRecordTitle') || '编辑记录') : (t('attendance.newRecord') || '新增记录')}
              </Text>
              {(editingRecord || meetingType || selectedDistrict || selectedGroup || adultCount || youthChildCount) && (
                <TouchableOpacity
                  onPress={() => {
                    // Clear form
                    setDate(new Date());
                    setMeetingType(null);
                    setScope(null);
                    setScopeValue(null);
                    setSelectedDistrict(null);
                    setSelectedGroup(null);
                    setAdultCount('');
                    setYouthChildCount('');
                    setEditingRecord(null);
                  }}
                  style={styles.clearButton}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                {t('attendance.date') || '日期'} *
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    setShowDatePicker(true);
                  } else {
                    setShowDatePicker(true);
                  }
                }}>
                <Text style={[styles.inputText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                  {formatDate(date)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Meeting Type Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                {t('attendance.meetingType') || '聚会类型'} *
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => setShowMeetingTypePicker(true)}>
                <Text style={[styles.inputText, { color: meetingType ? colors.text : colors.textTertiary, fontSize: getFontSizeValue(20) }]}>
                  {meetingType ? getMeetingTypeLabel(meetingType) : t('attendance.selectMeetingType') || '选择聚会类型'}
                </Text>
                <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* District and Group Pickers (for homeMeeting and prayer) */}
            {shouldShowDistrictAndGroup() && (
              <>
                {/* District Picker */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                    {t('attendance.selectDistrict') || '选择大区'} *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.inputWrapper,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                    onPress={() => setShowDistrictPicker(true)}>
                    <Text style={[styles.inputText, { color: selectedDistrict ? colors.text : colors.textTertiary, fontSize: getFontSizeValue(20) }]}>
                      {selectedDistrict || t('attendance.selectDistrict') || '选择大区'}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Group Picker - Only show if shouldShowGroup() returns true */}
                {shouldShowGroup() && (
                  <View style={styles.inputContainer}>
                    <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                      {t('attendance.selectGroup') || '选择小排'} *
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.inputWrapper,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => setShowGroupPicker(true)}>
                      <Text style={[styles.inputText, { color: selectedGroup ? colors.text : colors.textTertiary, fontSize: getFontSizeValue(20) }]}>
                        {selectedGroup || t('attendance.selectGroup') || '选择小排'}
                      </Text>
                      <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Adult Count */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                {t('attendance.adultCount') || '出席的成年人'} *
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, fontSize: getFontSizeValue(20) }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={adultCount}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setAdultCount(numericValue);
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Youth/Child Count */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                {t('attendance.youthChildCount') || '出席的青少年或儿童'} *
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, fontSize: getFontSizeValue(20) }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={youthChildCount}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setYouthChildCount(numericValue);
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.submitButtonText, { fontSize: getFontSizeValue(20) }]}>
                  {t('attendance.submit') || '提交'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* History Section */}
          <View style={[styles.historySection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(24) }]}>
              {t('attendance.history') || '历史记录'}
            </Text>

            {loadingRecords ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
                  {t('attendance.loadingRecords') || '加载记录中...'}
                </Text>
              </View>
            ) : getFilteredRecords().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
                  {t('attendance.noRecords') || '暂无记录'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={getFilteredRecords()}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.recordItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.recordHeader}>
                      {/* Display the selected date (item.date), NOT the creation date (item.createdAt) */}
                      <Text style={[styles.recordDate, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                        {item.date}
                      </Text>
                      <View style={styles.recordActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEdit(item)}>
                          <Ionicons name="create-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDelete(item)}>
                          <Ionicons name="trash-outline" size={20} color={colors.error || '#ff4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.recordType, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
                      {getMeetingTypeLabel(item.meetingType)}
                      {item.scope === 'full_congregation' && ' - 全会众'}
                      {item.scope === 'small_group' && item.scopeValue && ` - ${item.scopeValue}`}
                    </Text>
                    <View style={styles.recordCounts}>
                      <Text style={[styles.recordCount, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                        成年人: {item.adultCount}
                      </Text>
                      <Text style={[styles.recordCount, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                        青少年/儿童: {item.youthChildCount}
                      </Text>
                    </View>
                  </View>
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.datePickerModalOverlay}>
            <View style={[styles.datePickerModalContent, { backgroundColor: colors.card }]}>
              <View style={styles.datePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerModalCancel, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                    {t('common.cancel') || '取消'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerModalTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
                  {t('attendance.selectDate') || '选择日期'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                  }}>
                  <Text style={[styles.datePickerModalDone, { color: colors.primary, fontSize: getFontSizeValue(20) }]}>
                    {t('common.ok') || '确定'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )
      )}

      {/* Meeting Type Picker Modal */}
      <Modal
        visible={showMeetingTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMeetingTypePicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowMeetingTypePicker(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
                {t('attendance.selectMeetingType') || '选择聚会类型'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMeetingTypePicker(false)}
                style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {(['table', 'homeMeeting', 'prayer'] as MeetingType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  meetingType === type && { backgroundColor: colors.background },
                ]}
                onPress={() => {
                  setMeetingType(type);
                  setShowMeetingTypePicker(false);
                }}>
                <Text style={[styles.modalOptionText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                  {getMeetingTypeLabel(type)}
                </Text>
                {meetingType === type && (
                  <Ionicons name="checkmark" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: colors.border }]}
              onPress={() => setShowMeetingTypePicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('common.cancel') || '取消'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* District Picker Modal */}
      <Modal
        visible={showDistrictPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistrictPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDistrictPicker(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
                {t('attendance.selectDistrict') || '选择大区'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDistrictPicker(false)}
                style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {districts.length === 0 ? (
              <View style={styles.modalOption}>
                <Text style={[styles.modalOptionText, { color: colors.textTertiary, fontSize: getFontSizeValue(20) }]}>
                  {t('attendance.noRecords') || '暂无选项'}
                </Text>
              </View>
            ) : (
              districts.map((district) => (
                <TouchableOpacity
                  key={district}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedDistrict === district && { backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    setSelectedDistrict(district);
                    setShowDistrictPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                    {district}
                  </Text>
                  {selectedDistrict === district && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: colors.border }]}
              onPress={() => setShowDistrictPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('common.cancel') || '取消'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Group Picker Modal */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowGroupPicker(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
                {t('attendance.selectGroup') || '选择小排'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowGroupPicker(false)}
                style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {getGroupsForDistrict(selectedDistrict).length === 0 ? (
              <View style={styles.modalOption}>
                <Text style={[styles.modalOptionText, { color: colors.textTertiary, fontSize: getFontSizeValue(20) }]}>
                  {selectedDistrict ? (t('attendance.selectDistrictFirst') || '请先选择大区') : (t('attendance.noRecords') || '暂无选项')}
                </Text>
              </View>
            ) : (
              getGroupsForDistrict(selectedDistrict).map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedGroup === group && { backgroundColor: colors.background },
                  ]}
                  onPress={() => {
                    setSelectedGroup(group);
                    setShowGroupPicker(false);
                  }}>
                  <Text style={[styles.modalOptionText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                    {group}
                  </Text>
                  {selectedGroup === group && (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.modalCancelButton, { borderTopColor: colors.border }]}
              onPress={() => setShowGroupPicker(false)}>
              <Text style={[styles.modalCancelText, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
                {t('common.cancel') || '取消'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPermissionText: {
    fontSize: 16,
  },
  formSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  input: {
    flex: 1,
    padding: 0,
  },
  inputText: {
    flex: 1,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  historySection: {
    padding: 16,
    borderRadius: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  recordItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontWeight: 'bold',
  },
  recordActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  recordType: {
    marginBottom: 8,
  },
  recordCounts: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  recordCount: {
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    flex: 1,
  },
  modalCancelButton: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontWeight: '600',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  datePickerModalTitle: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  datePickerModalCancel: {
    paddingHorizontal: 16,
  },
  datePickerModalDone: {
    paddingHorizontal: 16,
    fontWeight: '600',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
});
