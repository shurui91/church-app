// app/settings.tsx
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from './context/ThemeContext';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
// import Slider from '@react-native-community/slider';
import Slider from '@react-native-assets/slider';

export default function SettingsScreen() {
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { fontSize, setFontSize } = useFontSize();

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
        {/* 显示设置 */}
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

          {/* 字体大小 */}
          <View
            style={[
              styles.settingItemColumn,
              { borderBottomColor: colors.border },
            ]}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              字体大小
            </Text>

            {/* 示例文字 */}
            <Text style={[styles.sampleText, { fontSize, color: colors.text }]}>
              这是一个示例文字
            </Text>

            {/* 滑动条 */}
            <View style={{ marginTop: 8 }}>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={12}
                maximumValue={40}
                step={4}
                value={fontSize}
                onValueChange={setFontSize}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
              />

              {/* 刻度线 */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                {Array.from(
                  { length: (40 - 12) / 4 + 1 },
                  (_, i) => 12 + i * 4
                ).map((size) => (
                  <Text
                    key={size}
                    style={{ fontSize: 12, color: colors.textSecondary }}>
                    |
                  </Text>
                ))}
              </View>

              {/* 刻度文字 */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                {[12, 40].map((size) => (
                  <Text
                    key={size}
                    style={{ fontSize: 12, color: colors.textSecondary }}>
                    {size}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* 其他设置 */}
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
  settingItemColumn: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  settingValue: {
    fontSize: 14,
  },
  sampleText: {
    marginBottom: 12,
    textAlign: 'center',
  },
});
