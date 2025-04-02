import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    useColorScheme,
    SafeAreaView,
    Platform,
    StatusBar,
    Image
} from 'react-native';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Flame,
    Award,
    BarChart2,
    Star,
    Edit2,
    Trash2,
    MoreVertical,
    Layers,
    MessageCircle,
    Camera,
    AlertCircle,
    Clock3,
    PieChart
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { format, isSameDay, parseISO, startOfToday, subDays, eachDayOfInterval } from 'date-fns';

// Import services
import {
    getHabitDetails,
    deleteHabit,
    toggleFavorite,
    logHabitCompletion,
    updateCompletionDetails
} from '../../services/habitService';

export default function EnhancedHabitDetailsScreen() {
    // Theme
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Get habit ID from params
    const params = useLocalSearchParams();
    const habitId = params.id ? parseInt(params.id) : null;

    // State
    const [habit, setHabit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [todayChecked, setTodayChecked] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'logs', 'analytics'
    const [completionNote, setCompletionNote] = useState('');
    const [completionDuration, setCompletionDuration] = useState(null);
    const [showLogDetails, setShowLogDetails] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [calendarView, setCalendarView] = useState(false);

    // Fetch habit details
    const fetchHabitDetails = useCallback(async () => {
        if (!habitId) {
            setError('Habit ID is missing');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await getHabitDetails(habitId);

            if (response && response.success && response.data) {
                const habitData = response.data;
                setHabit(habitData);

                // Check if habit is completed today
                if (habitData.todayStatus && habitData.todayStatus.is_completed) {
                    setTodayChecked(true);

                    // Set completion details if available
                    if (habitData.todayStatus.completion_notes) {
                        setCompletionNote(habitData.todayStatus.completion_notes);
                    }

                    if (habitData.todayStatus.duration_completed) {
                        setCompletionDuration(habitData.todayStatus.duration_completed);
                    }
                } else if (habitData.todayStatus && habitData.todayStatus.is_scheduled) {
                    setTodayChecked(false);
                } else {
                    // Check completions if todayStatus is not available
                    if (habitData.recentLogs && Array.isArray(habitData.recentLogs)) {
                        const today = startOfToday();
                        let todayLog = null;

                        for (let i = 0; i < habitData.recentLogs.length; i++) {
                            const log = habitData.recentLogs[i];
                            if (log && log.date && isSameDay(parseISO(log.date), today)) {
                                if (log.completed) {
                                    todayLog = log;
                                    break;
                                }
                            }
                        }

                        if (todayLog) {
                            setTodayChecked(true);
                            if (todayLog.completion_notes) {
                                setCompletionNote(todayLog.completion_notes);
                            }
                            if (todayLog.duration_completed) {
                                setCompletionDuration(todayLog.duration_completed);
                            }
                        } else {
                            setTodayChecked(false);
                        }
                    } else {
                        setTodayChecked(false);
                    }
                }
            } else {
                setError('Failed to fetch habit details');
            }
        } catch (err) {
            console.error('Error fetching habit details:', err);
            setError('An error occurred while loading habit details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [habitId]);

    // Use focus effect to refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchHabitDetails();
        }, [fetchHabitDetails])
    );

    // Handle track habit with additional details
    const handleTrackHabit = async (additionalDetails = {}) => {
        try {
            if (!habitId) {
                Alert.alert('Error', 'Cannot track habit: ID is missing');
                return;
            }

            // Optimistically update UI
            setTodayChecked(!todayChecked);

            const logData = {
                completed: !todayChecked,
                completed_at: new Date().toISOString(),
                ...additionalDetails
            };

            const response = await logHabitCompletion(habitId, logData);

            if (response && response.success && response.data) {
                // Update state with the updated data from response
                setHabit(prevHabit => {
                    if (!prevHabit) return prevHabit;

                    // Create a copy of the habit with updated data
                    const updatedHabit = { ...prevHabit };

                    // Update data from response
                    if (response.data.habit) {
                        if (response.data.habit.streak) {
                            updatedHabit.streak = response.data.habit.streak;
                        }
                        if (response.data.habit.stats) {
                            updatedHabit.stats = response.data.habit.stats;
                        }
                        if (response.data.habit.todayStatus) {
                            updatedHabit.todayStatus = response.data.habit.todayStatus;
                        } else {
                            updatedHabit.todayStatus = {
                                ...updatedHabit.todayStatus,
                                is_completed: !todayChecked,
                                completion_notes: additionalDetails.completion_notes || null,
                                duration_completed: additionalDetails.duration_completed || null
                            };
                        }
                    }

                    // Update logs
                    if (!updatedHabit.recentLogs) {
                        updatedHabit.recentLogs = [];
                    }

                    // If completing, add a new log
                    if (!todayChecked) {
                        const today = new Date().toISOString();
                        const newLog = {
                            log_id: String(Date.now()),
                            habit_id: habitId,
                            user_id: updatedHabit.habit?.user_id || 0,
                            completed: true,
                            date: today,
                            completion_notes: additionalDetails.completion_notes || null,
                            duration_completed: additionalDetails.duration_completed || null,
                            evidence_image: additionalDetails.evidence_image || null
                        };
                        updatedHabit.recentLogs = [newLog, ...updatedHabit.recentLogs];
                    } else {
                        // If uncompleting, remove today's log
                        const today = startOfToday();
                        updatedHabit.recentLogs = updatedHabit.recentLogs.filter(log => {
                            if (!log || !log.date) return true;
                            try {
                                return !isSameDay(parseISO(log.date), today);
                            } catch (e) {
                                return true;
                            }
                        });
                    }

                    return updatedHabit;
                });

                // Update the completion note and duration
                if (!todayChecked) {
                    setCompletionNote(additionalDetails.completion_notes || '');
                    setCompletionDuration(additionalDetails.duration_completed || null);
                } else {
                    setCompletionNote('');
                    setCompletionDuration(null);
                }
            } else {
                // Revert optimistic update if request failed
                setTodayChecked(!todayChecked);
                Alert.alert('Error', 'Failed to track habit');
            }
        } catch (err) {
            // Revert optimistic update if request failed
            setTodayChecked(!todayChecked);
            console.error('Error tracking habit:', err);
            Alert.alert('Error', 'An error occurred while tracking the habit');
        }
    };

    // Update completion details (notes, duration, etc.)
    const updateLogDetails = async (details) => {
        try {
            if (!habitId) {
                Alert.alert('Error', 'Cannot update log: ID is missing');
                return;
            }

            const response = await updateCompletionDetails(habitId, details);

            if (response && response.success) {
                // Update habit in state with the updated details
                setHabit(prevHabit => {
                    if (!prevHabit) return prevHabit;

                    const updatedHabit = { ...prevHabit };

                    // Update todayStatus
                    if (updatedHabit.todayStatus) {
                        updatedHabit.todayStatus = {
                            ...updatedHabit.todayStatus,
                            ...details
                        };
                    }

                    // Update in logs
                    if (updatedHabit.recentLogs && Array.isArray(updatedHabit.recentLogs)) {
                        const today = startOfToday();

                        updatedHabit.recentLogs = updatedHabit.recentLogs.map(log => {
                            if (log && log.date && isSameDay(parseISO(log.date), today)) {
                                return {
                                    ...log,
                                    ...details
                                };
                            }
                            return log;
                        });
                    }

                    return updatedHabit;
                });

                // Update local state
                if (details.completion_notes !== undefined) {
                    setCompletionNote(details.completion_notes);
                }
                if (details.duration_completed !== undefined) {
                    setCompletionDuration(details.duration_completed);
                }

                setShowLogDetails(false);
                Alert.alert('Success', 'Log details updated');
            } else {
                Alert.alert('Error', 'Failed to update log details');
            }
        } catch (err) {
            console.error('Error updating log details:', err);
            Alert.alert('Error', 'An error occurred while updating log details');
        }
    };

    // Show log detail modal
    const showLogDetailsModal = (log) => {
        setSelectedLog(log);
        if (log && log.completion_notes) {
            setCompletionNote(log.completion_notes);
        } else {
            setCompletionNote('');
        }

        if (log && log.duration_completed) {
            setCompletionDuration(log.duration_completed);
        } else {
            setCompletionDuration(null);
        }

        setShowLogDetails(true);
    };

    // Format logs data
    const formatLogs = () => {
        if (!habit || !habit.recentLogs || !Array.isArray(habit.recentLogs)) {
            return [];
        }

        return habit.recentLogs.map(log => {
            return {
                ...log,
                formattedDate: log.date ? format(parseISO(log.date), 'PPP') : 'Unknown',
                formattedTime: log.date ? format(parseISO(log.date), 'p') : ''
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Create calendar data for heat map
    const createCalendarData = () => {
        if (!habit || !habit.recentLogs || !Array.isArray(habit.recentLogs)) {
            return {};
        }

        const end = new Date();
        const start = subDays(end, 90); // Last 90 days

        const dateRange = eachDayOfInterval({ start, end });
        const calendarData = {};

        // Initialize all dates with 0 (not completed)
        dateRange.forEach(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            calendarData[dateStr] = { status: 'not-scheduled', data: null };
        });

        // Mark completed dates
        habit.recentLogs.forEach(log => {
            if (log && log.date) {
                try {
                    const date = parseISO(log.date);
                    const dateStr = format(date, 'yyyy-MM-dd');

                    if (calendarData[dateStr]) {
                        calendarData[dateStr] = {
                            status: log.completed ? 'completed' : (log.skipped ? 'skipped' : 'missed'),
                            data: log
                        };
                    }
                } catch (e) {
                    console.error('Error parsing date:', e);
                }
            }
        });

        return calendarData;
    };

    // Get stats from the habit data
    const getStats = () => {
        if (!habit) return {
            currentStreak: 0,
            longestStreak: 0,
            completionRate: 0,
            totalCompletions: 0,
            avgDuration: 0,
            completedDays: 0,
            missedDays: 0
        };

        // Get streak data
        let currentStreak = 0;
        let longestStreak = 0;

        if (habit.streak && typeof habit.streak === 'object') {
            currentStreak = habit.streak.current_streak || 0;
            longestStreak = habit.streak.longest_streak || 0;
        }

        // Completion stats
        let completionRate = 0;
        let totalCompletions = 0;
        let completedDays = 0;
        let missedDays = 0;

        if (habit.stats && typeof habit.stats === 'object') {
            completionRate = habit.stats.completionRate || 0;
            totalCompletions = habit.stats.completedLogs || 0;
            completedDays = habit.stats.completedLogs || 0;
            missedDays = habit.stats.totalLogs ? (habit.stats.totalLogs - habit.stats.completedLogs) : 0;
        }

        // Calculate average duration if we have logs with duration
        let avgDuration = 0;
        let durationsSum = 0;
        let durationsCount = 0;

        if (habit.recentLogs && Array.isArray(habit.recentLogs)) {
            habit.recentLogs.forEach(log => {
                if (log && log.completed && log.duration_completed) {
                    durationsSum += parseInt(log.duration_completed);
                    durationsCount++;
                }
            });

            if (durationsCount > 0) {
                avgDuration = Math.round(durationsSum / durationsCount);
            }
        }

        return {
            currentStreak,
            longestStreak,
            completionRate,
            totalCompletions,
            avgDuration,
            completedDays,
            missedDays
        };
    };

    // Render log item
    const renderLogItem = (log) => (
        <TouchableOpacity
            key={log.log_id}
            className={`p-4 mb-3 rounded-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}
            onPress={() => showLogDetailsModal(log)}
        >
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                    {log.completed ? (
                        <CheckCircle size={20} color="#22C55E" fill="#22C55E" />
                    ) : log.skipped ? (
                        <AlertCircle size={20} color="#F59E0B" />
                    ) : (
                        <XCircle size={20} color="#EF4444" />
                    )}
                    <Text className={`ml-2 font-montserrat-medium ${
                        isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'
                    }`}>
                        {log.formattedDate}
                    </Text>
                </View>
                <Text className={`${
                    isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                } font-montserrat`}>
                    {log.formattedTime}
                </Text>
            </View>

            {log.completion_notes && (
                <View className="mt-2 flex-row items-center">
                    <MessageCircle size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                    <Text className={`ml-2 ${
                        isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                    } font-montserrat`} numberOfLines={2}>
                        {log.completion_notes}
                    </Text>
                </View>
            )}

            {log.duration_completed && (
                <View className="mt-1 flex-row items-center">
                    <Clock3 size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                    <Text className={`ml-2 ${
                        isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'
                    } font-montserrat`}>
                        {log.duration_completed} minutes
                    </Text>
                </View>
            )}

            {log.evidence_image && (
                <View className="mt-2">
                    <Image
                        source={{ uri: log.evidence_image }}
                        className="w-16 h-16 rounded"
                        resizeMode="cover"
                    />
                </View>
            )}
        </TouchableOpacity>
    );

    // Tabs for different sections
    const renderTabs = () => (
        <View className={`flex-row border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
        } mx-3`}>
            <TouchableOpacity
                className={`px-4 py-3 ${activeTab === 'overview' ? 'border-b-2 border-secondary-600' : ''}`}
                onPress={() => setActiveTab('overview')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'overview'
                        ? 'text-secondary-600'
                        : isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                }`}>
                    Overview
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className={`px-4 py-3 ${activeTab === 'logs' ? 'border-b-2 border-secondary-600' : ''}`}
                onPress={() => setActiveTab('logs')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'logs'
                        ? 'text-secondary-600'
                        : isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                }`}>
                    Logs
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className={`px-4 py-3 ${activeTab === 'analytics' ? 'border-b-2 border-secondary-600' : ''}`}
                onPress={() => setActiveTab('analytics')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'analytics'
                        ? 'text-secondary-600'
                        : isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                }`}>
                    Analytics
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Overview Tab Content
    const renderOverviewTab = () => {
        const stats = getStats();

        return (
            <>
                {/* Stats Section */}
                <View className={`mt-5 p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mx-3 mb-3`}
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                      }}
                >
                    <Text className={`text-lg font-montserrat-bold mb-5 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Stats
                    </Text>

                    <View className="flex-row justify-between px-2">
                        <StatItem
                            icon={<Flame size={28} color="#F59E0B" />}
                            label="Current Streak"
                            value={`${stats.currentStreak} Days`}
                            color="#F59E0B"
                        />

                        <StatItem
                            icon={<Award size={28} color="#22C55E" />}
                            label="Best Streak"
                            value={`${stats.longestStreak} Days`}
                            color="#22C55E"
                        />

                        <StatItem
                            icon={<BarChart2 size={28} color="#7C3AED" />}
                            label="Completion"
                            value={`${stats.completionRate}%`}
                            color="#7C3AED"
                        />
                    </View>

                    <View className="mt-5 pt-4 border-t border-theme-border dark:border-theme-border-dark">
                        <Text className={`text-base ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                            Total Completions: <Text className="font-montserrat-semibold">{stats.totalCompletions}</Text>
                        </Text>

                        {stats.avgDuration > 0 && (
                            <Text className={`text-base mt-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                Average Duration: <Text className="font-montserrat-semibold">{stats.avgDuration} minutes</Text>
                            </Text>
                        )}
                    </View>
                </View>

                {/* Recent Activity */}
                <View className={`mt-2 p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mx-3 mb-3`}
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                      }}
                >
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Recent Activity
                        </Text>

                        <TouchableOpacity onPress={() => setActiveTab('logs')}>
                            <Text className="text-secondary-600 font-montserrat-medium">View All</Text>
                        </TouchableOpacity>
                    </View>

                    {habit && habit.recentLogs && habit.recentLogs.length > 0 ? (
                        formatLogs().slice(0, 3).map(renderLogItem)
                    ) : (
                        <Text className={`${isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'} font-montserrat italic`}>
                            No activity recorded yet
                        </Text>
                    )}
                </View>
            </>
        );
    };

    // Logs Tab Content
    const renderLogsTab = () => {
        const formattedLogs = formatLogs();

        return (
            <View className="mt-4 mx-3">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Habit Logs
                    </Text>

                    <TouchableOpacity
                        className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                        onPress={() => setCalendarView(!calendarView)}
                    >
                        <Text className={`font-montserrat-medium ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'}`}>
                            {calendarView ? 'List View' : 'Calendar View'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {calendarView ? (
                    <View className={`p-4 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl`}>
                        <Text className={`text-center mb-4 font-montserrat-medium ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Calendar view would display here
                        </Text>
                        <Text className={`text-center ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                            (Implement a calendar heatmap component)
                        </Text>
                    </View>
                ) : (
                    <>
                        {formattedLogs.length > 0 ? (
                            formattedLogs.map(renderLogItem)
                        ) : (
                            <View className={`p-8 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl items-center justify-center`}>
                                <Text className={`${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat text-center`}>
                                    No logs found for this habit
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>
        );
    };

    // Analytics Tab Content
    const renderAnalyticsTab = () => {
        const stats = getStats();

        return (
            <View className="mt-4 mx-3">
                <View className={`p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mb-4`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Completion Summary
                    </Text>

                    <View className="flex-row justify-around mb-4">
                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                {stats.completedDays}
                            </Text>
                            <Text className={`${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                Completed
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                {stats.missedDays}
                            </Text>
                            <Text className={`${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                Missed
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                {stats.completionRate}%
                            </Text>
                            <Text className={`${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                Success Rate
                            </Text>
                        </View>
                    </View>

                    <View className={`h-6 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <View
                            className="h-full bg-success-600"
                            style={{ width: `${stats.completionRate}%` }}
                        />
                    </View>
                </View>

                <View className={`p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mb-4`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Trends
                    </Text>

                    <View className="p-2">
                        <Text className={`text-center ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                            (Visualization chart would go here)
                        </Text>
                    </View>

                    <View className="mt-4">
                        <Text className={`font-montserrat-medium mb-2 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Insights:
                        </Text>
                        <View className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <Text className={`${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                {stats.currentStreak > 0
                                    ? `You're on a ${stats.currentStreak} day streak! Keep it up.`
                                    : "Start your streak today!"}
                            </Text>
                            {stats.completionRate > 0 && (
                                <Text className={`mt-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                    {stats.completionRate >= 80
                                        ? `Great job maintaining a ${stats.completionRate}% completion rate!`
                                        : stats.completionRate >= 50
                                            ? `You're doing well with a ${stats.completionRate}% completion rate. Can you reach 80%?`
                                            : `Try to improve your ${stats.completionRate}% completion rate by being more consistent.`}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                <View className={`p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mb-8`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Streak History
                    </Text>

                    <View className="p-2">
                        <Text className={`text-center ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                            (Streak history chart would go here)
                        </Text>
                    </View>

                    <View className="mt-4 flex-row justify-between">
                        <View>
                            <Text className={`font-montserrat-medium ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                Longest Streak
                            </Text>
                            <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                {stats.longestStreak} days
                            </Text>
                        </View>

                        <View>
                            <Text className={`font-montserrat-medium ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                Current Streak
                            </Text>
                            <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                {stats.currentStreak} days
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // Log Details Modal
    const renderLogDetailsModal = () => {
        if (!showLogDetails) return null;

        return (
            <View className="absolute inset-0 bg-black/60 justify-center items-center z-20">
                <View className={`w-11/12 rounded-xl ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} p-5`}>
                    <Text className={`text-xl font-montserrat-bold mb-4 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                        Log Details
                    </Text>

                    <View className="mb-4">
                        <Text className={`font-montserrat-medium mb-1 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'}`}>
                            Notes:
                        </Text>
                        <TextInput
                            value={completionNote}
                            onChangeText={setCompletionNote}
                            multiline
                            numberOfLines={3}
                            className={`p-3 rounded-md border ${
                                isDarkMode
                                    ? 'bg-gray-800 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                            } font-montserrat`}
                            placeholder="Add notes about your habit completion..."
                            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className={`font-montserrat-medium mb-1 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'}`}>
                            Duration (minutes):
                        </Text>
                        <TextInput
                            value={completionDuration ? String(completionDuration) : ''}
                            onChangeText={(text) => setCompletionDuration(text ? parseInt(text) : null)}
                            keyboardType="number-pad"
                            className={`p-3 rounded-md border ${
                                isDarkMode
                                    ? 'bg-gray-800 border-gray-700 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                            } font-montserrat`}
                            placeholder="Duration in minutes..."
                            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                    </View>

                    <View className="flex-row mt-2">
                        <TouchableOpacity
                            className="flex-1 mr-2 p-3 rounded-lg bg-gray-500"
                            onPress={() => setShowLogDetails(false)}
                        >
                            <Text className="text-white font-montserrat-medium text-center">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 ml-2 p-3 rounded-lg bg-secondary-600"
                            onPress={() => updateLogDetails({
                                completion_notes: completionNote,
                                duration_completed: completionDuration
                            })}
                        >
                            <Text className="text-white font-montserrat-medium text-center">Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    // Stats item component
    const StatItem = ({ icon, label, value, color = isDarkMode ? "#E2E8F0" : "#374151" }) => (
        <View className="items-center">
            <View
                className={`w-16 h-16 rounded-full items-center justify-center mb-2`}
                style={{
                    backgroundColor: `${color}20`,
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 3,
                    elevation: 2,
                }}
            >
                {icon}
            </View>
            <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>{value}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'} mt-1 font-montserrat`}>{label}</Text>
        </View>
    );

    // Enhanced habit completion button with options
    const renderEnhancedCompletionButton = () => (
        <View className={`mt-5 p-5 ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'} rounded-xl mx-3`}
              style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
              }}
        >
            <Text className={`text-lg font-montserrat-bold mb-3 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                Track Today
            </Text>

            <TouchableOpacity
                className={`p-4 rounded-xl border flex-row justify-between items-center ${
                    todayChecked
                        ? isDarkMode ? 'bg-success-600/20 border-success-dark' : 'bg-success-100 border-success-300'
                        : isDarkMode ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-100 border-gray-200'
                }`}
                onPress={() => todayChecked ? handleTrackHabit() : setShowLogDetails(true)}
                style={{
                    shadowColor: todayChecked ? "#22C55E" : "#9CA3AF",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 1,
                }}
            >
                <View className="flex-row items-center">
                    {todayChecked ? (
                        <CheckCircle size={26} color={isDarkMode ? "#4ADE80" : "#22C55E"} fill={isDarkMode ? "#4ADE80" : "#22C55E"} />
                    ) : (
                        <XCircle size={26} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                    )}
                    <Text className={`ml-3 text-base font-montserrat-medium ${
                        todayChecked
                            ? isDarkMode ? 'text-success-dark' : 'text-success-600'
                            : isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'
                    }`}>
                        {todayChecked ? 'Completed Today' : 'Mark as Completed'}
                    </Text>
                </View>

                <Text className={`${isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'} font-montserrat`}>
                    {format(new Date(), 'PPP')}
                </Text>
            </TouchableOpacity>

            {todayChecked && (
                <View className="mt-3">
                    {completionNote && (
                        <View className="mt-2 flex-row items-start">
                            <MessageCircle size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} style={{ marginTop: 2 }} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat flex-1`}>
                                {completionNote}
                            </Text>
                        </View>
                    )}

                    {completionDuration && (
                        <View className="mt-2 flex-row items-center">
                            <Clock3 size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                                {completionDuration} minutes
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        className="mt-3 self-end"
                        onPress={() => showLogDetailsModal({
                            log_id: 'today',
                            completed: true,
                            completion_notes: completionNote,
                            duration_completed: completionDuration
                        })}
                    >
                        <Text className="text-secondary-600 font-montserrat-medium">Edit Details</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Loading component
    if (loading) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-theme-background-dark' : 'bg-theme-background'}`}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text className={`mt-4 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-secondary'} font-montserrat`}>Loading habit details...</Text>
            </SafeAreaView>
        );
    }

    // Error component
    if (error || !habit) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center px-4 ${isDarkMode ? 'bg-theme-background-dark' : 'bg-theme-background'}`}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
                <Text className={`text-lg font-montserrat-bold mb-2 text-center ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                    {error || 'Habit not found'}
                </Text>
                <Text className={`text-center mb-6 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                    We couldn't load this habit's details. Please try again.
                </Text>
                <TouchableOpacity
                    className="bg-secondary-600 px-6 py-3 rounded-button"
                    onPress={fetchHabitDetails}
                >
                    <Text className="text-white font-montserrat-bold">Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-4"
                    onPress={() => router.back()}
                >
                    <Text className={`text-secondary-600 font-montserrat-medium`}>Back to Habits</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Destructure habit details for easier access
    const { name, description, start_date } = habit.habit || {};
    const domain_name = habit?.domain?.name;
    const domain_color = habit?.domain?.color || '#7C3AED';
    const difficultyStyle = getDifficultyColor();

    return (
        <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-theme-background-dark' : 'bg-theme-background'}`}
                      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className={`px-4 py-4 flex-row items-center justify-between ${
                isDarkMode ? 'bg-theme-card-dark' : 'bg-white'
            }`}
                  style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 3,
                  }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2"
                    style={{ borderRadius: 8 }}
                >
                    <ArrowLeft size={24} color={isDarkMode ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>

                <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                    Habit Details
                </Text>

                <TouchableOpacity
                    onPress={() => setIsMenuVisible(!isMenuVisible)}
                    className="p-2"
                    style={{ borderRadius: 8 }}
                >
                    <MoreVertical size={24} color={isDarkMode ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>
            </View>

            {/* Options Menu */}
            <HabitOptionsMenu />

            {/* Log Details Modal */}
            {renderLogDetailsModal()}

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Habit Header Section */}
                <View className={`p-5 mt-3 mx-3 rounded-xl ${isDarkMode ? 'bg-theme-card-dark' : 'bg-white'}`}
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                      }}
                >
                    <View className="flex-row items-center mb-3">
                        {/* Domain Indicator */}
                        {domain_name && (
                            <View
                                className="mr-3 p-2 rounded-full"
                                style={{
                                    backgroundColor: domain_color ? `${domain_color}20` : 'rgba(124, 58, 237, 0.1)'
                                }}
                            >
                                <Layers size={20} color={domain_color || '#7C3AED'} />
                            </View>
                        )}

                        {/* Habit Name */}
                        <Text className={`text-2xl font-montserrat-bold flex-1 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            {habit?.habit?.name || 'Unnamed Habit'}
                        </Text>

                        {/* Favorite Icon */}
                        {habit?.habit?.is_favorite && (
                            <Star size={22} color="#F59E0B" fill="#F59E0B" />
                        )}
                    </View>

                    {/* Description */}
                    {habit?.habit?.description && (
                        <Text className={`mt-1 mb-4 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat`}>
                            {habit.habit.description}
                        </Text>
                    )}

                    {/* Frequency & Difficulty */}
                    <View className={`flex-row justify-between items-center mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded-lg`}>
                        <View className="flex-row items-center">
                            <Calendar size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'} font-montserrat-medium`}>
                                {getFormattedFrequency()}
                            </Text>
                        </View>

                        <View
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: difficultyStyle.bg }}
                        >
                            <Text className="text-xs font-montserrat-bold" style={{ color: difficultyStyle.color }}>
                                {habit?.habit?.difficulty?.replace('_', ' ') || 'Medium'}
                            </Text>
                        </View>
                    </View>

                    {/* Start Date */}
                    <View className="flex-row items-center mt-3">
                        <Clock size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                        <Text className={`ml-2 ${isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'} font-montserrat`}>
                            Started {formatDate(habit?.habit?.start_date)}
                        </Text>
                    </View>
                </View>

                {/* Track Today Section - Enhanced version */}
                {renderEnhancedCompletionButton()}

                {/* Tabs */}
                {renderTabs()}

                {/* Tab Content */}
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'logs' && renderLogsTab()}
                {activeTab === 'analytics' && renderAnalyticsTab()}
            </ScrollView>
        </SafeAreaView>
    );
}