// app/profile.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  const { user, logout, refreshUser, isAuthenticated, hasRole } = useAuth();
  const { getFontSizeValue } = useFontSize();
  const [loggingOut, setLoggingOut] = useState(false);
  const isMountedRef = useRef(true);
  const shouldNavigateToLoginRef = useRef(false);

  // 页面加载时刷新用户信息（仅在已认证时）
  // 注意：不要在登出过程中刷新用户信息
  useEffect(() => {
    console.log('[Profile] useEffect (refreshUser) - isAuthenticated:', isAuthenticated, 'loggingOut:', loggingOut);
    // 只在用户已认证且不在登出过程中时才刷新用户信息
    if (isAuthenticated && !loggingOut) {
      console.log('[Profile] Calling refreshUser()...');
      refreshUser();
    } else {
      console.log('[Profile] Not authenticated or logging out, skipping refreshUser()');
    }
    
    // 组件卸载时标记
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshUser, isAuthenticated, loggingOut]);

  // 监听登出状态变化，当 isAuthenticated 变为 false 时自动导航
  // 使用 setTimeout 确保在 AuthGuard 检查之后执行，避免导航冲突
  useEffect(() => {
    console.log('[Profile] useEffect - shouldNavigateToLoginRef.current:', shouldNavigateToLoginRef.current, 'isAuthenticated:', isAuthenticated);
    if (shouldNavigateToLoginRef.current && !isAuthenticated) {
      console.log('[Profile] Navigating to /login (isAuthenticated became false)');
      shouldNavigateToLoginRef.current = false;
      // 延迟导航，确保 AuthGuard 已经处理完状态变化
      setTimeout(() => {
        console.log('[Profile] Executing navigation to /login');
        router.replace('/login');
        setLoggingOut(false);
      }, 50);
    }
  }, [isAuthenticated, router]);

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
            try {
              console.log('[Profile] Logout button pressed');
              setLoggingOut(true);
              
              // 设置标记，表示需要导航到登录页
              shouldNavigateToLoginRef.current = true;
              console.log('[Profile] shouldNavigateToLoginRef set to true, current isAuthenticated:', isAuthenticated);
              
              // 调用 logout() 清除本地状态（这会设置 user = null）
              // logout() 内部会先设置 setUser(null)，然后异步调用 API
              // useEffect 会监听 isAuthenticated 变化，当它变为 false 时自动导航
              console.log('[Profile] Calling logout()...');
              logout();
              console.log('[Profile] logout() called, waiting for state update...');
            } catch (error) {
              console.error('[Profile] Logout error:', error);
              // 即使出错，也尝试导航到登录页
              shouldNavigateToLoginRef.current = false;
              router.replace('/login');
              setLoggingOut(false);
            }
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
            {/* 显示角色（super_admin、admin、usher） */}
            {(() => {
              const getRoleDisplay = () => {
                // 使用 trim() 和 toLowerCase() 来确保匹配准确
                const role = String(user.role || '').trim().toLowerCase();
                
                if (role === 'super_admin') {
                  return t('profile.role.super_admin') || '超级管理员';
                }
                if (role === 'admin') {
                  return t('profile.role.admin') || '管理员';
                }
                if (role === 'usher') {
                  return t('profile.role.usher') || '招待';
                }
                
                return null;
              };

              const roleDisplay = getRoleDisplay();
              if (!roleDisplay) return null;

              return (
                <View style={styles.userInfoRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.userInfoText}>
                    <Text
                      style={[
                        styles.userInfoValue,
                        { color: colors.text, fontSize: getFontSizeValue(16) },
                      ]}>
                      {roleDisplay}
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* 菜单 */}
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          {/* 人数统计 - 所有角色可见，只有 member 不可见 */}
          {user?.role !== 'member' && (
            <MenuItem
              icon='clipboard-outline'
              title={t('attendance.title') || '人数统计'}
              onPress={() => router.push('/attendance')}
            />
          )}
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
