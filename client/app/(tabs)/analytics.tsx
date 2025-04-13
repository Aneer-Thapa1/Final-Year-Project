import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    Platform,
    StatusBar,
    Animated,
    Image,
    FlatList,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, ContributionGraph, PieChart } from 'react-native-chart-kit';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
    Hash,
    Zap,
    Check,
    X,
    ChevronRight,
    Filter,
    Plus,
    Minus,
    ArrowUp,
    ArrowDown,
    Target,
    PieChart as PieChartIcon,
    Sparkles,
    Lightbulb,
    Brain,
    Heart,
    Dumbbell,
    BookOpen,
    Users,
    Star,
    BrainCircuit,
    Bell,
    Share2,
    Download,
    ArrowUpRight,
    Calendar as CalendarIcon,
    Info,
    LifeBuoy,
    Settings,
    Lock,
    CheckCircle,
    Crown,
    Compass,
    BarChart as BarChartIcon,
    Layers,
    Rocket, Sun, Moon,
} from 'lucide-react-native';

// Import analytics services
import {
    getUserAnalytics,
    getHabitAnalytics,
    getStreakAnalysis,
    getHabitDomains,
    getTimePatterns,
    getCompletionHeatmap,
    getAIInsights,
    getStreakMilestones,
    getPointsBreakdown,
    exportAnalytics,
    getHabitSuggestions,
    getPerformanceBenchmark,
    getHabitComparisons
} from '../../services/analyticsService';

// Import habit service
import { getUserHabits, getHabitDetails } from '../../services/habitService';

// Constants for layout and styling
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const TAB_BAR_HEIGHT = 80;

// Domain icons mapping with accessibility labels
const DOMAIN_ICONS = {
    'Health': { icon: <Heart size={20} color="#ef4444" />, color: '#ef4444', bgColor: '#fee2e2' },
    'Fitness': { icon: <Dumbbell size={20} color="#f97316" />, color: '#f97316', bgColor: '#ffedd5' },
    'Mindfulness': { icon: <Brain size={20} color="#8b5cf6" />, color: '#8b5cf6', bgColor: '#ede9fe' },
    'Learning': { icon: <BookOpen size={20} color="#06b6d4" />, color: '#06b6d4', bgColor: '#cffafe' },
    'Social': { icon: <Users size={20} color="#ec4899" />, color: '#ec4899', bgColor: '#fce7f3' },
    'Productivity': { icon: <Zap size={20} color="#eab308" />, color: '#eab308', bgColor: '#fef9c3' },
    'Creativity': { icon: <Sparkles size={20} color="#a855f7" />, color: '#a855f7', bgColor: '#f3e8ff' },
    'Finance': { icon: <TrendingUp size={20} color="#10b981" />, color: '#10b981', bgColor: '#d1fae5' },
    'Personal': { icon: <Star size={20} color="#0ea5e9" />, color: '#0ea5e9', bgColor: '#e0f2fe' }
};

// Time of day definitions
const TIME_PERIODS = [
    { id: 'early_morning', name: 'Early Morning', timeRange: '5-8am', icon: <Compass size={16} /> },
    { id: 'morning', name: 'Morning', timeRange: '8am-12pm', icon: <Sun size={16} /> },
    { id: 'afternoon', name: 'Afternoon', timeRange: '12-5pm', icon: <Sun size={16} /> },
    { id: 'evening', name: 'Evening', timeRange: '5-9pm', icon: <Moon size={16} /> },
    { id: 'night', name: 'Night', timeRange: '9pm-12am', icon: <Moon size={16} /> },
    { id: 'late_night', name: 'Late Night', timeRange: '12-5am', icon: <Moon size={16} /> }
];

