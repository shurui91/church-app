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
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type MeetingType = 'table' | 'homeMeeting' | 'prayer';

interface AttendanceRecord {
  id: number;
  date: string;
  meetingType: MeetingType;
  adultCount: number;
  youthChildCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();

  // Permission check
  const canAccess = hasRole(['super_admin', 'admin', 'leader']) && user?.role !== 'member' && user?.role !== 'other';

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
  }, [user, canAccess]);

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType | null>(null);
  const [showMeetingTypePicker, setShowMeetingTypePicker] = useState(false);
  const [adultCount, setAdultCount] = useState<string>('');
  const [youthChildCount, setYouthChildCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Records state
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Load records on mount
  useEffect(() => {
    if (canAccess) {
      loadRecords();
    }
  }, [canAccess]);

  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await api.getAttendanceRecords(50, 0);
      if (response.success) {
        setRecords(response.data.records);
      }
    } catch (error: any) {
      console.error('Failed to load records:', error);
      Alert.alert(t('attendance.loadRecordsFailed') || '加载记录失败', error.message);
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

  const validateForm = (): boolean => {
    if (!date) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidDate') || '请选择日期');
      return false;
    }

    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate > today) {
      Alert.alert(t('common.tip') || '提示', t('attendance.futureDateNotAllowed') || '不能选择未来日期');
      return false;
    }

    if (!meetingType) {
      Alert.alert(t('common.tip') || '提示', t('attendance.invalidMeetingType') || '请选择聚会类型');
      return false;
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
        adultCount: parseInt(adultCount),
        youthChildCount: parseInt(youthChildCount),
        notes: notes || undefined,
      });

      if (response.success) {
        Alert.alert(t('common.tip') || '提示', t('attendance.submitSuccess') || '提交成功');
        // Clear form
        setDate(new Date());
        setMeetingType(null);
        setAdultCount('');
        setYouthChildCount('');
        setNotes('');
        setEditingRecord(null);
        // Reload records
        loadRecords();
      } else {
        Alert.alert(t('attendance.submitFailed') || '提交失败', response.message || '未知错误');
      }
    } catch (error: any) {
      console.error('Failed to submit attendance:', error);
      Alert.alert(t('attendance.submitFailed') || '提交失败', error.message || '网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    const recordDate = new Date(record.date);
    setDate(recordDate);
    setMeetingType(record.meetingType);
    setAdultCount(record.adultCount.toString());
    setYouthChildCount(record.youthChildCount.toString());
    setNotes(record.notes || '');
    // Scroll to form
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
              const response = await api.deleteAttendance(record.id);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('attendance.title') || '出席数据上传',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Form Section */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
              {editingRecord ? '编辑记录' : '新增记录'}
            </Text>

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.date') || '日期'} *
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    // On iOS, show picker in a modal
                    setShowDatePicker(true);
                  } else {
                    // On Android, show native picker
                    setShowDatePicker(true);
                  }
                }}>
                <Text style={[styles.inputText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                  {formatDate(date)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Meeting Type Picker */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.meetingType') || '聚会类型'} *
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => setShowMeetingTypePicker(true)}>
                <Text style={[styles.inputText, { color: meetingType ? colors.text : colors.textTertiary, fontSize: getFontSizeValue(16) }]}>
                  {meetingType ? getMeetingTypeLabel(meetingType) : t('attendance.selectMeetingType') || '选择聚会类型'}
                </Text>
                <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Adult Count */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.adultCount') || '出席的成年人'} *
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, fontSize: getFontSizeValue(16) }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={adultCount}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setAdultCount(numericValue);
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Youth/Child Count */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.youthChildCount') || '出席的青少年或儿童'} *
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text, fontSize: getFontSizeValue(16) }]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  value={youthChildCount}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setYouthChildCount(numericValue);
                  }}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.notes') || '备注'}
              </Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text, fontSize: getFontSizeValue(16) }]}
                  placeholder="可选备注"
                  placeholderTextColor={colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
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
                <Text style={[styles.submitButtonText, { fontSize: getFontSizeValue(16) }]}>
                  {t('attendance.submit') || '提交'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* History Section */}
          <View style={[styles.historySection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(20) }]}>
              {t('attendance.history') || '历史记录'}
            </Text>

            {loadingRecords ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                  {t('attendance.loadingRecords') || '加载记录中...'}
                </Text>
              </View>
            ) : records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                  {t('attendance.noRecords') || '暂无记录'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={records}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.recordItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.recordHeader}>
                      <Text style={[styles.recordDate, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
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
                    <Text style={[styles.recordType, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                      {getMeetingTypeLabel(item.meetingType)}
                    </Text>
                    <View style={styles.recordCounts}>
                      <Text style={[styles.recordCount, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                        成年人: {item.adultCount}
                      </Text>
                      <Text style={[styles.recordCount, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                        青少年/儿童: {item.youthChildCount}
                      </Text>
                    </View>
                    {item.notes && (
                      <Text style={[styles.recordNotes, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                        {item.notes}
                      </Text>
                    )}
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
                  <Text style={[styles.datePickerModalCancel, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                    {t('common.cancel') || '取消'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.datePickerModalTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                  {t('attendance.selectDate') || '选择日期'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                  }}>
                  <Text style={[styles.datePickerModalDone, { color: colors.primary, fontSize: getFontSizeValue(16) }]}>
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
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMeetingTypePicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
              {t('attendance.selectMeetingType') || '选择聚会类型'}
            </Text>
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
                <Text style={[styles.modalOptionText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
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
              <Text style={[styles.modalCancelText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                {t('common.cancel') || '取消'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    padding: 16,
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
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
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
  textAreaWrapper: {
    minHeight: 80,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
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
  recordNotes: {
    marginTop: 8,
    fontStyle: 'italic',
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
  },
  modalTitle: {
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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

