// app/settings.tsx
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '应用设置',
          headerShown: true, // 显示头部返回按钮
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知设置</Text>
          <SettingItem title='推送通知' hasSwitch={true} />
          <SettingItem title='声音提醒' hasSwitch={true} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>显示设置</Text>
          <SettingItem title='深色模式' hasSwitch={true} />
          <SettingItem title='字体大小' value='中等' />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>其他</Text>
          <SettingItem title='清除缓存' value='125 MB' />
          <SettingItem title='语言' value='简体中文' />
        </View>
      </ScrollView>
    </>
  );
}

function SettingItem({
  title,
  value,
  hasSwitch = false,
}: {
  title: string;
  value?: string;
  hasSwitch?: boolean;
}) {
  return (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      {hasSwitch ? (
        <Switch value={true} onValueChange={() => {}} />
      ) : (
        <Text style={styles.settingValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
});
