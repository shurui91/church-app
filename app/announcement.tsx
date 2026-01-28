// app/announcement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from './src/hooks/useThemeColors';
import { useFontSize } from './src/context/FontSizeContext';

export default function AnnouncementScreen() {
    const { t, i18n } = useTranslation();
    const colors = useThemeColors();
    const { getFontSizeValue } = useFontSize();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState(0);
    const [announcement, setAnnouncement] = useState<string | null>(null);
    const [prayer, setPrayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ✅ 根据语言决定加载哪个 Gist
    const getUrls = useCallback(() => {
        if (i18n.resolvedLanguage === 'zh-Hant') {
            return {
                ANNOUNCEMENT_URL:
                    'https://gist.githubusercontent.com/shurui91/1f4aa8bf7c23908c97c198e4b762f1f2/raw/weekly_traditional_c.txt',
                PRAYER_URL:
                    'https://gist.githubusercontent.com/shurui91/40ecf68fa147682428df8afc43abcebe/raw/prayer_item_traditional_c.txt',
            };
        } else {
            return {
                ANNOUNCEMENT_URL:
                    'https://gist.githubusercontent.com/shurui91/a0c5c416c79b9447dfebfb598b903c96/raw/weekly_simp_c.txt',
                PRAYER_URL:
                    'https://gist.githubusercontent.com/shurui91/a501d661a50b7631d7d591524fbd5259/raw/prayer_item_simp_c.txt',
            };
        }
    }, [i18n.resolvedLanguage]);

    // ✅ 独立的加载函数
    const fetchData = useCallback(async () => {
        const { ANNOUNCEMENT_URL, PRAYER_URL } = getUrls();
        setLoading(true);
        try {
            const [announcementRes, prayerRes] = await Promise.all([
                fetch(`${ANNOUNCEMENT_URL}?t=${Date.now()}`).then((res) => res.text()),
                fetch(`${PRAYER_URL}?t=${Date.now()}`).then((res) => res.text()),
            ]);
            setAnnouncement(announcementRes.trim());
            setPrayer(prayerRes.trim());
        } catch (e) {
            console.error('加载公告失败:', e);
            setAnnouncement(null);
            setPrayer(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [getUrls]);

    // ✅ 当语言切换时自动重新加载
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ✅ 下拉刷新逻辑
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

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
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }>
                <Text
                    style={{
                        color: colors.text,
                        fontSize: getFontSizeValue(22),
                        lineHeight: getFontSizeValue(22) * 1.5,
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
        <SafeAreaView
            edges={['top']} // ✅ 只处理顶部安全区域，底部由 TabBar 的 SafeAreaView 处理
            style={{ flex: 1, backgroundColor: colors.background }}>
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
                    {
                        backgroundColor: colors.card,
                        borderBottomColor: colors.border,
                        // iOS: SafeAreaView已处理顶部安全区域，保持原有padding
                        // Android: 添加额外顶部间距，确保不被状态栏遮挡
                        // paddingTop: Platform.OS === 'ios' ? 12 : insets.top || 0,
                    },
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
                                    fontSize: getFontSizeValue(20),
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
    container: { paddingHorizontal: 20, paddingTop: 20 }, // ✅ 移除底部 padding
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
    tabText: { fontWeight: '600' },
});
