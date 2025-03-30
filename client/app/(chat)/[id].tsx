import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    useColorScheme
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
    Layers
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { format, isSameDay, parseISO, startOfToday } from 'date-fns';

// Import services
import {
    getHabitDetails,
    deleteHabit,
    toggleFavorite,
    trackHabit
} from '../../services/habitService';

export default function HabitDetailsScreen() {
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

                // Check if habit is completed today from todayStatus
                try {
                    // Based on your API response, check todayStatus
                    if (habitData.todayStatus && habitData.todayStatus.completed) {
                        setTodayChecked(true);
                    } else if (habitData.todayStatus && habitData.todayStatus.is_scheduled) {
                        setTodayChecked(false);
                    } else {
                        // Check completions if todayStatus is not available
                        if (habitData.recentLogs && Array.isArray(habitData.recentLogs)) {
                            const today = startOfToday();
                            let foundToday = false;

                            for (let i = 0; habitData.recentLogs[i]; i++) {
                                const log = habitData.recentLogs[i];
                                if (log && log.date && isSameDay(parseISO(log.date), today)) {
                                    if (log.completed) {
                                        foundToday = true;
                                        break;
                                    }
                                }
                            }

                            setTodayChecked(foundToday);
                        } else {
                            setTodayChecked(false);
                        }
                    }
                } catch (err) {
                    console.error('Error checking completion status:', err);
                    setTodayChecked(false);
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

    // Handle refresh
    const handleRefresh = () => {
        setRefreshing(true);
        fetchHabitDetails();
    };

    // Handle delete habit
    const handleDeleteHabit = async () => {
        try {
            if (!habitId) {
                Alert.alert('Error', 'Cannot delete habit: ID is missing');
                return;
            }

            const response = await deleteHabit(habitId);

            if (response && response.success) {
                Alert.alert('Success', 'Habit deleted successfully');
                router.push('/(tabs)/habits');
            } else {
                Alert.alert('Error', 'Failed to delete habit');
            }
        } catch (err) {
            console.error('Error deleting habit:', err);
            Alert.alert('Error', 'An error occurred while trying to delete the habit');
        }
    };

    // Handle toggle favorite
    const handleToggleFavorite = async () => {
        try {
            if (!habitId || !habit) {
                Alert.alert('Error', 'Cannot update habit: Data is missing');
                return;
            }

            const response = await toggleFavorite(habitId);

            if (response && response.success && response.data) {
                // Update habit in state with the updated favorite status
                setHabit(prevHabit => ({
                    ...prevHabit,
                    is_favorite: !prevHabit.is_favorite
                }));
            } else {
                Alert.alert('Error', 'Failed to update favorite status');
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
            Alert.alert('Error', 'An error occurred while updating favorite status');
        }
    };

    // Handle track habit
    const handleTrackHabit = async () => {
        try {
            if (!habitId) {
                Alert.alert('Error', 'Cannot track habit: ID is missing');
                return;
            }

            // Optimistically update UI
            setTodayChecked(!todayChecked);

            const response = await trackHabit(habitId, {
                completed: !todayChecked,
                completion_date: new Date().toISOString()
            });

            if (response && response.success && response.data) {
                // Update habit in state with the updated completion data
                setHabit(prevHabit => {
                    if (!prevHabit) return prevHabit;

                    // Create a copy of the habit with updated data
                    const updatedHabit = { ...prevHabit };

                    // If API returns updated habit, use that data
                    if (response.data.habit) {
                        // Update streak if present
                        if (response.data.habit.streak) {
                            updatedHabit.streak = response.data.habit.streak;
                        }

                        // Update stats if present
                        if (response.data.habit.stats) {
                            updatedHabit.stats = response.data.habit.stats;
                        }

                        // Update todayStatus
                        if (response.data.habit.todayStatus) {
                            updatedHabit.todayStatus = response.data.habit.todayStatus;
                        } else {
                            // If no todayStatus, create one
                            updatedHabit.todayStatus = {
                                ...updatedHabit.todayStatus,
                                completed: !todayChecked
                            };
                        }
                    }

                    // Update recentLogs
                    if (!updatedHabit.recentLogs) {
                        updatedHabit.recentLogs = [];
                    }

                    // If completing, add a new log
                    if (!todayChecked) {
                        const today = new Date().toISOString();
                        const newLog = {
                            log_id: String(Date.now()), // Temporary ID
                            habit_id: habitId,
                            user_id: updatedHabit.user_id || 0,
                            completed: true,
                            date: today
                        };

                        // Add to the beginning of logs
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

    // Confirm delete habit
    const confirmDeleteHabit = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to delete this habit? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDeleteHabit }
            ]
        );
    };

    // Get formatted frequency
    const getFormattedFrequency = () => {
        if (!habit || !habit.frequency_type) return 'N/A';

        const type = habit.frequency_type;
        const value = habit.frequency_value || 0;

        switch (type) {
            case 'DAILY':
                return 'Every Day';
            case 'WEEKDAYS':
                return 'Weekdays';
            case 'WEEKENDS':
                return 'Weekends';
            case 'X_TIMES_WEEK':
                return `${value} Times per Week`;
            case 'INTERVAL':
                return `Every ${value} Days`;
            default:
                return type.replace('_', ' ');
        }
    };

    // Get difficulty color
    const getDifficultyColor = () => {
        if (!habit || !habit.difficulty) return { color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' };

        switch (habit.difficulty) {
            case 'VERY_EASY':
                return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'EASY':
                return { color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' };
            case 'MEDIUM':
                return { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'HARD':
                return { color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.1)' };
            case 'VERY_HARD':
                return { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
            default:
                return { color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' };
        }
    };

    // Get streak and history stats
    const getStats = () => {
        if (!habit) return { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };

        // Get streak data - based on your API response, streak is an object, not an array
        let currentStreak = 0;
        let longestStreak = 0;

        try {
            // Get streak data from the streak object directly
            if (habit.streak && typeof habit.streak === 'object') {
                currentStreak = habit.streak.current_streak || 0;
                longestStreak = habit.streak.longest_streak || 0;
            }
        } catch (err) {
            console.error('Error processing streak data:', err);
        }

        // Calculate completion stats
        let completionRate = 0;
        let totalCompletions = 0;

        try {
            // Try to get stats from stats object
            if (habit.stats && typeof habit.stats === 'object') {
                completionRate = habit.stats.completionRate || 0;
                totalCompletions = habit.stats.completedLogs || habit.stats.totalLogs || 0;
            } else {
                // Count recentLogs if available
                if (habit.recentLogs && Array.isArray(habit.recentLogs)) {
                    let count = 0;
                    for (let i = 0; habit.recentLogs[i]; i++) {
                        if (habit.recentLogs[i].completed) {
                            count++;
                        }
                    }
                    totalCompletions = count;
                }

                // Calculate completion rate
                if (habit.start_date) {
                    const startDate = new Date(habit.start_date);
                    const today = new Date();
                    const daysSinceStart = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
                    completionRate = totalCompletions > 0 ? Math.round((totalCompletions / daysSinceStart) * 100) : 0;
                }
            }
        } catch (err) {
            console.error('Error calculating completion stats:', err);
        }

        return { currentStreak, longestStreak, completionRate, totalCompletions };
    };

    // Format date helpers
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'PPP');
        } catch (e) {
            return 'Invalid Date';
        }
    };

    // Menu component
    const HabitOptionsMenu = () => {
        if (!isMenuVisible) return null;

        return (
            <View
                className={`absolute top-16 right-4 p-2 rounded-lg shadow-md z-10 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
            >
                <TouchableOpacity
                    className="flex-row items-center p-2"
                    onPress={() => {
                        setIsMenuVisible(false);
                        handleToggleFavorite();
                    }}
                >
                    <Star
                        size={20}
                        color={habit?.is_favorite ? "#FFD700" : isDarkMode ? "#E5E7EB" : "#374151"}
                        fill={habit?.is_favorite ? "#FFD700" : "none"}
                    />
                    <Text className={`ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {habit?.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center p-2"
                    onPress={() => {
                        setIsMenuVisible(false);
                        router.push({
                            pathname: '(habits)/editHabit',
                            params: { id: habitId }
                        });
                    }}
                >
                    <Edit2 size={20} color={isDarkMode ? "#E5E7EB" : "#374151"} />
                    <Text className={`ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Habit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center p-2"
                    onPress={() => {
                        setIsMenuVisible(false);
                        confirmDeleteHabit();
                    }}
                >
                    <Trash2 size={20} color="#EF4444" />
                    <Text className="ml-2 text-red-500">Delete Habit</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Stats item component
    const StatItem = ({ icon, label, value, color = isDarkMode ? "#E5E7EB" : "#374151" }) => (
        <View className="items-center">
            <View className={`w-12 h-12 rounded-full items-center justify-center mb-1`} style={{ backgroundColor: `${color}20` }}>
                {icon}
            </View>
            <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</Text>
            <Text className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</Text>
        </View>
    );

    // Loading component
    if (loading) {
        return (
            <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <ActivityIndicator size="large" color={isDarkMode ? "#93C5FD" : "#3B82F6"} />
                <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading habit details...</Text>
            </View>
        );
    }

    // Error component
    if (error || !habit) {
        return (
            <View className={`flex-1 justify-center items-center px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Text className={`text-lg font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {error || 'Habit not found'}
                </Text>
                <Text className={`text-center mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    We couldn't load this habit's details. Please try again.
                </Text>
                <TouchableOpacity
                    className="bg-primary-500 px-6 py-3 rounded-xl"
                    onPress={fetchHabitDetails}
                >
                    <Text className="text-white font-bold">Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="mt-4"
                    onPress={() => router.back()}
                >
                    <Text className={`${isDarkMode ? 'text-primary-400' : 'text-primary-600'}`}>Back to Habits</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Destructure habit details for easier access
    const { name, description, start_date, domain_name, domain_color } = habit;
    const difficultyStyle = getDifficultyColor();
    const stats = getStats();

    return (
        <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className={`pt-12 px-4 flex-row items-center justify-between ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/habits')}
                    className="p-2"
                >
                    <ArrowLeft size={24} color={isDarkMode ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>

                <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Habit Details
                </Text>

                <TouchableOpacity
                    onPress={() => setIsMenuVisible(!isMenuVisible)}
                    className="p-2"
                >
                    <MoreVertical size={24} color={isDarkMode ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>
            </View>

            {/* Options Menu */}
            <HabitOptionsMenu />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Habit Header Section */}
                <View className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <View className="flex-row items-center mb-2">
                        {/* Domain Indicator */}
                        {domain_name && (
                            <View
                                className="mr-2 p-2 rounded-full"
                                style={{
                                    backgroundColor: domain_color ? `${domain_color}20` : 'rgba(79, 70, 229, 0.1)'
                                }}
                            >
                                <Layers size={16} color={domain_color || '#4F46E5'} />
                            </View>
                        )}

                        {/* Habit Name */}
                        <Text className={`text-2xl font-bold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {name || 'Unnamed Habit'}
                        </Text>

                        {/* Favorite Icon */}
                        {habit.is_favorite && (
                            <Star size={20} color="#FFD700" fill="#FFD700" />
                        )}
                    </View>

                    {/* Description */}
                    {description && (
                        <Text className={`mt-1 mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {description}
                        </Text>
                    )}

                    {/* Frequency & Difficulty */}
                    <View className="flex-row justify-between items-center mt-2">
                        <View className="flex-row items-center">
                            <Calendar size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                            <Text className={`ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {getFormattedFrequency()}
                            </Text>
                        </View>

                        <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: difficultyStyle.bg }}
                        >
                            <Text className="text-xs" style={{ color: difficultyStyle.color }}>
                                {habit.difficulty?.replace('_', ' ') || 'Medium'}
                            </Text>
                        </View>
                    </View>

                    {/* Start Date */}
                    <View className="flex-row items-center mt-2">
                        <Clock size={16} color={isDarkMode ? "#D1D5DB" : "#6B7280"} />
                        <Text className={`ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Started {formatDate(start_date)}
                        </Text>
                    </View>
                </View>

                {/* Track Today Section */}
                <View className={`mt-4 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg mx-4`}>
                    <Text className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Track Today
                    </Text>

                    <TouchableOpacity
                        className={`p-4 rounded-lg border flex-row justify-between items-center ${
                            todayChecked
                                ? isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-100 border-green-200'
                                : isDarkMode ? 'bg-gray-700/30 border-gray-700' : 'bg-gray-100 border-gray-200'
                        }`}
                        onPress={handleTrackHabit}
                    >
                        <View className="flex-row items-center">
                            {todayChecked ? (
                                <CheckCircle size={24} color={isDarkMode ? "#34D399" : "#10B981"} fill={isDarkMode ? "#34D399" : "#10B981"} />
                            ) : (
                                <XCircle size={24} color={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                            )}
                            <Text className={`ml-2 text-base ${
                                todayChecked
                                    ? isDarkMode ? 'text-green-400' : 'text-green-700'
                                    : isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                {todayChecked ? 'Completed Today' : 'Mark as Completed'}
                            </Text>
                        </View>

                        <Text className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {format(new Date(), 'PPP')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View className={`mt-4 p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg mx-4`}>
                    <Text className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Stats
                    </Text>

                    <View className="flex-row justify-between">
                        <StatItem
                            icon={<Flame size={24} color="#F59E0B" />}
                            label="Current Streak"
                            value={`${stats.currentStreak} Days`}
                            color="#F59E0B"
                        />

                        <StatItem
                            icon={<Award size={24} color="#10B981" />}
                            label="Best Streak"
                            value={`${stats.longestStreak} Days`}
                            color="#10B981"
                        />

                        <StatItem
                            icon={<BarChart2 size={24} color="#3B82F6" />}
                            label="Completion Rate"
                            value={`${stats.completionRate}%`}
                            color="#3B82F6"
                        />
                    </View>

                    <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Text className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Total Completions: {stats.totalCompletions}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}