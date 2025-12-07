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

  // Load records - optimized: only load records for current filter
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
      // Only load records for the current selected filter to reduce database load
      const response = await api.getAttendanceRecords(RECORDS_PER_PAGE, currentOffset, selectedFilter);

      if (response.success) {
        const newRecords = response.data.records || [];
        
        if (reset) {
          setAllRecords(newRecords);
        } else {
          // Remove duplicates when appending new records
          setAllRecords((prev) => {
            const existingIds = new Set(prev.map(r => r.id));
            const uniqueNewRecords = newRecords.filter(r => !existingIds.has(r.id));
            return [...prev, ...uniqueNewRecords];
          });
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

  // Since we're now loading records filtered by selectedFilter, we don't need to filter again
  // But we keep this for backward compatibility and to handle filter changes
  useEffect(() => {
    // If records are already filtered by API, use them directly
    // Otherwise filter client-side (for backward compatibility)
    // Also remove duplicates based on id to prevent key conflicts
    const filtered = allRecords.filter(record => record.meetingType === selectedFilter);
    const uniqueFiltered = filtered.filter((record, index, self) => 
      index === self.findIndex(r => r.id === record.id)
    );
    setRecords(uniqueFiltered);
  }, [selectedFilter, allRecords]);

  // Load all records - optimized: only load records for current filter
  const loadAllRecords = async () => {
    if (loadingAllRecords || loading) {
      console.log('[ViewAllAttendance] Already loading, skipping...');
      return;
    }
    
    console.log('[ViewAllAttendance] Starting to load all records for', selectedFilter, '. Current count:', allRecords.length, 'hasMore:', hasMore);
    setLoadingAllRecords(true);
    try {
      // Start from current offset
      let currentOffset = allRecords.length;
      let currentHasMore = hasMore;
      let attempts = 0;
      const maxAttempts = 50; // Safety limit: max 50 pages (2500 records)
      let totalLoaded = 0;
      
      while (currentHasMore && attempts < maxAttempts) {
        console.log(`[ViewAllAttendance] Loading page ${attempts + 1}, offset: ${currentOffset}, filter: ${selectedFilter}`);
        // Only load records for the current selected filter
        const response = await api.getAttendanceRecords(RECORDS_PER_PAGE, currentOffset, selectedFilter);
        
        if (response.success) {
          const newRecords = response.data.records || [];
          console.log(`[ViewAllAttendance] Loaded ${newRecords.length} records`);
          
          if (newRecords.length > 0) {
            setAllRecords((prev) => {
              // Remove duplicates when appending new records
              const existingIds = new Set(prev.map(r => r.id));
              const uniqueNewRecords = newRecords.filter(r => !existingIds.has(r.id));
              const updated = [...prev, ...uniqueNewRecords];
              console.log(`[ViewAllAttendance] Total records now: ${updated.length} (added ${uniqueNewRecords.length} new, skipped ${newRecords.length - uniqueNewRecords.length} duplicates)`);
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

  // Track previous filter to detect changes
  const prevFilterRef = useRef<MeetingType | null>(null);

  // Initial load and handle filter changes
  useEffect(() => {
    const filterChanged = prevFilterRef.current !== null && prevFilterRef.current !== selectedFilter;
    
    if (filterChanged) {
      // Filter changed: reset state and load records for new filter
      console.log(`[ViewAllAttendance] Filter changed from ${prevFilterRef.current} to ${selectedFilter}, resetting...`);
      setAllRecords([]);
      setOffset(0);
      setHasMore(true);
      allRecordsLoadedRef.current = false;
    }
    
    prevFilterRef.current = selectedFilter;
    
    // Load records for current filter
    loadRecords(true);
  }, [selectedFilter]);

  // Auto-load all records when initial load completes
  // Optimized: Only load records for the current filter to reduce database load
  useEffect(() => {
    if (allRecords.length > 0 && hasMore && !loadingAllRecords && !loading && !allRecordsLoadedRef.current) {
      // Load all remaining records for the current filter only
      // This ensures complete data without loading unnecessary records from other filters
      console.log(`[ViewAllAttendance] Auto-loading all records for ${selectedFilter}...`);
      allRecordsLoadedRef.current = true;
      loadAllRecords().then(() => {
        console.log(`[ViewAllAttendance] All records loaded for ${selectedFilter}`);
        allRecordsLoadedRef.current = false;
      }).catch((error) => {
        console.error('[ViewAllAttendance] Error loading all records:', error);
        allRecordsLoadedRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRecords.length, hasMore, loadingAllRecords, loading]);

  // Get meeting type label
  const getMeetingTypeLabel = (type: MeetingType): string => {
    return t(`attendance.meetingType.${type}`) || type;
  };

  // Get scope label
  const getScopeLabel = (scope: Scope, scopeValue: string | null): string => {
    if (scope === 'full_congregation') {
      return '中文区';
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
  // Using same logic as main Sunday meeting chart
  // For prayer meetings, only show adults (youth/children is always 0)
  const renderScopeBarChart = (chartData: {date: string; adults: number; youthChildren: number; totalPeople: number}[], isCompact = false, isPrayer = false) => {
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const maxAdults = Math.max(...chartData.map(d => d.adults), 0); // Max adults value for Y-axis (same as main chart)
    const chartAreaWidth = CHART_WIDTH - 60;
    
    // Use same bar dimensions as main Sunday meeting chart
    // For prayer meetings, only show adults bar (single bar per date)
    const barSpacing = 4; // Spacing between adults and youth/children bars (not used for prayer)
    const barGroupSpacing = 28; // Increased spacing between date groups for better separation
    const barWidth = 32; // Wider bars so numbers can fit on one line
    const groupWidth = isPrayer ? barWidth : barWidth * 2 + barSpacing; // Single bar for prayer, two bars for homeMeeting
    const totalChartWidth = Math.max(
      chartAreaWidth,
      chartData.length * (groupWidth + barGroupSpacing) + 30
    );

    return (
      <View style={styles.scopeChartContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={{ paddingRight: 16, paddingBottom: 30 }}
          style={styles.chartScrollView}
          onScrollBeginDrag={() => setSelectedBar(null)}>
          <Pressable onPress={() => setSelectedBar(null)} style={{ flex: 1 }}>
            <View style={[styles.chartArea, { width: totalChartWidth, paddingBottom: 30 }]}>
            {/* Grid lines - Use same style as main Sunday meeting chart */}
            {/* Top grid line (max value) - at top of chartArea where max bars reach */}
            <View
              style={[
                styles.gridLine,
                {
                  top: 0,
                  borderColor: colors.borderLight || colors.border,
                },
              ]}
            />
            {/* Bottom grid line (0) - align with main Sunday meeting chart style */}
            <View
              style={[
                styles.gridLine,
                {
                  top: CHART_HEIGHT - 200, // Same as main Sunday meeting chart
                  borderColor: colors.borderLight || colors.border,
                },
              ]}
            />

            {/* Bars - Adults only for prayer, Adults and Youth/Children side by side for homeMeeting */}
            <View style={styles.barsContainer}>
              {chartData.map((item, index) => {
                const x = (index * (groupWidth + barGroupSpacing)) + 30;
                // chartArea height is CHART_HEIGHT - 60, use that for height calculation
                const chartAreaActualHeight = CHART_HEIGHT - 60;
                const adultsHeight = (item.adults / maxAdults) * chartAreaActualHeight;
                const youthHeight = isPrayer ? 0 : (item.youthChildren / maxAdults) * chartAreaActualHeight;
                // Bottom of chart area - all bars should align here (0 on Y-axis)
                // chartArea bottom is at CHART_HEIGHT - 60 relative to chartArea container
                const bottomY = CHART_HEIGHT - 230;

                return (
                  <View key={`bar-group-${item.date}-${index}`} style={styles.barGroup}>
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
                          bottom: bottomY, // All bars align at the same bottom position
                          width: barWidth,
                          height: adultsHeight, // Height varies based on data
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: '100%', // Fill the entire container height
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
                              color: colors.isDark ? '#ffffff' : '#000000',
                              fontSize: getFontSizeValue(10),
                              bottom: adultsHeight + 2,
                              width: barWidth,
                              backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                              borderRadius: 4,
                              paddingHorizontal: 2,
                              textAlign: 'center',
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {item.adults}
                        </Text>
                      )}
                    </Pressable>

                    {/* Youth/Children bar (only show for homeMeeting, not prayer, and only if value > 0) */}
                    {!isPrayer && item.youthChildren > 0 && (
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
                            bottom: bottomY, // All bars align at the same bottom position
                            width: barWidth,
                            height: youthHeight, // Height varies based on data
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.barSegment,
                            {
                              height: '100%', // Fill the entire container height
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
                                color: colors.isDark ? '#ffffff' : '#000000',
                                fontSize: getFontSizeValue(10),
                                bottom: youthHeight + 2,
                                width: barWidth,
                                backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                                borderRadius: 4,
                                paddingHorizontal: 2,
                                textAlign: 'center',
                                fontWeight: '600',
                              },
                            ]}
                          >
                            {item.youthChildren}
                          </Text>
                        )}
                      </Pressable>
                    )}
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

            {/* X-axis labels - Use same style as main Sunday meeting chart */}
            <View style={styles.xAxisContainer}>
              {chartData.map((item, index) => {
                // Show label for every few points to avoid crowding on mobile
                // Adjust based on chart width and data points (same logic as main chart)
                const maxLabels = Math.floor(chartAreaWidth / 60); // Show max labels based on available width
                const showEvery = Math.max(1, Math.ceil(chartData.length / maxLabels));
                if (index % showEvery === 0 || index === chartData.length - 1) {
                  const date = new Date(item.date);
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  // Calculate X position: base position + center of actual bar group
                  // Bar group starts at: (index * (groupWidth + barGroupSpacing)) + 30
                  const barGroupStartX = (index * (groupWidth + barGroupSpacing)) + 30;
                  // If only adults bar is shown (prayer or youthChildren === 0), center on adults bar
                  // Otherwise, center on the group (two bars)
                  const hasYouthBar = !isPrayer && item.youthChildren > 0;
                  const labelX = hasYouthBar 
                    ? barGroupStartX + groupWidth / 2  // Center of two bars
                    : barGroupStartX + barWidth / 2;    // Center of single adults bar
                  return (
                    <Text
                      key={`xaxis-${item.date}-${index}`}
                      style={[
                        styles.xAxisLabel,
                        {
                          left: labelX - 15,
                          color: colors.isDark ? '#ffffff' : '#333333',
                          fontSize: getFontSizeValue(10),
                          fontWeight: '600',
                          backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                          borderRadius: 4,
                          paddingVertical: 2,
                          paddingHorizontal: 4,
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
    chartData: {date: string; adults: number; youthChildren: number; totalPeople: number}[];
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
      <View style={[styles.scopeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            {renderScopeBarChart(group.chartData, true, selectedFilter === 'prayer')}

            {/* Chart legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                  成年人
                </Text>
              </View>
              {/* Only show youth/children legend for homeMeeting, not prayer */}
              {selectedFilter !== 'prayer' && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                    青少年/儿童
                  </Text>
                </View>
              )}
            </View>

            {/* Chart info */}
            <View style={styles.chartInfo}>
              <Text style={[styles.chartInfoText, { color: colors.textSecondary, fontSize: getFontSizeValue(11) }]}>
                {selectedFilter === 'prayer' 
                  ? `最高: 成年人 ${Math.max(...group.chartData.map(d => d.adults), 0)} 人`
                  : `最高: 成年人 ${Math.max(...group.chartData.map(d => d.adults), 0)} 人, 青少年/儿童 ${Math.max(...group.chartData.map(d => d.youthChildren), 0)} 人`
                }
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

    const maxAdults = Math.max(...chartData.map(d => d.adults), 0); // Max adults value for Y-axis
    const chartAreaWidth = CHART_WIDTH - 60; // Leave space for Y-axis
    
    // Wider bars and larger gaps for better visibility and interaction
    // Showing both adults and youth/children side by side
    const barSpacing = 4; // Spacing between adults and youth/children bars
    const barGroupSpacing = 28; // Increased spacing between date groups for better separation
    const barWidth = 32; // Wider bars so numbers can fit on one line
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
          {/* Y-axis labels - Show max adults value and 0 */}
          {/* Align with bar positions: bottomY = CHART_HEIGHT - 200 = 0 */}
          <View style={styles.yAxisContainer}>
            {/* Top label: Maximum adults value - at top of chartArea (where max bars reach) */}
            <Text
              style={[
                styles.yAxisLabel,
                {
                  color: colors.isDark ? '#e0e0e0' : '#333333',
                  fontSize: getFontSizeValue(11),
                  fontWeight: '600',
                },
              ]}
            >
              {maxAdults}
            </Text>
            {/* Bottom label: 0 - at bottomY position (CHART_HEIGHT - 200 = 0) */}
            <Text
              style={[
                styles.yAxisLabel,
                {
                  color: colors.isDark ? '#e0e0e0' : '#333333',
                  fontSize: getFontSizeValue(11),
                  fontWeight: '600',
                },
              ]}
            >
              0
            </Text>
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
            {/* Grid lines - Align with bar positions: bottomY = CHART_HEIGHT - 200 = 0 */}
            {/* Top grid line (max value) - at top of chartArea where max bars reach */}
            <View
              style={[
                styles.gridLine,
                {
                  top: 0,
                  borderColor: colors.borderLight || colors.border,
                },
              ]}
            />
            {/* Bottom grid line (0) - at bottomY position (CHART_HEIGHT - 200 = 0) */}
            <View
              style={[
                styles.gridLine,
                {
                  top: CHART_HEIGHT - 200, // Same as bottomY, align with bar bottoms
                  borderColor: colors.borderLight || colors.border,
                },
              ]}
            />

            {/* Bars - Adults and Youth/Children Side by Side */}
            <View style={styles.barsContainer}>
              {chartData.map((item, index) => {
                const x = (index * (groupWidth + barGroupSpacing)) + 30;
                // chartArea height is CHART_HEIGHT - 60, use that for height calculation
                const chartAreaActualHeight = CHART_HEIGHT - 60;
                const adultsHeight = (item.adults / maxAdults) * chartAreaActualHeight;
                const youthHeight = (item.youthChildren / maxAdults) * chartAreaActualHeight;
                // Bottom of chart area - all bars should align here (0 on Y-axis)
                // chartArea bottom is at CHART_HEIGHT - 60 relative to chartArea container
                const bottomY = CHART_HEIGHT - 230;

                return (
                  <View key={`bar-group-${item.date}-${index}`} style={styles.barGroup}>
                    {/* Adults bar (left) */}
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
                          bottom: bottomY, // All bars align at the same bottom position
                          width: barWidth,
                          height: adultsHeight, // Height varies based on data
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.barSegment,
                          {
                            height: '100%', // Fill the entire container height
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
                              color: colors.isDark ? '#ffffff' : '#000000',
                              fontSize: getFontSizeValue(10),
                              bottom: adultsHeight + 2,
                              width: barWidth,
                              backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                              borderRadius: 4,
                              paddingHorizontal: 2,
                              textAlign: 'center',
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {item.adults}
                        </Text>
                      )}
                    </Pressable>

                    {/* Youth/Children bar (right, next to adults) - Only show if value > 0 */}
                    {item.youthChildren > 0 && (
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
                            bottom: bottomY, // All bars align at the same bottom position
                            width: barWidth,
                            height: youthHeight, // Height varies based on data
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.barSegment,
                            {
                              height: '100%', // Fill the entire container height
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
                                color: colors.isDark ? '#ffffff' : '#000000',
                                fontSize: getFontSizeValue(10),
                                bottom: youthHeight + 2,
                                width: barWidth,
                                backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                                borderRadius: 4,
                                paddingHorizontal: 2,
                                textAlign: 'center',
                                fontWeight: '600',
                              },
                            ]}
                          >
                            {item.youthChildren}
                          </Text>
                        )}
                      </Pressable>
                    )}
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

            {/* X-axis labels - optimized for mobile readability */}
            <View style={styles.xAxisContainer}>
              {chartData.map((item, index) => {
                // Show label for every few points to avoid crowding on mobile
                // Adjust based on chart width and data points
                const maxLabels = Math.floor(chartAreaWidth / 60); // Show max labels based on available width
                const showEvery = Math.max(1, Math.ceil(chartData.length / maxLabels));
                if (index % showEvery === 0 || index === chartData.length - 1) {
                  const date = new Date(item.date);
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  // Calculate X position: base position + center of actual bar group
                  // Bar group starts at: (index * (groupWidth + barGroupSpacing)) + 30
                  const barGroupStartX = (index * (groupWidth + barGroupSpacing)) + 30;
                  // If only adults bar is shown (youthChildren === 0), center on adults bar
                  // Otherwise, center on the group (two bars)
                  const hasYouthBar = item.youthChildren > 0;
                  const labelX = hasYouthBar 
                    ? barGroupStartX + groupWidth / 2  // Center of two bars
                    : barGroupStartX + barWidth / 2;    // Center of single adults bar
                  return (
                    <Text
                      key={`xaxis-main-${item.date}-${index}`}
                      style={[
                        styles.xAxisLabel,
                        {
                          left: labelX - 15,
                          color: colors.isDark ? '#ffffff' : '#333333',
                          fontSize: getFontSizeValue(10),
                          fontWeight: '600',
                          backgroundColor: colors.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
                          borderRadius: 4,
                          paddingVertical: 2,
                          paddingHorizontal: 4,
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
            共 {chartData.length} 个数据点 | 最高: 成年人 {maxAdults} 人, 青少年/儿童 {Math.max(...chartData.map(d => d.youthChildren), 0)} 人
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
        {selectedFilter === 'table' && (
          <>
            {loadingAllRecords && (
              <View style={styles.loadingAllContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingAllText, { color: colors.textSecondary, fontSize: getFontSizeValue(14) }]}>
                  正在加载所有数据...
                </Text>
              </View>
            )}
            {renderBarChart()}
          </>
        )}

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
                        // Auto-load all records for any tab to ensure complete data
                        if (hasMore) {
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
                  {scopeGroupedData.map((group, index) => (
                    <View key={group.scopeValue || `scope-${index}`}>
                      {renderScopeGroupCard(group)}
                    </View>
                  ))}
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
            keyExtractor={(item, index) => {
              // Use combination of id, date, and index to ensure uniqueness
              // This handles cases where id might be duplicate or undefined
              const id = item.id ? item.id.toString() : `no-id-${index}`;
              return `record-${id}-${item.date}-${item.meetingType}-${index}`;
            }}
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
                refreshing={refreshing || loadingAllRecords}
                onRefresh={() => {
                  allRecordsLoadedRef.current = false;
                  loadRecords(true).then(() => {
                    // Auto-load all records to ensure complete data
                    if (hasMore) {
                      loadAllRecords();
                    }
                  });
                }}
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
    height: CHART_HEIGHT - 20,
    justifyContent: 'space-between', // Show both top (max) and bottom (0) labels
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 30, // Top padding aligns with chartArea marginTop
    paddingBottom: CHART_HEIGHT - 230, // Bottom padding aligns with bottomY (0 position)
  },
  yAxisLabel: {
    textAlign: 'right',
  },
  chartArea: {
    height: CHART_HEIGHT - 60,
    marginTop: 30,
    marginBottom: 30, // Add bottom margin for X-axis labels
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
    bottom: 30, // Align with chart bottom (accounting for X-axis space)
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT - 60, // Full height of chart area
  },
  stackedBarContainer: {
    flexDirection: 'column-reverse', // Stack from bottom to top
    justifyContent: 'flex-end',
    alignItems: 'stretch', // Stretch to full width
    height: '100%', // Take full height of parent
  },
  barContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barSegmentPressable: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
    justifyContent: 'flex-end', // Align content to bottom
    alignItems: 'center',
    position: 'relative',
  },
  barSegment: {
    width: '100%',
    borderRadius: 3,
    minHeight: 2,
  },
  barValue: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  tooltip: {
    position: 'absolute',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
    maxWidth: 200,
    zIndex: 1000,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tooltipDate: {
    fontWeight: '600',
    flex: 1,
  },
  tooltipCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  tooltipContent: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  tooltipIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tooltipLabel: {
    flex: 1,
  },
  tooltipValue: {
    textAlign: 'right',
  },
  tooltipText: {
    marginTop: 2,
  },
  xAxisContainer: {
    position: 'absolute',
    bottom: -30, // Position below chartArea (accounting for marginBottom: 30)
    left: 0,
    right: 0,
    height: 30,
  },
  xAxisLabel: {
    position: 'absolute',
    textAlign: 'center',
    width: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
    paddingVertical: 2,
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
    overflow: 'visible', // Changed from 'hidden' to allow X-axis labels to be visible
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
    paddingBottom: 16, // Ensure space for X-axis labels
    overflow: 'visible', // Allow X-axis labels to be visible
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
    minHeight: CHART_HEIGHT - 30, // Ensure enough space for chart + X-axis labels
  },
});
