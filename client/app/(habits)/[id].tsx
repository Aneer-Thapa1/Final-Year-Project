import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Image,
    TextInput,
    Animated,
    Dimensions
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
    PieChart,
    ChevronRight,
    Info
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import {
    format,
    isSameDay,
    parseISO,
    startOfToday,
    subDays,
    eachDayOfInterval,
    getDay,
    getMonth,
    getYear,
    startOfWeek,
    addDays
} from 'date-fns';

// Import services
import {
    getHabitDetails,
    deleteHabit,
    toggleFavorite,
    logHabitCompletion,
    updateCompletionDetails
} from '../../services/habitService';

// Get screen width for responsive sizing
const screenWidth = Dimensions.get('window').width;

export default function EnhancedHabitDetailsScreen() {
    // Theme
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Animation values
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Get habit ID from params
    const params = useLocalSearchParams();
    const habitId = params.id ? parseInt(params.id) : null;

    // State
    const [habit, setHabit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [todayChecked, setTodayChecked] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'logs', 'analytics'
    const [completionNote, setCompletionNote] = useState('');
    const [completionDuration, setCompletionDuration] = useState(null);
    const [showLogDetails, setShowLogDetails] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [calendarView, setCalendarView] = useState(false);
    const [heatmapData, setHeatmapData] = useState({});
    const [heatmapWeeks, setHeatmapWeeks] = useState([]);
    const [monthLabels, setMonthLabels] = useState([]);

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
                } else {
                    setTodayChecked(false);
                }

                // Prepare heatmap data from logs
                if (habitData.recentLogs && Array.isArray(habitData.recentLogs)) {
                    const heatmapData = prepareHeatmapData(habitData.recentLogs);
                    setHeatmapData(heatmapData);

                    // Generate calendar weeks for heatmap
                    const weeks = getCalendarWeeks(heatmapData);
                    setHeatmapWeeks(weeks);

                    // Generate month labels
                    const months = getMonthLabels(weeks);
                    setMonthLabels(months);
                }

                // Animate progress bar
                const completionRate = habitData.stats?.completionRate || 0;
                Animated.timing(progressAnim, {
                    toValue: completionRate / 100,
                    duration: 800,
                    useNativeDriver: false
                }).start();

                // Fade in animation
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true
                }).start();
            } else {
                setError('Failed to fetch habit details');
            }
        } catch (err) {
            console.error('Error fetching habit details:', err);
            setError('An error occurred while loading habit details');
        } finally {
            setLoading(false);
        }
    }, [habitId]);

    // Use focus effect to refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchHabitDetails();
        }, [fetchHabitDetails])
    );

    // Prepare heatmap data from logs
    const prepareHeatmapData = (logs) => {
        const data = {};

        // Initialize last 120 days with 0 values (no activity)
        const today = new Date();
        for (let i = 0; i < 120; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            data[dateStr] = {
                date: dateStr,
                count: 0,
                level: 0,
            };
        }

        // Fill with actual log data
        if (logs && logs.length > 0) {
            logs.forEach(log => {
                if (log.completed_at) {
                    const dateStr = parseISO(log.completed_at).toISOString().split('T')[0];

                    // Only count if within our date range
                    if (data[dateStr]) {
                        // Increment count
                        data[dateStr].count += 1;

                        // Set level based on count (normalize to 0-4)
                        // For simple completion tracking, we'll set to level 3 if completed
                        data[dateStr].level = log.completed ? 3 : 0;
                    }
                }
            });
        }

        return data;
    };

    // Generate calendar weeks for heatmap
    const getCalendarWeeks = (data) => {
        const weeks = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 119); // Start 120 days ago

        // Get day of week of start date (0 = Sunday, 6 = Saturday)
        const startDateDayOfWeek = startDate.getDay();

        // Adjust to first day of week (Monday in this case)
        const firstDay = startOfWeek(startDate, { weekStartsOn: 1 });

        // Generate weeks
        let currentDate = new Date(firstDay);

        while (currentDate <= today) {
            const week = [];

            // Generate days for the week
            for (let i = 0; i < 7; i++) {
                const date = new Date(currentDate);
                const dateStr = date.toISOString().split('T')[0];

                week.push({
                    date: dateStr,
                    count: data[dateStr]?.count || 0,
                    level: data[dateStr]?.level || 0,
                    day: i, // 0 = Monday, 6 = Sunday
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            weeks.push(week);
        }

        return weeks;
    };

    // Generate month labels for the heatmap
    const getMonthLabels = (weeks) => {
        const months = [];
        const seenMonths = new Set();

        // Iterate through all weeks
        weeks.forEach(week => {
            // Check the first day of the week
            const date = new Date(week[0].date);
            const monthKey = `${getYear(date)}-${getMonth(date)}`;

            // If we haven't seen this month yet, add it
            if (!seenMonths.has(monthKey)) {
                seenMonths.add(monthKey);
                months.push({
                    month: getMonth(date),
                    year: getYear(date),
                    position: weeks.indexOf(week), // Position in weeks array
                    label: format(date, 'MMM'), // Short month name
                });
            }
        });

        return months;
    };

    // Handle deletion of habit
    const handleDeleteHabit = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to delete this habit? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await deleteHabit(habitId);

                            if (response && response.success) {
                                router.replace('/habits');
                            } else {
                                Alert.alert('Error', 'Failed to delete habit');
                            }
                        } catch (error) {
                            console.error('Error deleting habit:', error);
                            Alert.alert('Error', 'An error occurred while deleting the habit');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Toggle favorite status
    const handleToggleFavorite = async () => {
        try {
            const response = await toggleFavorite(habitId);

            if (response && response.success) {
                // Update local state
                setHabit(prevHabit => {
                    if (!prevHabit) return prevHabit;

                    return {
                        ...prevHabit,
                        habit: {
                            ...prevHabit.habit,
                            is_favorite: !prevHabit.habit.is_favorite
                        }
                    };
                });
            } else {
                Alert.alert('Error', 'Failed to update favorite status');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            Alert.alert('Error', 'An error occurred while updating favorite status');
        }
    };

    // Navigate to edit habit screen
    const navigateToEditHabit = () => {
        if (!habitId) return;

        setIsMenuVisible(false);
        router.push({
            pathname: '/(habits)/editHabit',
            params: { id: habitId }
        });
    };

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

            if (response && response.success) {
                // Update state with the updated data
                setHabit(prevHabit => {
                    if (!prevHabit) return prevHabit;

                    const updatedHabit = {
                        ...prevHabit,
                        todayStatus: {
                            ...prevHabit.todayStatus,
                            is_completed: !todayChecked,
                            completion_notes: additionalDetails.completion_notes || null,
                            duration_completed: additionalDetails.duration_completed || null
                        },
                        streak: response.data?.streak || prevHabit.streak,
                        stats: response.data?.stats || prevHabit.stats
                    };

                    // Add the new log to recentLogs if completing
                    if (!todayChecked) {
                        const newLog = {
                            log_id: Date.now().toString(),
                            habit_id: habitId,
                            completed: true,
                            completed_at: new Date().toISOString(),
                            completion_notes: additionalDetails.completion_notes || null,
                            duration_completed: additionalDetails.duration_completed || null,
                        };

                        updatedHabit.recentLogs = [
                            newLog,
                            ...(updatedHabit.recentLogs || [])
                        ];

                        // Update heatmap
                        const today = new Date().toISOString().split('T')[0];
                        const updatedHeatmapData = { ...heatmapData };
                        if (updatedHeatmapData[today]) {
                            updatedHeatmapData[today].count += 1;
                            updatedHeatmapData[today].level = 3; // Completed
                        } else {
                            updatedHeatmapData[today] = {
                                date: today,
                                count: 1,
                                level: 3
                            };
                        }
                        setHeatmapData(updatedHeatmapData);

                        // Regenerate heatmap weeks
                        const weeks = getCalendarWeeks(updatedHeatmapData);
                        setHeatmapWeeks(weeks);
                    } else {
                        // Remove today's log if uncompleting
                        const today = new Date();
                        updatedHabit.recentLogs = (updatedHabit.recentLogs || []).filter(log => {
                            if (!log.completed_at) return true;
                            return !isSameDay(parseISO(log.completed_at), today);
                        });

                        // Update heatmap
                        const todayStr = today.toISOString().split('T')[0];
                        const updatedHeatmapData = { ...heatmapData };
                        if (updatedHeatmapData[todayStr]) {
                            updatedHeatmapData[todayStr].count = 0;
                            updatedHeatmapData[todayStr].level = 0; // Not completed
                        }
                        setHeatmapData(updatedHeatmapData);

                        // Regenerate heatmap weeks
                        const weeks = getCalendarWeeks(updatedHeatmapData);
                        setHeatmapWeeks(weeks);
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

                // Re-animate progress bar with updated completion rate
                if (response.data?.stats?.completionRate) {
                    Animated.timing(progressAnim, {
                        toValue: response.data.stats.completionRate / 100,
                        duration: 800,
                        useNativeDriver: false
                    }).start();
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

                    // Update todayStatus with new details
                    return {
                        ...prevHabit,
                        todayStatus: {
                            ...prevHabit.todayStatus,
                            ...details
                        }
                    };
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

    // Format logs data
    const formatLogs = () => {
        if (!habit || !habit.recentLogs || !Array.isArray(habit.recentLogs)) {
            return [];
        }

        return habit.recentLogs.map(log => {
            return {
                ...log,
                formattedDate: log.completed_at ? format(parseISO(log.completed_at), 'PPP') : 'Unknown',
                formattedTime: log.completed_at ? format(parseISO(log.completed_at), 'p') : ''
            };
        }).sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
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

        // Extract streak data
        const streak = habit.habit.streak[0] || {};
        const stats = habit.stats || {};


        // Calculate completed and missed days
        const completedDays = stats.completedLogs || 0;
        const totalLogs = stats.totalLogs || 0;
        const missedDays = totalLogs - completedDays;

        return {
            currentStreak: streak.current_streak || 0,
            longestStreak: streak.longest_streak || 0,
            completionRate: stats.completionRate || 0,
            totalCompletions: stats.completedLogs || 0,
            avgDuration: 15, // Placeholder, calculate from logs if available
            completedDays,
            missedDays
        };
    };

    // Get formatted frequency text
    const getFormattedFrequency = () => {
        if (!habit || !habit.habit) return 'Daily';

        const { frequency_type, frequency_value, frequency_interval, specific_days } = habit.habit;

        switch (frequency_type) {
            case 'DAILY':
                return 'Every day';
            case 'WEEKDAYS':
                return 'Monday to Friday';
            case 'WEEKENDS':
                return 'Weekends only';
            case 'SPECIFIC_DAYS':
                if (specific_days && Array.isArray(specific_days)) {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const days = specific_days.map(day => dayNames[day]).join(', ');
                    return `${days}`;
                }
                return 'Specific days';
            case 'INTERVAL':
                return `Every ${frequency_interval} days`;
            case 'X_TIMES_WEEK':
                return `${frequency_value} times per week`;
            case 'X_TIMES_MONTH':
                return `${frequency_value} times per month`;
            default:
                return frequency_type.replace('_', ' ').toLowerCase();
        }
    };

    // Get difficulty color styling
    const getDifficultyColor = () => {
        if (!habit || !habit.habit || !habit.habit.difficulty) {
            return { bg: isDarkMode ? '#2D2D2D' : '#F3F4F6', color: isDarkMode ? '#D1D5DB' : '#6B7280' };
        }

        const difficulty = habit.habit.difficulty;

        switch (difficulty) {
            case 'VERY_EASY':
                return { bg: isDarkMode ? '#064E3B20' : '#D1FAE5', color: '#059669' };
            case 'EASY':
                return { bg: isDarkMode ? '#065F4620' : '#DBEAFE', color: '#3B82F6' };
            case 'MEDIUM':
                return { bg: isDarkMode ? '#92400E20' : '#FEF3C7', color: '#F59E0B' };
            case 'HARD':
                return { bg: isDarkMode ? '#7C2D1220' : '#FEE2E2', color: '#EF4444' };
            case 'VERY_HARD':
                return { bg: isDarkMode ? '#4C1D9520' : '#EDE9FE', color: '#8B5CF6' };
            default:
                return { bg: isDarkMode ? '#2D2D2D' : '#F3F4F6', color: isDarkMode ? '#D1D5DB' : '#6B7280' };
        }
    };

// Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'MMM d, yyyy');
        } catch (e) {
            return 'Invalid date';
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

    // Get heatmap colors based on theme
    const getHeatmapColors = () => {
        return isDarkMode
            ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'] // Dark theme
            : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']; // Light theme
    };

    // Options menu component
    const HabitOptionsMenu = () => {
        if (!isMenuVisible) return null;

        return (
            <View className={`absolute right-4 top-16 z-50 rounded-xl shadow-lg py-2 ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
                  style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 5,
                      width: 180
                  }}>
                <TouchableOpacity
                    onPress={navigateToEditHabit}
                    className="flex-row items-center px-4 py-3"
                >
                    <Edit2 size={18} color={isDarkMode ? "#D1D5DB" : "#4B5563"} />
                    <Text className={`ml-3 font-montserrat-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>Edit Habit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setIsMenuVisible(false);
                        handleToggleFavorite();
                    }}
                    className="flex-row items-center px-4 py-3"
                >
                    <Star
                        size={18}
                        color="#F59E0B"
                        fill={habit?.habit?.is_favorite ? "#F59E0B" : "transparent"}
                    />
                    <Text className={`ml-3 font-montserrat-medium ${
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                        {habit?.habit?.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        setIsMenuVisible(false);
                        handleDeleteHabit();
                    }}
                    className="flex-row items-center px-4 py-3"
                >
                    <Trash2 size={18} color="#EF4444" />
                    <Text className="ml-3 font-montserrat-medium text-red-500">Delete Habit</Text>
                </TouchableOpacity>
            </View>
        );
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
                        isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                        {log.formattedDate}
                    </Text>
                </View>
                <Text className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                } font-montserrat`}>
                    {log.formattedTime}
                </Text>
            </View>

            {log.completion_notes && (
                <View className="mt-2 flex-row items-center">
                    <MessageCircle size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                    <Text className={`ml-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    } font-montserrat`} numberOfLines={2}>
                        {log.completion_notes}
                    </Text>
                </View>
            )}

            {log.duration_completed && (
                <View className="mt-1 flex-row items-center">
                    <Clock3 size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                    <Text className={`ml-2 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
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
                className={`px-4 py-3 ${activeTab === 'overview' ? 'border-b-2 border-purple-600' : ''}`}
                onPress={() => setActiveTab('overview')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'overview'
                        ? 'text-purple-600'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                    Overview
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className={`px-4 py-3 ${activeTab === 'logs' ? 'border-b-2 border-purple-600' : ''}`}
                onPress={() => setActiveTab('logs')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'logs'
                        ? 'text-purple-600'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                    Logs
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                className={`px-4 py-3 ${activeTab === 'analytics' ? 'border-b-2 border-purple-600' : ''}`}
                onPress={() => setActiveTab('analytics')}
            >
                <Text className={`font-montserrat-medium ${
                    activeTab === 'analytics'
                        ? 'text-purple-600'
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
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
            <Animated.View style={{ opacity: fadeAnim }}>
                {/* Stats Section */}
                <View className={`mt-5 p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mx-3 mb-3`}
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                      }}
                >
                    <Text className={`text-lg font-montserrat-bold mb-5 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Stats
                    </Text>

                    <View className="flex-row justify-between px-2">
                        <StatItem
                            icon={<Flame size={28} color="#F59E0B" />}
                            label="Current Streak"
                            value={`${stats.currentStreak} Days`}
                            color="#F59E0B"
                            isDarkMode={isDarkMode}
                        />

                        <StatItem
                            icon={<Award size={28} color="#22C55E" />}
                            label="Best Streak"
                            value={`${stats.longestStreak} Days`}
                            color="#22C55E"
                            isDarkMode={isDarkMode}
                        />

                        <StatItem
                            icon={<BarChart2 size={28} color="#7C3AED" />}
                            label="Completion"
                            value={`${stats.completionRate}%`}
                            color="#7C3AED"
                            isDarkMode={isDarkMode}
                        />
                    </View>

                    <View className={`mt-5 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <Text className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                            Total Completions: <Text className="font-montserrat-semibold">{stats.totalCompletions}</Text>
                        </Text>

                        {stats.avgDuration > 0 && (
                            <Text className={`text-base mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                                Average Duration: <Text className="font-montserrat-semibold">{stats.avgDuration} minutes</Text>
                            </Text>
                        )}
                    </View>
                </View>

                {/* Recent Activity */}
                <View className={`mt-2 p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mx-3 mb-3`}
                      style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                      }}
                >
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            Recent Activity
                        </Text>

                        <TouchableOpacity onPress={() => setActiveTab('logs')}>
                            <Text className="text-purple-600 font-montserrat-medium">View All</Text>
                        </TouchableOpacity>
                    </View>

                    {habit && habit.recentLogs && habit.recentLogs.length > 0 ? (
                        formatLogs().slice(0, 3).map(renderLogItem)
                    ) : (
                        <Text className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'} font-montserrat italic`}>
                            No activity recorded yet
                        </Text>
                    )}
                </View>
            </Animated.View>
        );
    };

    // GitHub-style Contribution Heatmap Component
    const renderHeatmap = () => {
        const cellSize = 12;
        const cellMargin = 1;
        const totalCellSize = cellSize + (cellMargin * 2);
        const heatmapColors = getHeatmapColors();

        // Day labels for the left side
        const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

        return (
            <View className={`p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mx-3 mb-4`}>
                <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    Activity Heatmap
                </Text>

                <View className="mb-6">
                    <View style={{ marginLeft: 30, marginBottom: 5 }}>
                        {/* Month Labels */}
                        {monthLabels.map((month, index) => (
                            <Text
                                key={index}
                                style={{
                                    position: 'absolute',
                                    left: month.position * totalCellSize,
                                    color: isDarkMode ? '#D1D5DB' : '#6B7280',
                                    fontSize: 12,
                                    fontFamily: 'Montserrat',
                                    textAlign: 'center',
                                }}
                            >
                                {month.label}
                            </Text>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', marginTop: 15 }}>
                        {/* Day Labels */}
                        <View style={{ width: 30, marginRight: 5 }}>
                            {dayLabels.map((day, index) => (
                                <Text
                                    key={index}
                                    style={{
                                        height: totalCellSize,
                                        fontSize: 10,
                                        color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                                        fontFamily: 'Montserrat',
                                        textAlign: 'right',
                                        paddingRight: 5,
                                        marginTop: index === 0 ? 0 : cellMargin,
                                    }}
                                >
                                    {day}
                                </Text>
                            ))}
                        </View>

                        {/* Heatmap Grid */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row' }}>
                                {heatmapWeeks.map((week, weekIndex) => (
                                    <View key={weekIndex} style={{ width: totalCellSize }}>
                                        {week.map((day, dayIndex) => (
                                            <View
                                                key={dayIndex}
                                                style={{
                                                    width: cellSize,
                                                    height: cellSize,
                                                    margin: cellMargin,
                                                    borderRadius: 2,
                                                    backgroundColor: heatmapColors[day.level] || heatmapColors[0],
                                                }}
                                            />
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Legend */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15, alignItems: 'center' }}>
                        <Text style={{
                            marginRight: 5,
                            fontSize: 12,
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            fontFamily: 'Montserrat'
                        }}>
                            Less
                        </Text>
                        {[0, 1, 2, 3, 4].map(level => (
                            <View
                                key={level}
                                style={{
                                    width: 10,
                                    height: 10,
                                    marginHorizontal: 1,
                                    borderRadius: 1,
                                    backgroundColor: heatmapColors[level],
                                }}
                            />
                        ))}
                        <Text style={{
                            marginLeft: 5,
                            fontSize: 12,
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            fontFamily: 'Montserrat'
                        }}>
                            More
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    className="flex-row items-center"
                    onPress={() => setCalendarView(true)}
                >
                    <Info size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                    <Text className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-montserrat text-sm`}>
                        Each cell represents a day. Darker colors indicate days when this habit was completed.
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Logs Tab Content
    const renderLogsTab = () => {
        const formattedLogs = formatLogs();

        return (
            <View className="mt-4 mx-3">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Habit Logs
                    </Text>

                    <TouchableOpacity
                        className={`px-3 py-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                        onPress={() => setCalendarView(!calendarView)}
                    >
                        <Text className={`font-montserrat-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {calendarView ? 'List View' : 'Calendar View'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {calendarView ? (
                    <View className="mb-5">
                        {renderHeatmap()}
                    </View>
                ) : (
                    <>
                        {formattedLogs.length > 0 ? (
                            formattedLogs.map(renderLogItem)
                        ) : (
                            <View className={`p-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl items-center justify-center`}>
                                <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-montserrat text-center`}>
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
                {/* Heatmap at the top of analytics */}
                {renderHeatmap()}

                <View className={`p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mb-4`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Completion Summary
                    </Text>

                    <View className="flex-row justify-around mb-4">
                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                {stats.completedDays}
                            </Text>
                            <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-montserrat`}>
                                Completed
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                {stats.missedDays}
                            </Text>
                            <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-montserrat`}>
                                Missed
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-2xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                {stats.completionRate}%
                            </Text>
                            <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-montserrat`}>
                                Success Rate
                            </Text>
                        </View>
                    </View>

                    <View className={`h-6 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <Animated.View
                            className="h-full bg-green-600"
                            style={{ width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                }) }}
                        />
                    </View>
                </View>

                <View className={`p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mb-4`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Streak History
                    </Text>

                    <View className="mt-4 flex-row justify-between">
                        <View>
                            <Text className={`font-montserrat-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Longest Streak
                            </Text>
                            <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                {stats.longestStreak} days
                            </Text>
                        </View>

                        <View>
                            <Text className={`font-montserrat-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Current Streak
                            </Text>
                            <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                                {stats.currentStreak} days
                            </Text>
                        </View>
                    </View>
                </View>

                <View className={`p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mb-8`}>
                    <Text className={`text-lg font-montserrat-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Insights
                    </Text>

                    <View className={`p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <Text className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                            {stats.currentStreak > 0
                                ? `You're on a ${stats.currentStreak} day streak! Keep it up.`
                                : "Start your streak today!"}
                        </Text>
                        {stats.completionRate > 0 && (
                            <Text className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
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
        );
    };

    // Log Details Modal
    const renderLogDetailsModal = () => {
        if (!showLogDetails) return null;

        return (
            <View className="absolute inset-0 bg-black/60 justify-center items-center z-20">
                <View className={`w-11/12 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-5`}>
                    <Text className={`text-xl font-montserrat-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        Log Details
                    </Text>

                    <View className="mb-4">
                        <Text className={`font-montserrat-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Notes:
                        </Text>
                        <TextInput
                            value={completionNote}
                            onChangeText={setCompletionNote}
                            multiline
                            numberOfLines={3}
                            className={`p-3 rounded-md border ${
                                isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                            } font-montserrat`}
                            placeholder="Add notes about your habit completion..."
                            placeholderTextColor={isDarkMode ? "#9CA3AF" : "#6B7280"}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className={`font-montserrat-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Duration (minutes):
                        </Text>
                        <TextInput
                            value={completionDuration ? String(completionDuration) : ''}
                            onChangeText={(text) => setCompletionDuration(text ? parseInt(text) : null)}
                            keyboardType="number-pad"
                            className={`p-3 rounded-md border ${
                                isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
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
                            className="flex-1 ml-2 p-3 rounded-lg bg-purple-600"
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
    const StatItem = ({ icon, label, value, color = "#374151", isDarkMode }) => (
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
            <Text className={`text-lg font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{value}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1 font-montserrat`}>{label}</Text>
        </View>
    );

    // Enhanced habit completion button with options
    const renderEnhancedCompletionButton = () => (
        <View className={`mt-5 p-5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl mx-3`}
              style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
              }}
        >
            <Text className={`text-lg font-montserrat-bold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                Track Today
            </Text>

            <TouchableOpacity
                className={`p-4 rounded-xl border flex-row justify-between items-center ${
                    todayChecked
                        ? isDarkMode ? 'bg-green-600/20 border-green-800' : 'bg-green-100 border-green-300'
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
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                        {todayChecked ? 'Completed Today' : 'Mark as Completed'}
                    </Text>
                </View>

                <Text className={`${isDarkMode ? 'text-gray-500' : 'text-gray-500'} font-montserrat`}>
                    {format(new Date(), 'PPP')}
                </Text>
            </TouchableOpacity>

            {todayChecked && (<View className="mt-3">
                    {completionNote && (
                        <View className="mt-2 flex-row items-start">
                            <MessageCircle size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} style={{ marginTop: 2 }} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat flex-1`}>
                                {completionNote}
                            </Text>
                        </View>
                    )}

                    {completionDuration && (
                        <View className="mt-2 flex-row items-center">
                            <Clock3 size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
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
                        {/*<Text className="text-purple-600 font-montserrat-medium">Edit Details</Text>*/}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Loading component
    if (loading) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>Loading habit details...</Text>
            </SafeAreaView>
        );
    }

    // Error component
    if (error || !habit) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
                <Text className={`text-lg font-montserrat-bold mb-2 text-center ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {error || 'Habit not found'}
                </Text>
                <Text className={`text-center mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                    We couldn't load this habit's details. Please try again.
                </Text>
                <TouchableOpacity
                    className="bg-purple-600 px-6 py-3 rounded-lg"
                    onPress={fetchHabitDetails}
                >
                    <Text className="text-white font-montserrat-bold">Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-4"
                    onPress={() => router.back()}
                >
                    <Text className={`text-purple-600 font-montserrat-medium`}>Back to Habits</Text>
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
        <SafeAreaView className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
                      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className={`px-4 py-4 flex-row items-center justify-between ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
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

                <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
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
                <Animated.View
                    className={`p-5 mt-3 mx-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                    style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                        opacity: fadeAnim
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
                        <Text className={`text-2xl font-montserrat-bold flex-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                            {habit?.habit?.name || 'Unnamed Habit'}
                        </Text>

                        {/* Favorite Icon */}
                        {habit?.habit?.is_favorite && (
                            <Star size={22} color="#F59E0B" fill="#F59E0B" />
                        )}
                    </View>

                    {/* Description */}
                    {habit?.habit?.description && (
                        <Text className={`mt-1 mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                            {habit.habit.description}
                        </Text>
                    )}

                    {/* Frequency & Difficulty */}
                    <View className={`flex-row justify-between items-center mt-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded-lg`}>
                        <View className="flex-row items-center">
                            <Calendar size={18} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            <Text className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`}>
                                {getFormattedFrequency()}
                            </Text>
                        </View>

                        <View
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: difficultyStyle.bg }}
                        >
                            <Text className="text-xs font-montserrat-bold" style={{ color: difficultyStyle.color }}>
                                {habit?.habit?.difficulty?.replace(/_/g, ' ') || 'Medium'}
                            </Text>
                        </View>
                    </View>

                    {/* Start Date */}
                    <View className="flex-row items-center mt-3">
                        <Clock size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                        <Text className={`ml-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} font-montserrat`}>
                            Started {formatDate(habit?.habit?.start_date)}
                        </Text>
                    </View>
                </Animated.View>

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

export default EnhancedHabitDetailsScreen;