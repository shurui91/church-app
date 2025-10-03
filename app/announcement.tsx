// app/announcement.tsx
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
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';
import { useState, useEffect, useCallback } from 'react';

// 两个 Gist txt Raw 地址（基础地址）
const ANNOUNCEMENT_URL =
  'https://gist.githubusercontent.com/shurui91/1f4aa8bf7c23908c97c198e4b762f1f2/raw/annoucement_chinese.txt';
const PRAYER_URL =
  'https://gist.githubusercontent.com/shurui91/40ecf68fa147682428df8afc43abcebe/raw/prayer_item_chinese.txt';

export default function AnnouncementScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();

  const [activeTab, setActiveTab] = useState(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const [announcementRes, prayerRes] = await Promise.all([
        fetch(`${ANNOUNCEMENT_URL}?t=${Date.now()}`).then((res) => res.text()),
        fetch(`${PRAYER_URL}?t=${Date.now()}`).then((res) => res.text()),
      ]);
      setAnnouncement(announcementRes);
      setPrayer(prayerRes);
    } catch (e) {
      setAnnouncement(null);
      setPrayer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

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
      return <Text style={{ color: colors.error, padding: 20 }}>加载失败</Text>;
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
    { title: '召会通知', content: announcement },
    { title: '祷告事项', content: prayer },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: '召会通知 & 祷告事项',
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
