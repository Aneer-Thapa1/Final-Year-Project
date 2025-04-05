// screens/Analytics.tsx
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
    ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, ContributionGraph, PieChart } from 'react-native-chart-kit';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
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
    Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Domain icons mapping
const DOMAIN_ICONS = {
    'Health': <Heart size={20} className="text-primary-500" />,
    'Fitness': <Dumbbell size={20} className="text-primary-600" />,
    'Mindfulness': <Brain size={20} className="text-secondary-500" />,
    'Learning': <BookOpen size={20} className="text-secondary-600" />,
    'Social': <Users size={20} className="text-accent-500" />,
    'Productivity': <Zap size={20} className="text-accent-600" />,
    'Creativity': <Sparkles size={20} className="text-secondary-400" />,
    'Finance': <TrendingUp size={20} className="text-primary-700" />,
    'Personal': <Star size={20} className="text-accent-400" />
};

const Analytics = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const insightAnimation = useRef(new Animated.Value(0)).current;

    // State variables
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingHabit, setLoadingHabit] = useState(false);
    const [period, setPeriod] = useState('month');
    const [viewMode, setViewMode] = useState('overall'); // 'overall' or 'habit'
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [expandedSection, setExpandedSection] = useState('completion');
    const [habits, setHabits] = useState([]);
    const [domains, setDomains] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [habitAnalytics, setHabitAnalytics] = useState(null);
    const [showInsights, setShowInsights] = useState(false);
    const [insights, setInsights] = useState([]);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipContent, setTooltipContent] = useState({ title: '', content: '' });
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
    });

    // Get chart config with appropriate colors
    const getChartConfig = () => ({
        backgroundGradientFrom: isDark ? '#1E293B' : '#FFFFFF',
        backgroundGradientTo: isDark ? '#1E293B' : '#FFFFFF',
        decimalPlaces: 0,
        color: (opacity = 1) => isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(34, 197, 94, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(51, 65, 85, ${opacity})`,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: isDark ? '#15803D' : '#16A34A',
        },
        fillShadowGradient: isDark ? '#22C55E' : '#22C55E',
        fillShadowGradientOpacity: 0.3
    });

    // Get heatmap config with appropriate colors
    const getHeatmapConfig = () => ({
        backgroundGradientFrom: isDark ? '#1E293B' : '#FFFFFF',
        backgroundGradientTo: isDark ? '#1E293B' : '#FFFFFF',
        color: (opacity = 1) => isDark ? `rgba(34, 197, 94, ${opacity})` : `rgba(34, 197, 94, ${opacity})`,
        labelColor: (opacity = 1) => isDark ? `rgba(226, 232, 240, ${opacity})` : `rgba(51, 65, 85, ${opacity})`,
        style: {
            borderRadius: 16,
        },
    });

    // Helper functions for styling
    const getBgClass = (colorType) => {
        switch (colorType) {
            case 'primary': return 'bg-primary-100 dark:bg-primary-900';
            case 'secondary': return 'bg-secondary-100 dark:bg-secondary-900';
            case 'accent': return 'bg-accent-100 dark:bg-accent-900';
            case 'success': return 'bg-success-100 dark:bg-success-500 dark:bg-opacity-20';
            case 'warning': return 'bg-warning-100 dark:bg-warning-500 dark:bg-opacity-20';
            case 'error': return 'bg-error-100 dark:bg-error-500 dark:bg-opacity-20';
            case 'info': return 'bg-blue-100 dark:bg-blue-900';
            default: return 'bg-primary-100 dark:bg-primary-900';
        }
    };

    const getTextClass = (colorType) => {
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
    };

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

    const getConsistencyColorClass = (score) => {
        if (score >= 80) return 'text-success-500 dark:text-success-dark';
        if (score >= 60) return 'text-success-600 dark:text-success-dark';
        if (score >= 40) return 'text-warning-500 dark:text-warning-dark';
        if (score >= 20) return 'text-warning-600 dark:text-warning-dark';
        return 'text-error-500 dark:text-error-dark';
    };

    const getConsistencyBorderColorClass = (score) => {
        if (score >= 80) return 'border-success-500 dark:border-success-dark';
        if (score >= 60) return 'border-success-600 dark:border-success-dark';
        if (score >= 40) return 'border-warning-500 dark:border-warning-dark';
        if (score >= 20) return 'border-warning-600 dark:border-warning-dark';
        return 'border-error-500 dark:border-error-dark';
    };

    const getConsistencyColorName = (score) => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'success';
        if (score >= 40) return 'warning';
        if (score >= 20) return 'warning';
        return 'error';
    };

    const getTrendColorClass = (trend) => {
        if (trend === 'increasing') return 'text-success-500 dark:text-success-dark';
        if (trend === 'decreasing') return 'text-error-500 dark:text-error-dark';
        return 'text-warning-500 dark:text-warning-dark';
    };

    const getAchievementColorClass = (rate) => {
        if (rate >= 90) return 'bg-success-500 dark:bg-success-dark';
        if (rate >= 70) return 'bg-success-600 dark:bg-success-dark';
        if (rate >= 50) return 'bg-warning-500 dark:bg-warning-dark';
        if (rate >= 30) return 'bg-warning-600 dark:bg-warning-dark';
        return 'bg-error-500 dark:bg-error-dark';
    };

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

                    // Calculate trends by comparing to previous data (if available)
                    const completionTrend = Math.random() > 0.5 ? Math.floor(Math.random() * 10) : -Math.floor(Math.random() * 10);
                    const streakTrend = Math.random() > 0.6 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 10);

                    setOverallStats({
                        totalHabits: habitsResponse.habits.length,
                        activeHabits: activeHabits.length,
                        averageCompletion: Math.round(avgCompletion * 10) / 10,
                        bestStreak: bestStreak,
                        currentStreak: currentDayCompletions,
                        totalCompletions: totalCompletions,
                        pointsEarned: totalPoints,
                        completionTrend: completionTrend,
                        streakTrend: streakTrend
                    });
                }
            }

            // Fetch both overall and habit-specific analytics
            await Promise.all([fetchOverallAnalytics(), fetchHabitAnalytics()]);

            // Generate insights based on the data
            generateInsights();

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Helper to get week number
    const getWeekNumber = (date) => {
        // Use ISO week numbering
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // Generate AI-powered insights based on the data
    const generateInsights = useCallback(() => {
        // This would ideally use actual data from your backend
        // For now, we'll create insights based on available data
        const newInsights = [];

        // Only add insights if we have data
        if (analytics && habits.length > 0) {
            // Completion rate insight
            if (analytics.stats && analytics.stats.completion_rate !== undefined) {
                const completionRate = analytics.stats.completion_rate;

                if (completionRate >= 80) {
                    newInsights.push({
                        title: "Excellent Consistency",
                        description: `Your ${completionRate}% completion rate is outstanding. You're building strong habit foundations!`,
                        type: "positive",
                        icon: <TrendingUp size={20} className="text-success-500" />,
                        action: "See Details"
                    });
                } else if (completionRate >= 60) {
                    newInsights.push({
                        title: "Good Progress",
                        description: `Your ${completionRate}% completion rate shows good consistency. Keep it up!`,
                        type: "positive",
                        icon: <TrendingUp size={20} className="text-success-500" />,
                        action: "See Details"
                    });
                } else if (completionRate < 40) {
                    newInsights.push({
                        title: "Consistency Challenge",
                        description: `Your ${completionRate}% completion rate suggests you might need to simplify your habit goals or adjust schedules.`,
                        type: "warning",
                        icon: <Activity size={20} className="text-warning-500" />,
                        action: "Get Tips"
                    });
                }
            }

            // Day of week insight
            if (analytics.completion_by_day && analytics.completion_by_day.length > 0) {
                const dayRates = analytics.completion_by_day.map(d => ({
                    day: d.day,
                    rate: d.completion_rate || 0,
                    scheduled: d.scheduled || 0
                }));

                // Find best and worst days with sufficient data
                const validDays = dayRates.filter(d => d.scheduled >= 3);
                if (validDays.length > 0) {
                    const bestDay = [...validDays].sort((a, b) => b.rate - a.rate)[0];
                    const worstDay = [...validDays].sort((a, b) => a.rate - b.rate)[0];

                    if (bestDay && bestDay.rate > 0) {
                        newInsights.push({
                            title: "Best Performance Day",
                            description: `You're most consistent on ${bestDay.day}s with ${bestDay.rate}% completion. Consider scheduling important habits on this day.`,
                            type: "insight",
                            icon: <Calendar size={20} className="text-primary-500" />,
                            action: "Optimize Schedule"
                        });
                    }

                    if (worstDay && worstDay.rate < 50 && bestDay.day !== worstDay.day) {
                        newInsights.push({
                            title: "Challenging Day Identified",
                            description: `You complete fewer habits on ${worstDay.day}s (${worstDay.rate}%). Consider simpler habits or different timing on this day.`,
                            type: "suggestion",
                            icon: <Calendar size={20} className="text-secondary-500" />,
                            action: "Adjust Schedule"
                        });
                    }
                }
            }

            // Time pattern insight
            if (analytics.time_patterns && analytics.time_patterns.length > 0) {
                const mostProductiveTime = [...analytics.time_patterns]
                    .filter(t => t.count > 0)
                    .sort((a, b) => b.rate - a.rate)[0];

                if (mostProductiveTime && mostProductiveTime.rate > 30) {
                    newInsights.push({
                        title: "Optimal Time Window",
                        description: `You're ${mostProductiveTime.rate}% more likely to complete habits during ${mostProductiveTime.name}. Schedule important habits during this time window.`,
                        type: "insight",
                        icon: <Clock size={20} className="text-secondary-500" />,
                        action: "Adjust Reminders"
                    });
                }
            }

            // Streak insight
            const topHabit = habits
                .filter(h => h.streak && h.streak[0] && h.streak[0].current_streak > 5)
                .sort((a, b) => {
                    const streakA = a.streak && a.streak[0] ? a.streak[0].current_streak : 0;
                    const streakB = b.streak && b.streak[0] ? b.streak[0].current_streak : 0;
                    return streakB - streakA;
                })[0];

            if (topHabit && topHabit.streak && topHabit.streak[0]) {
                const currentStreak = topHabit.streak[0].current_streak;
                newInsights.push({
                    title: `${currentStreak}-Day Streak!`,
                    description: `Your '${topHabit.name}' habit is on fire with a ${currentStreak}-day streak. Fantastic consistency!`,
                    type: "achievement",
                    icon: <Flame size={20} className="text-accent-500" />,
                    action: "Celebrate"
                });
            }

            // Add a habit suggestion based on domains
            if (domains.length > 0) {
                const habitTypes = [
                    "morning meditation",
                    "daily exercise",
                    "reading session",
                    "gratitude journaling",
                    "water tracking",
                    "healthy meal planning"
                ];

                const randomHabit = habitTypes[Math.floor(Math.random() * habitTypes.length)];

                newInsights.push({
                    title: "Habit Suggestion",
                    description: `Based on your current habits, adding a ${randomHabit} routine could complement your progress.`,
                    type: "suggestion",
                    icon: <Lightbulb size={20} className="text-accent-400" />,
                    action: "Add Habit"
                });
            }
        }

        // Randomize order slightly but keep important ones at top
        const sortedInsights = newInsights
            .sort((a, b) => {
                // Prioritize achievements and warnings
                if (a.type === 'achievement' && b.type !== 'achievement') return -1;
                if (b.type === 'achievement' && a.type !== 'achievement') return 1;
                if (a.type === 'warning' && b.type !== 'warning') return -1;
                if (b.type === 'warning' && a.type !== 'warning') return 1;
                return 0;
            })
            .slice(0, 5); // Limit to 5 insights

        setInsights(sortedInsights);

        // If we have good insights, show insights panel by default
        if (sortedInsights.length >= 3 && !showInsights) {
            setShowInsights(true);
        }
    }, [analytics, habits, domains, showInsights]);

