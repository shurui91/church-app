// app/announcement.tsx
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useThemeColors } from './hooks/useThemeColors';
import { useFontSize } from './context/FontSizeContext';
import { useState } from 'react';

const sections = [
  {
    title: '召会通知',
    data: [
      '1. 新人受浸\n8月31日，主日上午...',
      '2. 为喜瑞都召会的儿童代祷...',
      '3. 喜瑞都社区大学校园工作...',
      '4. 李常受文集展览...',
      '5. 二○二六年福音月历预购...',
      '6. 二○二五年感恩节特会...',
    ],
  },
  {
    title: '祷告事项',
    data: [
      '使徒行传 13:23『从这人的后裔中...』',
      '罗马书 8:2『因为生命之灵的律...』',
      '哥林多前书 1:23–24『我们却是传扬...』',
      '壹、儿童工作...',
      '贰、青少年工作...',
      '叁、喜瑞都社区大学校园工作...',
      '肆、请为在病痛中的圣徒代祷...',
    ],
  },
];

export default function AnnouncementScreen() {
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const [activeTab, setActiveTab] = useState(0); // 0 = 召会通知, 1 = 祷告事项

  const renderItem = ({ item }: { item: string }) => (
    <Text
      style={[
        styles.textContent,
        {
          color: colors.text,
          fontSize: getFontSizeValue(16),
          lineHeight: getFontSizeValue(16) * 1.6,
          marginBottom: getFontSizeValue(16),
        },
      ]}>
      {item}
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: '召会通知 & 祷告事项',
          headerShown: false,
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontSize: getFontSizeValue(18),
          },
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

      {/* 当前 Tab 的内容 */}
      <FlatList
        data={sections[activeTab].data}
        renderItem={renderItem}
        keyExtractor={(item, index) => item + index}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  textContent: {
    lineHeight: 24,
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
