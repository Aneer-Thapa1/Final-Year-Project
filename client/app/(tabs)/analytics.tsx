// screens/Analytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, ContributionGraph } from 'react-native-chart-kit';
import { MotiView, AnimatePresence } from 'moti';
import {
    Trophy,
    Flame,
    Calendar,
    TrendingUp,
    Activity,
    ChevronDown,
    Clock,
    BarChart2,
    Award,
    Clock3,
    Hash,
    Zap,
    Check,
    X,
    Clock4,
    ChevronRight,
    Filter,
    Plus,
    Minus,
    ArrowUp,
    ArrowDown,
    Target,
    PieChart
} from 'lucide-react-native';

// Import the services
import {
    getUserHabits,
    getHabitAnalytics,
    getHabitDetails,
    getStreakHistory,
    getHabitDomains
} from '../../services/habitService';

// Constants
const TAB_BAR_HEIGHT = 80; // Estimated tab bar height

const Analytics = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const screenWidth = Dimensions.get('window').width - 40;
    const screenHeight = Dimensions.get('window').height;

    // Theme colors
    const colors = {
        background: isDark ? '#0F172A' : '#F8FAFC', // Darker blue-gray for dark mode
        cardBg: isDark ? '#1E293B' : '#FFFFFF',
        primary: isDark ? '#818CF8' : '#4F46E5', // Indigo
        primaryLight: isDark ? '#C7D2FE' : '#E0E7FF',
        primaryDark: isDark ? '#4F46E5' : '#4338CA',
        text: isDark ? '#F1F5F9' : '#0F172A',
        textSecondary: isDark ? '#94A3B8' : '#64748B',
        success: isDark ? '#34D399' : '#10B981', // Green
        warning: isDark ? '#FBBF24' : '#F59E0B', // Amber
        danger: isDark ? '#F87171' : '#EF4444', // Red
        info: isDark ? '#60A5FA' : '#3B82F6', // Blue
        border: isDark ? '#334155' : '#E2E8F0',
    };

    // State variables
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [viewMode, setViewMode] = useState('overall'); // 'overall' or 'habit'
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [expandedSection, setExpandedSection] = useState('completion');
    const [habits, setHabits] = useState([]);
    const [domains, setDomains] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [overallStats, setOverallStats] = useState({
        totalHabits: 0,
        activeHabits: 0,
        averageCompletion: 0,
        bestStreak: 0,
        currentStreak: 0,
        totalCompletions: 0,
        pointsEarned: 0
    });

    // Fetch initial data
    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch habits
            const habitsResponse = await getUserHabits();

            if (habitsResponse && habitsResponse.habits) {
                setHabits(habitsResponse.habits);

                // Calculate overall stats
                const activeHabits = habitsResponse.habits.filter(h => h.is_active);
                let totalCompletion = 0;
                let completionCount = 0;
                let bestStreak = 0;
                let totalCompletions = 0;

                activeHabits.forEach(habit => {
                    if (habit.completionRate) {
                        totalCompletion += habit.completionRate;
                        completionCount++;
                    }

                    if (habit.streak && habit.streak[0]) {
                        bestStreak = Math.max(bestStreak, habit.streak[0].current_streak || 0);
                    }

                    if (habit.stats && habit.stats.completedLogs) {
                        totalCompletions += habit.stats.completedLogs;
                    }
                });

                const avgCompletion = completionCount > 0 ? (totalCompletion / completionCount) : 0;

                // Get current day streaks
                const currentDayCompletions = activeHabits.filter(h => h.scheduledToday && h.completedToday).length;

                // If no habit is selected yet, select the first active one with highest streak
                if (activeHabits.length > 0 && !selectedHabit) {
                    const sortedByStreak = [...activeHabits].sort((a, b) => {
                        const streakA = a.streak && a.streak[0] ? a.streak[0].current_streak : 0;
                        const streakB = b.streak && b.streak[0] ? b.streak[0].current_streak : 0;
                        return streakB - streakA;
                    });

                    setSelectedHabit(sortedByStreak[0].habit_id);
                }

                // Fetch domains
                const domainsResponse = await getHabitDomains();
                if (domainsResponse && domainsResponse.data) {
                    setDomains(domainsResponse.data);

                    // Calculate points earned across all habits
                    let totalPoints = 0;
                    domainsResponse.data.forEach(domain => {
                        if (domain.stats && domain.stats.total_points) {
                            totalPoints += domain.stats.total_points;
                        }
                    });

                    setOverallStats({
                        totalHabits: habitsResponse.habits.length,
                        activeHabits: activeHabits.length,
                        averageCompletion: Math.round(avgCompletion * 10) / 10,
                        bestStreak: bestStreak,
                        currentStreak: currentDayCompletions,
                        totalCompletions: totalCompletions,
                        pointsEarned: totalPoints
                    });
                }
            }

            // Fetch both overall and habit-specific analytics
            await Promise.all([fetchOverallAnalytics(), fetchHabitAnalytics()]);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Fetch overall analytics data
    const fetchOverallAnalytics = async () => {
        try {
            const activeHabits = habits.filter(h => h.is_active).slice(0, 5);
            const analyticsPromises = activeHabits.map(habit =>
                getHabitAnalytics(habit.habit_id, period, false, true)
            );

            const analyticsResults = await Promise.all(analyticsPromises);

            // Combine and aggregate data
            const combinedAnalytics = {
                completion_by_day: [
                    { day: 'Sunday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Monday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Tuesday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Wednesday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Thursday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Friday', completions: 0, completion_rate: 0, scheduled: 0 },
                    { day: 'Saturday', completions: 0, completion_rate: 0, scheduled: 0 }
                ],
                stats: {
                    completed_days: 0,
                    missed_days: 0,
                    skipped_days: 0,
                    scheduled_days: 0,
                    completion_rate: 0,
                    points_earned: 0,
                    consistency_score: 0
                },
                time_patterns: [
                    { name: 'Early Morning (5-8am)', count: 0, rate: 0 },
                    { name: 'Morning (8am-12pm)', count: 0, rate: 0 },
                    { name: 'Afternoon (12-5pm)', count: 0, rate: 0 },
                    { name: 'Evening (5-9pm)', count: 0, rate: 0 },
                    { name: 'Night (9pm-12am)', count: 0, rate: 0 },
                    { name: 'Late Night (12-5am)', count: 0, rate: 0 }
                ],
                monthly_distribution: []
            };

            // Count valid results
            let validResults = 0;

            analyticsResults.forEach(result => {
                if (result && result.data) {
                    validResults++;

                    // Aggregate stats
                    const stats = result.data.stats;
                    if (stats) {
                        combinedAnalytics.stats.completed_days += stats.completed_days || 0;
                        combinedAnalytics.stats.missed_days += stats.missed_days || 0;
                        combinedAnalytics.stats.skipped_days += stats.skipped_days || 0;
                        combinedAnalytics.stats.scheduled_days += stats.scheduled_days || 0;
                        combinedAnalytics.stats.points_earned += stats.points_earned || 0;
                        combinedAnalytics.stats.consistency_score += stats.consistency_score || 0;
                    }

                    // Aggregate day analysis
                    if (result.data.day_analysis) {
                        result.data.day_analysis.forEach((day, index) => {
                            const matchingDay = combinedAnalytics.completion_by_day.find(d =>
                                d.day.toLowerCase() === day.day.toLowerCase()
                            );
                            if (matchingDay) {
                                matchingDay.completions += day.completions || 0;
                                matchingDay.scheduled += day.scheduled || 0;
                            }
                        });
                    }

                    // Aggregate time patterns
                    if (result.data.time_patterns) {
                        result.data.time_patterns.forEach((pattern, index) => {
                            if (index < combinedAnalytics.time_patterns.length) {
                                combinedAnalytics.time_patterns[index].count += pattern.count || 0;
                            }
                        });
                    }

                    // Aggregate monthly distribution (heat map data)
                    if (result.data.monthly_distribution) {
                        result.data.monthly_distribution.forEach(day => {
                            const existingDay = combinedAnalytics.monthly_distribution.find(d => d.date === day.date);
                            if (existingDay) {
                                existingDay.value += day.value > 0 ? 1 : 0; // Count completed or skipped days
                            } else {
                                combinedAnalytics.monthly_distribution.push({
                                    date: day.date,
                                    value: day.value > 0 ? 1 : 0
                                });
                            }
                        });
                    }
                }
            });

            // Calculate average completion rate
            if (validResults > 0 && combinedAnalytics.stats.scheduled_days > 0) {
                combinedAnalytics.stats.completion_rate = Math.round(
                    (combinedAnalytics.stats.completed_days / combinedAnalytics.stats.scheduled_days) * 100
                );
                combinedAnalytics.stats.consistency_score = Math.round(combinedAnalytics.stats.consistency_score / validResults);
            }

            // Calculate completion rates by day
            combinedAnalytics.completion_by_day.forEach(day => {
                day.completion_rate = day.scheduled > 0 ? Math.round((day.completions / day.scheduled) * 100) : 0;
            });

            // Calculate time pattern rates
            const totalTimePatternCount = combinedAnalytics.time_patterns.reduce((sum, p) => sum + p.count, 0);
            if (totalTimePatternCount > 0) {
                combinedAnalytics.time_patterns.forEach(pattern => {
                    pattern.rate = Math.round((pattern.count / totalTimePatternCount) * 100);
                });
            }

            setAnalytics(combinedAnalytics);

        } catch (error) {
            console.error('Error fetching overall analytics:', error);
        }
    };

    // Fetch habit-specific analytics data
    const fetchHabitAnalytics = async () => {
        if (!selectedHabit) return;

        try {
            const analyticsData = await getHabitAnalytics(selectedHabit, period, true);

            if (analyticsData && analyticsData.data) {
                setHabitAnalytics(analyticsData.data);
            }
        } catch (error) {
            console.error('Error fetching habit analytics:', error);
        }
    };

    // Initial data load
    useEffect(() => {
        fetchData();
    }, []);

    // Refresh data when period changes
    useEffect(() => {
        if (habits.length > 0) {
            Promise.all([fetchOverallAnalytics(), fetchHabitAnalytics()]);
        }
    }, [period]);

    // Refresh habit analytics when selected habit changes
    useEffect(() => {
        if (selectedHabit) {
            fetchHabitAnalytics();
        }
    }, [selectedHabit]);

    // Handle pull-to-refresh
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    // Prepare chart data for completion by day (overall)
    const overallCompletionByDayData = useMemo(() => {
        if (!analytics || !analytics.completion_by_day || analytics.completion_by_day.length === 0) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        // We'll show completion rates instead of raw counts for more meaningful analysis
        return {
            labels: analytics.completion_by_day.map(day => day.day.substring(0, 3)),
            datasets: [{
                data: analytics.completion_by_day.map(day => day.completion_rate),
                color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})` // Indigo
            }]
        };
    }, [analytics]);

    // Prepare chart data for completion by day (habit-specific)
    const habitCompletionByDayData = useMemo(() => {
        if (!habitAnalytics || !habitAnalytics.day_analysis || habitAnalytics.day_analysis.length === 0) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        // Show both completions and completion rates for more detailed analysis
        return {
            labels: habitAnalytics.day_analysis.map(day => day.day.substring(0, 3)),
            datasets: [{
                data: habitAnalytics.day_analysis.map(day => day.completion_rate || 0)
            }]
        };
    }, [habitAnalytics]);

    // Prepare chart data for streak progression
    const streakProgressionData = useMemo(() => {
        if (!habitAnalytics || !habitAnalytics.streak_progression || habitAnalytics.streak_progression.length === 0) {
            return {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{ data: [0, 0, 0, 0] }]
            };
        }

        // Group streak data by weeks but with a more sophisticated approach
        const progressionData = habitAnalytics.streak_progression;

        // Group by week of month
        const startDate = new Date(habitAnalytics.date_range.start);
        const weekGroups = {};

        progressionData.forEach(item => {
            const date = new Date(item.date);
            // Calculate week number (since start date)
            const daysSinceStart = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
            const weekNum = Math.floor(daysSinceStart / 7) + 1;

            if (!weekGroups[weekNum]) {
                weekGroups[weekNum] = [];
            }
            weekGroups[weekNum].push(item.streak);
        });

        // Calculate average streak per week
        const labels = Object.keys(weekGroups).map(w => `Week ${w}`);
        const data = Object.values(weekGroups).map(streaks => {
            const avg = streaks.reduce((sum, val) => sum + val, 0) / streaks.length;
            return Math.round(avg * 10) / 10;
        });

        // If we have many weeks, consolidate to the most recent weeks
        const maxWeeks = 5;
        if (labels.length > maxWeeks) {
            return {
                labels: labels.slice(-maxWeeks),
                datasets: [{ data: data.slice(-maxWeeks) }]
            };
        }

        return {
            labels: labels.length > 0 ? labels : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{ data: data.length > 0 ? data : [0, 0, 0, 0] }]
        };
    }, [habitAnalytics]);

    // Prepare domain stats chart data
    const domainStatsData = useMemo(() => {
        if (!domains || domains.length === 0) {
            return {
                labels: ['Domain 1', 'Domain 2', 'Domain 3'],
                datasets: [{ data: [0, 0, 0] }]
            };
        }

        // Get top 5 domains by completion rate
        const topDomains = [...domains]
            .filter(domain => domain.stats && domain.stats.scheduled_today > 0)
            .sort((a, b) => {
                const rateA = a.stats.completed_today / a.stats.scheduled_today;
                const rateB = b.stats.completed_today / b.stats.scheduled_today;
                return rateB - rateA;
            })
            .slice(0, 5);

        return {
            labels: topDomains.map(domain => domain.name.length > 8 ? domain.name.substring(0, 7) + '...' : domain.name),
            datasets: [{
                data: topDomains.map(domain =>
                    Math.round((domain.stats.completed_today / domain.stats.scheduled_today) * 100)
                )
            }]
        };
    }, [domains]);

    // Chart configurations
    const chartConfig = {
        backgroundGradientFrom: colors.cardBg,
        backgroundGradientTo: colors.cardBg,
        decimalPlaces: 0,
        color: (opacity = 1) => colors.primary + (opacity < 1 ? Math.round(opacity * 255).toString(16).padStart(2, '0') : ''),
        labelColor: (opacity = 1) => colors.textSecondary + (opacity < 1 ? Math.round(opacity * 255).toString(16).padStart(2, '0') : ''),
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: colors.primaryDark,
        },
        fillShadowGradient: colors.primary,
        fillShadowGradientOpacity: 0.3
    };

    // Heat map chart config
    const heatmapConfig = {
        backgroundGradientFrom: colors.cardBg,
        backgroundGradientTo: colors.cardBg,
        color: (opacity = 1) => `rgba(129, 140, 248, ${opacity})`,
        labelColor: (opacity = 1) => colors.textSecondary,
        style: {
            borderRadius: 16,
        },
    };

    // Custom components
    const StatsCard = ({ title, value, icon, subtitle, color = 'primary', trend = null, trendValue = null }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={{
                backgroundColor: colors.cardBg,
                borderRadius: 16,
                padding: 16,
                width: screenWidth / 2 - 16,
                marginRight: 12,
                shadowColor: isDark ? '#000' : '#CBD5E1',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: isDark ? 0 : 2,
            }}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
                    {title}
                </Text>
                <View style={{ backgroundColor: `${colors[color]}30`, padding: 6, borderRadius: 8 }}>
                    {icon}
                </View>
            </View>
            <View className="flex-row items-baseline">
                <Text style={{ fontSize: 20, color: colors.text, fontWeight: 'bold' }}>
                    {value}
                </Text>

                {trend && trendValue !== null && (
                    <View className="flex-row items-center ml-2">
                        {trend === 'up' ? (
                            <ArrowUp size={14} color={colors.success} />
                        ) : (
                            <ArrowDown size={14} color={colors.danger} />
                        )}
                        <Text style={{ fontSize: 12, color: trend === 'up' ? colors.success : colors.danger, marginLeft: 2 }}>
                            {trendValue}%
                        </Text>
                    </View>
                )}
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {subtitle}
            </Text>
        </MotiView>
    );

    const HabitSelector = () => (
        <View className="mb-4">
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginBottom: 8 }}>
                Select Habit
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
            >
                {habits.filter(h => h.is_active).map((habit) => (
                    <TouchableOpacity
                        key={habit.habit_id}
                        onPress={() => setSelectedHabit(habit.habit_id)}
                        style={{
                            backgroundColor: selectedHabit === habit.habit_id
                                ? (isDark ? colors.primaryDark + '40' : colors.primaryLight)
                                : colors.cardBg,
                            padding: 12,
                            marginRight: 12,
                            borderRadius: 12,
                            borderWidth: selectedHabit === habit.habit_id ? 1 : 0,
                            borderColor: colors.primary + '50',
                            shadowColor: isDark ? '#000' : '#CBD5E1',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: isDark ? 0 : 1,
                        }}
                    >
                        <Text style={{
                            color: selectedHabit === habit.habit_id
                                ? colors.primary
                                : colors.text,
                            fontWeight: selectedHabit === habit.habit_id ? '600' : '500'
                        }}>
                            {habit.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const PeriodSelector = () => (
        <View className="mb-6 flex-row">
            {['week', 'month', 'quarter', 'year'].map((p) => (
                <TouchableOpacity
                    key={p}
                    onPress={() => setPeriod(p)}
                    style={{
                        backgroundColor: period === p
                            ? (isDark ? colors.primaryDark + '40' : colors.primaryLight)
                            : colors.cardBg,
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        marginRight: 8,
                        borderRadius: 10,
                        borderWidth: period === p ? 1 : 0,
                        borderColor: colors.primary + '50',
                    }}
                >
                    <Text style={{
                        color: period === p ? colors.primary : colors.text,
                        fontWeight: period === p ? '600' : '500',
                        textTransform: 'capitalize'
                    }}>
                        {p}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const ViewModeSelector = () => (
        <View className="flex-row mb-6" style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: colors.cardBg }}>
            <TouchableOpacity
                onPress={() => setViewMode('overall')}
                style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: viewMode === 'overall'
                        ? (isDark ? colors.primaryDark : colors.primary)
                        : 'transparent',
                }}
            >
                <Text style={{
                    textAlign: 'center',
                    color: viewMode === 'overall' ? '#fff' : colors.text,
                    fontWeight: '600'
                }}>
                    Overall
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setViewMode('habit')}
                style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: viewMode === 'habit'
                        ? (isDark ? colors.primaryDark : colors.primary)
                        : 'transparent',
                }}
            >
                <Text style={{
                    textAlign: 'center',
                    color: viewMode === 'habit' ? '#fff' : colors.text,
                    fontWeight: '600'
                }}>
                    Habit Specific
                </Text>
            </TouchableOpacity>
        </View>
    );

    const MetricCard = ({ title, value, icon, suffix = '', color = 'primary', trend = null }) => (
        <View style={{
            flex: 1,
            backgroundColor: colors.cardBg,
            borderRadius: 12,
            padding: 12,
            marginRight: 8,
            marginBottom: 8,
            minWidth: screenWidth / 2 - 24,
        }}>
            <View className="flex-row items-center mb-1">
                <View style={{ backgroundColor: `${colors[color]}20`, padding: 4, borderRadius: 6, marginRight: 6 }}>
                    {icon}
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {title}
                </Text>
                {trend && (
                    <View className="ml-auto">
                        {trend === 'up' ? (
                            <ArrowUp size={12} color={colors.success} />
                        ) : trend === 'down' ? (
                            <ArrowDown size={12} color={colors.danger} />
                        ) : (
                            <Minus size={12} color={colors.warning} />
                        )}
                    </View>
                )}
            </View>
            <View className="flex-row items-baseline">
                <Text style={{ fontSize: 18, color: colors[color], fontWeight: 'bold' }}>
                    {value}
                </Text>
                {suffix && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
                        {suffix}
                    </Text>
                )}
            </View>
        </View>
    );

    const CollapsibleSection = ({ title, icon, children, isExpanded, onToggle }) => (
        <View className="mb-6" style={{ backgroundColor: colors.cardBg, borderRadius: 16, overflow: 'hidden' }}>
            <TouchableOpacity
                onPress={onToggle}
                className="flex-row items-center justify-between p-4"
                style={{
                    borderBottomWidth: isExpanded ? 1 : 0,
                    borderBottomColor: colors.border
                }}
            >
                <View className="flex-row items-center">
                    <View style={{ backgroundColor: colors.primary + '20', padding: 8, borderRadius: 8, marginRight: 12 }}>
                        {icon}
                    </View>
                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
                        {title}
                    </Text>
                </View>
                {isExpanded ?
                    <Minus size={20} color={colors.textSecondary} /> :
                    <Plus size={20} color={colors.textSecondary} />
                }
            </TouchableOpacity>

            <AnimatePresence>
                {isExpanded && (
                    <MotiView
                        from={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <View className="p-4">
                            {children}
                        </View>
                    </MotiView>
                )}
            </AnimatePresence>
        </View>
    );

    const SectionTitle = ({ icon, title }) => (
        <View className="flex-row items-center mb-3">
            {icon}
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600', marginLeft: 8 }}>
                {title}
            </Text>
        </View>
    );

    // Loading state
    if (loading && !habits.length) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 16, color: colors.text }}>Loading analytics...</Text>
                </View></SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                className="flex-1 px-4"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT }}
            >
                {/* Header */}
                <View className="pb-4 pt-2">
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                        Analytics
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                        Track your progress and insights
                    </Text>
                </View>

                {/* Overall Stats */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-6"
                >
                    <StatsCard
                        title="Current Streak"
                        value={`${overallStats.currentStreak}`}
                        icon={<Flame size={20} color={colors.warning} />}
                        subtitle={`Best: ${overallStats.bestStreak} days`}
                        color="warning"
                        trend={overallStats.currentStreak > 0 ? 'up' : null}
                        trendValue={overallStats.currentStreak > 0 ? 5 : null}
                    />
                    <StatsCard
                        title="Completion Rate"
                        value={`${overallStats.averageCompletion}%`}
                        icon={<TrendingUp size={20} color={colors.info} />}
                        subtitle="All active habits"
                        color="info"
                    />
                    <StatsCard
                        title="Total Habits"
                        value={overallStats.totalHabits}
                        icon={<Activity size={20} color={colors.success} />}
                        subtitle={`${overallStats.activeHabits} active now`}
                        color="success"
                    />
                    <StatsCard
                        title="Points Earned"
                        value={overallStats.pointsEarned}
                        icon={<Zap size={20} color={colors.primary} />}
                        subtitle="All time total"
                        color="primary"
                    />
                </ScrollView>

                {/* View Mode Selector */}
                <ViewModeSelector />

                {/* Period Selector for both modes */}
                <PeriodSelector />

                {/* Loading indicator when refreshing data */}
                {loading && (
                    <View className="h-20 justify-center items-center">
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                {!loading && viewMode === 'overall' ? (
                    // OVERALL VIEW
                    <>
                        {/* Domain Completion Rates */}
                        {domains.length > 0 && (
                            <CollapsibleSection
                                title="Domain Performance"
                                icon={<BarChart2 size={20} color={colors.primary} />}
                                isExpanded={expandedSection === 'domains'}
                                onToggle={() => setExpandedSection(expandedSection === 'domains' ? '' : 'domains')}
                            >
                                <View className="mb-4">
                                    <BarChart
                                        data={domainStatsData}
                                        width={screenWidth - 32}
                                        height={220}
                                        chartConfig={chartConfig}
                                        style={{ borderRadius: 16, marginVertical: 8 }}
                                        fromZero={true}
                                        showValuesOnTopOfBars={true}
                                        withInnerLines={false}
                                        yAxisSuffix="%"
                                        segments={5}
                                    />
                                </View>

                                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 12 }}>
                                    Domain Statistics
                                </Text>

                                {domains.slice(0, 5).map((domain, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            backgroundColor: colors.background,
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 10,
                                            borderLeftWidth: 4,
                                            borderLeftColor: domain.color || colors.primary
                                        }}
                                    >
                                        <View className="flex-row justify-between items-center">
                                            <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>
                                                {domain.name}
                                            </Text>
                                            <View className="flex-row items-center">
                                                <Flame size={14} color={colors.warning} />
                                                <Text style={{ fontSize: 13, color: colors.warning, marginLeft: 4 }}>
                                                    {domain.stats?.avg_streak?.toFixed(1) || 0} avg streak
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row mt-3">
                                            <View className="flex-1">
                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                    Total Habits
                                                </Text>
                                                <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>
                                                    {domain.stats?.total_habits || 0}
                                                </Text>
                                            </View>

                                            <View className="flex-1">
                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                    Completion Today
                                                </Text>
                                                <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>
                                                    {domain.stats?.completed_today || 0}/{domain.stats?.scheduled_today || 0}
                                                </Text>
                                            </View>

                                            <View className="flex-1">
                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                    Points
                                                </Text>
                                                <Text style={{ fontWeight: '600', color: colors.text, fontSize: 14 }}>
                                                    {domain.stats?.total_points || 0}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </CollapsibleSection>
                        )}

                        {/* Activity Calendar */}
                        {analytics && analytics.monthly_distribution && analytics.monthly_distribution.length > 0 && (
                            <CollapsibleSection
                                title="Activity Calendar"
                                icon={<Calendar size={20} color={colors.primary} />}
                                isExpanded={expandedSection === 'calendar'}
                                onToggle={() => setExpandedSection(expandedSection === 'calendar' ? '' : 'calendar')}
                            >
                                <View style={{ marginVertical: 10 }}>
                                    <ContributionGraph
                                        values={analytics.monthly_distribution}
                                        endDate={new Date()}
                                        numDays={90}
                                        width={screenWidth - 32}
                                        height={220}
                                        chartConfig={heatmapConfig}
                                        tooltipDataAttrs={(value) => ({ 'aria-label': `${value.date}: ${value.count} habits` })}
                                        squareSize={16}
                                        style={{ borderRadius: 16 }}
                                    />
                                </View>

                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
                                    This calendar shows your habit activity over time. Darker colors indicate more habits completed on that day.
                                </Text>
                            </CollapsibleSection>
                        )}

                        {/* Overall Completion Stats */}
                        {analytics && (
                            <CollapsibleSection
                                title="Completion Stats"
                                icon={<Check size={20} color={colors.primary} />}
                                isExpanded={expandedSection === 'completion'}
                                onToggle={() => setExpandedSection(expandedSection === 'completion' ? '' : 'completion')}
                            >
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    backgroundColor: colors.background,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 16
                                }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.success }}>
                                            {analytics.stats.completion_rate || 0}%
                                        </Text>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                                            Completion Rate
                                        </Text>
                                    </View>

                                    <View style={{ width: 1, backgroundColor: colors.border, height: '80%', alignSelf: 'center' }} />

                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary }}>
                                            {analytics.stats.points_earned || 0}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                                            Points Earned
                                        </Text>
                                    </View>
                                </View>

                                {analytics.stats.consistency_score !== undefined && (
                                    <View style={{
                                        backgroundColor: colors.background,
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <View>
                                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                Consistency Score
                                            </Text>
                                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 4 }}>
                                                {analytics.stats.consistency_score}/100
                                            </Text>
                                        </View>

                                        <View style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 30,
                                            borderWidth: 3,
                                            borderColor: getConsistencyColor(analytics.stats.consistency_score),
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: 'bold',
                                                color: getConsistencyColor(analytics.stats.consistency_score)
                                            }}>
                                                {analytics.stats.consistency_score}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View className="flex-row flex-wrap">
                                    <MetricCard
                                        title="Completed"
                                        value={analytics.stats.completed_days || 0}
                                        suffix="days"
                                        icon={<Check size={16} color={colors.success} />}
                                        color="success"
                                    />

                                    <MetricCard
                                        title="Missed"
                                        value={analytics.stats.missed_days || 0}
                                        suffix="days"
                                        icon={<X size={16} color={colors.danger} />}
                                        color="danger"
                                    />

                                    <MetricCard
                                        title="Skipped"
                                        value={analytics.stats.skipped_days || 0}
                                        suffix="days"
                                        icon={<Minus size={16} color={colors.warning} />}
                                        color="warning"
                                    />

                                    <MetricCard
                                        title="Scheduled"
                                        value={analytics.stats.scheduled_days || 0}
                                        suffix="days"
                                        icon={<Calendar size={16} color={colors.info} />}
                                        color="info"
                                    />
                                </View>
                            </CollapsibleSection>
                        )}

                        {/* Completion by Day of Week */}
                        <CollapsibleSection
                            title="Completion by Day"
                            icon={<Calendar size={20} color={colors.primary} />}
                            isExpanded={expandedSection === 'dayCompletion'}
                            onToggle={() => setExpandedSection(expandedSection === 'dayCompletion' ? '' : 'dayCompletion')}
                        >
                            <View>
                                <BarChart
                                    data={overallCompletionByDayData}
                                    width={screenWidth - 32}
                                    height={220}
                                    chartConfig={chartConfig}
                                    style={{ borderRadius: 16, marginVertical: 8 }}
                                    fromZero={true}
                                    showValuesOnTopOfBars={true}
                                    withInnerLines={false}
                                    yAxisSuffix="%"
                                />
                            </View>

                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
                                This chart shows your completion rate for each day of the week across all habits.
                                Identify your strongest and weakest days to optimize your habit schedule.
                            </Text>

                            {/* Day-by-day breakdown */}
                            {analytics && analytics.completion_by_day && (
                                <View style={{ marginTop: 16 }}>
                                    {analytics.completion_by_day.map((day, index) => {
                                        // Find best and worst days
                                        const rates = analytics.completion_by_day.map(d => d.completion_rate);
                                        const maxRate = Math.max(...rates);
                                        const minRate = Math.min(...rates.filter(r => r > 0));

                                        const isBest = day.completion_rate === maxRate && day.completion_rate > 0;
                                        const isWorst = day.completion_rate === minRate && day.completion_rate > 0;

                                        return (
                                            <View
                                                key={index}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    paddingVertical: 8,
                                                    borderBottomWidth: index < analytics.completion_by_day.length - 1 ? 1 : 0,
                                                    borderBottomColor: colors.border
                                                }}
                                            >
                                                <Text style={{
                                                    color: colors.text,
                                                    fontWeight: isBest || isWorst ? 'bold' : 'normal',
                                                    fontSize: 14
                                                }}>
                                                    {day.day}
                                                </Text>

                                                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                                                    <View style={{
                                                        height: 6,
                                                        backgroundColor: colors.background,
                                                        borderRadius: 3,
                                                        overflow: 'hidden'
                                                    }}>
                                                        <View style={{
                                                            height: '100%',
                                                            width: `${day.completion_rate}%`,
                                                            backgroundColor: isBest ? colors.success : isWorst ? colors.danger : colors.primary
                                                        }} />
                                                    </View>
                                                </View>

                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={{
                                                        color: isBest ? colors.success : isWorst ? colors.danger : colors.text,
                                                        fontWeight: 'bold',
                                                        fontSize: 14
                                                    }}>
                                                        {day.completion_rate}%
                                                    </Text>

                                                    {isBest && (
                                                        <Trophy size={14} color={colors.warning} style={{ marginLeft: 4 }} />
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </CollapsibleSection>

                        {/* Time Patterns */}
                        {analytics && analytics.time_patterns && analytics.time_patterns.length > 0 && (
                            <CollapsibleSection
                                title="Time of Day Patterns"
                                icon={<Clock size={20} color={colors.primary} />}
                                isExpanded={expandedSection === 'timePatterns'}
                                onToggle={() => setExpandedSection(expandedSection === 'timePatterns' ? '' : 'timePatterns')}
                            >
                                {analytics.time_patterns.map((segment, index) => {
                                    // Find the most productive time period
                                    const mostProductiveIndex = analytics.time_patterns.reduce(
                                        (maxIndex, current, i, arr) =>
                                            current.count > arr[maxIndex].count ? i : maxIndex,
                                        0
                                    );

                                    const isMostProductive = index === mostProductiveIndex && segment.count > 0;

                                    return (
                                        <View key={index} style={{
                                            marginBottom: index < analytics.time_patterns.length - 1 ? 12 : 0,
                                            backgroundColor: isMostProductive ? colors.primary + '15' : 'transparent',
                                            borderRadius: 8,
                                            padding: isMostProductive ? 8 : 0
                                        }}>
                                            <View className="flex-row justify-between mb-1 items-center">
                                                <View className="flex-row items-center">
                                                    <Text style={{
                                                        fontSize: 14,
                                                        color: colors.text,
                                                        fontWeight: isMostProductive ? '600' : 'normal'
                                                    }}>
                                                        {segment.name}
                                                    </Text>
                                                    {isMostProductive && (
                                                        <View style={{
                                                            backgroundColor: colors.primary + '30',
                                                            borderRadius: 4,
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            marginLeft: 8
                                                        }}>
                                                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                                                                Most Productive
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={{
                                                    fontSize: 14,
                                                    fontWeight: '600',
                                                    color: isMostProductive ? colors.primary : colors.textSecondary
                                                }}>
                                                    {segment.count} ({segment.rate || 0}%)
                                                </Text>
                                            </View>
                                            <View style={{
                                                height: 8,
                                                backgroundColor: colors.background,
                                                borderRadius: 4,
                                                overflow: 'hidden'
                                            }}>
                                                <View
                                                    style={{
                                                        height: '100%',
                                                        width: `${segment.rate || 0}%`,
                                                        backgroundColor: isMostProductive ? colors.primary : colors.primary + '60'
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}

                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
                                    This shows when you typically complete your habits throughout the day.
                                    Knowing your most productive times can help you schedule habits more effectively.
                                </Text>
                            </CollapsibleSection>
                        )}
                    </>
                ) : !loading ? (
                    // HABIT-SPECIFIC VIEW
                    <>
                        {/* Habit Selector */}
                        <HabitSelector />

                        {habitAnalytics ? (
                            <>
                                {/* Habit Header with Key Metrics */}
                                <View style={{
                                    backgroundColor: colors.cardBg,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 16
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <View>
                                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                                                {habitAnalytics.name}
                                            </Text>
                                            {habitAnalytics.domain && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                    <View style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: 4,
                                                        backgroundColor: habitAnalytics.domain.color || colors.primary,
                                                        marginRight: 6
                                                    }} />
                                                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                        {habitAnalytics.domain.name}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={{
                                            backgroundColor: colors.primary + '20',
                                            borderRadius: 12,
                                            padding: 10
                                        }}>
                                            <Flame size={24} color={colors.primary} />
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                                                {habitAnalytics.streaks?.current_streak || 0}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                Current Streak
                                            </Text>
                                        </View>

                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                                                {habitAnalytics.streaks?.longest_streak || 0}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                Longest Streak
                                            </Text>
                                        </View>

                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                                                {habitAnalytics.stats?.completion_rate || 0}%
                                            </Text>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                Completion Rate
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Habit-Specific Completion Stats */}
                                <CollapsibleSection
                                    title="Completion Stats"
                                    icon={<Check size={20} color={colors.primary} />}
                                    isExpanded={expandedSection === 'habitCompletion'}
                                    onToggle={() => setExpandedSection(expandedSection === 'habitCompletion' ? '' : 'habitCompletion')}
                                >
                                    {/* Stats comparison with previous period if available */}
                                    {habitAnalytics.previous_period && (
                                        <View style={{
                                            backgroundColor: colors.background,
                                            borderRadius: 12,
                                            padding: 16,
                                            marginBottom: 16
                                        }}>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 }}>
                                                Compared to Previous {period.charAt(0).toUpperCase() + period.slice(1)}
                                            </Text>

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <View style={{ alignItems: 'center' }}>
                                                    {habitAnalytics.trends && habitAnalytics.trends.completion_rate_change !== undefined && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            {habitAnalytics.trends.completion_rate_change > 0 ? (
                                                                <ArrowUp size={16} color={colors.success} />
                                                            ) : habitAnalytics.trends.completion_rate_change < 0 ? (
                                                                <ArrowDown size={16} color={colors.danger} />
                                                            ) : (
                                                                <Minus size={16} color={colors.warning} />
                                                            )}
                                                            <Text style={{
                                                                fontSize: 14,
                                                                fontWeight: '600',
                                                                color: habitAnalytics.trends.completion_rate_change > 0 ?
                                                                    colors.success :
                                                                    habitAnalytics.trends.completion_rate_change < 0 ?
                                                                        colors.danger :
                                                                        colors.warning,
                                                                marginLeft: 4
                                                            }}>
                                                                {habitAnalytics.trends.completion_rate_change > 0 ? '+' : ''}
                                                                {habitAnalytics.trends.completion_rate_change}%
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                        Completion Rate
                                                    </Text>
                                                </View>

                                                <View style={{ alignItems: 'center' }}>
                                                    {habitAnalytics.trends && habitAnalytics.trends.completed_days_change !== undefined && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            {habitAnalytics.trends.completed_days_change > 0 ? (
                                                                <ArrowUp size={16} color={colors.success} />
                                                            ) : habitAnalytics.trends.completed_days_change < 0 ? (
                                                                <ArrowDown size={16} color={colors.danger} />
                                                            ) : (
                                                                <Minus size={16} color={colors.warning} />
                                                            )}
                                                            <Text style={{
                                                                fontSize: 14,
                                                                fontWeight: '600',
                                                                color: habitAnalytics.trends.completed_days_change > 0 ?
                                                                    colors.success :
                                                                    habitAnalytics.trends.completed_days_change < 0 ?
                                                                        colors.danger :
                                                                        colors.warning,
                                                                marginLeft: 4
                                                            }}>
                                                                {habitAnalytics.trends.completed_days_change > 0 ? '+' : ''}
                                                                {habitAnalytics.trends.completed_days_change} days
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                        Completed Days
                                                    </Text>
                                                </View>

                                                <View style={{ alignItems: 'center' }}>
                                                    {habitAnalytics.trends && habitAnalytics.trends.missed_days_change !== undefined && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            {habitAnalytics.trends.missed_days_change < 0 ? (
                                                                <ArrowDown size={16} color={colors.success} />
                                                            ) : habitAnalytics.trends.missed_days_change > 0 ? (
                                                                <ArrowUp size={16} color={colors.danger} />
                                                            ) : (
                                                                <Minus size={16} color={colors.warning} />
                                                            )}
                                                            <Text style={{
                                                                fontSize: 14,
                                                                fontWeight: '600',
                                                                color: habitAnalytics.trends.missed_days_change < 0 ?
                                                                    colors.success :
                                                                    habitAnalytics.trends.missed_days_change > 0 ?
                                                                        colors.danger :
                                                                        colors.warning,
                                                                marginLeft: 4
                                                            }}>
                                                                {habitAnalytics.trends.missed_days_change > 0 ? '+' : ''}
                                                                {habitAnalytics.trends.missed_days_change} days
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                        Missed Days
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    <View className="flex-row flex-wrap">
                                        <MetricCard
                                            title="Completed"
                                            value={habitAnalytics.stats.completed_days || 0}
                                            suffix="days"
                                            icon={<Check size={16} color={colors.success} />}
                                            color="success"
                                        />

                                        <MetricCard
                                            title="Missed"
                                            value={habitAnalytics.stats.missed_days || 0}
                                            suffix="days"
                                            icon={<X size={16} color={colors.danger} />}
                                            color="danger"
                                        />

                                        <MetricCard
                                            title="Skipped"
                                            value={habitAnalytics.stats.skipped_days || 0}
                                            suffix="days"
                                            icon={<Minus size={16} color={colors.warning} />}
                                            color="warning"
                                        />

                                        <MetricCard
                                            title="Scheduled"
                                            value={habitAnalytics.stats.scheduled_days || 0}
                                            suffix="days"
                                            icon={<Calendar size={16} color={colors.info} />}
                                            color="info"
                                        />

                                        <MetricCard
                                            title="Points"
                                            value={habitAnalytics.stats.points_earned || 0}
                                            icon={<Zap size={16} color={colors.primary} />}
                                            color="primary"
                                        />

                                        {habitAnalytics.stats.consistency_score !== undefined && (
                                            <MetricCard
                                                title="Consistency"
                                                value={habitAnalytics.stats.consistency_score}
                                                suffix="/100"
                                                icon={<Target size={16} color={getConsistencyColor(habitAnalytics.stats.consistency_score)} />}
                                                color={getConsistencyColorName(habitAnalytics.stats.consistency_score)}
                                            />
                                        )}
                                    </View>
                                </CollapsibleSection>

                                {/* Tracking-Type Specific Metrics */}
                                {habitAnalytics.tracking_metrics && Object.keys(habitAnalytics.tracking_metrics).length > 0 && (
                                    <CollapsibleSection
                                        title="Tracking Metrics"
                                        icon={<Activity size={20} color={colors.primary} />}
                                        isExpanded={expandedSection === 'trackingMetrics'}
                                        onToggle={() => setExpandedSection(expandedSection === 'trackingMetrics' ? '' : 'trackingMetrics')}
                                    >
                                        {/* Goal Achievement Rate */}
                                        {habitAnalytics.tracking_metrics.goal_achievement_rate !== undefined && (
                                            <View style={{
                                                backgroundColor: colors.background,
                                                borderRadius: 12,
                                                padding: 16,
                                                marginBottom: 16
                                            }}>
                                                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                                    Goal Achievement
                                                </Text>

                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
                                                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
                                                        {habitAnalytics.tracking_metrics.goal_achievement_rate}%
                                                    </Text>

                                                    {habitAnalytics.tracking_metrics.trend && (
                                                        <View style={{
                                                            backgroundColor: getTrendColor(habitAnalytics.tracking_metrics.trend) + '20',
                                                            borderRadius: 4,
                                                            paddingHorizontal: 6,
                                                            paddingVertical: 2,
                                                            marginLeft: 12
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 12,
                                                                color: getTrendColor(habitAnalytics.tracking_metrics.trend),
                                                                fontWeight: '600'
                                                            }}>
                                                                {habitAnalytics.tracking_metrics.trend === 'increasing' ? 'Improving' :
                                                                    habitAnalytics.tracking_metrics.trend === 'decreasing' ? 'Declining' : 'Stable'}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4 }}>
                                                    <View
                                                        style={{
                                                            height: '100%',
                                                            width: `${Math.min(100, habitAnalytics.tracking_metrics.goal_achievement_rate)}%`,
                                                            backgroundColor: getAchievementColor(habitAnalytics.tracking_metrics.goal_achievement_rate),
                                                            borderRadius: 4
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                        )}

                                        <View className="flex-row flex-wrap">
                                            {habitAnalytics.tracking_metrics.avg_duration !== undefined && (
                                                <>
                                                    <MetricCard
                                                        title="Average Duration"
                                                        value={habitAnalytics.tracking_metrics.avg_duration || 0}
                                                        suffix="min"
                                                        icon={<Clock3 size={16} color={colors.primary} />}
                                                        trend={habitAnalytics.tracking_metrics.trend}
                                                    />
                                                    <MetricCard
                                                        title="Total Time"
                                                        value={habitAnalytics.tracking_metrics.total_duration || 0}
                                                        suffix="min"
                                                        icon={<Clock4 size={16} color={colors.success} />}
                                                    />
                                                    <MetricCard
                                                        title="Goal"
                                                        value={habitAnalytics.tracking_metrics.goal_duration || 0}
                                                        suffix="min"
                                                        icon={<Award size={16} color={colors.warning} />}
                                                    />
                                                    <MetricCard
                                                        title="Max Duration"
                                                        value={habitAnalytics.tracking_metrics.max_duration || 0}
                                                        suffix="min"
                                                        icon={<TrendingUp size={16} color={colors.danger} />}
                                                    />
                                                </>
                                            )}

                                            {habitAnalytics.tracking_metrics.avg_count !== undefined && (
                                                <>
                                                    <MetricCard
                                                        title="Average Count"
                                                        value={habitAnalytics.tracking_metrics.avg_count || 0}
                                                        icon={<Hash size={16} color={colors.primary} />}
                                                        trend={habitAnalytics.tracking_metrics.trend}
                                                    />
                                                    <MetricCard
                                                        title="Total Count"
                                                        value={habitAnalytics.tracking_metrics.total_count || 0}
                                                        icon={<Activity size={16} color={colors.success} />}
                                                    />
                                                    <MetricCard
                                                        title="Goal"
                                                        value={habitAnalytics.tracking_metrics.goal_count || 0}
                                                        icon={<Award size={16} color={colors.warning} />}
                                                    />
                                                    <MetricCard
                                                        title="Max Count"
                                                        value={habitAnalytics.tracking_metrics.max_count || 0}
                                                        icon={<TrendingUp size={16} color={colors.danger} />}
                                                    />
                                                </>
                                            )}

                                            {habitAnalytics.tracking_metrics.avg_value !== undefined && (
                                                <>
                                                    <MetricCard
                                                        title="Average"
                                                        value={habitAnalytics.tracking_metrics.avg_value || 0}
                                                        suffix={habitAnalytics.tracking_metrics.units || ''}
                                                        icon={<BarChart2 size={16} color={colors.primary} />}
                                                        trend={habitAnalytics.tracking_metrics.trend}
                                                    />
                                                    <MetricCard
                                                        title="Total"
                                                        value={habitAnalytics.tracking_metrics.total_value || 0}
                                                        suffix={habitAnalytics.tracking_metrics.units || ''}
                                                        icon={<Activity size={16} color={colors.success} />}
                                                    />
                                                    <MetricCard
                                                        title="Goal"
                                                        value={habitAnalytics.tracking_metrics.goal_value || 0}
                                                        suffix={habitAnalytics.tracking_metrics.units || ''}
                                                        icon={<Award size={16} color={colors.warning} />}
                                                    />
                                                    <MetricCard
                                                        title="Max"
                                                        value={habitAnalytics.tracking_metrics.max_value || 0}
                                                        suffix={habitAnalytics.tracking_metrics.units || ''}
                                                        icon={<TrendingUp size={16} color={colors.danger} />}
                                                    />

                                                    {habitAnalytics.tracking_metrics.std_deviation !== undefined && (
                                                        <MetricCard
                                                            title="Std Deviation"
                                                            value={habitAnalytics.tracking_metrics.std_deviation || 0}
                                                            suffix={habitAnalytics.tracking_metrics.units || ''}
                                                            icon={<PieChart size={16} color={colors.info} />}
                                                            color="info"
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    </CollapsibleSection>
                                )}

                                {/* Activity Calendar for this habit */}
                                {habitAnalytics.monthly_distribution && habitAnalytics.monthly_distribution.length > 0 && (
                                    <CollapsibleSection
                                        title="Activity Calendar"
                                        icon={<Calendar size={20} color={colors.primary} />}
                                        isExpanded={expandedSection === 'habitCalendar'}
                                        onToggle={() => setExpandedSection(expandedSection === 'habitCalendar' ? '' : 'habitCalendar')}
                                    >
                                        <View style={{ marginVertical: 10 }}>
                                            <ContributionGraph
                                                values={habitAnalytics.monthly_distribution.map(item => ({
                                                    date: item.date,
                                                    count: item.value
                                                }))}
                                                endDate={new Date()}
                                                numDays={90}
                                                width={screenWidth - 32}
                                                height={220}
                                                chartConfig={heatmapConfig}
                                                squareSize={16}
                                                style={{ borderRadius: 16 }}
                                            />
                                        </View>

                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>
                                            This calendar shows your activity for this habit. Darker colors indicate completed days,
                                            lighter colors indicate skipped days, and empty cells indicate missed or unscheduled days.
                                        </Text>
                                    </CollapsibleSection>
                                )}

                                {/* Habit-Specific Day Analysis */}
                                <CollapsibleSection
                                    title="Completion by Day"
                                    icon={<Calendar size={20} color={colors.primary} />}
                                    isExpanded={expandedSection === 'habitDayAnalysis'}
                                    onToggle={() => setExpandedSection(expandedSection === 'habitDayAnalysis' ? '' : 'habitDayAnalysis')}
                                >
                                    <View>
                                        <BarChart
                                            data={habitCompletionByDayData}
                                            width={screenWidth - 32}
                                            height={220}
                                            chartConfig={chartConfig}
                                            style={{ borderRadius: 16, marginVertical: 8 }}
                                            fromZero={true}
                                            showValuesOnTopOfBars={true}
                                            withInnerLines={false}
                                            yAxisSuffix="%"
                                        />
                                    </View>

                                    {habitAnalytics.day_analysis && (
                                        <View style={{ marginTop: 16 }}>
                                            {habitAnalytics.day_analysis.map((day, index) => {
                                                // Find best and worst days
                                                const rates = habitAnalytics.day_analysis.map(d => d.completion_rate || 0);
                                                const maxRate = Math.max(...rates);
                                                const minRate = Math.min(...rates.filter(r => r > 0));

                                                const isBest = day.completion_rate === maxRate && day.completion_rate > 0;
                                                const isWorst = day.completion_rate === minRate && day.completion_rate > 0;

                                                return (
                                                    <View
                                                        key={index}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            paddingVertical: 8,
                                                            borderBottomWidth: index < habitAnalytics.day_analysis.length - 1 ? 1 : 0,
                                                            borderBottomColor: colors.border
                                                        }}
                                                    >
                                                        <Text style={{
                                                            color: colors.text,
                                                            fontWeight: isBest || isWorst ? 'bold' : 'normal',
                                                            width: 80
                                                        }}>
                                                            {day.day}
                                                        </Text>

                                                        <View style={{ flex: 1, paddingHorizontal: 12 }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                                                    {day.completions}/{day.scheduled || 0}
                                                                </Text>
                                                                <Text style={{
                                                                    fontSize: 12,
                                                                    fontWeight: '600',
                                                                    color: isBest ? colors.success : isWorst ? colors.danger : colors.text
                                                                }}>
                                                                    {day.completion_rate || 0}%
                                                                </Text>
                                                            </View>
                                                            <View style={{
                                                                height: 6,
                                                                backgroundColor: colors.background,
                                                                borderRadius: 3,
                                                                overflow: 'hidden'
                                                            }}>
                                                                <View style={{
                                                                    height: '100%',
                                                                    width: `${day.completion_rate || 0}%`,
                                                                    backgroundColor: isBest ? colors.success : isWorst ? colors.danger : colors.primary
                                                                }} />
                                                            </View>
                                                        </View>

                                                        {isBest && (
                                                            <Trophy size={16} color={colors.warning} />
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
                                        This shows when you typically complete this specific habit throughout the week.
                                        Use this information to identify your strongest and weakest days.
                                    </Text>
                                </CollapsibleSection>

                                {/* Streak Progression */}
                                {habitAnalytics.streak_progression && habitAnalytics.streak_progression.length > 0 && (
                                    <CollapsibleSection
                                        title="Streak Progression"
                                        icon={<Flame size={20} color={colors.primary} />}
                                        isExpanded={expandedSection === 'streakProgression'}
                                        onToggle={() => setExpandedSection(expandedSection === 'streakProgression' ? '' : 'streakProgression')}
                                    >
                                        <View>
                                            <LineChart
                                                data={streakProgressionData}
                                                width={screenWidth - 32}
                                                height={220}
                                                chartConfig={chartConfig}
                                                style={{ borderRadius: 16, marginVertical: 8 }}
                                                bezier
                                                withDots={false}
                                                withShadow
                                                withInnerLines={false}
                                            />
                                        </View>

                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
                                            This chart shows how your streak has evolved over time. Track your consistency and identify
                                            periods where you maintained your longest streaks.
                                        </Text>
                                    </CollapsibleSection>
                                )}

                                {/* Time Patterns */}
                                {habitAnalytics.time_patterns && habitAnalytics.time_patterns.length > 0 && (
                                    <CollapsibleSection
                                        title="Time of Day Patterns"
                                        icon={<Clock size={20} color={colors.primary} />}
                                        isExpanded={expandedSection === 'habitTimePatterns'}
                                        onToggle={() => setExpandedSection(expandedSection === 'habitTimePatterns' ? '' : 'habitTimePatterns')}
                                    >
                                        {habitAnalytics.time_patterns.map((segment, index) => {
                                            // Find the most productive time period
                                            const mostProductiveIndex = habitAnalytics.time_patterns.reduce(
                                                (maxIndex, current, i, arr) =>
                                                    current.count > arr[maxIndex].count ? i : maxIndex,
                                                0
                                            );

                                            const isMostProductive = index === mostProductiveIndex && segment.count > 0;

                                            return (
                                                <View key={index} style={{
                                                    marginBottom: index < habitAnalytics.time_patterns.length - 1 ? 12 : 0,
                                                    backgroundColor: isMostProductive ? colors.primary + '15' : 'transparent',
                                                    borderRadius: 8,
                                                    padding: isMostProductive ? 8 : 0
                                                }}>
                                                    <View className="flex-row justify-between mb-1 items-center">
                                                        <View className="flex-row items-center">
                                                            <Text style={{
                                                                fontSize: 14,
                                                                color: colors.text,
                                                                fontWeight: isMostProductive ? '600' : 'normal'
                                                            }}>
                                                                {segment.name}
                                                            </Text>
                                                            {isMostProductive && (
                                                                <View style={{
                                                                    backgroundColor: colors.primary + '30',
                                                                    borderRadius: 4,
                                                                    paddingHorizontal: 6,
                                                                    paddingVertical: 2,
                                                                    marginLeft: 8
                                                                }}>
                                                                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                                                                        Optimal Time
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={{
                                                            fontSize: 14,
                                                            fontWeight: '600',
                                                            color: isMostProductive ? colors.primary : colors.textSecondary
                                                        }}>
                                                            {segment.count} ({segment.rate || 0}%)
                                                        </Text>
                                                    </View>
                                                    <View style={{
                                                        height: 8,
                                                        backgroundColor: colors.background,
                                                        borderRadius: 4,
                                                        overflow: 'hidden'
                                                    }}>
                                                        <View
                                                            style={{
                                                                height: '100%',
                                                                width: `${segment.rate || 0}%`,
                                                                backgroundColor: isMostProductive ? colors.primary : colors.primary + '60'
                                                            }}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
                                            This shows when you typically complete this habit throughout the day.
                                            Find your optimal time to maximize consistency.
                                        </Text>
                                    </CollapsibleSection>
                                )}

                                {/* Activity Log Summary */}
                                {habitAnalytics.logs && habitAnalytics.logs.length > 0 && (
                                    <CollapsibleSection
                                        title="Recent Activity"
                                        icon={<Activity size={20} color={colors.primary} />}
                                        isExpanded={expandedSection === 'activityLog'}
                                        onToggle={() => setExpandedSection(expandedSection === 'activityLog' ? '' : 'activityLog')}
                                    >
                                        {habitAnalytics.logs.slice(0, 5).map((log, index) => (
                                            <View
                                                key={index}
                                                style={{
                                                    backgroundColor: log.completed ? colors.success + '20' :
                                                        log.skipped ? colors.warning + '20' : colors.danger + '20',
                                                    borderRadius: 12,
                                                    padding: 12,
                                                    marginBottom: 10,
                                                    borderLeftWidth: 3,
                                                    borderLeftColor: log.completed ? colors.success :
                                                        log.skipped ? colors.warning : colors.danger
                                                }}
                                            >
                                                <View className="flex-row justify-between items-center">
                                                    <Text style={{
                                                        fontWeight: '600',
                                                        color: colors.text
                                                    }}>
                                                        {new Date(log.date).toLocaleDateString()}
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        {log.completed ? (
                                                            <Check size={16} color={colors.success} />
                                                        ) : log.skipped ? (
                                                            <Minus size={16} color={colors.warning} />
                                                        ) : (
                                                            <X size={16} color={colors.danger} />
                                                        )}
                                                        <Text style={{
                                                            marginLeft: 6,
                                                            fontSize: 13,
                                                            color: log.completed ? colors.success :
                                                                log.skipped ? colors.warning : colors.danger,
                                                            fontWeight: '500'
                                                        }}>
                                                            {log.completed ? 'Completed' : log.skipped ? 'Skipped' : 'Missed'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {log.time && (
                                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                                        Time: {log.time}
                                                    </Text>
                                                )}

                                                {log.tracking_value && (
                                                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                                                        Value: {log.tracking_value}
                                                    </Text>
                                                )}

                                                {log.points > 0 && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                        <Zap size={14} color={colors.primary} />
                                                        <Text style={{ fontSize: 13, color: colors.primary, marginLeft: 4 }}>
                                                            +{log.points} points
                                                        </Text>
                                                    </View>
                                                )}

                                                {log.notes && (
                                                    <Text style={{
                                                        fontSize: 13,
                                                        fontStyle: 'italic',
                                                        color: colors.textSecondary,
                                                        marginTop: 4,
                                                        paddingTop: 4,
                                                        borderTopWidth: 1,
                                                        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                                    }}>
                                                        "{log.notes}"
                                                    </Text>
                                                )}
                                            </View>
                                        ))}

                                        {habitAnalytics.logs.length > 5 && (
                                            <TouchableOpacity
                                                style={{
                                                    paddingVertical: 10,
                                                    alignItems: 'center',
                                                    marginTop: 5
                                                }}
                                            >
                                                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                                    View More
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </CollapsibleSection>
                                )}
                            </>
                        ) : (
                            <View style={{
                                padding: 30,
                                alignItems: 'center',
                                backgroundColor: colors.cardBg,
                                borderRadius: 16,
                                margin: 10
                            }}>
                                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                                    Select a habit to see detailed analytics
                                </Text>
                            </View>
                        )}
                    </>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
};

// Helper functions
const getConsistencyColor = (score) => {
    if (score >= 80) return '#10B981'; // Success/green
    if (score >= 60) return '#65A30D'; // Lime
    if (score >= 40) return '#F59E0B'; // Warning/amber
    if (score >= 20) return '#FB923C'; // Orange
    return '#EF4444'; // Danger/red
};

const getConsistencyColorName = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'success';
    if (score >= 40) return 'warning';
    if (score >= 20) return 'warning';
    return 'danger';
};

const getTrendColor = (trend) => {
    if (trend === 'increasing') return '#10B981'; // Green
    if (trend === 'decreasing') return '#EF4444'; // Red
    return '#F59E0B'; // Amber
};

const getAchievementColor = (rate) => {
    if (rate >= 90) return '#10B981'; // Green
    if (rate >= 70) return '#65A30D'; // Lime
    if (rate >= 50) return '#F59E0B'; // Amber
    if (rate >= 30) return '#FB923C'; // Orange
    return '#EF4444'; // Red
};

export default Analytics;