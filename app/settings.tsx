// app/settings.tsx
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from './context/ThemeContext';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { fontSize, setFontSize, fontSizeOptions } = useFontSize();

  return (
    <>
      <Stack.Screen
        options={{
          title: '应用设置',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary, borderBottomColor: colors.border },
            ]}>
            显示设置
          </Text>
          <SettingItem
            title='深色模式'
            hasSwitch={true}
            switchValue={isDark}
            onSwitchChange={toggleTheme}
          />

          {/* 新增字体大小选择器 */}
          <View
            style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              字体大小
            </Text>
            <View style={styles.fontSizeOptions}>
              {fontSizeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.fontSizeOption,
                    fontSize === option.value && styles.fontSizeOptionSelected,
                    {
                      backgroundColor:
                        fontSize === option.value
                          ? colors.primary
                          : 'transparent',
                    },
                  ]}
                  onPress={() => setFontSize(option.value)}>
                  <Text
                    style={[
                      styles.fontSizeOptionText,
                      {
                        color:
                          fontSize === option.value ? '#FFFFFF' : colors.text,
                      },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary, borderBottomColor: colors.border },
            ]}>
            其他
          </Text>
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
  switchValue = false,
  onSwitchChange,
}: {
  title: string;
  value?: string;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          thumbColor={colors.switchThumb}
          trackColor={colors.switchTrack}
        />
      ) : (
        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 14,
  },
  // 新增字体大小选择器样式
  fontSizeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  fontSizeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  fontSizeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
