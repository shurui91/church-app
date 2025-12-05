import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackButton from '../components/BackButton';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useFontSize } from '../src/context/FontSizeContext';
import { useTranslation } from 'react-i18next';
import { api } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';

type MeetingType = 'table' | 'homeMeeting' | 'prayer';
type Scope = 'full_congregation' | 'district' | 'small_group';

interface AttendanceRecord {
  id: number;
  date: string;
  meetingType: MeetingType;
  scope: Scope;
  scopeValue: string | null;
  adultCount: number;
  youthChildCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  district?: string | null;
  notes?: string | null;
}

const RECORDS_PER_PAGE = 50;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64; // Account for padding
const CHART_HEIGHT = 200;

export default function ViewAllAttendanceScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { getFontSizeValue } = useFontSize();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Permission check: only super_admin, admin, leader can access
  const canAccess = ['super_admin', 'admin', 'leader'].includes(user?.role || '');

  // Redirect if no permission
  useEffect(() => {
    if (user && !canAccess) {
      Alert.alert(
        t('common.tip') || '提示',
        '权限不足，只有管理员和负责人可以访问此功能',
        [
          {
            text: t('common.cancel') || '确定',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [user, canAccess, router, t]);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]); // 存储所有记录
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<MeetingType>('table'); // 筛选类型，默认显示主日聚会
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set()); // 展开的层级scopeValue
  const [loadingAllRecords, setLoadingAllRecords] = useState(false); // Track if we're loading all records
  const allRecordsLoadedRef = useRef(false); // Track if all records have been loaded for homeMeeting
  const [selectedBar, setSelectedBar] = useState<{date: string; adults: number; youthChildren: number; totalPeople: number; x: number; y: number; barType: 'adults' | 'youth'} | null>(null); // Selected bar for tooltip

  // Load records
  const loadRecords = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
        setError(null);
        allRecordsLoadedRef.current = false; // Reset flag on reset
      } else {
        setRefreshing(true);
      }

      const currentOffset = reset ? 0 : offset;
      const response = await api.getAttendanceRecords(RECORDS_PER_PAGE, currentOffset);

      if (response.success) {
        const newRecords = response.data.records || [];
        
        if (reset) {
          setAllRecords(newRecords);
        } else {
          setAllRecords((prev) => [...prev, ...newRecords]);
        }

        // Check if there are more records
        setHasMore(newRecords.length === RECORDS_PER_PAGE);
        setOffset(currentOffset + newRecords.length);
      } else {
        setError((response as any).message || '加载失败');
      }
    } catch (error: any) {
      console.error('[ViewAllAttendance] Failed to load records:', error);
      const errorMessage = error.responseData?.error || error.message || '网络错误';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load more records
  const loadMore = () => {
    if (!loading && !refreshing && hasMore) {
      loadRecords(false);
    }
  };

  // Filter records based on selected filter
  useEffect(() => {
    setRecords(allRecords.filter(record => record.meetingType === selectedFilter));
  }, [selectedFilter, allRecords]);

  // Load all records (for homeMeeting grouping)
  const loadAllRecords = async () => {
    if (loadingAllRecords || loading) {
      console.log('[ViewAllAttendance] Already loading, skipping...');
      return;
    }
    
    console.log('[ViewAllAttendance] Starting to load all records. Current count:', allRecords.length, 'hasMore:', hasMore);
    setLoadingAllRecords(true);
    try {
      // Start from current offset
      let currentOffset = allRecords.length;
      let currentHasMore = hasMore;
      let attempts = 0;
      const maxAttempts = 50; // Safety limit: max 50 pages (2500 records)
      let totalLoaded = 0;
      
      while (currentHasMore && attempts < maxAttempts) {
        console.log(`[ViewAllAttendance] Loading page ${attempts + 1}, offset: ${currentOffset}`);
        const response = await api.getAttendanceRecords(RECORDS_PER_PAGE, currentOffset);
        
        if (response.success) {
          const newRecords = response.data.records || [];
          console.log(`[ViewAllAttendance] Loaded ${newRecords.length} records`);
          
          if (newRecords.length > 0) {
            setAllRecords((prev) => {
              const updated = [...prev, ...newRecords];
              console.log(`[ViewAllAttendance] Total records now: ${updated.length}`);
              return updated;
            });
            currentOffset += newRecords.length;
            totalLoaded += newRecords.length;
            currentHasMore = newRecords.length === RECORDS_PER_PAGE;
          } else {
            currentHasMore = false;
          }
          
          setHasMore(currentHasMore);
          setOffset(currentOffset);
        } else {
          console.error('[ViewAllAttendance] API response not successful:', response);
          currentHasMore = false;
        }
        
        attempts++;
        // Small delay to avoid overwhelming the server
        if (currentHasMore && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`[ViewAllAttendance] Finished loading all records. Total loaded: ${totalLoaded}, Final count: ${allRecords.length + totalLoaded}`);
    } catch (error: any) {
      console.error('[ViewAllAttendance] Failed to load all records:', error);
    } finally {
      setLoadingAllRecords(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRecords(true);
  }, []);

  // Auto-load all records when switching to homeMeeting or prayer tab
  // This ensures we have all records for accurate grouping by scopeValue
  useEffect(() => {
    if ((selectedFilter === 'homeMeeting' || selectedFilter === 'prayer') && allRecords.length > 0) {
      // Always load all records when switching to homeMeeting or prayer tab
      // This is necessary for accurate grouping
      if (hasMore && !loadingAllRecords && !loading && !allRecordsLoadedRef.current) {
        console.log(`[ViewAllAttendance] Switching to ${selectedFilter}, loading all records...`);
        console.log('[ViewAllAttendance] Current state - allRecords:', allRecords.length, 'hasMore:', hasMore, 'loading:', loading, 'loadingAllRecords:', loadingAllRecords);
        allRecordsLoadedRef.current = true;
        loadAllRecords().then(() => {
          console.log(`[ViewAllAttendance] All records loaded for ${selectedFilter}`);
          allRecordsLoadedRef.current = false;
        }).catch((error) => {
          console.error('[ViewAllAttendance] Error loading all records:', error);
          allRecordsLoadedRef.current = false;
        });
      } else if (!hasMore) {
        console.log(`[ViewAllAttendance] All records already loaded for ${selectedFilter}`);
      }
    } else if (selectedFilter !== 'homeMeeting' && selectedFilter !== 'prayer') {
      // Reset flag when switching away from homeMeeting or prayer
      allRecordsLoadedRef.current = false;
    }
  }, [selectedFilter, hasMore, allRecords.length, loading, loadingAllRecords]);

  // Get meeting type label
  const getMeetingTypeLabel = (type: MeetingType): string => {
    return t(`attendance.meetingType.${type}`) || type;
  };

  // Get scope label
  const getScopeLabel = (scope: Scope, scopeValue: string | null): string => {
    if (scope === 'full_congregation') {
      return '全会众';
    }
    if (scope === 'district' && scopeValue) {
      return `${scopeValue}大区`;
    }
    if (scope === 'small_group' && scopeValue) {
      return scopeValue;
    }
    return scope;
  };

  // Prepare data for bar chart (only for table/主日聚会)
  const chartData = useMemo(() => {
    if (selectedFilter !== 'table' || records.length === 0) {
      return null;
    }

    // Group records by date and calculate adults and youth/children per date
    const dateMap = new Map<string, { adults: number; youthChildren: number }>();
    
    records.forEach(record => {
      const date = record.date;
      
      if (dateMap.has(date)) {
        const existing = dateMap.get(date)!;
        dateMap.set(date, {
          adults: existing.adults + record.adultCount,
          youthChildren: existing.youthChildren + record.youthChildCount,
        });
      } else {
        dateMap.set(date, {
          adults: record.adultCount,
          youthChildren: record.youthChildCount,
        });
      }
    });

    // Convert to array and sort by date
    const sortedData = Array.from(dateMap.entries())
      .map(([date, counts]) => ({
        date,
        adults: counts.adults,
        youthChildren: counts.youthChildren,
        totalPeople: counts.adults + counts.youthChildren,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return sortedData;
  }, [records, selectedFilter]);

  // Prepare data grouped by scopeValue for homeMeeting/小排聚会 and prayer/祷告聚会
  const scopeGroupedData = useMemo(() => {
    if ((selectedFilter !== 'homeMeeting' && selectedFilter !== 'prayer') || records.length === 0) {
      return null;
    }

    // Group records by scopeValue (single level grouping)
    const scopeMap = new Map<string, AttendanceRecord[]>();
    
    records.forEach(record => {
      // Use scopeValue as key, or 'unknown' if null
      const key = record.scopeValue || 'unknown';
      if (!scopeMap.has(key)) {
        scopeMap.set(key, []);
      }
      scopeMap.get(key)!.push(record);
    });

    // Process each scopeValue group
    const groupedData = Array.from(scopeMap.entries())
      .map(([scopeValue, scopeRecords]) => {
        // Group by date within this scopeValue
        const dateMap = new Map<string, { adults: number; youthChildren: number }>();
        
        scopeRecords.forEach(record => {
          const date = record.date;
          if (dateMap.has(date)) {
            const existing = dateMap.get(date)!;
            dateMap.set(date, {
              adults: existing.adults + record.adultCount,
              youthChildren: existing.youthChildren + record.youthChildCount,
            });
          } else {
            dateMap.set(date, {
              adults: record.adultCount,
              youthChildren: record.youthChildCount,
            });
          }
        });

        // Convert to sorted array
        const chartData = Array.from(dateMap.entries())
          .map(([date, counts]) => ({
            date,
            adults: counts.adults,
            youthChildren: counts.youthChildren,
            totalPeople: counts.adults + counts.youthChildren,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate statistics based on original records, not aggregated chart data
        // This ensures accurate totals
        const totalAdults = scopeRecords.reduce((sum, r) => {
          const count = typeof r.adultCount === 'number' ? r.adultCount : parseInt(r.adultCount || '0', 10);
          return sum + (isNaN(count) ? 0 : count);
        }, 0);
        const totalYouthChildren = scopeRecords.reduce((sum, r) => {
          const count = typeof r.youthChildCount === 'number' ? r.youthChildCount : parseInt(r.youthChildCount || '0', 10);
          return sum + (isNaN(count) ? 0 : count);
        }, 0);
        const totalPeople = totalAdults + totalYouthChildren;
        // Average is calculated based on unique dates (chartData.length), not total records
        const averagePeople = chartData.length > 0 
          ? Number((totalPeople / chartData.length).toFixed(1))
          : 0;
        const maxPeople = chartData.length > 0 ? Math.max(...chartData.map(d => d.totalPeople || 0), 0) : 0;

        return {
          scopeValue,
          scope: scopeRecords[0]?.scope || 'unknown',
          records: scopeRecords,
          chartData,
          statistics: {
            recordCount: scopeRecords.length, // Use original record count, not chart data count
            totalAdults,
            totalYouthChildren,
            totalPeople,
            averagePeople,
            maxPeople,
          },
        };
      })
      .filter(item => item.scopeValue !== 'unknown') // Filter out records without scopeValue
      .sort((a, b) => {
        // Sort: district scope first, then small_group
        // Within same scope, sort by scopeValue alphabetically
        if (a.scope !== b.scope) {
          if (a.scope === 'district') return -1;
          if (b.scope === 'district') return 1;
        }
        return a.scopeValue.localeCompare(b.scopeValue);
      });

    return groupedData;
  }, [records, selectedFilter]);

  // Toggle expand/collapse for a scope
  const toggleScope = (scopeValue: string) => {
    setExpandedScopes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scopeValue)) {
        newSet.delete(scopeValue);
      } else {
        newSet.add(scopeValue);
      }
      return newSet;
    });
  };

  // Render bar chart for a specific scope (smaller version for homeMeeting)
  const renderScopeBarChart = (chartData: Array<{date: string; adults: number; youthChildren: number; totalPeople: number}>, isCompact = false) => {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const maxValue = Math.max(...chartData.map(d => d.totalPeople), 1);
    const chartAreaHeight = isCompact ? 150 : CHART_HEIGHT - 80;
    const chartAreaWidth = CHART_WIDTH - 60;
    
    const barSpacing = 2;
    const barGroupSpacing = 4;
    const barWidth = 12;
    const groupWidth = barWidth * 2 + barSpacing;
    const totalChartWidth = Math.max(
      chartAreaWidth,
      chartData.length * (groupWidth + barGroupSpacing) + 30
    );

    return (
      <View style={styles.scopeChartContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingRight: 16 }}
          style={styles.chartScrollView}
          onScrollBeginDrag={() => setSelectedBar(null)}>
          <Pressable onPress={() => setSelectedBar(null)} style={{ flex: 1 }}>
            <View style={[styles.chartArea, { width: totalChartWidth, height: chartAreaHeight }]}>
            {/* Grid lines */}
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => {
              const y = chartAreaHeight * ratio + 30;
              return (
                <View
                  key={index}
                  style={[
                    styles.gridLine,
                    {
                      top: y,
                      borderColor: colors.borderLight || colors.border,
                    },
                  ]}
                />
              );
            })}

            {/* Bars */}
            <View style={styles.barsContainer}>
              {chartData.map((item, index) => {
                const x = (index * (groupWidth + barGroupSpacing)) + 30;
                const adultsHeight = (item.adults / maxValue) * (chartAreaHeight - 60);
                const youthHeight = (item.youthChildren / maxValue) * (chartAreaHeight - 60);
                const bottomY = chartAreaHeight - 30;

                return (
                  <View key={index} style={styles.barGroup}>
                    {/* Adults bar */}
                    <Pressable
                      onPress={() => {
                        setSelectedBar({
                          date: item.date,
                          adults: item.adults,
                          youthChildren: item.youthChildren,
                          totalPeople: item.totalPeople,
                          x: x + barWidth / 2,
                          y: bottomY - adultsHeight - 20,
                          barType: 'adults',
                        });
                      }}
                      style={[
                        styles.barContainer,
                        {
                          left: x,
                          bottom: bottomY - adultsHeight,
                          width: barWidth,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: Math.max(adultsHeight, 2),
                            backgroundColor: colors.primary,
                            opacity: selectedBar?.date === item.date && selectedBar?.barType === 'adults' ? 0.7 : 1,
                          },
                        ]}
                      />
                      {adultsHeight > 12 && (
                        <Text
                          style={[
                            styles.barValue,
                            {
                              color: colors.text,
                              fontSize: getFontSizeValue(8),
                              bottom: adultsHeight + 2,
                              width: barWidth,
                            },
                          ]}
                        >
                          {item.adults}
                        </Text>
                      )}
                    </Pressable>

                    {/* Youth/Children bar */}
                    <Pressable
                      onPress={() => {
                        setSelectedBar({
                          date: item.date,
                          adults: item.adults,
                          youthChildren: item.youthChildren,
                          totalPeople: item.totalPeople,
                          x: x + barWidth + barSpacing + barWidth / 2,
                          y: bottomY - youthHeight - 20,
                          barType: 'youth',
                        });
                      }}
                      style={[
                        styles.barContainer,
                        {
                          left: x + barWidth + barSpacing,
                          bottom: bottomY - youthHeight,
                          width: barWidth,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: Math.max(youthHeight, 2),
                            backgroundColor: '#FF9800',
                            opacity: selectedBar?.date === item.date && selectedBar?.barType === 'youth' ? 0.7 : 1,
                          },
                        ]}
                      />
                      {youthHeight > 12 && (
                        <Text
                          style={[
                            styles.barValue,
                            {
                              color: colors.text,
                              fontSize: getFontSizeValue(8),
                              bottom: youthHeight + 2,
                              width: barWidth,
                            },
                          ]}
                        >
                          {item.youthChildren}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Tooltip */}
            {selectedBar && (
              <Pressable
                onPress={() => setSelectedBar(null)}
                style={[
                  styles.tooltip,
                  {
                    left: selectedBar.x - 60,
                    top: selectedBar.y,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.tooltipDate, { color: colors.text, fontSize: getFontSizeValue(12) }]}>
                  {new Date(selectedBar.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </Text>
                <Text style={[styles.tooltipText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                  {selectedBar.barType === 'adults' ? '成年人' : '青少年/儿童'}: {selectedBar.barType === 'adults' ? selectedBar.adults : selectedBar.youthChildren} 人
                </Text>
              </Pressable>
            )}

            {/* X-axis labels */}
            <View style={styles.xAxisContainer}>
              {chartData.map((item, index) => {
                const showEvery = Math.max(1, Math.ceil(chartData.length / 8));
                if (index % showEvery === 0 || index === chartData.length - 1) {
                  const date = new Date(item.date);
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  const x = (index * (groupWidth + barGroupSpacing)) + 30 + groupWidth / 2;
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.xAxisLabel,
                        {
                          left: x - 12,
                          color: colors.textSecondary,
                          fontSize: getFontSizeValue(9),
                        },
                      ]}
                    >
                      {`${month}/${day}`}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          </View>
          </Pressable>
        </ScrollView>
      </View>
    );
  };

  // Render scope group card (for homeMeeting)
  const renderScopeGroupCard = (group: {
    scopeValue: string;
    scope: Scope;
    chartData: Array<{date: string; adults: number; youthChildren: number; totalPeople: number}>;
    statistics: {
      recordCount: number;
      totalAdults: number;
      totalYouthChildren: number;
      totalPeople: number;
      averagePeople: number;
      maxPeople: number;
    };
  }) => {
    const isExpanded = expandedScopes.has(group.scopeValue);
    const scopeLabel = getScopeLabel(group.scope, group.scopeValue);

    return (
      <View key={group.scopeValue} style={[styles.scopeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.scopeCardHeader}
          onPress={() => toggleScope(group.scopeValue)}
          activeOpacity={0.7}>
          <View style={styles.scopeCardHeaderLeft}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <View style={styles.scopeCardTitleContainer}>
              <Text style={[styles.scopeCardTitle, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                {scopeLabel}
              </Text>
              <Text style={[styles.scopeCardSubtitle, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                {group.statistics.recordCount} 条记录
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.scopeCardContent}>
            {/* Statistics summary */}
            <View style={[styles.scopeStatistics, { borderBottomColor: colors.border }]}>
              <View style={styles.scopeStatItem}>
                <Text style={[styles.scopeStatLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                  记录数
                </Text>
                <Text style={[styles.scopeStatValue, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                  {group.statistics.recordCount}
                </Text>
              </View>
              <View style={styles.scopeStatItem}>
                <Text style={[styles.scopeStatLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
                  平均人数
                </Text>
                <Text style={[styles.scopeStatValue, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
                  {Number(group.statistics.averagePeople).toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Chart */}
            {renderScopeBarChart(group.chartData, true)}

            {/* Chart legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                  成年人
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                  青少年/儿童
                </Text>
              </View>
            </View>

            {/* Chart info */}
            <View style={styles.chartInfo}>
              <Text style={[styles.chartInfoText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                最高: 成年人 {Math.max(...group.chartData.map(d => d.adults), 0)} 人, 青少年/儿童 {Math.max(...group.chartData.map(d => d.youthChildren), 0)} 人
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render bar chart component (stacked bar chart)
  const renderBarChart = () => {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const maxValue = Math.max(...chartData.map(d => d.totalPeople), 1);
    const chartAreaHeight = CHART_HEIGHT - 80; // Leave space for labels
    const chartAreaWidth = CHART_WIDTH - 60; // Leave space for Y-axis
    
    // Make bars narrower for mobile screens
    const barSpacing = 2; // Reduced spacing between bar groups
    const barGroupSpacing = 4; // Spacing between each date group
    const barWidth = 12; // Fixed narrow width for each bar
    const groupWidth = barWidth * 2 + barSpacing; // Width of one date group (2 bars + spacing)
    const totalChartWidth = Math.max(
      chartAreaWidth,
      chartData.length * (groupWidth + barGroupSpacing) + 30 // Minimum width based on data
    );

    return (
      <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          <Text style={[styles.chartTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
            主日聚会趋势图
          </Text>
        </View>
        
        <View style={styles.chartContent}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => {
              const value = Math.round(maxValue * ratio);
              return (
                <Text
                  key={index}
                  style={[styles.yAxisLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}
                >
                  {value}
                </Text>
              );
            })}
          </View>

          {/* Scrollable chart area */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ paddingRight: 16 }}
            style={styles.chartScrollView}
            onScrollBeginDrag={() => setSelectedBar(null)}>
            <Pressable onPress={() => setSelectedBar(null)} style={{ flex: 1 }}>
              <View style={[styles.chartArea, { width: totalChartWidth }]}>
            {/* Grid lines */}
            {[1, 0.75, 0.5, 0.25, 0].map((ratio, index) => {
              const y = chartAreaHeight * ratio + 30;
              return (
                <View
                  key={index}
                  style={[
                    styles.gridLine,
                    {
                      top: y,
                      borderColor: colors.borderLight || colors.border,
                    },
                  ]}
                />
              );
            })}

            {/* Bars */}
            <View style={styles.barsContainer}>
              {chartData.map((item, index) => {
                const x = (index * (groupWidth + barGroupSpacing)) + 30;
                const adultsHeight = (item.adults / maxValue) * chartAreaHeight;
                const youthHeight = (item.youthChildren / maxValue) * chartAreaHeight;
                const bottomY = chartAreaHeight + 30;

                return (
                  <View key={index} style={styles.barGroup}>
                    {/* Adults bar */}
                    <Pressable
                      onPress={() => {
                        setSelectedBar({
                          date: item.date,
                          adults: item.adults,
                          youthChildren: item.youthChildren,
                          totalPeople: item.totalPeople,
                          x: x + barWidth / 2,
                          y: bottomY - adultsHeight - 20,
                          barType: 'adults',
                        });
                      }}
                      style={[
                        styles.barContainer,
                        {
                          left: x,
                          bottom: bottomY - adultsHeight,
                          width: barWidth,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: Math.max(adultsHeight, 2),
                            backgroundColor: colors.primary,
                            opacity: selectedBar?.date === item.date && selectedBar?.barType === 'adults' ? 0.7 : 1,
                          },
                        ]}
                      />
                      {/* Value label on top */}
                      {adultsHeight > 15 && (
                        <Text
                          style={[
                            styles.barValue,
                            {
                              color: colors.text,
                              fontSize: getFontSizeValue(9),
                              bottom: adultsHeight + 2,
                              width: barWidth,
                            },
                          ]}
                        >
                          {item.adults}
                        </Text>
                      )}
                    </Pressable>

                    {/* Youth/Children bar */}
                    <Pressable
                      onPress={() => {
                        setSelectedBar({
                          date: item.date,
                          adults: item.adults,
                          youthChildren: item.youthChildren,
                          totalPeople: item.totalPeople,
                          x: x + barWidth + barSpacing + barWidth / 2,
                          y: bottomY - youthHeight - 20,
                          barType: 'youth',
                        });
                      }}
                      style={[
                        styles.barContainer,
                        {
                          left: x + barWidth + barSpacing,
                          bottom: bottomY - youthHeight,
                          width: barWidth,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: Math.max(youthHeight, 2),
                            backgroundColor: '#FF9800',
                            opacity: selectedBar?.date === item.date && selectedBar?.barType === 'youth' ? 0.7 : 1,
                          },
                        ]}
                      />
                      {/* Value label on top */}
                      {youthHeight > 15 && (
                        <Text
                          style={[
                            styles.barValue,
                            {
                              color: colors.text,
                              fontSize: getFontSizeValue(9),
                              bottom: youthHeight + 2,
                              width: barWidth,
                            },
                          ]}
                        >
                          {item.youthChildren}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Tooltip */}
            {selectedBar && (
              <Pressable
                onPress={() => setSelectedBar(null)}
                style={[
                  styles.tooltip,
                  {
                    left: selectedBar.x - 60,
                    top: selectedBar.y,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.tooltipDate, { color: colors.text, fontSize: getFontSizeValue(12) }]}>
                  {new Date(selectedBar.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </Text>
                <Text style={[styles.tooltipText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                  {selectedBar.barType === 'adults' ? '成年人' : '青少年/儿童'}: {selectedBar.barType === 'adults' ? selectedBar.adults : selectedBar.youthChildren} 人
                </Text>
              </Pressable>
            )}

            {/* X-axis labels */}
            <View style={styles.xAxisContainer}>
              {chartData.map((item, index) => {
                // Show label for every few points to avoid crowding
                const showEvery = Math.max(1, Math.ceil(chartData.length / 10));
                if (index % showEvery === 0 || index === chartData.length - 1) {
                  const date = new Date(item.date);
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  const x = (index * (groupWidth + barGroupSpacing)) + 30 + groupWidth / 2;
                  return (
                    <Text
                      key={index}
                      style={[
                        styles.xAxisLabel,
                        {
                          left: x - 12,
                          color: colors.textSecondary,
                          fontSize: getFontSizeValue(9),
                        },
                      ]}
                    >
                      {`${month}/${day}`}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
            </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* Chart legend */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
              成年人
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
              青少年/儿童
            </Text>
          </View>
        </View>

        {/* Chart info */}
        <View style={styles.chartInfo}>
          <Text style={[styles.chartInfoText, { color: colors.textSecondary, fontSize: getFontSizeValue(12) }]}>
            共 {chartData.length} 个数据点 | 最高: 成年人 {Math.max(...chartData.map(d => d.adults), 0)} 人, 青少年/儿童 {Math.max(...chartData.map(d => d.youthChildren), 0)} 人
          </Text>
        </View>
      </View>
    );
  };

  // Render record item
  const renderRecordItem = ({ item }: { item: AttendanceRecord }) => {
    return (
      <View style={[styles.recordItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.recordHeader}>
          <View style={styles.recordHeaderLeft}>
            <Text style={[styles.recordDate, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
              {item.date}
            </Text>
            <Text style={[styles.recordType, { color: colors.textSecondary, fontSize: getFontSizeValue(16) }]}>
              {getMeetingTypeLabel(item.meetingType)}
            </Text>
          </View>
        </View>
        
        <View style={styles.recordBody}>
          <View style={styles.recordRow}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.recordLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
              统计层级:
            </Text>
            <Text style={[styles.recordValue, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
              {getScopeLabel(item.scope, item.scopeValue)}
            </Text>
          </View>
          
          <View style={styles.recordRow}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.recordLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
              成年人:
            </Text>
            <Text style={[styles.recordValue, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
              {item.adultCount}
            </Text>
          </View>
          
          <View style={styles.recordRow}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.recordLabel, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
              青少年/儿童:
            </Text>
            <Text style={[styles.recordValue, { color: colors.text, fontSize: getFontSizeValue(14) }]}>
              {item.youthChildCount}
            </Text>
          </View>
          
          {item.notes && (
            <View style={styles.recordRow}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.recordNotes, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                {item.notes}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render footer (loading indicator or end message)
  const renderFooter = () => {
    if (loading && records.length === 0) {
      return null; // Initial loading is handled separately
    }
    
    if (loading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
            加载更多...
          </Text>
        </View>
      );
    }
    
    if (!hasMore && records.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
            已加载全部数据
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
            加载中...
          </Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#ff4444'} />
          <Text style={[styles.emptyText, { color: colors.error || '#ff4444', fontSize: getFontSizeValue(18) }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => loadRecords(true)}>
            <Text style={[styles.retryButtonText, { fontSize: getFontSizeValue(16) }]}>
              重试
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
          暂无数据
        </Text>
      </View>
    );
  };

  // Show no permission message if user doesn't have access
  if (!canAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
        <Stack.Screen
          options={{
            title: '查看所有出席数据',
            headerShown: true,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            headerLeft: () => <BackButton />,
          }}
        />
        <View style={styles.noPermissionContainer}>
          <Text style={[styles.noPermissionText, { color: colors.text }]}>
            权限不足，只有管理员和负责人可以访问此功能
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Stack.Screen
        options={{
          title: '查看所有出席数据',
          headerShown: true,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerLeft: () => <BackButton />,
        }}
      />
      
      <View style={styles.content}>
        {/* Filter Tabs */}
        <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}>
            {(['table', 'homeMeeting', 'prayer'] as MeetingType[]).map((filter) => {
              const isSelected = selectedFilter === filter;
              const label = getMeetingTypeLabel(filter);
              
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedFilter(filter)}>
                  <Text
                    style={[
                      styles.filterTabText,
                      {
                        color: isSelected ? '#fff' : colors.text,
                        fontSize: getFontSizeValue(14),
                      },
                    ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Summary */}
        {records.length > 0 && (
          <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[styles.summaryText, { color: colors.text, fontSize: getFontSizeValue(16) }]}>
              共 {records.length} 条记录 ({getMeetingTypeLabel(selectedFilter)})
            </Text>
          </View>
        )}

        {/* Bar Chart - only show for 主日聚会 */}
        {selectedFilter === 'table' && renderBarChart()}

        {/* Scope Grouped Charts - show for 小排聚会 and 祷告聚会 */}
        {(selectedFilter === 'homeMeeting' || selectedFilter === 'prayer') && (
          <>
            {loadingAllRecords && (
              <View style={styles.loadingAllContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingAllText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                  正在加载所有数据...
                </Text>
              </View>
            )}
            {scopeGroupedData && scopeGroupedData.length > 0 && (
              <ScrollView
                style={styles.scopeGroupsScrollView}
                contentContainerStyle={styles.scopeGroupsScrollContent}
                showsVerticalScrollIndicator={true}
                onScrollBeginDrag={() => setSelectedBar(null)}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing || loadingAllRecords}
                    onRefresh={() => {
                      allRecordsLoadedRef.current = false;
                      loadRecords(true).then(() => {
                        if ((selectedFilter === 'homeMeeting' || selectedFilter === 'prayer') && hasMore) {
                          loadAllRecords();
                        }
                      });
                    }}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                  />
                }>
                <View style={styles.scopeGroupsContainer}>
                  <View style={styles.scopeGroupsHeader}>
                    <Ionicons name="layers-outline" size={20} color={colors.primary} />
                    <Text style={[styles.scopeGroupsTitle, { color: colors.text, fontSize: getFontSizeValue(18) }]}>
                      按统计层级分类 ({scopeGroupedData.length} 个层级)
                    </Text>
                  </View>
                  {scopeGroupedData.map(group => renderScopeGroupCard(group))}
                </View>
              </ScrollView>
            )}
            {!loadingAllRecords && !loading && scopeGroupedData && scopeGroupedData.length === 0 && records.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: getFontSizeValue(18) }]}>
                  {selectedFilter === 'homeMeeting' ? '暂无小排聚会数据' : '暂无祷告聚会数据'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Records List - hidden for homeMeeting and prayer, shown for other tabs */}
        {selectedFilter !== 'homeMeeting' && selectedFilter !== 'prayer' && (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRecordItem}
            contentContainerStyle={[
              styles.listContent,
              records.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadRecords(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterTabText: {
    fontWeight: '600',
  },
  summary: {
    padding: 16,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  recordItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordHeaderLeft: {
    flex: 1,
  },
  recordDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordType: {
    marginTop: 4,
  },
  recordBody: {
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordLabel: {
    minWidth: 80,
  },
  recordValue: {
    flex: 1,
    fontWeight: '500',
  },
  recordNotes: {
    flex: 1,
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontWeight: '600',
  },
  chartContent: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  chartScrollView: {
    flex: 1,
  },
  yAxisContainer: {
    width: 30,
    height: CHART_HEIGHT - 60,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 30,
  },
  yAxisLabel: {
    textAlign: 'right',
  },
  chartArea: {
    height: CHART_HEIGHT - 60,
    marginTop: 30,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    opacity: 0.3,
  },
  barsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  barGroup: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
  },
  barContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barSegment: {
    width: '100%',
    borderRadius: 2,
  },
  barValue: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  tooltipDate: {
    fontWeight: '600',
    marginBottom: 4,
  },
  tooltipText: {
    marginTop: 2,
  },
  xAxisContainer: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    height: 30,
  },
  xAxisLabel: {
    position: 'absolute',
    textAlign: 'center',
    width: 30,
  },
  chartInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartInfoText: {
    textAlign: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
  },
  loadingAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingAllText: {
    marginLeft: 8,
  },
  scopeGroupsScrollView: {
    flex: 1,
  },
  scopeGroupsScrollContent: {
    paddingBottom: 32,
  },
  scopeGroupsContainer: {
    margin: 16,
    gap: 12,
  },
  scopeGroupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  scopeGroupsTitle: {
    fontWeight: '600',
  },
  scopeCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scopeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  scopeCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  scopeCardTitleContainer: {
    flex: 1,
  },
  scopeCardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  scopeCardSubtitle: {
    marginTop: 2,
  },
  scopeCardContent: {
    padding: 16,
    paddingTop: 0,
  },
  scopeStatistics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  scopeStatItem: {
    alignItems: 'center',
  },
  scopeStatLabel: {
    marginBottom: 4,
  },
  scopeStatValue: {
    fontWeight: 'bold',
  },
  scopeChartContainer: {
    marginVertical: 12,
  },
});
