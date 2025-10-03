// app/announcement.tsx
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';
import { useState, useEffect } from 'react';

// 两个 Gist txt Raw 地址
const ANNOUNCEMENT_URL =
  'https://gist.githubusercontent.com/shurui91/1f4aa8bf7c23908c97c198e4b762f1f2/raw/a3c8d53025b8b5eab1a9e9979a91a896ff59dd27/annoucement_chinese.txt';
const PRAYER_URL =
  'https://gist.githubusercontent.com/shurui91/40ecf68fa147682428df8afc43abcebe/raw/5ffc19b55226fc37d8aa91f80bd142ab0b02626b/prayer_item_chinese.txt';

export default function AnnouncementScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize(); // ✅ 用 context 提供的函数

  const [activeTab, setActiveTab] = useState(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [prayer, setPrayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(ANNOUNCEMENT_URL)
        .then((res) => res.text())
        .catch(() => null),
      fetch(PRAYER_URL)
        .then((res) => res.text())
        .catch(() => null),
    ])
      .then(([announcementText, prayerText]) => {
        setAnnouncement(announcementText);
        setPrayer(prayerText);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderContent = (content: string | null) => {
    if (loading) {
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text
          style={{
            color: colors.text,
            fontSize: getFontSizeValue(16), // ✅ 字号由 context 保证整数
            lineHeight: getFontSizeValue(24), // ✅ 行高也交给 context
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
                  fontSize: getFontSizeValue(14), // ✅ tab 字体
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
