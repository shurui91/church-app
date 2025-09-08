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
import { useThemeColors } from './hooks/useThemeColors';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}>
          <Text style={[styles.title, { color: colors.text }]}>设置</Text>
        </View>

        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
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

        {/* 应用信息 */}
        <View style={styles.infoContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            版本号: 1.0.0
          </Text>
          <Text style={[styles.copyrightText, { color: colors.textTertiary }]}>
            © {new Date().getFullYear()} Church in Cerritos. All rights reserved.
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
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
  infoContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 12,
  },
});
