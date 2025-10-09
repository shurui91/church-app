// app/announcement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';

export default function AnnouncementScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  const [activeTab, setActiveTab] = useState(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 根据语言决定加载哪个 Gist
  const getUrls = () => {
    if (i18n.resolvedLanguage === 'zh-Hant') {
      return {
        ANNOUNCEMENT_URL:
          'https://gist.githubusercontent.com/shurui91/1f4aa8bf7c23908c97c198e4b762f1f2/raw/5641a3fa2b55ffdc646f71c0ae181d81a15ee247/weekly_traditional_c.txt',
        PRAYER_URL:
          'https://gist.githubusercontent.com/shurui91/40ecf68fa147682428df8afc43abcebe/raw/c7af7f2664ce065675913cd6928faea008d5522e/prayer_item_traditional_c.txt',
      };
    } else {
      return {
        ANNOUNCEMENT_URL:
          'https://gist.githubusercontent.com/shurui91/a0c5c416c79b9447dfebfb598b903c96/raw/dbe80f1db835319e36285ad922098c95ab35333a/weekly_simp_c.txt',
        PRAYER_URL:
          'https://gist.githubusercontent.com/shurui91/a501d661a50b7631d7d591524fbd5259/raw/e03c66140aa439da48efb442652bb7c519454d66/prayer_item_simp_c',
      };
    }
  };

  const fetchData = useCallback(async () => {
    const { ANNOUNCEMENT_URL, PRAYER_URL } = getUrls();

    if (!refreshing) setLoading(true);
    try {
      const [announcementRes, prayerRes] = await Promise.all([
        fetch(`${ANNOUNCEMENT_URL}?t=${Date.now()}`).then((res) => res.text()),
        fetch(`${PRAYER_URL}?t=${Date.now()}`).then((res) => res.text()),
      ]);
      setAnnouncement(announcementRes);
      setPrayer(prayerRes);
    } catch (e) {
      console.error('加载公告失败:', e);
      setAnnouncement(null);
      setPrayer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [i18n.resolvedLanguage, refreshing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderContent = (content: string | null) => {
    if (loading && !refreshing) {
      return (
        <ActivityIndicator
          size='large'
          color={colors.primary}
          style={{ marginTop: 20 }}
        />
      );
    }
    if (!content) {
      return (
        <Text style={{ color: colors.error, padding: 20 }}>
          {t('announcement.loadFail')}
        </Text>
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <Text
          style={{
            color: colors.text,
            fontSize: getFontSizeValue(16),
            lineHeight: getFontSizeValue(24),
          }}>
          {content}
        </Text>
      </ScrollView>
    );
  };

  const sections = [
    { title: t('announcement.tabNotice'), content: announcement },
    { title: t('announcement.tabPrayer'), content: prayer },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: t('announcement.title'),
          headerShown: false,
          headerBackVisible: false,
        }}
      />

      {/* 顶部 Tab 栏 */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}>
        {sections.map((section, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === index ? colors.primary + '20' : 'transparent',
                borderColor:
                  activeTab === index ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => setActiveTab(index)}>
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === index ? colors.primary : colors.text,
                  fontSize: getFontSizeValue(14),
                },
              ]}>
              {section.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 当前 Tab 内容 */}
      {renderContent(sections[activeTab].content)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontWeight: '600',
  },
});
