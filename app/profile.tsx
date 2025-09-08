import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>设置</Text>
        </View>

        <View style={styles.menuContainer}>
          <MenuItem
            icon='settings-outline'
            title='应用设置'
            onPress={() => router.push('/settings')}
          />
          <MenuItem
            icon='shield-checkmark-outline'
            title='隐私条款'
            onPress={() => router.push('/privacy')}
            isLast={true}
          />
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
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.lastMenuItem]}
      onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon as any} size={24} color='#333' />
        <Text style={styles.menuText}>{title}</Text>
      </View>
      <Ionicons name='chevron-forward' size={20} color='#999' />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  menuContainer: {
    backgroundColor: 'white',
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#333',
    marginLeft: 15,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
});