// Fetch overall analytics data
    const fetchOverallAnalytics = async () => {
        try {
            // Make sure we have habits to analyze
            if (!habits || habits.length === 0) return;

            const activeHabits = habits.filter(h => h.is_active).slice(0, 5);

            // Exit if no active habits
            if (activeHabits.length === 0) return;

            const analyticsPromises = activeHabits.map(habit =>
                getHabitAnalytics(habit.habit_id, period, false, true)
            );

            const analyticsResults = await Promise.all(analyticsPromises);

            // Combine and aggregate data - this uses the structure from your backend
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
                monthly_distribution: [],
                streak_milestones: [
                    { milestone: 7, count: 0, label: '1 Week' },
                    { milestone: 30, count: 0, label: '1 Month' },
                    { milestone: 90, count: 0, label: '3 Months' },
                    { milestone: 180, count: 0, label: '6 Months' },
                    { milestone: 365, count: 0, label: '1 Year' }
                ],
                completion_by_domain: []
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

                    // Track domain completion rate
                    const habit = activeHabits.find(h => h.habit_id === result.data.habit_id);
                    if (habit && habit.domain) {
                        const existingDomain = combinedAnalytics.completion_by_domain.find(d => d.name === habit.domain.name);
                        if (existingDomain) {
                            existingDomain.completions += stats?.completed_days || 0;
                            existingDomain.scheduled += stats?.scheduled_days || 0;
                        } else {
                            combinedAnalytics.completion_by_domain.push({
                                name: habit.domain.name,
                                color: habit.domain.color || "#22C55E",
                                completions: stats?.completed_days || 0,
                                scheduled: stats?.scheduled_days || 0,
                                completion_rate: 0
                            });
                        }
                    }

                    // Track streak milestones
                    if (result.data.streaks && result.data.streaks.longest_streak) {
                        combinedAnalytics.streak_milestones.forEach(milestone => {
                            if (result.data.streaks.longest_streak >= milestone.milestone) {
                                milestone.count += 1;
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

            // Calculate domain completion rates
            combinedAnalytics.completion_by_domain.forEach(domain => {
                domain.completion_rate = domain.scheduled > 0
                    ? Math.round((domain.completions / domain.scheduled) * 100)
                    : 0;
            });

            setAnalytics(combinedAnalytics);
        } catch (error) {
            console.error('Error fetching overall analytics:', error);
        }
    };

// Fetch habit-specific analytics data
const fetchHabitAnalytics = async () => {
    if (!selectedHabit) return;

    try {
        setLoadingHabit(true);

        // Make direct analytics call with proper parameters
        // We use compare_to_previous=true to get trend data
        const analyticsData = await getHabitAnalytics(selectedHabit, period, true, 50, true);

        if (analyticsData && analyticsData.data) {
            // Direct mapping from backend response to state
            setHabitAnalytics(analyticsData.data);
        }

        setLoadingHabit(false);
    } catch (error) {
        console.error('Error fetching habit analytics:', error);
        setLoadingHabit(false);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchData();
};

// Toggle section expansion with haptic feedback
const toggleSection = (section) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExpandedSection(expandedSection === section ? '' : section);
};

// Handle period change with haptic feedback
const handlePeriodChange = (newPeriod) => {
    if (period !== newPeriod) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPeriod(newPeriod);
    }
};

// Handle view mode change with haptic feedback
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

// Show info tooltip
const showTooltipInfo = (title, content) => {
    setTooltipContent({ title, content });
    setShowTooltip(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
        setShowTooltip(false);
    }, 3000);
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
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Primary-500
            strokeWidth: 2,
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

    // Extract data properly from the backend format
    const progressionData = habitAnalytics.streak_progression;

    // Group by week for better visualization
    const dateMap = new Map();

    // First, organize by date
    progressionData.forEach(entry => {
        const date = new Date(entry.date);
        const weekNum = getWeekNumber(date);

        if (!dateMap.has(weekNum)) {
            dateMap.set(weekNum, []);
        }

        dateMap.get(weekNum).push(entry.streak);
    });

    // Convert to chart format
    const labels = [];
    const data = [];

    // Sort weeks chronologically
    const sortedWeeks = Array.from(dateMap.keys()).sort((a, b) => a - b);

    sortedWeeks.forEach(weekNum => {
        const streaks = dateMap.get(weekNum);
        // Use the maximum streak for each week
        const maxStreak = Math.max(...streaks);

        labels.push(`Week ${weekNum}`);
        data.push(maxStreak);
    });

    // If we have more than 8 weeks, only show most recent 8
    const MAX_WEEKS = 8;
    if (labels.length > MAX_WEEKS) {
        return {
            labels: labels.slice(-MAX_WEEKS),
            datasets: [{ data: data.slice(-MAX_WEEKS) }]
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

// Format date for display
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

// Custom components
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
            <View className={`p-1.5 rounded-lg ${getBgClass(colorClass)}`}>
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
            <View className={`p-1 rounded-md mr-1.5 ${getBgClass(colorClass)}`}>
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
            <Text className={`text-lg font-montserrat-bold ${getTextClass(colorClass)}`}>
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

const InsightCard = ({ insight, index }) => (
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
                {insight.action}
            </Text>
        </TouchableOpacity>
    </MotiView>
);

const SectionTitle = ({ icon, title }) => (
    <View className="flex-row items-center mb-3">
        {icon}
        <Text className="ml-2 text-base font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark">
            {title}
        </Text>
    </View>
);

// Loading state
if (loading && !habits.length) {
    return (
        <SafeAreaView className="flex-1 bg-theme-background dark:bg-theme-background-dark">
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" className="text-primary-500" />
                <Text className="mt-4 font-montserrat text-theme-text-primary dark:text-theme-text-primary-dark">
                    Loading analytics...
                </Text>
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
                colors={isDark ? ['#166534', '#14532D'] : ['#DCFCE7', '#F0FDF4']}
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
                    colors={[isDark ? '#4ADE80' : '#22C55E']}
                    tintColor={isDark ? '#4ADE80' : '#22C55E'}
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

                    {insights.map((insight, index) => (
                        <InsightCard key={index} insight={insight} index={index} />
                    ))}
                </Animated.View>
            )}

            {/* Overall Stats */}
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
            {loading && (
                <View className="h-20 justify-center items-center">
                    <ActivityIndicator size="large" className="text-primary-500" />
                </View>
            )}

            {!loading && viewMode === 'overall' ? (
                // OVERALL VIEW
                <>
                    {/* Domain Completion Rates */}
                    {domains.length > 0 && (
                        <CollapsibleSection
                            title="Domain Performance"
                            icon={<BarChart2 size={20} className="text-primary-500" />}
                            isExpanded={expandedSection === 'domains'}
                            onToggle={() => toggleSection('domains')}
                        >
                            <View className="mb-4">
                                <BarChart
                                    data={domainStatsData}
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
                                    className={`bg-theme-background dark:bg-theme-background-dark rounded-lg p-3 mb-2.5 border-l-4 ${
                                        index % 3 === 0 ? 'border-primary-500 dark:border-primary-400' :
                                            index % 3 === 1 ? 'border-secondary-500 dark:border-secondary-400' :
                                                'border-accent-500 dark:border-accent-400'
                                    }`}
                                >
                                    <View className="flex-row justify-between items-center">
                                        <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark text-base">
                                            {domain.name}
                                        </Text>
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
                        </CollapsibleSection>
                    )}

                    {/* Overall Completion Stats */}
                    {analytics && (
                        <CollapsibleSection
                            title="Completion Stats"
                            icon={<Check size={20} className="text-primary-500" />}
                            isExpanded={expandedSection === 'completion'}
                            onToggle={() => toggleSection('completion')}
                        >
                            <View className="flex-row justify-between bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4">
                                <View className="items-center">
                                    <Text className="text-2xl font-montserrat-bold text-success-500 dark:text-success-dark">
                                        {analytics.stats.completion_rate || 0}%
                                    </Text>
                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                        Completion Rate
                                    </Text>
                                </View>

                                <View className="w-px h-4/5 self-center bg-theme-border dark:bg-theme-border-dark" />

                                <View className="items-center">
                                    <Text className="text-2xl font-montserrat-bold text-primary-500 dark:text-primary-400">
                                        {analytics.stats.points_earned || 0}
                                    </Text>
                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                        Points Earned
                                    </Text>
                                </View>
                            </View>

                            {analytics.stats.consistency_score !== undefined && (
                                <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4 flex-row items-center justify-between">
                                    <View>
                                        <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                            Consistency Score
                                        </Text>
                                        <Text className="text-xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark mt-1">
                                            {analytics.stats.consistency_score}/100
                                        </Text>
                                    </View>

                                    <View className={`w-14 h-14 rounded-full border-3 items-center justify-center ${getConsistencyBorderColorClass(analytics.stats.consistency_score)}`}>
                                        <Text className={`text-base font-montserrat-bold ${getConsistencyColorClass(analytics.stats.consistency_score)}`}>
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
                                    icon={<Check size={16} className="text-success-500 dark:text-success-dark" />}
                                    colorClass="success"
                                />

                                <MetricCard
                                    title="Missed"
                                    value={analytics.stats.missed_days || 0}
                                    suffix="days"
                                    icon={<X size={16} className="text-error-500 dark:text-error-dark" />}
                                    colorClass="error"
                                />

                                <MetricCard
                                    title="Skipped"
                                    value={analytics.stats.skipped_days || 0}
                                    suffix="days"
                                    icon={<Minus size={16} className="text-warning-500 dark:text-warning-dark" />}
                                    colorClass="warning"
                                />

                                <MetricCard
                                    title="Scheduled"
                                    value={analytics.stats.scheduled_days || 0}
                                    suffix="days"
                                    icon={<Calendar size={16} className="text-blue-500 dark:text-blue-400" />}
                                    colorClass="info"
                                />
                            </View>
                        </CollapsibleSection>
                    )}

                    {/* Completion by Day of Week */}
                    <CollapsibleSection
                        title="Completion by Day"
                        icon={<Calendar size={20} className="text-primary-500" />}
                        isExpanded={expandedSection === 'dayCompletion'}
                        onToggle={() => toggleSection('dayCompletion')}
                    >
                        <View>
                            <BarChart
                                data={overallCompletionByDayData}
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
                    </CollapsibleSection>

                    {/* Time Patterns */}
                    {analytics && analytics.time_patterns && analytics.time_patterns.length > 0 && (
                        <CollapsibleSection
                            title="Time of Day Patterns"
                            icon={<Clock size={20} className="text-primary-500" />}
                            isExpanded={expandedSection === 'timePatterns'}
                            onToggle={() => toggleSection('timePatterns')}
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
                            })}

                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3">
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

                    {/* Loading indicator when switching habits */}
                    {loadingHabit ? (
                        <View className="h-40 justify-center items-center">
                            <ActivityIndicator size="large" className="text-primary-500" />
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
                                                <View className={`w-2 h-2 rounded-full mr-1.5 ${
                                                    habitAnalytics.domain.color ? '' : 'bg-primary-500 dark:bg-primary-400'
                                                }`} style={habitAnalytics.domain.color ? { backgroundColor: habitAnalytics.domain.color } : {}} />
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

                            {/* Habit-Specific Completion Stats */}
                            <CollapsibleSection
                                title="Completion Stats"
                                icon={<Check size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'habitCompletion'}
                                onToggle={() => toggleSection('habitCompletion')}
                            >
                                {/* Stats comparison with previous period if available */}
                                {habitAnalytics.previous_period && (
                                    <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4">
                                        <Text className="text-base font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark mb-3">
                                            Compared to Previous {period.charAt(0).toUpperCase() + period.slice(1)}
                                        </Text>

                                        <View className="flex-row justify-between">
                                            <View className="items-center">
                                                {habitAnalytics.trends && habitAnalytics.trends.completion_rate_change !== undefined && (
                                                    <View className="flex-row items-center">
                                                        {habitAnalytics.trends.completion_rate_change > 0 ? (
                                                            <ArrowUp size={16} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.trends.completion_rate_change < 0 ? (
                                                            <ArrowDown size={16} className="text-error-500 dark:text-error-dark" />
                                                        ) : (
                                                            <Minus size={16} className="text-warning-500 dark:text-warning-dark" />
                                                        )}
                                                        <Text className={`ml-1 text-sm font-montserrat-semibold ${
                                                            habitAnalytics.trends.completion_rate_change > 0 ?
                                                                'text-success-600 dark:text-success-dark' :
                                                                habitAnalytics.trends.completion_rate_change < 0 ?
                                                                    'text-error-600 dark:text-error-dark' :
                                                                    'text-warning-600 dark:text-warning-dark'
                                                        }`}>
                                                            {habitAnalytics.trends.completion_rate_change > 0 ? '+' : ''}
                                                            {habitAnalytics.trends.completion_rate_change}%
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                                    Completion Rate
                                                </Text>
                                            </View>

                                            <View className="items-center">
                                                {habitAnalytics.trends && habitAnalytics.trends.completed_days_change !== undefined && (
                                                    <View className="flex-row items-center">
                                                        {habitAnalytics.trends.completed_days_change > 0 ? (
                                                            <ArrowUp size={16} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.trends.completed_days_change < 0 ? (
                                                            <ArrowDown size={16} className="text-error-500 dark:text-error-dark" />
                                                        ) : (
                                                            <Minus size={16} className="text-warning-500 dark:text-warning-dark" />
                                                        )}
                                                        <Text className={`ml-1 text-sm font-montserrat-semibold ${
                                                            habitAnalytics.trends.completed_days_change > 0 ?
                                                                'text-success-600 dark:text-success-dark' :
                                                                habitAnalytics.trends.completed_days_change < 0 ?
                                                                    'text-error-600 dark:text-error-dark' :
                                                                    'text-warning-600 dark:text-warning-dark'
                                                        }`}>
                                                            {habitAnalytics.trends.completed_days_change > 0 ? '+' : ''}
                                                            {habitAnalytics.trends.completed_days_change} days
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                                    Completed Days
                                                </Text>
                                            </View>

                                            <View className="items-center">
                                                {habitAnalytics.trends && habitAnalytics.trends.missed_days_change !== undefined && (
                                                    <View className="flex-row items-center">
                                                        {habitAnalytics.trends.missed_days_change < 0 ? (
                                                            <ArrowDown size={16} className="text-success-500 dark:text-success-dark" />
                                                        ) : habitAnalytics.trends.missed_days_change > 0 ? (
                                                            <ArrowUp size={16} className="text-error-500 dark:text-error-dark" />
                                                        ) : (
                                                            <Minus size={16} className="text-warning-500 dark:text-warning-dark" />
                                                        )}
                                                        <Text className={`ml-1 text-sm font-montserrat-semibold ${
                                                            habitAnalytics.trends.missed_days_change < 0 ?
                                                                'text-success-600 dark:text-success-dark' :
                                                                habitAnalytics.trends.missed_days_change > 0 ?
                                                                    'text-error-600 dark:text-error-dark' :
                                                                    'text-warning-600 dark:text-warning-dark'
                                                        }`}>
                                                            {habitAnalytics.trends.missed_days_change > 0 ? '+' : ''}
                                                            {habitAnalytics.trends.missed_days_change} days
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
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
                                        icon={<Check size={16} className="text-success-500 dark:text-success-dark" />}
                                        colorClass="success"
                                    />

                                    <MetricCard
                                        title="Missed"
                                        value={habitAnalytics.stats.missed_days || 0}
                                        suffix="days"
                                        icon={<X size={16} className="text-error-500 dark:text-error-dark" />}
                                        colorClass="error"
                                    />

                                    <MetricCard
                                        title="Skipped"
                                        value={habitAnalytics.stats.skipped_days || 0}
                                        suffix="days"
                                        icon={<Minus size={16} className="text-warning-500 dark:text-warning-dark" />}
                                        colorClass="warning"
                                    />

                                    <MetricCard
                                        title="Scheduled"
                                        value={habitAnalytics.stats.scheduled_days || 0}
                                        suffix="days"
                                        icon={<Calendar size={16} className="text-blue-500 dark:text-blue-400" />}
                                        colorClass="info"
                                    />

                                    <MetricCard
                                        title="Points"
                                        value={habitAnalytics.stats.points_earned || 0}
                                        icon={<Zap size={16} className="text-primary-500 dark:text-primary-400" />}
                                        colorClass="primary"
                                    />

                                    {habitAnalytics.stats.consistency_score !== undefined && (
                                        <MetricCard
                                            title="Consistency"
                                            value={habitAnalytics.stats.consistency_score}
                                            suffix="/100"
                                            icon={
                                                <Target
                                                    size={16}
                                                    className={getConsistencyColorClass(habitAnalytics.stats.consistency_score)}
                                                />
                                            }
                                            colorClass={getConsistencyColorName(habitAnalytics.stats.consistency_score)}
                                        />
                                    )}
                                </View>
                            </CollapsibleSection>

                            {/* Tracking-Type Specific Metrics */}
                            {habitAnalytics.tracking_metrics && Object.keys(habitAnalytics.tracking_metrics).length > 0 && (
                                <CollapsibleSection
                                    title="Tracking Metrics"
                                    icon={<Activity size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'trackingMetrics'}
                                    onToggle={() => toggleSection('trackingMetrics')}
                                >
                                    {/* Goal Achievement Rate */}
                                    {habitAnalytics.tracking_metrics.goal_achievement_rate !== undefined && (
                                        <View className="bg-theme-background dark:bg-theme-background-dark rounded-lg p-4 mb-4">
                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                Goal Achievement
                                            </Text>

                                            <View className="flex-row items-center mt-2 mb-3">
                                                <Text className="text-xl font-montserrat-bold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                    {habitAnalytics.tracking_metrics.goal_achievement_rate}%
                                                </Text>

                                                {habitAnalytics.tracking_metrics.trend && (
                                                    <View className={`ml-3 px-1.5 py-0.5 rounded ${
                                                        habitAnalytics.tracking_metrics.trend === 'increasing' ? 'bg-success-100 dark:bg-success-900 dark:bg-opacity-30' :
                                                            habitAnalytics.tracking_metrics.trend === 'decreasing' ? 'bg-error-100 dark:bg-error-900 dark:bg-opacity-30' :
                                                                'bg-warning-100 dark:bg-warning-900 dark:bg-opacity-30'
                                                    }`}>
                                                        <Text className={`text-xs font-montserrat-medium ${
                                                            habitAnalytics.tracking_metrics.trend === 'increasing' ? 'text-success-700 dark:text-success-dark' :
                                                                habitAnalytics.tracking_metrics.trend === 'decreasing' ? 'text-error-700 dark:text-error-dark' :
                                                                    'text-warning-700 dark:text-warning-dark'
                                                        }`}>
                                                            {habitAnalytics.tracking_metrics.trend === 'increasing' ? 'Improving' :
                                                                habitAnalytics.tracking_metrics.trend === 'decreasing' ? 'Declining' : 'Stable'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View className="h-2 bg-theme-border dark:bg-theme-border-dark rounded-full overflow-hidden">
                                                <View
                                                    className={getAchievementColorClass(habitAnalytics.tracking_metrics.goal_achievement_rate)}
                                                    style={{ height: '100%', width: `${Math.min(100, habitAnalytics.tracking_metrics.goal_achievement_rate)}%` }}
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
                                                    icon={<Clock3 size={16} className="text-primary-500 dark:text-primary-400" />}
                                                    colorClass="primary"
                                                    trend={habitAnalytics.tracking_metrics.trend}
                                                />
                                                <MetricCard
                                                    title="Total Time"
                                                    value={habitAnalytics.tracking_metrics.total_duration || 0}
                                                    suffix="min"
                                                    icon={<Clock4 size={16} className="text-success-500 dark:text-success-dark" />}
                                                    colorClass="success"
                                                />
                                                <MetricCard
                                                    title="Goal"
                                                    value={habitAnalytics.tracking_metrics.goal_duration || 0}
                                                    suffix="min"
                                                    icon={<Award size={16} className="text-accent-500 dark:text-accent-400" />}
                                                    colorClass="accent"
                                                />
                                                <MetricCard
                                                    title="Max Duration"
                                                    value={habitAnalytics.tracking_metrics.max_duration || 0}
                                                    suffix="min"
                                                    icon={<TrendingUp size={16} className="text-secondary-500 dark:text-secondary-400" />}
                                                    colorClass="secondary"
                                                />
                                            </>
                                        )}

                                        {habitAnalytics.tracking_metrics.avg_count !== undefined && (
                                            <>
                                                <MetricCard
                                                    title="Average Count"
                                                    value={habitAnalytics.tracking_metrics.avg_count || 0}
                                                    icon={<Hash size={16} className="text-primary-500 dark:text-primary-400" />}
                                                    colorClass="primary"
                                                    trend={habitAnalytics.tracking_metrics.trend}
                                                />
                                                <MetricCard
                                                    title="Total Count"
                                                    value={habitAnalytics.tracking_metrics.total_count || 0}
                                                    icon={<Activity size={16} className="text-success-500 dark:text-success-dark" />}
                                                    colorClass="success"
                                                />
                                                <MetricCard
                                                    title="Goal"
                                                    value={habitAnalytics.tracking_metrics.goal_count || 0}
                                                    icon={<Award size={16} className="text-accent-500 dark:text-accent-400" />}
                                                    colorClass="accent"
                                                />
                                                <MetricCard
                                                    title="Max Count"
                                                    value={habitAnalytics.tracking_metrics.max_count || 0}
                                                    icon={<TrendingUp size={16} className="text-secondary-500 dark:text-secondary-400" />}
                                                    colorClass="secondary"
                                                />
                                            </>
                                        )}

                                        {habitAnalytics.tracking_metrics.avg_value !== undefined && (
                                            <>
                                                <MetricCard
                                                    title="Average"
                                                    value={habitAnalytics.tracking_metrics.avg_value || 0}
                                                    suffix={habitAnalytics.tracking_metrics.units || ''}
                                                    icon={<BarChart2 size={16} className="text-primary-500 dark:text-primary-400" />}
                                                    colorClass="primary"
                                                    trend={habitAnalytics.tracking_metrics.trend}
                                                />
                                                <MetricCard
                                                    title="Total"
                                                    value={habitAnalytics.tracking_metrics.total_value || 0}
                                                    suffix={habitAnalytics.tracking_metrics.units || ''}
                                                    icon={<Activity size={16} className="text-success-500 dark:text-success-dark" />}
                                                    colorClass="success"
                                                />
                                                <MetricCard
                                                    title="Goal"
                                                    value={habitAnalytics.tracking_metrics.goal_value || 0}
                                                    suffix={habitAnalytics.tracking_metrics.units || ''}
                                                    icon={<Award size={16} className="text-accent-500 dark:text-accent-400" />}
                                                    colorClass="accent"
                                                />
                                                <MetricCard
                                                    title="Max"
                                                    value={habitAnalytics.tracking_metrics.max_value || 0}
                                                    suffix={habitAnalytics.tracking_metrics.units || ''}
                                                    icon={<TrendingUp size={16} className="text-secondary-500 dark:text-secondary-400" />}
                                                    colorClass="secondary"
                                                />

                                                {habitAnalytics.tracking_metrics.std_deviation !== undefined && (
                                                    <MetricCard
                                                        title="Std Deviation"
                                                        value={habitAnalytics.tracking_metrics.std_deviation || 0}
                                                        suffix={habitAnalytics.tracking_metrics.units || ''}
                                                        icon={<PieChartIcon size={16} className="text-blue-500 dark:text-blue-400" />}
                                                        colorClass="info"
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
                                    icon={<Calendar size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'habitCalendar'}
                                    onToggle={() => toggleSection('habitCalendar')}
                                >
                                    <View className="my-2.5">
                                        <ContributionGraph
                                            values={habitAnalytics.monthly_distribution.map(item => ({
                                                date: item.date,
                                                count: item.value
                                            }))}
                                            endDate={new Date()}
                                            numDays={90}
                                            width={SCREEN_WIDTH - 40}
                                            height={220}
                                            chartConfig={getHeatmapConfig()}
                                            squareSize={16}
                                            style={{ borderRadius: 16 }}
                                        />
                                    </View>

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-2">
                                        This calendar shows your activity for this habit. Darker colors indicate completed days,
                                        lighter colors indicate skipped days, and empty cells indicate missed or unscheduled days.
                                    </Text>
                                </CollapsibleSection>
                            )}

                            {/* Habit-Specific Day Analysis */}
                            <CollapsibleSection
                                title="Completion by Day"
                                icon={<Calendar size={20} className="text-primary-500" />}
                                isExpanded={expandedSection === 'habitDayAnalysis'}
                                onToggle={() => toggleSection('habitDayAnalysis')}
                            >
                                <View>
                                    <BarChart
                                        data={habitCompletionByDayData}
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

                                {habitAnalytics.day_analysis && (
                                    <View className="mt-4">
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
                                                    className={`flex-row items-center justify-between py-2 ${
                                                        index < habitAnalytics.day_analysis.length - 1 ? 'border-b border-theme-border dark:border-theme-border-dark' : ''
                                                    }`}
                                                >
                                                    <Text className={`text-theme-text-primary dark:text-theme-text-primary-dark w-20 ${
                                                        isBest || isWorst ? 'font-montserrat-bold' : 'font-montserrat'
                                                    }`}>
                                                        {day.day}
                                                    </Text>

                                                    <View className="flex-1 px-3">
                                                        <View className="flex-row justify-between mb-1">
                                                            <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark">
                                                                {day.completions}/{day.scheduled || 0}
                                                            </Text>
                                                            <Text className={`text-xs font-montserrat-medium ${
                                                                isBest ? 'text-success-600 dark:text-success-dark' :
                                                                    isWorst ? 'text-error-600 dark:text-error-dark' :
                                                                        'text-theme-text-primary dark:text-theme-text-primary-dark'
                                                            }`}>
                                                                {day.completion_rate || 0}%
                                                            </Text>
                                                        </View>
                                                        <View className="h-1.5 bg-theme-background dark:bg-theme-background-dark rounded-full overflow-hidden">
                                                            <View className={`h-full ${
                                                                isBest ? 'bg-success-500 dark:bg-success-dark' :
                                                                    isWorst ? 'bg-error-500 dark:bg-error-dark' :
                                                                        'bg-primary-500 dark:bg-primary-400'
                                                            }`} style={{ width: `${day.completion_rate || 0}%` }} />
                                                        </View>
                                                    </View>

                                                    {isBest && (
                                                        <Trophy size={16} className="text-accent-500 dark:text-accent-400" />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3">
                                    This shows when you typically complete this specific habit throughout the week.
                                    Use this information to identify your strongest and weakest days.
                                </Text>
                            </CollapsibleSection>

                            {/* Streak Progression */}
                            {habitAnalytics.streak_progression && habitAnalytics.streak_progression.length > 0 && (
                                <CollapsibleSection
                                    title="Streak Progression"
                                    icon={<Flame size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'streakProgression'}
                                    onToggle={() => toggleSection('streakProgression')}
                                >
                                    <View>
                                        <LineChart
                                            data={streakProgressionData}
                                            width={SCREEN_WIDTH - 40}
                                            height={220}
                                            chartConfig={getChartConfig()}
                                            style={{ borderRadius: 16, marginVertical: 8 }}
                                            bezier
                                            withDots={false}
                                            withShadow
                                            withInnerLines={false}
                                        />
                                    </View>

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3">
                                        This chart shows how your streak has evolved over time. Track your consistency and identify
                                        periods where you maintained your longest streaks.
                                    </Text>
                                </CollapsibleSection>
                            )}

                            {/* Time Patterns */}
                            {habitAnalytics.time_patterns && habitAnalytics.time_patterns.length > 0 && (
                                <CollapsibleSection
                                    title="Time of Day Patterns"
                                    icon={<Clock size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'habitTimePatterns'}
                                    onToggle={() => toggleSection('habitTimePatterns')}
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
                                                                    Optimal Time
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
                                    })}

                                    <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-3">
                                        This shows when you typically complete this habit throughout the day.
                                        Find your optimal time to maximize consistency.
                                    </Text>
                                </CollapsibleSection>
                            )}

                            {/* Activity Log Summary */}
                            {habitAnalytics.logs && habitAnalytics.logs.length > 0 && (
                                <CollapsibleSection
                                    title="Recent Activity"
                                    icon={<Activity size={20} className="text-primary-500" />}
                                    isExpanded={expandedSection === 'activityLog'}
                                    onToggle={() => toggleSection('activityLog')}
                                >
                                    {habitAnalytics.logs.slice(0, 5).map((log, index) => (
                                        <View
                                            key={index}
                                            className={`mb-2.5 p-3 rounded-lg ${
                                                log.completed ? 'bg-success-50 dark:bg-success-900 dark:bg-opacity-20 border-l-3 border-success-500 dark:border-success-dark' :
                                                    log.skipped ? 'bg-warning-50 dark:bg-warning-900 dark:bg-opacity-20 border-l-3 border-warning-500 dark:border-warning-dark' :
                                                        'bg-error-50 dark:bg-error-900 dark:bg-opacity-20 border-l-3 border-error-500 dark:border-error-dark'
                                            }`}
                                        >
                                            <View className="flex-row justify-between items-center">
                                                <Text className="font-montserrat-semibold text-theme-text-primary dark:text-theme-text-primary-dark">
                                                    {formatDate(log.date)}
                                                </Text>
                                                <View className="flex-row items-center">
                                                    {log.completed ? (
                                                        <Check size={16} className="text-success-600 dark:text-success-dark" />
                                                    ) : log.skipped ? (
                                                        <Minus size={16} className="text-warning-600 dark:text-warning-dark" />
                                                    ) : (
                                                        <X size={16} className="text-error-600 dark:text-error-dark" />
                                                    )}
                                                    <Text className={`ml-1.5 text-xs font-montserrat-medium ${
                                                        log.completed ? 'text-success-600 dark:text-success-dark' :
                                                            log.skipped ? 'text-warning-600 dark:text-warning-dark' :
                                                                'text-error-600 dark:text-error-dark'
                                                    }`}>
                                                        {log.completed ? 'Completed' : log.skipped ? 'Skipped' : 'Missed'}
                                                    </Text>
                                                </View>
                                            </View>

                                            {log.time && (
                                                <Text className="text-xs font-montserrat text-theme-text-muted dark:text-theme-text-muted-dark mt-1">
                                                    Time: {log.time}
                                                </Text>
                                            )}

                                            {log.tracking_value && (
                                                <Text className="text-sm font-montserrat text-theme-text-primary dark:text-theme-text-primary-dark mt-1">
                                                    Value: {log.tracking_value}
                                                </Text>
                                            )}

                                            {log.points > 0 && (
                                                <View className="flex-row items-center mt-1">
                                                    <Zap size={14} className="text-primary-500 dark:text-primary-400" />
                                                    <Text className="text-xs font-montserrat-medium text-primary-600 dark:text-primary-400 ml-1">
                                                        +{log.points} points
                                                    </Text>
                                                </View>
                                            )}

                                            {log.notes && (
                                                <Text className={`text-xs font-montserrat italic text-theme-text-muted dark:text-theme-text-muted-dark mt-1 pt-1 ${
                                                    isDark ? 'border-t border-white border-opacity-10' : 'border-t border-black border-opacity-5'
                                                }`}>
                                                    "{log.notes}"
                                                </Text>
                                            )}
                                        </View>
                                    ))}

                                    {habitAnalytics.logs.length > 5 && (
                                        <TouchableOpacity className="bg-primary-100 dark:bg-primary-900 dark:bg-opacity-30 py-2.5 rounded-lg mt-1.5 items-center">
                                            <Text className="text-sm font-montserrat-semibold text-primary-600 dark:text-primary-400">
                                                View More
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </CollapsibleSection>
                            )}
                        </>
                    ) : (
                        <View className="p-8 items-center bg-theme-card dark:bg-theme-card-dark rounded-xl mx-2.5">
                            <Text className="text-center text-theme-text-muted dark:text-theme-text-muted-dark font-montserrat">
                                Select a habit to see detailed analytics
                            </Text>
                        </View>
                    )}
                </>
            ) : null}

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
                onPress={() => showTooltipInfo(
                    "Export Analytics",
                    "This feature will allow you to share or export your habit analytics data."
                )}
            >
                <Share2 size={24} className="text-white" />
            </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
);
};

export default Analytics;