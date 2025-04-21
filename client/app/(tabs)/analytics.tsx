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
    StatusBar,
    Animated,
    Alert,
    SafeAreaView,
} from 'react-native';
import { BarChart, LineChart, ContributionGraph, PieChart } from 'react-native-chart-kit';
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
    CheckCircle,
    X,
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
    Info,
    Download,
    Share2,
    Sun,
    Moon,
    Compass,
    Crown,
    Lock,
    Zap,
} from 'lucide-react-native';
import { useSelector } from 'react-redux';

// Import analytics services
import analyticsService from '../../services/analyticsService';
import { getUserHabits } from '../../services/habitService';

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
    'Personal': { icon: <Star size={20} color="#0ea5e9" />, color: '#0ea5e9', bgColor: '#e0f2fe' },
    'default': { icon: <Star size={20} color="#0ea5e9" />, color: '#0ea5e9', bgColor: '#e0f2fe' }
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

const Analytics = () => {
    // Theme and device info
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const insightAnimation = useRef(new Animated.Value(0)).current;

    const userDetails = useSelector((state) => state.user);
    const userId = userDetails?.userId || userDetails?.user_id || userDetails?.user?.user_id;

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
    const [dashboardData, setDashboardData] = useState(null);
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [insights, setInsights] = useState([]);
    const [streakMilestones, setStreakMilestones] = useState([]);
    const [personalizedInsights, setPersonalizedInsights] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);

    // UI controls
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipContent, setTooltipContent] = useState({ title: '', content: '' });

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

    // Safely access nested properties to handle null data
    const safeGet = (obj, path, defaultValue = null) => {
        try {
            return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : defaultValue, obj);
        } catch (e) {
            return defaultValue;
        }
    };

    // Safely handle null/undefined values in arrays
    const safeArray = (arr) => {
        return Array.isArray(arr) ? arr : [];
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
                            const streakA = safeGet(a, 'stats.current_streak', 0);
                            const streakB = safeGet(b, 'stats.current_streak', 0);
                            return streakB - streakA;
                        });

                        setSelectedHabit(sortedByStreak[0].habit_id);
                    }
                }

                // Calculate overall statistics
                calculateOverallStats(habitsList);
            }

            // Fetch domains
            try {
                const domainsResponse = await analyticsService.getHabitDomains();
                if (domainsResponse && Array.isArray(domainsResponse)) {
                    setDomains(domainsResponse);
                }
            } catch (err) {
                console.warn('Error fetching domains:', err);
                setDomains([]);
            }

            // Fetch analytics data
            await Promise.all([
                fetchDashboardAnalytics(),
                fetchHabitAnalytics(),
                fetchInsights(),
                fetchHeatmapData()
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
            if (safeGet(habit, 'stats.completion_rate')) {
                totalCompletion += habit.stats.completion_rate;
                completionCount++;
            }

            // Best streak
            if (safeGet(habit, 'stats.best_streak')) {
                bestStreak = Math.max(bestStreak, habit.stats.best_streak);
            }

            // Current streak
            if (safeGet(habit, 'stats.current_streak') && habit.stats.current_streak > 0) {
                currentStreakCount++;
            }

            // Total completions
            if (safeGet(habit, 'stats.total_completions')) {
                totalCompletions += habit.stats.total_completions;
            }

            // Consistency score
            if (safeGet(habit, 'stats.consistency_score')) {
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
            pointsEarned: habitsList.reduce((total, h) => total + (safeGet(h, 'stats.points_earned', 0)), 0),
            completionTrend: completionTrend,
            streakTrend: streakTrend,
            consistencyScore: activeHabits.length > 0 ? Math.round(totalConsistency / activeHabits.length) : 0
        });
    };

    // Fetch dashboard analytics data
    const fetchDashboardAnalytics = async () => {
        try {
            const data = await analyticsService.getDashboardAnalytics();
            if (data) {
                setDashboardData(data);

                // Update overall stats from dashboard data
                if (data.summary) {
                    setOverallStats(prevStats => ({
                        ...prevStats,
                        currentStreak: data.summary.currentStreak || prevStats.currentStreak,
                        bestStreak: data.summary.longestStreak || prevStats.bestStreak,
                        averageCompletion: data.summary.weekProgress || prevStats.averageCompletion,
                        totalCompletions: data.summary.weekCompleted || prevStats.totalCompletions,
                        pointsEarned: data.summary.monthPoints || prevStats.pointsEarned,
                        activeHabits: data.summary.activeHabits || prevStats.activeHabits,
                        totalHabits: data.summary.totalHabits || prevStats.totalHabits
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard analytics:', error);
            // Don't set error state to prevent blocking the entire screen
        }
    };

    // Fetch analytics for specific habit
    const fetchHabitAnalytics = async () => {
        if (!selectedHabit) return;

        try {
            setLoadingHabit(true);
            const result = await analyticsService.getHabitAnalytics(selectedHabit, period);

            if (result) {
                setHabitAnalytics(result);
            }
        } catch (error) {
            console.error('Error fetching habit analytics:', error);
        } finally {
            setLoadingHabit(false);
        }
    };

    // Fetch heatmap data
    const fetchHeatmapData = async () => {
        try {
            const heatmap = await analyticsService.getHabitHeatmap(period === 'year' ? 'year' : 'quarter', viewMode === 'habit' ? selectedHabit : null);
            if (heatmap) {
                setHeatmapData(heatmap);
            }
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            setHeatmapData(null);
        }
    };

    // Fetch personalized insights
    const fetchInsights = async () => {
        try {
            const insights = await analyticsService.getPersonalInsights();
            if (insights) {
                setPersonalizedInsights(insights);

                // Prepare insights for the insights panel
                const formattedInsights = [];

                // Strengths
                if (Array.isArray(insights.strengths) && insights.strengths.length > 0) {
                    insights.strengths.forEach(strength => {
                        formattedInsights.push({
                            id: `strength-${formattedInsights.length}`,
                            title: `${strength.type === 'domain' ? strength.name : 'Strong'} Performance`,
                            description: strength.message,
                            type: 'positive',
                            icon: <Sparkles size={20} className="text-success-500" />,
                            action: "View Details"
                        });
                    });
                }

                // Improvement areas
                if (Array.isArray(insights.improvements) && insights.improvements.length > 0) {
                    insights.improvements.forEach(improvement => {
                        formattedInsights.push({
                            id: `improvement-${formattedInsights.length}`,
                            title: `Improvement Opportunity`,
                            description: improvement.message,
                            type: 'warning',
                            icon: <Target size={20} className="text-warning-500" />,
                            action: "See How"
                        });
                    });
                }

                // Suggestions
                if (Array.isArray(insights.suggestions) && insights.suggestions.length > 0) {
                    insights.suggestions.forEach(suggestion => {
                        let icon = <Lightbulb size={20} className="text-primary-500" />;

                        if (suggestion.type === 'streak') {
                            icon = <Flame size={20} className="text-accent-500" />;
                        } else if (suggestion.type === 'time') {
                            icon = <Clock size={20} className="text-secondary-500" />;
                        }

                        formattedInsights.push({
                            id: `suggestion-${formattedInsights.length}`,
                            title: suggestion.type === 'streak' ? 'Streak Opportunity' :
                                suggestion.type === 'time' ? 'Optimal Timing' : 'Smart Suggestion',
                            description: suggestion.message,
                            type: 'suggestion',
                            icon: icon,
                            action: "Apply"
                        });
                    });
                }

                // Add insights to the insights panel
                if (formattedInsights.length > 0) {
                    setInsights(formattedInsights);
                } else {
                    generateFallbackInsights();
                }
            } else {
                generateFallbackInsights();
            }
        } catch (error) {
            console.error('Error fetching personalized insights:', error);
            generateFallbackInsights();
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
                icon: <Calendar size={20} className="text-primary-500" />,
                action: "View Details"
            },
            {
                id: 'insight-2',
                title: 'Streak Achievement',
                description: 'You\'re building a great streak with your morning meditation habit. You\'re now in the top 15% of users!',
                type: 'positive',
                icon: <Trophy size={20} className="text-accent-500" />,
                action: "View Progress"
            },
            {
                id: 'insight-3',
                title: 'Optimal Timing',
                description: 'You complete 72% more habits in the morning than evening. Consider scheduling important habits before noon.',
                type: 'suggestion',
                icon: <Clock size={20} className="text-secondary-500" />,
                action: "Apply"
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
            const data = await analyticsService.exportAnalytics(format, period, viewMode === 'habit' ? selectedHabit : null);

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
            Promise.all([fetchDashboardAnalytics(), fetchHabitAnalytics(), fetchHeatmapData()]);
        }
    }, [period, habits.length, loading]);

    // Refetch habit-specific analytics when selectedHabit changes
    useEffect(() => {
        if (selectedHabit) {
            fetchHabitAnalytics();
            if (viewMode === 'habit') {
                fetchHeatmapData();
            }
        }
    }, [selectedHabit]);

    // Refetch heatmap data when view mode changes
    useEffect(() => {
        fetchHeatmapData();
    }, [viewMode]);

    // Prepare chart data for day of week completion
    const weekdayCompletionData = useMemo(() => {
        if (!dashboardData || !safeGet(dashboardData, 'weekStatus')) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        return {
            labels: safeArray(dashboardData.weekStatus).map(day => safeGet(day, 'name', '').substring(0, 3)),
            datasets: [{
                data: safeArray(dashboardData.weekStatus).map(day => {
                    const total = safeGet(day, 'total', 0);
                    const completed = safeGet(day, 'completed', 0);
                    return total > 0 ? Math.round((completed / total) * 100) : 0;
                }),
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                strokeWidth: 2,
            }]
        };
    }, [dashboardData]);

    // Prepare chart data for habit-specific day completion
    const habitWeekdayData = useMemo(() => {
        if (!habitAnalytics || !safeGet(habitAnalytics, 'completionStats.dayDistribution')) {
            return {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }]
            };
        }

        const dayDistribution = safeGet(habitAnalytics, 'completionStats.dayDistribution', []);
        return {
            labels: dayDistribution.map(day => safeGet(day, 'name', '').substring(0, 3)),
            datasets: [{
                data: dayDistribution.map(day => safeGet(day, 'percentage', 0))
            }]
        };
    }, [habitAnalytics]);

    // Prepare domain performance data
    const domainPerformanceData = useMemo(() => {
        if (!dashboardData || !safeGet(dashboardData, 'domainPerformance') || dashboardData.domainPerformance.length === 0) {
            return {
                labels: ['Health', 'Fitness', 'Learning'],
                datasets: [{ data: [0, 0, 0] }]
            };
        }

        // Get top 5 domains by completion percentage
        const topDomains = [...dashboardData.domainPerformance]
            .sort((a, b) => b.completionPercentage - a.completionPercentage)
            .slice(0, 5);

        return {
            labels: topDomains.map(domain => {
                const name = safeGet(domain, 'name', '');
                return name.length > 8 ? name.substring(0, 7) + '...' : name;
            }),
            datasets: [{
                data: topDomains.map(domain => safeGet(domain, 'completionPercentage', 0))
            }]
        };
    }, [dashboardData]);

    // Prepare time of day distribution data
    const timeOfDayData = useMemo(() => {
        if (!habitAnalytics || !safeGet(habitAnalytics, 'completionStats.timeDistribution')) {
            return TIME_PERIODS.map(period => ({
                name: period.name,
                value: 0
            }));
        }

        const timeDistribution = safeGet(habitAnalytics, 'completionStats.timeDistribution', []);
        return timeDistribution.map(time => ({
            name: time.name,
            value: time.percentage || 0
        }));
    }, [habitAnalytics]);

    // Format heatmap data for visualization
    const processedHeatmapData = useMemo(() => {
        if (!heatmapData || !safeGet(heatmapData, 'weeks')) {
            return [];
        }

        // Process the nested structure into a flat array for the chart
        const processed = [];

        heatmapData.weeks.forEach(week => {
            week.forEach(day => {
                if (day) {  // Skip null values (empty days)
                    processed.push({
                        date: day.date,
                        count: day.count,
                        level: day.level
                    });
                }
            });
        });

        return processed;
    }, [heatmapData]);

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
                {safeArray(habits).filter(h => h.is_active).map((habit) => (
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

    // NoDataView component to display when no data is available
    const NoDataView = ({ message, icon }) => (
        <View className="py-6 items-center justify-center">
            <View className="mb-3 bg-theme-card dark:bg-theme-card-dark p-3 rounded-full">
                {icon}
            </View>
            <Text className="text-center text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                {message}
            </Text>
        </View>
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
                        {safeArray(insights)
                            .filter(insight => insightCategory === 'all' || insight.type === insightCategory)
                            .map((insight, index) => (
                                <InsightCard key={insight.id || index} insight={insight} index={index} />
                            ))}

                        {safeArray(insights).filter(i => insightCategory === 'all' || i.type === insightCategory).length === 0 && (
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
                        title="Consistency Score"
                        value={`${overallStats.consistencyScore}`}
                        icon={<Activity size={20} className="text-success-500" />}
                        subtitle="Out of 100"
                        colorClass={getConsistencyColor(overallStats.consistencyScore)}
                    />
                    <StatsCard
                        title="Total Completions"
                        value={overallStats.totalCompletions}
                        icon={<CheckCircle size={20} className="text-secondary-500" />}
                        subtitle={`Active habits: ${overallStats.activeHabits}`}
                        colorClass="secondary"
                    />
                </ScrollView>

                {/* Period Selector */}
                <PeriodSelector />

                {/* View Mode Selector */}
                <ViewModeSelector />

                {/* Habit Selector (only show in habit-specific view mode) */}
                {viewMode === 'habit' && <HabitSelector />}

                {/* Loading indicators while data updates */}
                {loading && (
                    <View className="items-center py-8">
                        <ActivityIndicator size="large" color={isDark ? '#4ade80' : '#22c55e'} />
                        <Text className="mt-4 font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                            Loading data...
                        </Text>
                    </View>
                )}

                {/* Main Analytics Content */}
                {!loading && (
                    <>
                        {/* Performance Section */}
                        <CollapsibleSection
                            title="Performance"
                            icon={<TrendingUp size={24} className="text-primary-500 dark:text-primary-400" />}
                            isExpanded={expandedSection === 'performance'}
                            onToggle={() => toggleSection('performance')}
                        >
                            {viewMode === 'overall' ? (
                                <>
                                    <View className="mb-6">
                                        <SectionTitle
                                            icon={<BarChart2 size={20} className="text-primary-500" />}
                                            title="Completion Rate by Day"
                                        /><View className="mt-2">
                                        {dashboardData && safeGet(dashboardData, 'weekStatus') ? (
                                            <BarChart
                                                data={weekdayCompletionData}
                                                width={SCREEN_WIDTH - 48}
                                                height={220}
                                                yAxisSuffix="%"
                                                chartConfig={getChartConfig()}
                                                style={{
                                                    borderRadius: 16,
                                                    marginVertical: 8,
                                                }}
                                                fromZero={true}
                                                showValuesOnTopOfBars={true}
                                            />
                                        ) : (
                                            <NoDataView
                                                message="No completion data available for this period"
                                                icon={<BarChart2 size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />}
                                            />
                                        )}
                                    </View>
                                    </View>

                                    <View className="mb-6">
                                        <SectionTitle
                                            icon={<PieChartIcon size={20} className="text-secondary-500" />}
                                            title="Domain Performance"
                                        />
                                        <View className="mt-2">
                                            {dashboardData && safeGet(dashboardData, 'domainPerformance.length', 0) > 0 ? (
                                                <BarChart
                                                    data={domainPerformanceData}
                                                    width={SCREEN_WIDTH - 48}
                                                    height={220}
                                                    yAxisSuffix="%"
                                                    chartConfig={{
                                                        ...getChartConfig(),
                                                        color: (opacity = 1) => isDark ? `rgba(168, 85, 247, ${opacity})` : `rgba(168, 85, 247, ${opacity})`,
                                                        fillShadowGradient: isDark ? '#a855f7' : '#a855f7',
                                                    }}
                                                    style={{
                                                        borderRadius: 16,
                                                        marginVertical: 8,
                                                    }}
                                                    fromZero={true}
                                                    showValuesOnTopOfBars={true}
                                                />
                                            ) : (
                                                <NoDataView
                                                    message="No domain data available"
                                                    icon={<PieChartIcon size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />}
                                                />
                                            )}
                                        </View>
                                    </View>

                                    <View className="mb-4">
                                        <SectionTitle
                                            icon={<Calendar size={20} className="text-accent-500" />}
                                            title="Habit Contribution"
                                        />
                                        <View className="mt-2">
                                            {heatmapData && processedHeatmapData.length > 0 ? (
                                                <ContributionGraph
                                                    values={processedHeatmapData}
                                                    endDate={new Date()}
                                                    numDays={84}
                                                    width={SCREEN_WIDTH - 48}
                                                    height={220}
                                                    chartConfig={getHeatmapConfig()}
                                                    style={{
                                                        borderRadius: 16,
                                                        marginVertical: 8,
                                                    }}
                                                    tooltipDataAttrs={(value) => {
                                                        return {
                                                            'data-tip': `${value.date}: ${value.count} habits completed`,
                                                        };
                                                    }}
                                                />
                                            ) : (
                                                <NoDataView
                                                    message="No contribution data available for this period"
                                                    icon={<Calendar size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {loadingHabit ? (
                                        <View className="h-[220] justify-center items-center">
                                            <ActivityIndicator size="small" color={isDark ? '#4ade80' : '#22c55e'} />
                                        </View>
                                    ) : habitAnalytics ? (
                                        <>
                                            {/* Habit-specific metrics */}
                                            <View className="flex-row flex-wrap mb-6">
                                                <MetricCard
                                                    title="Current Streak"
                                                    value={safeGet(habitAnalytics, 'streakData.current', 0)}
                                                    icon={<Flame size={16} className="text-accent-500" />}
                                                    suffix="days"
                                                    colorClass="accent"
                                                />
                                                <MetricCard
                                                    title="Best Streak"
                                                    value={safeGet(habitAnalytics, 'streakData.longest', 0)}
                                                    icon={<Trophy size={16} className="text-warning-500" />}
                                                    suffix="days"
                                                    colorClass="warning"
                                                />
                                                <MetricCard
                                                    title="Completion Rate"
                                                    value={`${safeGet(habitAnalytics, 'completionStats.completionRate', 0)}%`}
                                                    icon={<CheckCircle size={16} className="text-success-500" />}
                                                    colorClass="success"
                                                />
                                                <MetricCard
                                                    title="Total Completions"
                                                    value={safeGet(habitAnalytics, 'completionStats.totalCompleted', 0)}
                                                    icon={<CheckCircle size={16} className="text-primary-500" />}
                                                    colorClass="primary"
                                                />
                                            </View>

                                            <View className="mb-6">
                                                <SectionTitle
                                                    icon={<BarChart2 size={20} className="text-primary-500" />}
                                                    title="Completion by Day of Week"
                                                />
                                                <View className="mt-2">
                                                    {safeGet(habitAnalytics, 'completionStats.dayDistribution') ? (
                                                        <BarChart
                                                            data={habitWeekdayData}
                                                            width={SCREEN_WIDTH - 48}
                                                            height={220}
                                                            yAxisSuffix="%"
                                                            chartConfig={getChartConfig()}
                                                            style={{
                                                                borderRadius: 16,
                                                                marginVertical: 8,
                                                            }}
                                                            fromZero={true}
                                                            showValuesOnTopOfBars={true}
                                                        />
                                                    ) : (
                                                        <NoDataView
                                                            message="No daily completion data available"
                                                            icon={<BarChart2 size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />}
                                                        />
                                                    )}
                                                </View>
                                            </View>

                                            <View className="mb-6">
                                                <SectionTitle
                                                    icon={<Clock size={20} className="text-secondary-500" />}
                                                    title="Time of Day Distribution"
                                                />
                                                <View className="mt-2">
                                                    {safeGet(habitAnalytics, 'completionStats.timeDistribution.length', 0) > 0 ? (
                                                        <BarChart
                                                            data={{
                                                                labels: timeOfDayData.map(t => t.name.substring(0, 5)),
                                                                datasets: [{ data: timeOfDayData.map(t => t.value) }]
                                                            }}
                                                            width={SCREEN_WIDTH - 48}
                                                            height={220}
                                                            yAxisSuffix="%"
                                                            chartConfig={{
                                                                ...getChartConfig(),
                                                                color: (opacity = 1) => isDark ? `rgba(236, 72, 153, ${opacity})` : `rgba(236, 72, 153, ${opacity})`,
                                                                fillShadowGradient: isDark ? '#ec4899' : '#ec4899',
                                                            }}
                                                            style={{
                                                                borderRadius: 16,
                                                                marginVertical: 8,
                                                            }}
                                                            fromZero={true}
                                                            showValuesOnTopOfBars={true}
                                                        />
                                                    ) : (
                                                        <NoDataView
                                                            message="No time distribution data available"
                                                            icon={<Clock size={24} className="text-theme-text-muted dark:text-theme-text-muted-dark" />}
                                                        />
                                                    )}
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        <View className="py-10 items-center">
                                            <Text className="text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat-medium">
                                                Select a habit to view detailed analytics
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </CollapsibleSection>

                        {/* Time Patterns Section */}
                        <CollapsibleSection
                            title="Time Patterns"
                            icon={<Clock size={24} className="text-secondary-500 dark:text-secondary-400" />}
                            isExpanded={expandedSection === 'timepatterns'}
                            onToggle={() => toggleSection('timepatterns')}
                        >
                            <View className="mb-4">
                                <View className="flex-row mb-4">
                                    <TouchableOpacity
                                        onPress={() => setSelectedTimeView('weekday')}
                                        className={`flex-1 py-2 ${selectedTimeView === 'weekday' ? 'border-b-2 border-secondary-500' : ''}`}
                                    >
                                        <Text className={`text-center font-montserrat-medium ${
                                            selectedTimeView === 'weekday'
                                                ? 'text-secondary-700 dark:text-secondary-300'
                                                : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                        }`}>
                                            Day of Week
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedTimeView('time_of_day')}
                                        className={`flex-1 py-2 ${selectedTimeView === 'time_of_day' ? 'border-b-2 border-secondary-500' : ''}`}
                                    >
                                        <Text className={`text-center font-montserrat-medium ${
                                            selectedTimeView === 'time_of_day'
                                                ? 'text-secondary-700 dark:text-secondary-300'
                                                : 'text-theme-text-muted dark:text-theme-text-muted-dark'
                                        }`}>
                                            Time of Day
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {selectedTimeView === 'weekday' ? (
                                    <View>
                                        {/* Weekday visualization */}
                                        <Text className="mb-2 text-sm font-montserrat-medium text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                            Your most productive days
                                        </Text>
                                        <View className="flex-row flex-wrap">
                                            {dashboardData && safeGet(dashboardData, 'weekStatus') ? (
                                                safeArray(dashboardData.weekStatus)
                                                    .map((day, index) => {
                                                        const completionRate = safeGet(day, 'total', 0) > 0 ?
                                                            Math.round((safeGet(day, 'completed', 0) / safeGet(day, 'total', 0)) * 100) : 0;
                                                        return (
                                                            <View key={day.name || index} className="w-1/3 p-1">
                                                                <MotiView
                                                                    from={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    transition={{ delay: index * 100, type: 'timing', duration: 400 }}
                                                                    className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-3 items-center"
                                                                >
                                                                    <Text className="text-xs font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                                        {safeGet(day, 'name', '').substring(0, 3)}
                                                                    </Text>
                                                                    <View className="my-2 h-1.5 w-full bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden">
                                                                        <View
                                                                            className={`h-full rounded-full ${
                                                                                completionRate >= 80 ? 'bg-success-500' :
                                                                                    completionRate >= 60 ? 'bg-success-500' :
                                                                                        completionRate >= 40 ? 'bg-warning-500' :
                                                                                            completionRate >= 20 ? 'bg-warning-500' :
                                                                                                'bg-error-500'
                                                                            }`}
                                                                            style={{ width: `${completionRate}%` }}
                                                                        />
                                                                    </View>
                                                                    <Text className="text-xs font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                                        {completionRate}%
                                                                    </Text>
                                                                </MotiView>
                                                            </View>
                                                        );
                                                    })
                                            ) : (
                                                <View className="py-4 w-full items-center">
                                                    <Text className="text-theme-text-muted dark:text-theme-text-muted-dark">
                                                        No data available
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        {/* Time of day visualization */}
                                        <Text className="mb-2 text-sm font-montserrat-medium text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                            Your most productive times
                                        </Text>
                                        <View className="flex-row flex-wrap">
                                            {/* Use real data if available, otherwise show time periods */}
                                            {(viewMode === 'habit' && habitAnalytics && safeGet(habitAnalytics, 'completionStats.timeDistribution.length', 0) > 0) ? (
                                                timeOfDayData.map((period, index) => (
                                                    <View key={period.name} className="w-1/2 p-1">
                                                        <MotiView
                                                            from={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: index * 100, type: 'timing', duration: 400 }}
                                                            className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-3"
                                                        >
                                                            <View className="flex-row items-center mb-1">
                                                                <Clock size={16} className="text-secondary-500" />
                                                                <Text className="ml-1.5 text-xs font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                                    {period.name}
                                                                </Text>
                                                            </View>
                                                            <View className="h-1.5 w-full bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden mt-2">
                                                                <View
                                                                    className={`h-full rounded-full ${
                                                                        period.value >= 80 ? 'bg-success-500' :
                                                                            period.value >= 60 ? 'bg-success-500' :
                                                                                period.value >= 40 ? 'bg-warning-500' :
                                                                                    period.value >= 20 ? 'bg-warning-500' :
                                                                                        'bg-error-500'
                                                                    }`}
                                                                    style={{ width: `${period.value}%` }}
                                                                />
                                                            </View>
                                                            <Text className="mt-1 text-xs font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                                {period.value}% completion
                                                            </Text>
                                                        </MotiView>
                                                    </View>
                                                ))
                                            ) : (
                                                TIME_PERIODS.map((period, index) => {
                                                    // Use mock data for demonstration if real data isn't available
                                                    const completionRate = Math.floor(Math.random() * 100);
                                                    return (
                                                        <View key={period.id} className="w-1/2 p-1">
                                                            <MotiView
                                                                from={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: index * 100, type: 'timing', duration: 400 }}
                                                                className="bg-theme-card dark:bg-theme-card-dark rounded-lg p-3"
                                                            >
                                                                <View className="flex-row items-center mb-1">
                                                                    {period.icon}
                                                                    <Text className="ml-1.5 text-xs font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                                        {period.name}
                                                                    </Text>
                                                                </View>
                                                                <Text className="text-xs text-theme-text-muted dark:text-theme-text-muted-dark mb-2">
                                                                    {period.timeRange}
                                                                </Text>
                                                                <View className="h-1.5 w-full bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden">
                                                                    <View
                                                                        className={`h-full rounded-full ${
                                                                            completionRate >= 80 ? 'bg-success-500' :
                                                                                completionRate >= 60 ? 'bg-success-500' :
                                                                                    completionRate >= 40 ? 'bg-warning-500' :
                                                                                        completionRate >= 20 ? 'bg-warning-500' :
                                                                                            'bg-error-500'
                                                                        }`}
                                                                        style={{ width: `${completionRate}%` }}
                                                                    />
                                                                </View>
                                                                <Text className="mt-1 text-xs font-montserrat text-theme-text-secondary dark:text-theme-text-secondary-dark">
                                                                    {completionRate}% completion
                                                                </Text>
                                                            </MotiView>
                                                        </View>
                                                    );
                                                })
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </CollapsibleSection>

                        {/* Export and Share Section */}
                        <View className="mt-4 mb-8">
                            <View className="flex-row">
                                <TouchableOpacity
                                    onPress={handleExportAnalytics}
                                    className="flex-1 mr-2 flex-row justify-center items-center bg-theme-card dark:bg-theme-card-dark py-3 px-4 rounded-lg border border-theme-border dark:border-theme-border-dark"
                                >
                                    <Download size={18} className="text-primary-600 dark:text-primary-400 mr-2" />
                                    <Text className="font-montserrat-semibold text-primary-600 dark:text-primary-400">
                                        Export Data
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-1 ml-2 flex-row justify-center items-center bg-primary-500 dark:bg-primary-600 py-3 px-4 rounded-lg"
                                >
                                    <Share2 size={18} className="text-white mr-2" />
                                    <Text className="font-montserrat-semibold text-white">
                                        Share Progress
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Analytics;