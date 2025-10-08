// app/settings.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from './src/i18n';
import { useTheme } from './src/context/ThemeContext';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';
import Slider from '@react-native-assets/slider';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const { fontSize = 16, setFontSize } = useFontSize();
  const router = useRouter();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const handleLanguageChange = async (lang: 'zh' | 'zh-Hant') => {
    await setAppLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings.title') || '应用设置',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={{ paddingHorizontal: 12 }}>
              <Ionicons name='chevron-back' size={24} color={colors.text} />
            </TouchableOpacity>
          ),
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
            {t('settings.display') || '显示设置'}
          </Text>

          <SettingItem
            title={t('settings.darkMode') || '深色模式'}
            hasSwitch
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
              {t('settings.fontSize') || '字体大小'}
            </Text>

            <Text style={[styles.sampleText, { fontSize, color: colors.text }]}>
              {t('settings.sampleText') || '这是一个示例文字'}
            </Text>

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
          </View>
        </View>

        {/* 语言设置 */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textSecondary, borderBottomColor: colors.border },
            ]}>
            {t('settings.language') || '语言'}
          </Text>

          <TouchableOpacity
            onPress={() => setLanguageModalVisible(true)}
            style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {t('settings.currentLanguage') || '当前语言'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}>
                {i18n.resolvedLanguage === 'zh-Hant' ? '繁體中文' : '简体中文'}
              </Text>
              <Ionicons
                name='chevron-forward'
                size={18}
                color={colors.textSecondary}
                style={{ marginLeft: 4 }}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 弹窗选择语言 */}
      <Modal
        visible={languageModalVisible}
        animationType='fade'
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, borderBottomColor: colors.border },
              ]}>
              {t('settings.selectLanguage') || '选择语言'}
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleLanguageChange('zh')}>
              <Text
                style={[
                  styles.modalOptionText,
                  {
                    color:
                      i18n.resolvedLanguage === 'zh'
                        ? colors.primary
                        : colors.text,
                  },
                ]}>
                简体中文
              </Text>
              {i18n.resolvedLanguage === 'zh' && (
                <Ionicons name='checkmark' size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleLanguageChange('zh-Hant')}>
              <Text
                style={[
                  styles.modalOptionText,
                  {
                    color:
                      i18n.resolvedLanguage === 'zh-Hant'
                        ? colors.primary
                        : colors.text,
                  },
                ]}>
                繁體中文
              </Text>
              {i18n.resolvedLanguage === 'zh-Hant' && (
                <Ionicons name='checkmark' size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancel]}
              onPress={() => setLanguageModalVisible(false)}>
              <Text style={{ color: colors.textSecondary }}>
                {t('settings.cancel') || '取消'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function SettingItem({ title, value, hasSwitch, switchValue, onSwitchChange }) {
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
  container: { flex: 1 },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  settingTitle: { fontSize: 16, marginBottom: 12 },
  settingValue: { fontSize: 14 },
  sampleText: { marginBottom: 12, textAlign: 'center' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCancel: {
    marginTop: 16,
    alignItems: 'center',
  },
});
