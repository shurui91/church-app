import React, { useState, useEffect } from 'react';
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
  const { t } = useTranslation();
  const { user } = useAuth();

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

  // View mode: 'my' (my schedules) or 'all' (all schedules)
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  // Load schedules on mount
  useEffect(() => {
    loadSchedules();
  }, [viewMode]);

  const loadSchedules = async () => {
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
          (response as any).message || '未知错误'
        );
      }
    } catch (error: any) {
      console.error('[Travel] Failed to load schedules:', error);
      const errorMessage = error.responseData?.error || error.message || '网络错误';
      Alert.alert(t('travel.loadFailed') || '加载失败', errorMessage);
    } finally {
      setLoadingSchedules(false);
    }
  };

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

  const resetForm = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setDestination('');
    setNotes('');
    setEditingSchedule(null);
    setShowForm(false);
  };

  const openForm = (schedule?: TravelSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setStartDate(parseDate(schedule.startDate));
      setEndDate(parseDate(schedule.endDate));
      setDestination(schedule.destination || '');
      setNotes(schedule.notes || '');
    } else {
      resetForm();
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
      const errorMessage = error.responseData?.error || error.message || '保存失败';
      Alert.alert(t('travel.saveFailed') || '保存失败', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (schedule: TravelSchedule) => {
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
              const errorMessage = error.responseData?.error || error.message || '删除失败';
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

  const renderScheduleItem = ({ item }: { item: TravelSchedule }) => {
    // In "my" view mode, all schedules belong to the current user
    // In "all" view mode, check if the schedule belongs to current user
    const isMySchedule = viewMode === 'my' || item.userId === user?.id;
    const displayName = getUserDisplayName(item);

    // Debug log
    console.log('[Travel] renderScheduleItem:', {
      itemUserId: item.userId,
      userid: user?.id,
      isMySchedule,
      viewMode,
    });

    return (
      <View style={[styles.scheduleItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleInfo}>
            <Text style={[styles.scheduleDate, { color: colors.text }]}>
              {formatDisplayDate(item.startDate)} - {formatDisplayDate(item.endDate)}
            </Text>
            {viewMode === 'all' && displayName && (
              <Text style={[styles.scheduleUser, { color: colors.textSecondary }]}>
                {displayName}
              </Text>
            )}
          </View>
          {isMySchedule && (
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
          <Text style={[styles.scheduleDestination, { color: colors.text }]}>
            <Ionicons name="location" size={14} color={colors.primary} /> {item.destination}
          </Text>
        )}
        {item.notes && (
          <Text style={[styles.scheduleNotes, { color: colors.textSecondary }]}>
            {item.notes}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: t('travel.title') || '行程表',
          headerShown: true,
          headerBackTitle: '返回',
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
                { color: viewMode === 'my' ? '#fff' : colors.text },
              ]}
            >
              {t('travel.mySchedules') || '我的行程'}
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
                { color: viewMode === 'all' ? '#fff' : colors.text },
              ]}
            >
              {t('travel.allSchedules') || '全部行程'}
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
            <Text style={styles.addButtonText}>
              {t('travel.addSchedule') || '添加行程'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Schedules List */}
        {loadingSchedules ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('travel.noSchedules') || '暂无行程记录'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={schedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshing={loadingSchedules}
            onRefresh={loadSchedules}
          />
        )}

        {/* Form Modal */}
        <Modal
          visible={showForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowForm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingSchedule
                    ? t('travel.editSchedule') || '编辑行程'
                    : t('travel.addSchedule') || '添加行程'}
                </Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                {/* Start Date */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('travel.startDate') || '开始日期'} *
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
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
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('travel.endDate') || '结束日期'} *
                  </Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
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
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('travel.destination') || '目的地'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={destination}
                    onChangeText={setDestination}
                    placeholder={t('travel.destinationPlaceholder') || '请输入目的地（可选）'}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {t('travel.notes') || '备注'}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
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
              </ScrollView>

              {/* Form Actions */}
              <View style={[styles.formActions, { borderTopColor: colors.border }]}>
                {editingSchedule && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#ff4444' }]}
                    onPress={() => {
                      setShowForm(false);
                      handleDelete(editingSchedule);
                    }}
                    disabled={submitting}
                  >
                    <Ionicons name="trash" size={18} color="#ff4444" />
                    <Text style={[styles.deleteButtonText, { color: '#ff4444' }]}>
                      {t('common.delete') || '删除'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                    {t('common.cancel') || '取消'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {t('common.save') || '保存'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    margin: 16,
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
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleUser: {
    fontSize: 14,
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
    fontSize: 14,
    marginTop: 8,
  },
  scheduleNotes: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
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
    fontSize: 16,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
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
  },
  deleteButtonText: {
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

