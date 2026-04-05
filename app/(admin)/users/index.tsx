import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useFontSize } from '../../src/context/FontSizeContext';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { api } from '../../src/services/api';

const ROLES = ['super_admin', 'admin', 'responsible_one', 'member', 'usher'];

const losAngelesFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const formatDateInLA = (value?: string | null) =>
  value ? losAngelesFormatter.format(new Date(value)) : '—';

const emptyFormState = {
  phoneNumber: '',
  name: '',
  nameZh: '',
  nameTw: '',
  nameEn: '',
  role: 'member',
  district: '',
  groupNum: '',
  email: '',
  status: 'active',
  gender: '',
  birthdate: '',
  joinDate: '',
  preferredLanguage: 'zh',
  notes: '',
};

const FormField = ({ label, value, onChangeText, placeholder, keyboardType }: any) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(0,0,0,0.3)"
      style={styles.formInput}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

export default function AdminUsersScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [formState, setFormState] = useState(() => ({ ...emptyFormState }));
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const canDelete = currentUser?.role === 'super_admin';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsers();
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowered = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        (user.phoneNumber || '').toLowerCase().includes(lowered) ||
        (user.name || '').toLowerCase().includes(lowered) ||
        (user.email || '').toLowerCase().includes(lowered)
    );
  }, [users, searchTerm]);

  const openModal = (user: any | null) => {
    if (user) {
      setSelectedUser(user);
      setFormState({
        phoneNumber: user.phoneNumber || '',
        name: user.name || '',
        nameZh: user.nameZh || '',
        nameTw: user.nameTw || '',
        nameEn: user.nameEn || '',
        role: user.role || 'member',
        district: user.district || '',
        groupNum: user.groupNum || '',
        email: user.email || '',
        status: user.status || 'active',
        gender: user.gender || '',
        birthdate: user.birthdate || '',
        joinDate: user.joinDate || '',
        preferredLanguage: user.preferredLanguage || 'zh',
        notes: user.notes || '',
      });
    } else {
      setSelectedUser(null);
      setFormState({ ...emptyFormState });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!formState.phoneNumber) {
      Alert.alert(t('common.error'), '手机号为必填项');
      return;
    }

    setSaving(true);
    try {
      if (selectedUser) {
        const response = await api.updateUser(selectedUser.id, formState);
        if (!response.success) throw new Error(response.message || '更新失败');
      } else {
        const response = await api.createUser(formState as any);
        if (!response.success) throw new Error(response.message || '创建失败');
      }
      await loadUsers();
      closeModal();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (userToDelete: any) => {
    Alert.alert(
      '确认删除',
      `确定要删除 ${userToDelete.name || userToDelete.phoneNumber}?`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteUser(userToDelete.id);
              await loadUsers();
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }: { item: any }) => (
    <View
      style={[
        styles.userCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight },
      ]}>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
          {item.name || '—'} ({item.phoneNumber})
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          {item.email || '未填写邮箱'} · {item.role} · {item.status}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          简中: {item.nameZh || '—'} · 繁中: {item.nameTw || '—'}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          创建时间（洛杉矶）: {formatDateInLA(item.createdAt)}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          更新时间（洛杉矶）: {formatDateInLA(item.updatedAt)}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          {item.district || '-'} / {item.groupNum || '-'} · {item.preferredLanguage}
        </Text>
        <Text style={[styles.userMeta, { color: colors.textSecondary }]}>
          创建于 {item.createdAt || '未知'} · 最近更新 {item.updatedAt || '未知'}
        </Text>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionChip, { borderColor: colors.primary }]}
          onPress={() => openModal(item)}>
          <Text style={[styles.actionText, { color: colors.primary }]}>编辑</Text>
        </TouchableOpacity>
        {canDelete && currentUser?.id !== item.id && (
          <TouchableOpacity
            style={[styles.actionChip, { borderColor: colors.error }]}
            onPress={() => handleDelete(item)}>
            <Text style={[styles.actionText, { color: colors.error }]}>删除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
          用户管理
        </Text>
        <TouchableOpacity
          style={[styles.themeToggle, { borderColor: colors.borderLight }]}
          onPress={toggleTheme}>
          <Text style={[styles.themeToggleText, { color: colors.text }]}>
            {isDark ? '切换到浅色' : '切换到深色'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal(null)}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={[styles.addText, { color: colors.primary, marginLeft: 6 }]}>新增账号</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { borderColor: colors.borderLight }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="搜索手机号、姓名或邮箱"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
        />
        <TouchableOpacity onPress={loadUsers}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.textSecondary }}>暂无用户</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal} />
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
              {selectedUser ? '编辑用户' : '新增用户'}
            </Text>
            <FormField
              label="手机号"
              value={formState.phoneNumber}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, phoneNumber: text }))}
              placeholder="+1..."
              keyboardType="phone-pad"
            />
            <FormField
              label="姓名（默认）"
              value={formState.name}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, name: text }))}
              placeholder="English name"
            />
            <FormField
              label="中文名（简体）"
              value={formState.nameZh}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, nameZh: text }))}
              placeholder="姓名（简）"
            />
            <FormField
              label="中文名（繁体）"
              value={formState.nameTw}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, nameTw: text }))}
              placeholder="姓名（繁）"
            />
            <FormField
              label="英文名"
              value={formState.nameEn}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, nameEn: text }))}
              placeholder="English alias"
            />
            <View style={styles.formField}>
              <Text style={styles.formLabel}>角色</Text>
              <View style={styles.roleList}>
                {ROLES.map((roleOption) => {
                  const active = formState.role === roleOption;
                  return (
                    <TouchableOpacity
                      key={roleOption}
                      style={[
                        styles.roleChip,
                        {
                          borderColor: active ? colors.primary : colors.borderLight,
                          backgroundColor: active ? colors.primary + '15' : 'transparent',
                        },
                      ]}
                      onPress={() => setFormState((prev) => ({ ...prev, role: roleOption }))}>
                      <Text
                        style={[
                          styles.roleLabel,
                          { color: active ? colors.primary : colors.textSecondary },
                        ]}>
                        {roleOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <FormField
              label="邮箱"
              value={formState.email}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, email: text }))}
              placeholder="email@example.com"
              keyboardType="email-address"
            />
            <FormField
              label="大区"
              value={formState.district}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, district: text }))}
            />
            <FormField
              label="小组"
              value={formState.groupNum}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, groupNum: text }))}
            />
            <FormField
              label="状态"
              value={formState.status}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, status: text }))}
              placeholder="active / inactive"
            />
            <FormField
              label="性别"
              value={formState.gender}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, gender: text }))}
            />
            <FormField
              label="出生日期"
              value={formState.birthdate}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, birthdate: text }))}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label="加入日期"
              value={formState.joinDate}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, joinDate: text }))}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label="首选语言"
              value={formState.preferredLanguage}
              onChangeText={(text) => setFormState((prev) => ({ ...prev, preferredLanguage: text }))}
            />
            <View style={styles.formField}>
              <Text style={styles.formLabel}>备注</Text>
              <TextInput
                value={formState.notes}
                onChangeText={(text) => setFormState((prev) => ({ ...prev, notes: text }))}
                placeholder="notes"
                placeholderTextColor={colors.textTertiary}
                style={[styles.formInput, { minHeight: 86 }]}
                multiline
              />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
              <Text style={{ color: colors.textSecondary }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary, marginLeft: 12 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff' }}>{selectedUser ? '保存' : '创建'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  themeToggle: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerTitle: { fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addText: { fontWeight: '500' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
  },
  userInfo: {
    marginBottom: 10,
  },
  userName: {
    fontWeight: '600',
  },
  userMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  userActions: {
    flexDirection: 'row',
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalContent: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    left: '5%',
    right: '5%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalBody: {
    padding: 16,
    paddingBottom: 0,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    borderColor: '#ddd',
    fontSize: 14,
  },
  roleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
