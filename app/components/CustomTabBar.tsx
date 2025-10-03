import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../src/hooks/useThemeColors';

const tabs = [
  {
    name: '线上聚会',
    path: '/meeting',
    icon: 'videocam-outline',
    activeIcon: 'videocam',
  },
  {
    name: '读经',
    path: '/bible',
    icon: 'book-outline',
    activeIcon: 'book',
  },
  {
    name: '通知',
    path: '/announcement',
    icon: 'notifications-outline',
    activeIcon: 'notifications',
  },
  {
    name: '设置',
    path: '/profile',
    icon: 'cog-outline',
    activeIcon: 'cog',
  },
];

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemeColors();

  const isTabActive = (tabPath: string) => pathname === tabPath;

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.safeArea,
        { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder },
      ]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const active = isTabActive(tab.path);
          const iconName = active ? tab.activeIcon : tab.icon;

          return (
            <TouchableOpacity
              key={tab.path}
              style={styles.tab}
              onPress={() => router.push(tab.path as any)}>
              <Ionicons
                name={iconName as any}
                size={24}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}>
                {tab.name}
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
  },
  container: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 2, // ← 多留一点空间
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
  },
});
