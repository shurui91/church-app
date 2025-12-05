import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/context/AuthContext';
import BackButton from '../components/BackButton';
import { api } from '../src/services/api';
// Using native components for charts instead of SVG

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 200;

type StatisticsData = {
  total: { records: number; adults: number; youthChildren: number; totalPeople: number };
  today: { records: number; adults: number; youthChildren: number; totalPeople: number };
  thisWeek: { records: number; adults: number; youthChildren: number; totalPeople: number };
  thisMonth: { records: number; adults: number; youthChildren: number; totalPeople: number };
  byMeetingType: Array<{ meetingType: string; count: number; adults: number; youthChildren: number; totalPeople: number }>;
  byDistrict: Array<{ district: string; count: number; adults: number; youthChildren: number; totalPeople: number }>;
  dailyTrend: Array<{ date: string; recordCount: number; adults: number; youthChildren: number; totalPeople: number }>;
};

export default function AttendanceStatsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = async () => {
    try {
      setError(null);
      const response = await api.getAttendanceStatistics();
      if (response.success) {
        setStatistics(response.data);
      } else {
        setError('获取统计数据失败');
      }
    } catch (err: any) {
      console.error('Error loading statistics:', err);
      setError(err.message || '加载统计数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const getMeetingTypeLabel = (type: string) => {
    switch (type) {
      case 'table':
        return t('attendance.meetingType.table') || '主日聚会';
      case 'homeMeeting':
        return t('attendance.meetingType.homeMeeting') || '小排聚会';
      case 'prayer':
        return t('attendance.meetingType.prayer') || '祷告聚会';
      default:
        return type;
    }
  };

  // Simple bar chart component using native views
  const BarChart = ({ data, labels, maxValue, color }: { data: number[]; labels: string[]; maxValue: number; color: string }) => {
    const maxBarHeight = CHART_HEIGHT - 80;
    const barSpacing = 8;
    const availableWidth = CHART_WIDTH - 40;
    const barWidth = Math.max(20, (availableWidth - (data.length - 1) * barSpacing) / data.length);

    return (
      <View style={styles.chartContainer}>
        <View style={styles.barChartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => {
              const value = Math.round(maxValue * ratio);
              return (
                <Text
                  key={index}
                  style={[styles.yAxisLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}
                >
                  {value}
                </Text>
              );
            })}
          </View>

          {/* Bars */}
          <View style={styles.barsContainer}>
            {data.map((value, index) => {
              const barHeight = maxValue > 0 ? (value / maxValue) * maxBarHeight : 0;
              return (
                <View key={index} style={styles.barWrapper}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 2),
                          backgroundColor: color,
                          width: barWidth,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.barValue,
                        { color: colors.text, fontSize: getFontSizeValue(11) },
                        barHeight < 20 && styles.barValueAbove,
                      ]}
                    >
                      {value}
                    </Text>
                  </View>
                  <Text
                    style={[styles.barLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}
                    numberOfLines={1}
                  >
                    {labels[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Simple pie chart component using horizontal bars
  const PieChart = ({ data, colors: pieColors }: { data: Array<{ label: string; value: number }>; colors: string[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={[styles.emptyChartText, { color: colors.textSecondary, fontSize: getFontSizeValue(16) }]}>
            暂无数据
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <View style={styles.pieChartContainer}>
          {data.map((item, index) => {
            const percentage = item.value / total;
            return (
              <View key={index} style={styles.pieItem}>
                <View style={styles.pieItemHeader}>
                  <View style={[styles.pieColorIndicator, { backgroundColor: pieColors[index % pieColors.length] }]} />
                  <Text style={[styles.pieLabel, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.piePercentage, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                    {Math.round(percentage * 100)}%
                  </Text>
                </View>
                <View style={[styles.pieBarContainer, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.pieBar,
                      {
                        width: `${percentage * 100}%`,
                        backgroundColor: pieColors[index % pieColors.length],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.pieValue, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                  {item.value} 人
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: t('attendance.statistics') || '统计数据',
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
            {t('attendance.loadingStatistics') || '加载统计数据中...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Stack.Screen
          options={{
            title: t('attendance.statistics') || '统计数据',
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#ff4444'} />
          <Text style={[styles.errorText, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          title: t('attendance.statistics') || '统计数据',
          headerLeft: () => <BackButton />,
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
            {t('attendance.summary') || '汇总统计'}
          </Text>
          <View style={styles.cardsRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.today') || '今日'}
              </Text>
              <Text style={[styles.cardValue, { color: colors.primary, fontSize: getFontSizeValue(24) }]}>
                {statistics.today.totalPeople}
              </Text>
              <Text style={[styles.cardSubtext, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                {statistics.today.adults} 成人 + {statistics.today.youthChildren} 青少年/儿童
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.thisWeek') || '本周'}
              </Text>
              <Text style={[styles.cardValue, { color: colors.primary, fontSize: getFontSizeValue(24) }]}>
                {statistics.thisWeek.totalPeople}
              </Text>
              <Text style={[styles.cardSubtext, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                {statistics.thisWeek.adults} 成人 + {statistics.thisWeek.youthChildren} 青少年/儿童
              </Text>
            </View>
          </View>
          <View style={styles.cardsRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.thisMonth') || '本月'}
              </Text>
              <Text style={[styles.cardValue, { color: colors.primary, fontSize: getFontSizeValue(24) }]}>
                {statistics.thisMonth.totalPeople}
              </Text>
              <Text style={[styles.cardSubtext, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                {statistics.thisMonth.adults} 成人 + {statistics.thisMonth.youthChildren} 青少年/儿童
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {t('attendance.total') || '总计'}
              </Text>
              <Text style={[styles.cardValue, { color: colors.primary, fontSize: getFontSizeValue(24) }]}>
                {statistics.total.totalPeople}
              </Text>
              <Text style={[styles.cardSubtext, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                {statistics.total.adults} 成人 + {statistics.total.youthChildren} 青少年/儿童
              </Text>
            </View>
          </View>
        </View>

        {/* Meeting Type Distribution */}
        {statistics.byMeetingType.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
              {t('attendance.byMeetingType') || '按聚会类型分布'}
            </Text>
            <PieChart
              data={statistics.byMeetingType.map(item => ({
                label: getMeetingTypeLabel(item.meetingType),
                value: item.totalPeople,
              }))}
              colors={['#4CAF50', '#2196F3', '#FF9800']}
            />
            <View style={styles.legendContainer}>
              {statistics.byMeetingType.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'][index % 3] }]} />
                  <Text style={[styles.legendText, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
                    {getMeetingTypeLabel(item.meetingType)}: {item.totalPeople} 人 ({item.count} 条记录)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* District Comparison */}
        {statistics.byDistrict.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
              {t('attendance.byDistrict') || '按大区对比'}
            </Text>
            <BarChart
              data={statistics.byDistrict.map(item => item.totalPeople)}
              labels={statistics.byDistrict.map(item => `${item.district}大区`)}
              maxValue={Math.max(...statistics.byDistrict.map(item => item.totalPeople), 1)}
              color={colors.primary}
            />
            <View style={styles.districtDetails}>
              {statistics.byDistrict.map((item, index) => (
                <View key={index} style={[styles.districtItem, { borderColor: colors.border }]}>
                  <Text style={[styles.districtLabel, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                    {item.district}大区
                  </Text>
                  <Text style={[styles.districtValue, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                    总计: {item.totalPeople} 人 ({item.adults} 成人 + {item.youthChildren} 青少年/儿童)
                  </Text>
                  <Text style={[styles.districtValue, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                    {item.count} 条记录
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Daily Trend */}
        {statistics.dailyTrend.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: getFontSizeValue(22) }]}>
              {t('attendance.dailyTrend') || '最近30天趋势'}
            </Text>
            <BarChart
              data={statistics.dailyTrend.map(item => item.totalPeople)}
              labels={statistics.dailyTrend.map(item => {
                const date = new Date(item.date);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              })}
              maxValue={Math.max(...statistics.dailyTrend.map(item => item.totalPeople), 1)}
              color={colors.primary}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  cardLabel: {
    marginBottom: 8,
  },
  cardValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 32,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    backgroundColor: 'transparent',
  },
  emptyChartText: {
    textAlign: 'center',
    padding: 32,
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
  },
  districtDetails: {
    marginTop: 16,
  },
  districtItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  districtLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  districtValue: {
    marginTop: 2,
  },
  // Bar chart styles
  barChartContainer: {
    flexDirection: 'row',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
  yAxisContainer: {
    width: 30,
    height: CHART_HEIGHT - 60,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yAxisLabel: {
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT - 60,
    paddingBottom: 40,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  bar: {
    borderRadius: 4,
    minHeight: 2,
  },
  barValue: {
    marginTop: 4,
    textAlign: 'center',
  },
  barValueAbove: {
    position: 'absolute',
    top: -18,
  },
  barLabel: {
    textAlign: 'center',
    marginTop: 4,
  },
  // Pie chart styles
  pieChartContainer: {
    width: CHART_WIDTH,
  },
  pieItem: {
    marginBottom: 16,
  },
  pieItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pieColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  pieLabel: {
    flex: 1,
  },
  piePercentage: {
    fontWeight: '600',
  },
  pieBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  pieBar: {
    height: '100%',
    borderRadius: 4,
  },
  pieValue: {
    marginTop: 4,
  },
});

