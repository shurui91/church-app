import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const tabs = [
  {
    key: 'meeting', // 线上聚会
    path: '/meeting',
    icon: 'videocam-outline',
    activeIcon: 'videocam',
  },
  {
    key: 'pursue', // 追求
    path: '/pursue',
    icon: 'library-outline',
    activeIcon: 'library',
  },
  {
    key: 'announcement', // 通知
    path: '/announcement',
    icon: 'notifications-outline',
    activeIcon: 'notifications',
  },
  {
    key: 'profile', // 我的
    path: '/profile',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();
  const { t } = useTranslation();

  // 为每个 tab 建立独立的动画值
  const shakeAnimations = useRef(
    tabs.reduce((acc, tab) => {
      acc[tab.path] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // 抖动动画函数
  const triggerShake = (tabPath: string) => {
    const anim = shakeAnimations[tabPath];
    anim.setValue(0);
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const isTabActive = (tabPath: string) => pathname === tabPath;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          shadowColor: colors.isDark ? 'rgba(255, 220, 150, 0.08)' : 'rgba(0,0,0,0.05)',
          shadowOpacity: 1,
          shadowRadius: 8,
        },
      ]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const active = isTabActive(tab.path);
          const iconName = active ? tab.activeIcon : tab.icon;

          const shakeStyle = {
            transform: [
              {
                translateX: shakeAnimations[tab.path].interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-4, 4],
                }),
              },
            ],
          };

          return (
            <TouchableOpacity
              key={tab.path}
              style={styles.tab}
              activeOpacity={0.85}
              onPress={() => {
                if (pathname === tab.path) {
                  triggerShake(tab.path);
                  return;
                }
                router.push(tab.path as any);
              }}>
              <Animated.View style={shakeStyle}>
                <Ionicons
                  name={iconName as any}
                  size={24}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </Animated.View>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? colors.primary : colors.textSecondary,
                    textShadowColor: active
                      ? colors.isDark
                        ? 'rgba(212,166,89,0.25)'
                        : 'rgba(0,0,0,0.1)'
                      : 'transparent',
                    textShadowRadius: 4,
                  },
                ]}>
                {t(`tab.${tab.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
