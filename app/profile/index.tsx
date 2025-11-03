// app/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useAuth } from '../src/context/AuthContext';
import { useFontSize } from '../src/context/FontSizeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const { getFontSizeValue } = useFontSize();
  const [loggingOut, setLoggingOut] = useState(false);

  // 页面加载时刷新用户信息
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutConfirm') || '确认登出',
      t('profile.logoutConfirmMessage') || '确定要登出吗？',
      [
        {
          text: t('common.cancel') || '取消',
          style: 'cancel',
        },
        {
          text: t('profile.logout') || '登出',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
            // AuthGuard will redirect to login page
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        {/* 顶部标题 */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontSize: getFontSizeValue(24) },
            ]}>
            {t('profile.pageTitle') || '我的'}
          </Text>
        </View>

        {/* 用户信息 */}
        {user && (
          <View
            style={[
              styles.userInfoContainer,
              { backgroundColor: colors.card, borderBottomColor: colors.border },
            ]}>
            <View style={styles.userInfoRow}>
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={colors.primary}
              />
              <View style={styles.userInfoText}>
                <Text
                  style={[
                    styles.userInfoLabel,
                    {
                      color: colors.textSecondary,
                      fontSize: getFontSizeValue(12),
                    },
                  ]}>
                  {t('profile.phoneNumber') || '手机号'}
                </Text>
                <Text
                  style={[
                    styles.userInfoValue,
                    { color: colors.text, fontSize: getFontSizeValue(16) },
                  ]}>
                  {(() => {
                    const phone = user.phoneNumber.replace('+1', '').replace(/\D/g, '');
                    if (phone.length === 10) {
                      return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
                    }
                    return phone || 'N/A';
                  })()}
                </Text>
              </View>
            </View>
            {(user.nameZh || user.nameEn || user.name) && (
              <View style={styles.userInfoRow}>
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.userInfoText}>
                  <Text
                    style={[
                      styles.userInfoLabel,
                      {
                        color: colors.textSecondary,
                        fontSize: getFontSizeValue(12),
                      },
                    ]}>
                    {t('profile.name') || '姓名'}
                  </Text>
                  <Text
                    style={[
                      styles.userInfoValue,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {user.nameZh || user.nameEn || user.name || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
            {(user.district || user.groupNum) && (
              <View style={styles.userInfoRow}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.userInfoText}>
                  <Text
                    style={[
                      styles.userInfoLabel,
                      {
                        color: colors.textSecondary,
                        fontSize: getFontSizeValue(12),
                      },
                    ]}>
                    {t('profile.districtGroup') || '大区/小组'}
                  </Text>
                  <Text
                    style={[
                      styles.userInfoValue,
                      { color: colors.text, fontSize: getFontSizeValue(16) },
                    ]}>
                    {user.district && user.groupNum
                      ? `${user.district} - ${user.groupNum}`
                      : user.district || user.groupNum || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 菜单 */}
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          <MenuItem
            icon='settings-outline'
            title={t('profile.appSettings') || '应用设置'}
            onPress={() => router.push('/profile/settings')}
          />
          <MenuItem
            icon='shield-checkmark-outline'
            title={t('profile.privacy') || '隐私条款'}
            onPress={() => router.push('/profile/privacy')}
            isLast
          />
        </View>

        {/* 登出按钮 */}
        <View style={[styles.logoutContainer, { marginTop: 20 }]}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.error }]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.7}>
            {loggingOut ? (
              <Text
                style={[
                  styles.logoutButtonText,
                  { fontSize: getFontSizeValue(16) },
                ]}>
                {t('profile.loggingOut') || '登出中...'}
              </Text>
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text
                  style={[
                    styles.logoutButtonText,
                    { fontSize: getFontSizeValue(16) },
                  ]}>
                  {t('profile.logout') || '登出'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 应用信息 */}
        <View style={styles.infoContainer}>
          <Text
            style={[
              styles.versionText,
              {
                color: colors.textSecondary,
                fontSize: getFontSizeValue(12),
              },
            ]}>
            {t('profile.version') || '版本号'}: 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 菜单项组件
function MenuItem({
  icon,
  title,
  onPress,
  isLast = false,
}: {
  icon: string;
  title: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: colors.borderLight },
        isLast && styles.lastMenuItem,
      ]}
      onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon as any} size={24} color={colors.text} />
        <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
      </View>
      <Ionicons name='chevron-forward' size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuContainer: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    marginLeft: 15,
  },
  userInfoContainer: {
    padding: 20,
    marginTop: 10,
    borderBottomWidth: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  userInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    marginBottom: 8,
  },
});