// Analytics screen component
const Analytics = () => {
    // Theme and device info
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const insightAnimation = useRef(new Animated.Value(0)).current;

    // State management
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingHabit, setLoadingHabit] = useState(false);
    const [error, setError] = useState(null);

    // View filters and controls
    const [period, setPeriod] = useState('month');
    const [viewMode, setViewMode] = useState('overall'); // 'overall' or 'habit'
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [expandedSection, setExpandedSection] = useState('performance');
    const [selectedTimeView, setSelectedTimeView] = useState('weekday'); // 'weekday', 'time_of_day'
    const [showInsights, setShowInsights] = useState(true);
    const [insightCategory, setInsightCategory] = useState('all'); // 'all', 'streak', 'timing', 'suggestions'

    // Data states
    const [habits, setHabits] = useState([]);
    const [domains, setDomains] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [insights, setInsights] = useState([]);
    const [benchmarks, setBenchmarks] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [streakMilestones, setStreakMilestones] = useState([]);

    // UI controls
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipContent, setTooltipContent] = useState({ title: '', content: '' });
    const [filterVisible, setFilterVisible] = useState(false);

    // Overall statistics shown at the top of the analytics screen
    const [overallStats, setOverallStats] = useState({
        totalHabits: 0,
        activeHabits: 0,
        averageCompletion: 0,
        bestStreak: 0,
        currentStreak: 0,
        totalCompletions: 0,
        pointsEarned: 0,
        completionTrend: 0,
        streakTrend: 0,
        consistencyScore: 0
    });

    // Chart configuration adjusted for dark/light theme
    const getChartConfig = useCallback(() => ({
        backgroundGradientFrom: isDark ? '#1e293b' : '#ffffff',
        backgroundGradientTo: isDark ? '#1e293b' : '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(34, 197, 94, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(51, 65, 85, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: isDark ? '#15803d' : '#16a34a',
        },
        fillShadowGradient: isDark ? '#22c55e' : '#22c55e',
        fillShadowGradientOpacity: 0.3
    }), [isDark]);

    // Heatmap configuration for GitHub-style contribution graph
    const getHeatmapConfig = useCallback(() => ({
        backgroundGradientFrom: isDark ? '#1e293b' : '#ffffff',
        backgroundGradientTo: isDark ? '#1e293b' : '#ffffff',
        color: (opacity = 1) => isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(34, 197, 94, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(51, 65, 85, ${opacity})`,
        style: {
            borderRadius: 16,
        },
    }), [isDark]);

    // Theme helper functions for styling elements
    const getThemeClasses = {
        bg: (colorType = 'primary') => {
            const baseClasses = 'rounded-lg';
            switch (colorType) {
                case 'primary': return `${baseClasses} bg-primary-100 dark:bg-primary-900`;
                case 'secondary': return `${baseClasses} bg-secondary-100 dark:bg-secondary-900`;
                case 'accent': return `${baseClasses} bg-accent-100 dark:bg-accent-900`;
                case 'success': return `${baseClasses} bg-success-100 dark:bg-success-500 dark:bg-opacity-20`;
                case 'warning': return `${baseClasses} bg-warning-100 dark:bg-warning-500 dark:bg-opacity-20`;
                case 'error': return `${baseClasses} bg-error-100 dark:bg-error-500 dark:bg-opacity-20`;
                case 'info': return `${baseClasses} bg-blue-100 dark:bg-blue-900`;
                default: return `${baseClasses} bg-primary-100 dark:bg-primary-900`;
            }
        },
        text: (colorType = 'primary') => {
            switch (colorType) {
                case 'primary': return 'text-primary-600 dark:text-primary-400';
                case 'secondary': return 'text-secondary-600 dark:text-secondary-400';
                case 'accent': return 'text-accent-600 dark:text-accent-400';
                case 'success': return 'text-success-600 dark:text-success-dark';
                case 'warning': return 'text-warning-600 dark:text-warning-dark';
                case 'error': return 'text-error-600 dark:text-error-dark';
                case 'info': return 'text-blue-600 dark:text-blue-400';
                default: return 'text-primary-600 dark:text-primary-400';
            }
        },
        border: (colorType = 'primary') => {
            switch (colorType) {
                case 'primary': return 'border-primary-300 dark:border-primary-700';
                case 'secondary': return 'border-secondary-300 dark:border-secondary-700';
                case 'accent': return 'border-accent-300 dark:border-accent-700';
                case 'success': return 'border-success-300 dark:border-success-700';
                case 'warning': return 'border-warning-300 dark:border-warning-700';
                case 'error': return 'border-error-300 dark:border-error-700';
                default: return 'border-primary-300 dark:border-primary-700';
            }
        },
        card: 'bg-theme-card dark:bg-theme-card-dark rounded-xl shadow-sm',
        cardHeader: 'border-b border-theme-border dark:border-theme-border-dark p-4',
        textPrimary: 'text-theme-text-primary dark:text-theme-text-primary-dark',
        textSecondary: 'text-theme-text-secondary dark:text-theme-text-secondary-dark',
        textMuted: 'text-theme-text-muted dark:text-theme-text-muted-dark',
        button: 'px-3 py-2 rounded-lg bg-primary-500 dark:bg-primary-600',
        buttonText: 'text-white font-montserrat-semibold text-sm'
    };

    // Helper functions for styling based on data values
    const getConsistencyColor = (score) => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'success';
        if (score >= 40) return 'warning';
        if (score >= 20) return 'warning';
        return 'error';
    };

    const getTrendColorClass = (trend) => {
        if (trend > 0) return 'text-success-500 dark:text-success-dark';
        if (trend < 0) return 'text-error-500 dark:text-error-dark';
        return 'text-warning-500 dark:text-warning-dark';
    };

    const getTrendIcon = (trend) => {
        if (trend > 0) return <ArrowUp size={16} className="text-success-500 dark:text-success-dark" />;
        if (trend < 0) return <ArrowDown size={16} className="text-error-500 dark:text-error-dark" />;
        return null;
    };

    // Helper to format date strings
    const formatDate = (dateString) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    // Load initial data
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch habits
            const habitsResponse = await getUserHabits();

            if (habitsResponse && habitsResponse.habits) {
                const habitsList = habitsResponse.habits;
                setHabits(habitsList);

                // Set a selected habit if none exists
                if (habitsList.length > 0 && !selectedHabit) {
                    // Select the habit with highest streak or first active habit
                    const activeHabits = habitsList.filter(h => h.is_active);

                    if (activeHabits.length > 0) {
                        const sortedByStreak = [...activeHabits].sort((a, b) => {
                            const streakA = a.stats?.current_streak || 0;
                            const streakB = b.stats?.current_streak || 0;
                            return streakB - streakA;
                        });

                        setSelectedHabit(sortedByStreak[0].habit_id);
                    }
                }

                // Calculate overall statistics
                calculateOverallStats(habitsList);
            }

            // Fetch domains
            const domainsResponse = await getHabitDomains();
            if (domainsResponse && domainsResponse.success && domainsResponse.data) {
                setDomains(domainsResponse.data);
            }

            // Fetch streak milestones
            const milestonesResponse = await getStreakMilestones('all', true);
            if (milestonesResponse) {
                setStreakMilestones(milestonesResponse);
            }

            // Fetch analytics data
            await Promise.all([
                fetchOverallAnalytics(),
                fetchHabitAnalytics(),
                fetchInsights(),
                fetchHabitSuggestions()
            ]);

        } catch (error) {
            console.error('Error fetching initial analytics data:', error);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Calculate overall user stats
    const calculateOverallStats = (habitsList) => {
        if (!habitsList || habitsList.length === 0) return;

        const activeHabits = habitsList.filter(h => h.is_active);
        let totalCompletion = 0;
        let completionCount = 0;
        let bestStreak = 0;
        let currentStreakCount = 0;
        let totalCompletions = 0;
        let totalConsistency = 0;

        // Calculate statistics across all habits
        activeHabits.forEach(habit => {
            // Completion rate
            if (habit.stats?.completion_rate) {
                totalCompletion += habit.stats.completion_rate;
                completionCount++;
            }

            // Best streak
            if (habit.stats?.best_streak) {
                bestStreak = Math.max(bestStreak, habit.stats.best_streak);
            }

            // Current streak
            if (habit.stats?.current_streak && habit.stats.current_streak > 0) {
                currentStreakCount++;
            }

            // Total completions
            if (habit.stats?.total_completions) {
                totalCompletions += habit.stats.total_completions;
            }

            // Consistency score
            if (habit.stats?.consistency_score) {
                totalConsistency += habit.stats.consistency_score;
            }
        });

        // Calculate trends (would come from API but mocked here)
        const completionTrend = Math.random() > 0.5 ? Math.floor(Math.random() * 10) : -Math.floor(Math.random() * 10);
        const streakTrend = Math.random() > 0.6 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 10);

        // Set the overall stats
        setOverallStats({
            totalHabits: habitsList.length,
            activeHabits: activeHabits.length,
            averageCompletion: completionCount > 0 ? Math.round((totalCompletion / completionCount) * 10) / 10 : 0,
            bestStreak: bestStreak,
            currentStreak: currentStreakCount,
            totalCompletions: totalCompletions,
            pointsEarned: habitsList.reduce((total, h) => total + (h.stats?.points_earned || 0), 0),
            completionTrend: completionTrend,
            streakTrend: streakTrend,
            consistencyScore: activeHabits.length > 0 ? Math.round(totalConsistency / activeHabits.length) : 0
        });
    };

    // Fetch overall analytics data
    const fetchOverallAnalytics = async () => {
        try {
            const analyticsData = await getUserAnalytics(period, true);
            if (analyticsData) {
                setAnalytics(analyticsData);

                // Fetch benchmarks for comparison
                const benchmarkData = await getPerformanceBenchmark(null, 'completion', 'average');
                if (benchmarkData) {
                    setBenchmarks(benchmarkData);
                }
            }
        } catch (error) {
            console.error('Error fetching overall analytics:', error);
            setError('Failed to load analytics data.');
        }
    };

    // Fetch analytics for specific habit
    const fetchHabitAnalytics = async () => {
        if (!selectedHabit) return;

        try {
            setLoadingHabit(true);
            const result = await getHabitAnalytics(selectedHabit, period, true, 50, true);

            if (result && result.success && result.data) {
                setHabitAnalytics(result.data);
            }
        } catch (error) {
            console.error('Error fetching habit analytics:', error);
        } finally {
            setLoadingHabit(false);
        }
    };

    // Fetch AI insights
    const fetchInsights = async () => {
        try {
            const insightsData = await getAIInsights(selectedHabit);
            if (insightsData && insightsData.length > 0) {
                setInsights(insightsData);
            } else {
                // Generate placeholder insights if API doesn't return any
                generateFallbackInsights();
            }
        } catch (error) {
            console.error('Error fetching AI insights:', error);
            generateFallbackInsights();
        }
    };

    // Fetch habit suggestions
    const fetchHabitSuggestions = async () => {
        try {
            const suggestionsData = await getHabitSuggestions();
            if (suggestionsData && suggestionsData.length > 0) {
                setSuggestions(suggestionsData);
            }
        } catch (error) {
            console.error('Error fetching habit suggestions:', error);
        }
    };

    // Generate fallback insights if API call fails
    const generateFallbackInsights = () => {
        const generatedInsights = [
            {
                id: 'insight-1',
                title: 'Consistency Opportunities',
                description: 'Your completion rate is higher on weekdays than weekends. Consider adjusting weekend habits to be simpler or more enjoyable.',
                type: 'suggestion',
                icon: <Calendar size={20} className="text-primary-500" />
            },
            {
                id: 'insight-2',
                title: 'Streak Achievement',
                description: 'You\'re building a great streak with your morning meditation habit. You\'re now in the top 15% of users!',
                type: 'achievement',
                icon: <Trophy size={20} className="text-accent-500" />
            },
            {
                id: 'insight-3',
                title: 'Optimal Timing',
                description: 'You complete 72% more habits in the morning than evening. Consider scheduling important habits before noon.',
                type: 'insight',
                icon: <Clock size={20} className="text-secondary-500" />
            }
        ];

        setInsights(generatedInsights);
    };

    // Handle exporting analytics data
    const handleExportAnalytics = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Show options dialog
            Alert.alert(
                'Export Analytics',
                'Choose export format:',
                [
                    {
                        text: 'CSV',
                        onPress: () => performExport('csv')
                    },
                    {
                        text: 'PDF',
                        onPress: () => performExport('pdf')
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            console.error('Error with export:', error);
            showTooltipInfo(
                'Export Failed',
                'There was an error preparing the export. Please try again.'
            );
        }
    };

    // Perform the actual export
    const performExport = async (format) => {
        try {
            const data = await exportAnalytics(format, period, viewMode === 'habit' ? selectedHabit : null);

            if (data) {
                showTooltipInfo(
                    'Export Successful',
                    `Your analytics data has been exported in ${format.toUpperCase()} format.`
                );
            }
        } catch (error) {
            console.error('Export failed:', error);
            showTooltipInfo(
                'Export Failed',
                'There was an error exporting your data. Please try again.'
            );
        }
    };

    // Show information tooltip
    const showTooltipInfo = (title, content) => {
        setTooltipContent({ title, content });
        setShowTooltip(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            setShowTooltip(false);
        }, 3000);
    };

    // Toggle section expansion with haptic feedback
    const toggleSection = (section) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setExpandedSection(expandedSection === section ? null : section);
    };

    // Handle period changes with haptic feedback
    const handlePeriodChange = (newPeriod) => {
        if (period !== newPeriod) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPeriod(newPeriod);
        }
    };

    // Handle view mode changes with haptic feedback
    const handleViewModeChange = (mode) => {
        if (viewMode !== mode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setViewMode(mode);
        }
    };

    // Toggle insights panel with animation
    const toggleInsights = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowInsights(!showInsights);

        Animated.timing(insightAnimation, {
            toValue: !showInsights ? 1 : 0,
            duration: 300,
            useNativeDriver: true
        }).start();
    };

    // Filter insights by category
    const handleInsightCategoryChange = (category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setInsightCategory(category);
    };

    // Handle refresh (pull-to-refresh)
    const onRefresh = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        await fetchData();
    };

    // Fetch data when component mounts
    useEffect(() => {
        fetchData();
    }, []);

    // Refetch data when period changes
    useEffect(() => {
        if (!loading && habits.length > 0) {
            Promise.all([fetchOverallAnalytics(), fetchHabitAnalytics()]);
        }
    }, [period, habits.length, loading]);

    // Refetch habit-specific analytics when selectedHabit changes
    useEffect(() => {
        if (selectedHabit) {
            fetchHabitAnalytics();
        }
    }, [selectedHabit]);

    // Prepare chart data for day of week completion
    const weekdayCompletionData = useMemo(() => {
        if (!analytics || !analytics.completion_by_day) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        return {
            labels: analytics.completion_by_day.map(day => day.day.substring(0, 3)),
            datasets: [{
                data: analytics.completion_by_day.map(day => day.completion_rate || 0),
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                strokeWidth: 2,
            }]
        };
    }, [analytics]);

    // Prepare chart data for habit-specific day completion
    const habitWeekdayData = useMemo(() => {
        if (!habitAnalytics || !habitAnalytics.day_analysis) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        return {
            labels: habitAnalytics.day_analysis.map(day => day.day.substring(0, 3)),
            datasets: [{
                data: habitAnalytics.day_analysis.map(day => day.completion_rate || 0)
            }]
        };
    }, [habitAnalytics]);

    // Prepare domain performance data
    const domainPerformanceData = useMemo(() => {
        if (!domains || domains.length === 0) {
            return {
                labels: ['Health', 'Fitness', 'Learning'],
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

    // Prepare streak data for line chart
    const streakProgressionData = useMemo(() => {
        if (!habitAnalytics || !habitAnalytics.streak_progression || habitAnalytics.streak_progression.length === 0) {
            return {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{ data: [0, 0, 0, 0] }]
            };
        }

        // Get week numbers and group streak data by week
        const weekData = habitAnalytics.streak_progression.reduce((acc, item) => {
            const date = new Date(item.date);
            const weekNum = Math.ceil((date.getDate() - 1 + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
            const weekLabel = `Week ${weekNum}`;

            if (!acc[weekLabel]) {
                acc[weekLabel] = [];
            }

            acc[weekLabel].push(item.streak);
            return acc;
        }, {});

        // Continuing from the previous code...

        // Convert to chart format
        const labels = Object.keys(weekData);
        const data = labels.map(week => {
            // Use max streak for the week
            return Math.max(...weekData[week]);
        });

        return {
            labels,
            datasets: [{ data }]
        };
    }, [habitAnalytics]);

    // Custom reusable components for the analytics screen
    const StatsCard = ({ title, value, icon, subtitle, colorClass = 'primary', trend = null, trendValue = null }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className={`bg-theme-card dark:bg-theme-card-dark rounded-lg p-4 w-[48%] mr-3 ${
                isDark ? 'shadow-card-dark' : 'shadow-card-light'
            }`}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat-medium">
                    {title}
                </Text>
                <View className={`p-1.5 rounded-lg ${getThemeClasses.bg(colorClass)}`}>
                    {icon}
                </View>
            </View>
            <View className="flex-row items-baseline">
                <Text className="text-xl text-theme-text-primary dark:text-theme-text-primary-dark font-montserrat-bold">
                    {value}
                </Text>

                {trend && trendValue !== null && (
                    <View className="flex-row items-center ml-2">
                        {trend === 'up' ? (
                            <ArrowUp size={14} className="text-success-500 dark:text-success-dark" />
                        ) : (
                            <ArrowDown size={14} className="text-error-500 dark:text-error-dark" />
                        )}
                        <Text className={`text-xs ml-0.5 ${
                            trend === 'up' ? 'text-success-500 dark:text-success-dark' : 'text-error-500 dark:text-error-dark'
                        }`}>
                            {trendValue}%
                        </Text>
                    </View>
                )}
            </View>
            <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark mt-1 font-montserrat">
                {subtitle}
            </Text>
        </MotiView>
    );

    const HabitSelector = () => (
        <View className="mb-4">
            <Text className="mb-2 text-sm text-theme-text-secondary dark:text-theme-text-secondary-dark font-montserrat-medium">
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
                        className={`px-3 py-2.5 mr-3 rounded-md border ${
                            selectedHabit === habit.habit_id
                                ? 'bg-primary-50 dark:bg-primary-900 border-primary-300 dark:border-primary-700'
                                : 'bg-theme-card dark:bg-theme-card-dark border-transparent'
                        } ${isDark ? 'shadow-sm' : 'shadow-md'}`}
                    >
                        <Text className={`font-montserrat-medium ${
                            selectedHabit === habit.habit_id
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-theme-text-primary dark:text-theme-text-primary-dark'
                        }`}>
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
                    onPress={() => handlePeriodChange(p)}
                    className={`px-3.5 py-2 mr-2 rounded-md border ${
                        period === p
                            ? 'bg-primary-50 dark:bg-primary-900 border-primary-300 dark:border-primary-700'
                            : 'bg-theme-card dark:bg-theme-card-dark border-transparent'
                    }`}
                >
                    <Text className={`font-montserrat-medium capitalize ${
                        period === p
                            ? 'text-primary-700 dark:text-primary-300'
                            : 'text-theme-text-primary dark:text-theme-text-primary-dark'
                    }`}>
                        {p}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const ViewModeSelector = () => (
        <View className="flex-row mb-6 rounded-md overflow-hidden bg-theme-card dark:bg-theme-card-dark">
            <TouchableOpacity
                onPress={() => handleViewModeChange('overall')}
                className={`flex-1 py-2.5 px-4 ${
                    viewMode === 'overall'
                        ? 'bg-primary-500 dark:bg-primary-600'
                        : 'bg-transparent'
                }`}
            >
                <Text className={`text-center font-montserrat-semibold ${
                    viewMode === 'overall'
                        ? 'text-white'
                        : 'text-theme-text-primary dark:text-theme-text-primary-dark'
                }`}>
                    Overall
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleViewModeChange('habit')}
                className={`flex-1 py-2.5 px-4 ${
                    viewMode === 'habit'
                        ? 'bg-primary-500 dark:bg-primary-600'
                        : 'bg-transparent'
                }`}
            >
                <Text className={`text-center font-montserrat-semibold ${
                    viewMode === 'habit'
                        ? 'text-white'
                        : 'text-theme-text-primary dark:text-theme-text-primary-dark'
                }`}>
                    Habit Specific
                </Text>
            </TouchableOpacity>
        </View>
    );

    const MetricCard = ({ title, value, icon, suffix = '', colorClass = 'primary', trend = null }) => (
        <View className={`flex-1 bg-theme-card dark:bg-theme-card-dark rounded-lg p-3 mr-2 mb-2 min-w-[${SCREEN_WIDTH / 2 - 24}px]`}>
            <View className="flex-row items-center mb-1">
                <View className={`p-1 rounded-md mr-1.5 ${getThemeClasses.bg(colorClass)}`}>
                    {icon}
                </View>
                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                    {title}
                </Text>
                {trend && (
                    <View className="ml-auto">
                        {trend === 'up' ? (
                            <ArrowUp size={12} className="text-success-500 dark:text-success-dark" />
                        ) : trend === 'down' ? (
                            <ArrowDown size={12} className="text-error-500 dark:text-error-dark" />
                        ) : (
                            <Minus size={12} className="text-warning-500 dark:text-warning-dark" />
                        )}
                    </View>
                )}
            </View>
            <View className="flex-row items-baseline">
                <Text className={`text-lg font-montserrat-bold ${getThemeClasses.text(colorClass)}`}>
                    {value}
                </Text>
                {suffix && (
                    <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark ml-1 font-montserrat">
                        {suffix}
                    </Text>
                )}
            </View>
        </View>
    );

    const CollapsibleSection = ({ title, icon, children, isExpanded, onToggle }) => (
        <View className="mb-6 bg-theme-card dark:bg-theme-card-dark rounded-xl overflow-hidden">
            <TouchableOpacity
                onPress={() => onToggle()}
                className={`flex-row items-center justify-between p-4 ${
                    isExpanded ? 'border-b border-theme-border dark:border-theme-border-dark' : ''
                }`}
            >
                <View className="flex-row items-center">
                    <View className="bg-primary-100 dark:bg-primary-900 p-2 rounded-lg mr-3">
                        {icon}
                    </View>
                    <Text className="text-base text-theme-text-primary dark:text-theme-text-primary-dark font-montserrat-semibold">
                        {title}
                    </Text>
                </View>
                {isExpanded ?
                    <Minus size={20} className="text-theme-text-muted dark:text-theme-text-muted-dark" /> :
                    <Plus size={20} className="text-theme-text-muted dark:text-theme-text-muted-dark" />
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

    const InsightCard = ({ insight, index }) => {
        const getInsightBgClass = (type) => {
            switch (type) {
                case 'positive': return 'bg-success-50 dark:bg-success-900 dark:bg-opacity-20';
                case 'negative': return 'bg-error-50 dark:bg-error-900 dark:bg-opacity-20';
                case 'warning': return 'bg-warning-50 dark:bg-warning-900 dark:bg-opacity-20';
                case 'insight': return 'bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20';
                case 'achievement': return 'bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20';
                case 'suggestion': return 'bg-secondary-50 dark:bg-secondary-900 dark:bg-opacity-20';
                default: return 'bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20';
            }
        };

        const getInsightIconBgClass = (type) => {
            switch (type) {
                case 'positive': return 'bg-success-100 dark:bg-success-900';
                case 'negative': return 'bg-error-100 dark:bg-error-900';
                case 'warning': return 'bg-warning-100 dark:bg-warning-900';
                case 'insight': return 'bg-primary-100 dark:bg-primary-900';
                case 'achievement': return 'bg-accent-100 dark:bg-accent-900';
                case 'suggestion': return 'bg-secondary-100 dark:bg-secondary-900';
                default: return 'bg-primary-100 dark:bg-primary-900';
            }
        };

        return (
            <MotiView
                from={{ opacity: 0, translateX: 50 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ delay: index * 100, type: 'timing', duration: 400 }}
                className={`mb-4 p-4 rounded-xl ${getInsightBgClass(insight.type)}`}
            >
                <View className="flex-row items-start mb-2">
                    <View className={`p-2 rounded-lg mr-3 ${getInsightIconBgClass(insight.type)}`}>
                        {insight.icon}
                    </View>
                    <View className="flex-1">
                        <Text className="text-base font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark mb-1">
                            {insight.title}
                        </Text>
                        <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                            {insight.description}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity className="ml-auto p-2.5 rounded-lg bg-primary-500 dark:bg-primary-600">
                    <Text className="text-xs font-montserrat-semibold text-white">
                        {insight.action || 'View Details'}
                    </Text>
                </TouchableOpacity>
            </MotiView>
        );
    };

    const SectionTitle = ({ icon, title }) => (
        <View className="flex-row items-center mb-3">
            {icon}
            <Text className="ml-2 text-base font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark">
                {title}
            </Text>
        </View>
    );

    const AchievementCard = ({ milestone, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 50, type: 'timing', duration: 300 }}
            className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-4 mb-3 shadow-sm"
        >
            <View className="flex-row items-center">
                <View className="bg-accent-100 dark:bg-accent-900 p-2 rounded-lg mr-3">
                    {milestone.completed ? (
                        <Trophy size={24} className="text-accent-500 dark:text-accent-300" />
                    ) : (
                        <Lock size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-base font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                        {milestone.label}
                    </Text>
                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                        {milestone.completed ?
                            `Achieved ${milestone.count} times` :
                            milestone.progress ? `Progress: ${milestone.progress}%` : 'Not yet achieved'}
                    </Text>
                </View>
                {milestone.completed && (
                    <View className="bg-accent-50 dark:bg-accent-900 dark:bg-opacity-30 px-2 py-1 rounded">
                        <Text className="text-xs font-montserrat-medium text-accent-700 dark:text-accent-300">
                            +{milestone.points || 100} pts
                        </Text>
                    </View>
                )}
            </View>
            {milestone.progress > 0 && !milestone.completed && (
                <View className="mt-2 bg-theme-background dark:bg-theme-background-dark h-1.5 rounded-full overflow-hidden">
                    <View
                        className="bg-accent-500 dark:bg-accent-400 h-full rounded-full"
                        style={{ width: `${milestone.progress}%` }}
                    />
                </View>
            )}
        </MotiView>
    );

    // Loading state
    if (loading && !habits.length) {
        return (
            <SafeAreaView className="flex-1 bg-theme-background dark:bg-theme-background-dark">
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? '#4ade80' : '#22c55e'} />
                    <Text className="mt-4 font-montserrat text-theme-text-primary dark:text-theme-text-primary-dark">
                        Loading analytics...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-theme-background dark:bg-theme-background-dark">
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View className="flex-1 justify-center items-center px-4">
                    <View className="bg-error-100 dark:bg-error-900 dark:bg-opacity-20 p-3 rounded-full mb-4">
                        <X size={32} className="text-error-500 dark:text-error-400" />
                    </View>
                    <Text className="text-lg font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark mb-2 text-center">
                        Something went wrong
                    </Text>
                    <Text className="text-base font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark mb-6 text-center">
                        {error}
                    </Text>
                    <TouchableOpacity
                        onPress={fetchData}
                        className="bg-primary-500 dark:bg-primary-600 py-3 px-6 rounded-lg"
                    >
                        <Text className="text-white font-montserrat-semibold">Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-theme-background dark:bg-theme-background-dark">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header with gradient */}
            <View className="z-10 w-full px-4 pb-2">
                <LinearGradient
                    colors={isDark ? ['#166534', '#14532d'] : ['#dcfce7', '#f0fdf4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute top-0 left-0 right-0 h-full rounded-b-xl opacity-70"
                />

                <View className="pt-2 pb-4">
                    <Text className="text-2xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                        Analytics
                    </Text>
                    <Text className="text-sm font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                        Track your progress and insights
                    </Text>
                </View>

                {/* AI Insights Button */}
                <TouchableOpacity
                    onPress={toggleInsights}
                    className="absolute top-3 right-4 flex-row items-center bg-primary-500 dark:bg-primary-600 px-3 py-1.5 rounded-full"
                >
                    <BrainCircuit size={16} className="text-white mr-1" />
                    <Text className="text-xs font-montserrat-semibold text-white">
                        {showInsights ? 'Hide Insights' : 'AI Insights'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tooltip for information */}
            {showTooltip && (
                <View className="absolute top-1/4 left-4 right-4 bg-theme-card dark:bg-theme-card-dark p-4 rounded-xl z-50 shadow-lg">
                    <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-base font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                            {tooltipContent.title}
                        </Text>
                        <TouchableOpacity onPress={() => setShowTooltip(false)}>
                            <X size={18} className="text-theme-text-muted dark:text-theme-text-muted-dark" />
                        </TouchableOpacity>
                    </View>
                    <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                        {tooltipContent.content}
                    </Text>
                </View>
            )}

            <ScrollView
                ref={scrollViewRef}
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[isDark ? '#4ade80' : '#22c55e']}
                        tintColor={isDark ? '#4ade80' : '#22c55e'}
                    />
                }
                contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 20 }}
            >
                {/* AI Insights Panel */}
                {showInsights && (
                    <Animated.View
                        className="mb-6"
                        style={{
                            opacity: insightAnimation,
                            transform: [{
                                translateY: insightAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [-20, 0]
                                })
                            }]
                        }}
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-base font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                AI-Powered Insights
                            </Text>
                            <TouchableOpacity
                                className="p-1"
                                onPress={() => showTooltipInfo(
                                    "About AI Insights",
                                    "These insights are generated from your habit data to help you understand your patterns and improve your consistency."
                                )}
                            >
                                <Info size={18} className="text-primary-500 dark:text-primary-400" />
                            </TouchableOpacity>
                        </View>

                        {/* Insight category filters */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mb-3"
                        >
                            {['all', 'streak', 'timing', 'suggestions'].map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    onPress={() => handleInsightCategoryChange(category)}
                                    className={`px-3 py-1.5 mr-2 rounded-full border ${
                                        insightCategory === category
                                            ? 'bg-primary-50 dark:bg-primary-900 border-primary-300 dark:border-primary-700'
                                            : 'bg-theme-card dark:bg-theme-card-dark border-theme-border dark:border-theme-border-dark'
                                    }`}
                                >
                                    <Text className={`text-xs font-montserrat-medium capitalize ${
                                        insightCategory === category
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-theme-text-secondary dark:text-theme-text-secondary-dark'
                                    }`}>
                                        {category}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Insights list */}
                        {insights
                            .filter(insight => insightCategory === 'all' || insight.type === insightCategory)
                            .map((insight, index) => (
                                <InsightCard key={insight.id || index} insight={insight} index={index} />
                            ))}

                        {insights.filter(i => insightCategory === 'all' || i.type === insightCategory).length === 0 && (
                            <View className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-4 items-center">
                                <Info size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark mb-2" />
                                <Text className="text-center text-theme-text-secondary dark:text-theme-text-secondary-dark font-montserrat">
                                    No {insightCategory !== 'all' ? insightCategory : ''} insights available yet.
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* Overall Stats Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-6"
                >
                    <StatsCard
                        title="Current Streak"
                        value={`${overallStats.currentStreak}`}
                        icon={<Flame size={20} className="text-accent-500" />}
                        subtitle={`Best: ${overallStats.bestStreak} days`}
                        colorClass="accent"
                        trend={overallStats.streakTrend > 0 ? 'up' : (overallStats.streakTrend < 0 ? 'down' : null)}
                        trendValue={Math.abs(overallStats.streakTrend)}
                    />
                    <StatsCard
                        title="Completion Rate"
                        value={`${overallStats.averageCompletion}%`}
                        icon={<TrendingUp size={20} className="text-primary-500" />}
                        subtitle="All active habits"
                        colorClass="primary"
                        trend={overallStats.completionTrend > 0 ? 'up' : (overallStats.completionTrend < 0 ? 'down' : null)}
                        trendValue={Math.abs(overallStats.completionTrend)}
                    />
                    <StatsCard
                        title="Total Habits"
                        value={overallStats.totalHabits}
                        icon={<Activity size={20} className="text-success-500" />}
                        subtitle={`${overallStats.activeHabits} active now`}
                        colorClass="success"
                    />
                    <StatsCard
                        title="Points Earned"
                        value={overallStats.pointsEarned}
                        icon={<Zap size={20} className="text-secondary-500" />}
                        subtitle="All time total"
                        colorClass="secondary"
                    />
                </ScrollView>

                {/* View Mode Selector */}
                <ViewModeSelector />

                {/* Period Selector for both modes */}
                <PeriodSelector />

                {/* Loading indicator when refreshing data */}
                {refreshing && (
                    <View className="h-20 justify-center items-center">
                        <ActivityIndicator size="large" color={isDark ? '#4ade80' : '#22c55e'} />
                    </View>
                )}

                {/* Content based on view mode */}
                {viewMode === 'overall' ? (
                    // OVERALL VIEW
                    <>
                        {/* Performance Overview */}
                        <CollapsibleSection
                            title="Performance Overview"
                            icon={<Activity size={20} className="text-primary-500" />}
                            isExpanded={expandedSection === 'performance'}
                            onToggle={() => toggleSection('performance')}
                        >
                            <View className="flex-row justify-between bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4">
                                <View className="items-center">
                                    <Text className="text-2xl font-montserrat-bold text-success-500 dark:text-success-dark">
                                        {analytics?.stats?.completion_rate || 0}%
                                    </Text>
                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                        Completion Rate
                                    </Text>
                                </View>

                                <View className="w-px h-4/5 self-center bg-theme-border dark:bg-theme-border-dark" />

                                <View className="items-center">
                                    <Text className="text-2xl font-montserrat-bold text-primary-500 dark:text-primary-400">
                                        {analytics?.stats?.points_earned || 0}
                                    </Text>
                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                        Points Earned
                                    </Text>
                                </View>

                                <View className="w-px h-4/5 self-center bg-theme-border dark:bg-theme-border-dark" />

                                <View className="items-center">
                                    <Text className="text-2xl font-montserrat-bold text-accent-500 dark:text-accent-400">
                                        {overallStats.consistencyScore}
                                    </Text>
                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                        Consistency Score
                                    </Text>
                                </View>
                            </View>

                            {/* Benchmark comparison if available */}
                            {benchmarks && (
                                <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4">
                                    <Text className="text-sm font-montserrat-medium text-theme-text-primary dark:text-theme-text-primary-dark mb-2">
                                        How You Compare
                                    </Text>

                                    <View className="flex-row items-center">
                                        <View className="flex-1">
                                            <View className="h-1.5 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden">
                                                <View
                                                    className="h-full bg-primary-500 dark:bg-primary-400"
                                                    style={{ width: `${analytics?.stats?.completion_rate || 0}%` }}
                                                />
                                            </View>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                                You: {analytics?.stats?.completion_rate || 0}%
                                            </Text>
                                        </View>

                                        <View className="mx-2 w-px h-10 bg-theme-border dark:bg-theme-border-dark" />

                                        <View className="flex-1">
                                            <View className="h-1.5 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden">
                                                <View
                                                    className="h-full bg-secondary-500 dark:bg-secondary-400"
                                                    style={{ width: `${benchmarks.average_completion || 0}%` }}
                                                />
                                            </View>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                                Average: {benchmarks.average_completion || 0}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View className="flex-row flex-wrap">
                                <MetricCard
                                    title="Completed"
                                    value={analytics?.stats?.completed_days || 0}
                                    suffix="days"
                                    icon={<Check size={16} className="text-success-500 dark:text-success-dark" />}
                                    colorClass="success"
                                />

                                <MetricCard
                                    title="Missed"
                                    value={analytics?.stats?.missed_days || 0}
                                    suffix="days"
                                    icon={<X size={16} className="text-error-500 dark:text-error-dark" />}
                                    colorClass="error"
                                />

                                <MetricCard
                                    title="Longest Streak"
                                    value={analytics?.stats?.longest_streak || 0}
                                    suffix="days"
                                    icon={<Flame size={16} className="text-accent-500 dark:text-accent-400" />}
                                    colorClass="accent"
                                />

                                <MetricCard
                                    title="Active Habits"
                                    value={overallStats.activeHabits}
                                    suffix={`/${overallStats.totalHabits}`}
                                    icon={<Activity size={16} className="text-primary-500 dark:text-primary-400" />}
                                    colorClass="primary"
                                />
                            </View>
                        </CollapsibleSection>

                        {/* Domain Performance */}
                        {domains.length > 0 && (
                            <CollapsibleSection
                                title="Domain Performance"
                                icon={<BarChart2 size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'domains'}
                                onToggle={() => toggleSection('domains')}
                            >
                                <View className="mb-4">
                                    <BarChart
                                        data={domainPerformanceData}
                                        width={SCREEN_WIDTH - 40}
                                        height={220}
                                        chartConfig={getChartConfig()}
                                        style={{ borderRadius: 16, marginVertical: 8 }}
                                        fromZero={true}
                                        showValuesOnTopOfBars={true}
                                        withInnerLines={false}
                                        yAxisSuffix="%"
                                        segments={5}
                                    />
                                </View>

                                <Text className="text-base font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark mt-2 mb-3">
                                    Domain Statistics
                                </Text>

                                {domains.slice(0, 5).map((domain, index) => (
                                    <View
                                        key={index}
                                        className={`bg-theme-background dark:bg-theme-background-dark rounded-lg p-3 mb-2.5 border-l-4`}
                                        style={{
                                            borderColor: domain.color ||
                                                (DOMAIN_ICONS[domain.name]?.color || '#22c55e')
                                        }}
                                    >
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <View className="p-1.5 rounded-md mr-2" style={{
                                                    backgroundColor: DOMAIN_ICONS[domain.name]?.bgColor || '#dcfce7'
                                                }}>
                                                    {DOMAIN_ICONS[domain.name]?.icon || <Sparkles size={20} color="#22c55e" />}
                                                </View>
                                                <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark text-base">
                                                    {domain.name}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <Flame size={14} className="text-accent-500 dark:text-accent-400" />
                                                <Text className="text-xs text-accent-600 dark:text-accent-300 ml-1 font-montserrat-medium">
                                                    {domain.stats?.avg_streak?.toFixed(1) || 0} avg streak
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="flex-row mt-3">
                                            <View className="flex-1">
                                                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                                                    Total Habits
                                                </Text>
                                                <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark text-sm">
                                                    {domain.stats?.total_habits || 0}
                                                </Text>
                                            </View>

                                            <View className="flex-1">
                                                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                                                    Completion Today
                                                </Text>
                                                <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark text-sm">
                                                    {domain.stats?.completed_today || 0}/{domain.stats?.scheduled_today || 0}
                                                </Text>
                                            </View>

                                            <View className="flex-1">
                                                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                                                    Points
                                                </Text>
                                                <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark text-sm">
                                                    {domain.stats?.total_points || 0}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </CollapsibleSection>
                        )}

                        {/* Completion by Time */}
                        <CollapsibleSection
                            title="Completion Patterns"
                            icon={<Clock size={20} className="text-primary-500" />}
                            isExpanded={expandedSection === 'timePatterns'}
                            onToggle={() => toggleSection('timePatterns')}
                        >
                            {/* Time view selector buttons */}
                            <View className="flex-row mb-4">
                                <TouchableOpacity
                                    onPress={() => setSelectedTimeView('weekday')}
                                    className={`flex-1 py-2 ${
                                        selectedTimeView === 'weekday'
                                            ? 'border-b-2 border-primary-500 dark:border-primary-400'
                                            : 'border-b border-theme-border dark:border-theme-border-dark'
                                    }`}
                                >
                                    <Text className={`text-center font-montserrat-medium ${
                                        selectedTimeView === 'weekday'
                                            ? 'text-primary-600 dark:text-primary-400'
                                            : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                    }`}>
                                        By Day of Week
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setSelectedTimeView('time_of_day')}
                                    className={`flex-1 py-2 ${
                                        selectedTimeView === 'time_of_day'
                                            ? 'border-b-2 border-primary-500 dark:border-primary-400'
                                            : 'border-b border-theme-border dark:border-theme-border-dark'
                                    }`}
                                >
                                    <Text className={`text-center font-montserrat-medium ${
                                        selectedTimeView === 'time_of_day'
                                            ? 'text-primary-600 dark:text-primary-400'
                                            : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                    }`}>
                                        By Time of Day
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {selectedTimeView === 'weekday' ? (
                                // Weekday completion chart
                                <>
                                    <View>
                                        <BarChart
                                            data={weekdayCompletionData}
                                            width={SCREEN_WIDTH - 40}
                                            height={220}
                                            chartConfig={getChartConfig()}
                                            style={{ borderRadius: 16, marginVertical: 8 }}
                                            fromZero={true}
                                            showValuesOnTopOfBars={true}
                                            withInnerLines={false}
                                            yAxisSuffix="%"
                                        />
                                    </View>

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3 mb-3">
                                        This chart shows your completion rate for each day of the week across all habits.
                                        Identify your strongest and weakest days to optimize your habit schedule.
                                    </Text>

                                    {/* Day-by-day breakdown */}
                                    {analytics && analytics.completion_by_day && (
                                        <View className="mt-2">
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
                                                        className={`flex-row items-center justify-between py-2 ${
                                                            index < analytics.completion_by_day.length - 1 ? 'border-b border-theme-border dark:border-theme-border-dark' : ''
                                                        }`}
                                                    >
                                                        <Text className={`text-theme-text-primary dark:text-theme-text-primary-dark ${
                                                            isBest || isWorst ? 'font-montserrat-bold' : 'font-montserrat'
                                                        }`}>
                                                            {day.day}
                                                        </Text>

                                                        <View className="flex-1 px-3">
                                                            <View className="h-1.5 bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden">
                                                                <View className={`h-full ${
                                                                    isBest ? 'bg-success-500 dark:bg-success-dark' :
                                                                        isWorst ? 'bg-error-500 dark:bg-error-dark' :
                                                                            'bg-primary-500 dark:bg-primary-400'
                                                                }`} style={{ width: `${day.completion_rate}%` }} />
                                                            </View>
                                                        </View>

                                                        <View className="flex-row items-center">
                                                            <Text className={`font-montserrat-semibold ${
                                                                isBest ? 'text-success-600 dark:text-success-dark' :
                                                                    isWorst ? 'text-error-600 dark:text-error-dark' :
                                                                        'text-theme-text-primary dark:text-theme-text-primary-dark'
                                                            }`}>
                                                                {day.completion_rate}%
                                                            </Text>

                                                            {isBest && (
                                                                <Trophy size={14} className="text-accent-500 dark:text-accent-400 ml-1" />
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                </>
                            ) : (
                                // Time of day patterns
                                <>
                                    {analytics && analytics.time_patterns && analytics.time_patterns.length > 0 ? (
                                        analytics.time_patterns.map((segment, index) => {
                                            // Find the most productive time period
                                            const mostProductiveIndex = analytics.time_patterns.reduce(
                                                (maxIndex, current, i, arr) =>
                                                    current.count > arr[maxIndex].count ? i : maxIndex,
                                                0
                                            );

                                            const isMostProductive = index === mostProductiveIndex && segment.count > 0;

                                            return (
                                                <View key={index} className={`mb-3 ${
                                                    isMostProductive ? 'bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 rounded-lg p-2' : ''
                                                }`}>
                                                    <View className="flex-row justify-between items-center mb-1">
                                                        <View className="flex-row items-center">
                                                            <Text className={`${
                                                                isMostProductive ? 'font-montserrat-semibold text-primary-700 dark:text-primary-300' : 'font-montserrat text-theme-text-primary dark:text-theme-text-primary-dark'
                                                            }`}>
                                                                {segment.name}
                                                            </Text>
                                                            {isMostProductive && (
                                                                <View className="bg-primary-100 dark:bg-primary-800 px-1.5 py-0.5 rounded ml-2">
                                                                    <Text className="text-xs font-montserrat-medium text-primary-700 dark:text-primary-300">
                                                                        Most Productive
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text className={`font-montserrat-semibold ${
                                                            isMostProductive ? 'text-primary-700 dark:text-primary-300' : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                                        }`}>
                                                            {segment.count} ({segment.rate || 0}%)
                                                        </Text>
                                                    </View>
                                                    <View className="h-2 bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden">
                                                        <View
                                                            className={`h-full ${
                                                                isMostProductive ? 'bg-primary-500 dark:bg-primary-400' : 'bg-primary-400 dark:bg-primary-700'
                                                            }`}
                                                            style={{ width: `${segment.rate || 0}%` }}
                                                        />
                                                    </View>
                                                </View>
                                            );
                                        })
                                    ) : (
                                        <View className="items-center py-8">
                                            <Clock size={32} className="text-theme-text-muted dark:text-theme-text-muted-dark mb-2" />
                                            <Text className="text-theme-text-muted dark:text-theme-text-muted-dark text-center font-montserrat">
                                                Not enough data to show time patterns yet.
                                                Continue logging your habits!
                                            </Text>
                                        </View>
                                    )}

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3">
                                        This shows when you typically complete your habits throughout the day.
                                        Knowing your most productive times can help you schedule habits more effectively.
                                    </Text>
                                </>
                            )}
                        </CollapsibleSection>

                        {/* Activity Calendar */}
                        {analytics && analytics.monthly_distribution && analytics.monthly_distribution.length > 0 && (
                            <CollapsibleSection
                                title="Activity Calendar"
                                icon={<Calendar size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'calendar'}
                                onToggle={() => toggleSection('calendar')}
                            >
                                <View className="my-2.5">
                                    <ContributionGraph
                                        values={analytics.monthly_distribution}
                                        endDate={new Date()}
                                        numDays={90}
                                        width={SCREEN_WIDTH - 40}
                                        height={220}
                                        chartConfig={getHeatmapConfig()}
                                        tooltipDataAttrs={(value) => ({ 'aria-label': `${value.date}: ${value.count} habits` })}
                                        squareSize={16}
                                        style={{ borderRadius: 16 }}
                                    />
                                </View>

                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-2">
                                    This calendar shows your habit activity over time. Darker colors indicate more habits completed on that day.
                                </Text>

                                {/* Current streak indicator */}
                                {analytics.streaks && analytics.streaks.current_streak > 0 && (
                                    <View className="mt-4 bg-accent-50 dark:bg-accent-900 dark:bg-opacity-20 rounded-lg p-3 flex-row items-center">
                                        <View className="bg-accent-100 dark:bg-accent-800 p-2 rounded-full mr-3">
                                            <Flame size={20} className="text-accent-500 dark:text-accent-400" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                Current Streak: {analytics.streaks.current_streak} days
                                            </Text>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                Started on {formatDate(analytics.streaks.streak_start_date)}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </CollapsibleSection>
                        )}

                        {/* Streak Milestones */}
                        {streakMilestones && streakMilestones.length > 0 && (
                            <CollapsibleSection
                                title="Streak Milestones"
                                icon={<Award size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'streaks'}
                                onToggle={() => toggleSection('streaks')}
                            >
                                {streakMilestones.map((milestone, index) => (
                                    <AchievementCard key={milestone.milestone} milestone={milestone} index={index} />
                                ))}

                                <TouchableOpacity
                                    className="mt-2 flex-row items-center justify-center py-3 bg-theme-background dark:bg-theme-background-dark rounded-lg"
                                >
                                    <Trophy size={16} className="text-accent-500 dark:text-accent-400 mr-2" />
                                    <Text className="font-montserrat-medium text-theme-text-primary dark:text-theme-text-primary-dark">
                                        View All Achievements
                                    </Text>
                                </TouchableOpacity>
                            </CollapsibleSection>
                        )}

                        {/* Habit Suggestions */}
                        {suggestions && suggestions.length > 0 && (
                            <CollapsibleSection
                                title="Suggested Habits"
                                icon={<Lightbulb size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'suggestions'}
                                onToggle={() => toggleSection('suggestions')}
                            >
                                <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark mb-4">
                                    Based on your current habits and performance, here are some suggestions to enhance your routine:
                                </Text>

                                {suggestions.map((suggestion, index) => (
                                    <MotiView
                                        key={index}
                                        from={{ opacity: 0, translateY: 20 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ delay: index * 100, type: 'timing', duration: 300 }}
                                        className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-4 mb-3 border border-theme-border dark:border-theme-border-dark"
                                    >
                                        <View className="flex-row">
                                            <View
                                                className="p-2 rounded-lg mr-3"
                                                style={{
                                                    backgroundColor: DOMAIN_ICONS[suggestion.domain]?.bgColor || '#f0fdf4'
                                                }}
                                            >
                                                {DOMAIN_ICONS[suggestion.domain]?.icon || <Sparkles size={20} color="#22c55e" />}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-base font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                    {suggestion.name}
                                                </Text>
                                                <Text className="text-xs font-montserrat-medium text-theme-text-muted dark:text-theme-text-muted-dark">
                                                    {suggestion.domain} • {suggestion.frequency || 'Daily'}
                                                </Text>
                                                <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark mt-2">
                                                    {suggestion.description}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity className="mt-3 self-end bg-primary-500 dark:bg-primary-600 px-4 py-2 rounded-lg">
                                            <Text className="text-white font-montserrat-semibold">Add Habit</Text>
                                        </TouchableOpacity>
                                    </MotiView>
                                ))}
                            </CollapsibleSection>
                        )}
                    </>
                ) : (
                    // HABIT-SPECIFIC VIEW
                    <>
                        {/* Habit Selector */}
                        <HabitSelector />

                        {/* Loading indicator when switching habits */}
                        {loadingHabit ? (
                            <View className="h-40 justify-center items-center">
                                <ActivityIndicator size="large" color={isDark ? '#4ade80' : '#22c55e'} />
                                <Text className="mt-2 font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                    Loading habit data...
                                </Text>
                            </View>
                        ) : habitAnalytics ? (
                            <>
                                {/* Habit Header with Key Metrics */}
                                <View className="bg-theme-card dark:bg-theme-card-dark rounded-xl p-4 mb-4">
                                    <View className="flex-row justify-between items-start mb-3">
                                        <View className="flex-1">
                                            <Text className="text-lg font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                {habitAnalytics.name}
                                            </Text>
                                            {habitAnalytics.domain && (
                                                <View className="flex-row items-center mt-1">
                                                    <View className="w-2 h-2 rounded-full mr-1.5"
                                                          style={{
                                                              backgroundColor: habitAnalytics.domain.color ||
                                                                  (DOMAIN_ICONS[habitAnalytics.domain.name]?.color || '#22c55e')
                                                          }}
                                                    />
                                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                        {habitAnalytics.domain.name}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View className="bg-primary-100 dark:bg-primary-900 p-2.5 rounded-lg">
                                            <Flame size={24} className="text-primary-500 dark:text-primary-400" />
                                        </View>
                                    </View>

                                    {/* Date range for the analysis */}
                                    {habitAnalytics.date_range && (
                                        <View className="bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 rounded-md py-1 px-2 mb-3">
                                            <Text className="text-xs font-montserrat text-primary-700 dark:text-primary-300">
                                                Analysis Period: {formatDate(habitAnalytics.date_range.start)} - {formatDate(habitAnalytics.date_range.end)}
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-row justify-between">
                                        <View className="items-center">
                                            <Text className="text-xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                {habitAnalytics.streaks?.current_streak || 0}
                                            </Text>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                Current Streak
                                            </Text>
                                        </View>

                                        <View className="items-center">
                                            <Text className="text-xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                {habitAnalytics.streaks?.longest_streak || 0}
                                            </Text>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                Longest Streak
                                            </Text>
                                        </View>

                                        <View className="items-center">
                                            <Text className="text-xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                {habitAnalytics.stats?.completion_rate || 0}%
                                            </Text>
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                Completion Rate
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Habit Sections */}
                                {/* Streak Progression */}
                                <CollapsibleSection
                                    title="Streak Progression"
                                    icon={<TrendingUp size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'habitStreak'}
                                    onToggle={() => toggleSection('habitStreak')}
                                >
                                    <View className="mb-3">
                                        <LineChart
                                            data={streakProgressionData}
                                            width={SCREEN_WIDTH - 40}
                                            height={220}
                                            chartConfig={getChartConfig()}
                                            style={{ borderRadius: 16 }}
                                            bezier
                                        />
                                    </View>

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mb-4">
                                        This chart shows how your streak has progressed over time. Look for patterns to understand what helps you maintain consistency.
                                    </Text>

                                    {/* Streak stats */}
                                    <View className="flex-row flex-wrap">
                                        <MetricCard
                                            title="Current Streak"
                                            value={habitAnalytics.streaks?.current_streak || 0}
                                            suffix="days"
                                            icon={<Flame size={16} className="text-accent-500 dark:text-accent-400" />}colorClass="accent"
                                        />

                                        <MetricCard
                                            title="Longest Streak"
                                            value={habitAnalytics.streaks?.longest_streak || 0}
                                            suffix="days"
                                            icon={<Trophy size={16} className="text-success-500 dark:text-success-400" />}
                                            colorClass="success"
                                        />

                                        <MetricCard
                                            title="Average Streak"
                                            value={habitAnalytics.streaks?.average_streak?.toFixed(1) || 0}
                                            suffix="days"
                                            icon={<Hash size={16} className="text-primary-500 dark:text-primary-400" />}
                                            colorClass="primary"
                                        />

                                        <MetricCard
                                            title="Streak Breaks"
                                            value={habitAnalytics.streaks?.streak_breaks || 0}
                                            suffix="times"
                                            icon={<X size={16} className="text-error-500 dark:text-error-400" />}
                                            colorClass="error"
                                        />
                                    </View>
                                </CollapsibleSection>

                                {/* Completion Rate by Day */}
                                <CollapsibleSection
                                    title="Completion by Day"
                                    icon={<Calendar size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'habitDayCompletion'}
                                    onToggle={() => toggleSection('habitDayCompletion')}
                                >
                                    <View className="mb-3">
                                        <BarChart
                                            data={habitWeekdayData}
                                            width={SCREEN_WIDTH - 40}
                                            height={220}
                                            chartConfig={getChartConfig()}
                                            style={{ borderRadius: 16 }}
                                            fromZero={true}
                                            showValuesOnTopOfBars={true}
                                            withInnerLines={false}
                                            yAxisSuffix="%"
                                        />
                                    </View>

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mb-4">
                                        This chart shows your completion rate for each day of the week for this habit.
                                        You can use this to identify which days might need more attention.
                                    </Text>

                                    {/* Scheduled vs. Completed days */}
                                    {habitAnalytics.day_analysis && (
                                        <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4">
                                            <Text className="text-sm font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark mb-3">
                                                Scheduled vs. Completed
                                            </Text>

                                            {habitAnalytics.day_analysis.map((day, index) => (
                                                <View key={index} className="flex-row items-center justify-between mb-2">
                                                    <Text className="w-24 font-montserrat text-theme-text-primary dark:text-theme-text-primary-dark">
                                                        {day.day}
                                                    </Text>

                                                    <View className="flex-1 mr-2">
                                                        <View className="h-2.5 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden">
                                                            <View
                                                                className="h-full bg-primary-500 dark:bg-primary-400"
                                                                style={{ width: `${(day.completions / day.scheduled) * 100}%` }}
                                                            />
                                                        </View>
                                                    </View>

                                                    <Text className="text-xs font-montserrat-medium text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                        {day.completions}/{day.scheduled}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </CollapsibleSection>

                                {/* Time of Day Analysis */}
                                {habitAnalytics.time_patterns && habitAnalytics.time_patterns.length > 0 && (
                                    <CollapsibleSection
                                        title="Optimal Time of Day"
                                        icon={<Clock size={20} className="text-primary-500" />}
                                        isExpanded={expandedSection === 'habitTimePatterns'}
                                        onToggle={() => toggleSection('habitTimePatterns')}
                                    >
                                        <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark mb-3">
                                            Here's when you tend to complete this habit most successfully:
                                        </Text>

                                        {habitAnalytics.time_patterns.map((timePattern, index) => {
                                            const isBestTime = timePattern.is_optimal;

                                            return (
                                                <View key={index} className={`p-3 mb-2 rounded-lg ${
                                                    isBestTime
                                                        ? 'bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 border border-primary-200 dark:border-primary-800'
                                                        : 'bg-theme-background dark:bg-theme-background-dark'
                                                }`}>
                                                    <View className="flex-row justify-between items-center">
                                                        <View className="flex-row items-center">
                                                            <View className={`p-1.5 rounded-md mr-2 ${
                                                                isBestTime
                                                                    ? 'bg-primary-100 dark:bg-primary-800'
                                                                    : 'bg-theme-card dark:bg-theme-card-dark'
                                                            }`}>
                                                                {TIME_PERIODS.find(t => t.name === timePattern.name)?.icon ||
                                                                    <Clock size={16} className="text-primary-500 dark:text-primary-400" />}
                                                            </View>
                                                            <Text className={`font-montserrat-medium ${
                                                                isBestTime
                                                                    ? 'text-primary-700 dark:text-primary-300'
                                                                    : 'text-theme-text-primary dark:text-theme-text-primary-dark'
                                                            }`}>
                                                                {timePattern.name}
                                                            </Text>
                                                        </View>

                                                        <Text className={`text-sm font-montserrat-semibold ${
                                                            isBestTime
                                                                ? 'text-primary-700 dark:text-primary-300'
                                                                : 'text-theme-text-secondary dark:text-theme-text-secondary-dark'
                                                        }`}>
                                                            {timePattern.count} completions
                                                        </Text>
                                                    </View>

                                                    <View className="h-1.5 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden mt-2">
                                                        <View
                                                            className={`h-full ${
                                                                isBestTime
                                                                    ? 'bg-primary-500 dark:bg-primary-400'
                                                                    : 'bg-primary-300 dark:bg-primary-700'
                                                            }`}
                                                            style={{ width: `${timePattern.rate}%` }}
                                                        />
                                                    </View>

                                                    {isBestTime && (
                                                        <Text className="text-xs font-montserrat text-primary-700 dark:text-primary-300 mt-2">
                                                            This is your optimal time for this habit. You're {timePattern.success_rate}% more likely to complete it during this period.
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}

                                        <TouchableOpacity className="mt-3 flex-row items-center justify-center p-3 bg-primary-50 dark:bg-primary-900 dark:bg-opacity-20 rounded-lg">
                                            <Clock size={16} className="text-primary-600 dark:text-primary-400 mr-2" />
                                            <Text className="font-montserrat-medium text-primary-600 dark:text-primary-400">
                                                Adjust Reminder Times
                                            </Text>
                                        </TouchableOpacity>
                                    </CollapsibleSection>
                                )}

                                {/* Comparison with Previous Period */}
                                {habitAnalytics.comparison && (
                                    <CollapsibleSection
                                        title="Period Comparison"
                                        icon={<BarChart2 size={20} className="text-primary-500" />}
                                        isExpanded={expandedSection === 'habitComparison'}
                                        onToggle={() => toggleSection('habitComparison')}
                                    >
                                        <Text className="text-sm font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark mb-4">
                                            Comparing your performance with the previous {period}:
                                        </Text>

                                        <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-3">
                                            {/* Completion Rate Comparison */}
                                            <View className="mb-4">
                                                <View className="flex-row justify-between mb-1">
                                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                        Completion Rate
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className={`text-xs font-montserrat-medium mr-1 ${
                                                            habitAnalytics.comparison.completion_rate_change > 0
                                                                ? 'text-success-600 dark:text-success-dark'
                                                                : habitAnalytics.comparison.completion_rate_change < 0
                                                                    ? 'text-error-600 dark:text-error-dark'
                                                                    : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                                        }`}>
                                                            {habitAnalytics.comparison.completion_rate_change > 0 ? '+' : ''}
                                                            {habitAnalytics.comparison.completion_rate_change}%
                                                        </Text>
                                                        {habitAnalytics.comparison.completion_rate_change > 0 ? (
                                                            <ArrowUp size={12} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.comparison.completion_rate_change < 0 ? (
                                                            <ArrowDown size={12} className="text-error-500 dark:text-error-dark" />
                                                        ) : null}
                                                    </View>
                                                </View>

                                                <View className="flex-row items-center">
                                                    <Text className="w-16 text-xs font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                        Current:
                                                    </Text>
                                                    <View className="flex-1 h-2 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden mr-2">
                                                        <View
                                                            className="h-full bg-primary-500 dark:bg-primary-400"
                                                            style={{ width: `${habitAnalytics.stats.completion_rate}%` }}
                                                        />
                                                    </View>
                                                    <Text className="text-xs font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark w-9 text-right">
                                                        {habitAnalytics.stats.completion_rate}%
                                                    </Text>
                                                </View>

                                                <View className="flex-row items-center mt-1">
                                                    <Text className="w-16 text-xs font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                        Previous:
                                                    </Text>
                                                    <View className="flex-1 h-2 bg-theme-card dark:bg-theme-card-dark rounded-full overflow-hidden mr-2">
                                                        <View
                                                            className="h-full bg-secondary-500 dark:bg-secondary-400"
                                                            style={{ width: `${habitAnalytics.comparison.previous_completion_rate}%` }}
                                                        />
                                                    </View>
                                                    <Text className="text-xs font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark w-9 text-right">
                                                        {habitAnalytics.comparison.previous_completion_rate}%
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Streak Comparison */}
                                            <View className="mb-4">
                                                <View className="flex-row justify-between mb-1">
                                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                        Max Streak
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className={`text-xs font-montserrat-medium mr-1 ${
                                                            habitAnalytics.comparison.streak_change > 0
                                                                ? 'text-success-600 dark:text-success-dark'
                                                                : habitAnalytics.comparison.streak_change < 0
                                                                    ? 'text-error-600 dark:text-error-dark'
                                                                    : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                                        }`}>
                                                            {habitAnalytics.comparison.streak_change > 0 ? '+' : ''}
                                                            {habitAnalytics.comparison.streak_change} days
                                                        </Text>
                                                        {habitAnalytics.comparison.streak_change > 0 ? (
                                                            <ArrowUp size={12} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.comparison.streak_change < 0 ? (
                                                            <ArrowDown size={12} className="text-error-500 dark:text-error-dark" />
                                                        ) : null}
                                                    </View>
                                                </View>

                                                <View className="flex-row justify-between">
                                                    <View className="items-center p-2 bg-theme-card dark:bg-theme-card-dark rounded-lg flex-1 mr-2">
                                                        <Text className="text-lg font-montserrat-bold text-accent-500 dark:text-accent-400">
                                                            {habitAnalytics.streaks.current_streak}
                                                        </Text>
                                                        <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                            Current
                                                        </Text>
                                                    </View>

                                                    <View className="items-center p-2 bg-theme-card dark:bg-theme-card-dark rounded-lg flex-1">
                                                        <Text className="text-lg font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                            {habitAnalytics.comparison.previous_max_streak || 0}
                                                        </Text>
                                                        <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                            Previous
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {/* Total Completions Comparison */}
                                            <View>
                                                <View className="flex-row justify-between mb-1">
                                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                        Total Completions
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className={`text-xs font-montserrat-medium mr-1 ${
                                                            habitAnalytics.comparison.completion_count_change > 0
                                                                ? 'text-success-600 dark:text-success-dark'
                                                                : habitAnalytics.comparison.completion_count_change < 0
                                                                    ? 'text-error-600 dark:text-error-dark'
                                                                    : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                                        }`}>
                                                            {habitAnalytics.comparison.completion_count_change > 0 ? '+' : ''}
                                                            {habitAnalytics.comparison.completion_count_change}
                                                        </Text>
                                                        {habitAnalytics.comparison.completion_count_change > 0 ? (
                                                            <ArrowUp size={12} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.comparison.completion_count_change < 0 ? (
                                                            <ArrowDown size={12} className="text-error-500 dark:text-error-dark" />
                                                        ) : null}
                                                    </View>
                                                </View>

                                                <View className="flex-row justify-between">
                                                    <View className="items-center p-2 bg-theme-card dark:bg-theme-card-dark rounded-lg flex-1 mr-2">
                                                        <Text className="text-lg font-montserrat-bold text-primary-600 dark:text-primary-400">
                                                            {habitAnalytics.stats.completed_days}
                                                        </Text>
                                                        <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                            Current
                                                        </Text>
                                                    </View>

                                                    <View className="items-center p-2 bg-theme-card dark:bg-theme-card-dark rounded-lg flex-1">
                                                        <Text className="text-lg font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                            {habitAnalytics.comparison.previous_completed_days || 0}
                                                        </Text>
                                                        <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                            Previous
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </CollapsibleSection>
                                )}
                            </>
                        ) : (
                            <View className="p-8 items-center bg-theme-card dark:bg-theme-card-dark rounded-xl">
                                <Flame size={40} className="text-theme-text-muted dark:text-theme-text-muted-dark opacity-40 mb-3" />
                                <Text className="text-center text-lg font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark mb-2">
                                    Select a habit
                                </Text>
                                <Text className="text-center text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                                    Choose a habit from the list above to see detailed analytics
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* Floating Action Button for Share/Export */}
                <TouchableOpacity
                    className="absolute bottom-4 right-4 bg-primary-500 dark:bg-primary-600 p-3 rounded-full shadow-lg"
                    style={{
                        shadowColor: isDark ? '#000' : '#166534',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 5
                    }}
                    onPress={handleExportAnalytics}
                >
                    <Share2 size={24} className="text-white" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Analytics;