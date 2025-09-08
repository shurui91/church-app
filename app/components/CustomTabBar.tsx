import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';

const tabs = [
  {
    name: '首页',
    path: '/home',
    icon: 'home-outline',
    activeIcon: 'home',
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
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
      ]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 5,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
  },
});
