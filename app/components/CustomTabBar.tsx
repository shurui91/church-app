import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const tabs = [
  {
    name: '首页',
    path: '/home',
    icon: 'home',
  },
  {
    name: '我',
    path: '/profile',
    icon: 'person-outline',
  },
];

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const isTabActive = (tabPath: string) => {
    return pathname === tabPath;
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.path}
          style={styles.tab}
          onPress={() => router.push(tab.path as any)}>
          <Ionicons
            name={tab.icon as any}
            size={24}
            color={isTabActive(tab.path) ? '#007AFF' : '#8E8E93'}
          />
          <Text
            style={[
              styles.tabText,
              { color: isTabActive(tab.path) ? '#007AFF' : '#8E8E93' },
            ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
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
