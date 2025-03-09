import { View, Text, Image, useColorScheme, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import { MotiView, AnimatePresence } from 'moti'
import { Calendar, Star, Book, Award, Zap, Clock, Filter, TrendingUp, Flame } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const ActivityComponent = ({ isDark: forceDark, colors = {} }) => {
    // Get device color scheme
    const colorScheme = useColorScheme();
    const isDark = forceDark !== undefined ? forceDark : colorScheme === 'dark';

    // State for filtering activities
    const [filter, setFilter] = useState('all'); // 'all', 'course', 'streak', etc.
    const [sortNewest, setSortNewest] = useState(true);

    // Default colors with fallbacks
    const theme = {
        primary: {
            50: colors.primary50 || '#EEF2FF',
            100: colors.primary100 || '#E0E7FF',
            500: colors.primary500 || '#6366F1',
            700: colors.primary700 || '#4338CA',
        },
        background: {
            card: isDark ? (colors.darkCard || '#1F2937') : (colors.lightCard || '#FFFFFF'),
            main: isDark ? (colors.darkBg || '#111827') : (colors.lightBg || '#F9FAFB'),
        },
        text: {
            primary: isDark ? (colors.darkTextPrimary || '#F9FAFB') : (colors.lightTextPrimary || '#1F2937'),
            secondary: isDark ? (colors.darkTextSecondary || '#9CA3AF') : (colors.lightTextSecondary || '#6B7280'),
        }
    };

    // Map activity types to icons and colors
    const activityConfig = {
        course_completed: {
            icon: Book,
            bgColor: isDark ? 'rgba(99, 102, 241, 0.2)' : theme.primary[100],
            iconColor: theme.primary[500],
            label: 'Courses'
        },
        streak: {
            icon: Flame,
            bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
            iconColor: isDark ? '#FCA5A5' : '#EF4444',
            label: 'Streaks'
        },
        badge: {
            icon: Award,
            bgColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
            iconColor: isDark ? '#FBBF24' : '#F59E0B',
            label: 'Badges'
        },
        quiz: {
            icon: Star,
            bgColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
            iconColor: isDark ? '#93C5FD' : '#3B82F6',
            label: 'Quizzes'
        },
        challenge: {
            icon: Zap,
            bgColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
            iconColor: isDark ? '#6EE7B7' : '#10B981',
            label: 'Challenges'
        }
    };

    // Static activity data with added variety
    const activities = [
        {
            id: '1',
            type: 'course_completed',
            title: 'Completed Intro to React Native',
            description: 'You\'ve learned the basics of React Native components and styling',
            icon: 'Book',
            points: 50,
            date: '2 days ago',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
            id: '2',
            type: 'streak',
            title: 'Maintained a 7-day streak',
            description: 'Keep going to earn bonus points',
            icon: 'Calendar',
            points: 25,
            date: '4 days ago',
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        },
        {
            id: '3',
            type: 'badge',
            title: 'Earned Code Master Badge',
            description: 'You\'ve demonstrated exceptional coding skills',
            icon: 'Award',
            points: 75,
            date: '1 week ago',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        },
        {
            id: '4',
            type: 'quiz',
            title: 'Aced JavaScript Fundamentals Quiz',
            description: 'Perfect score on advanced concepts',
            icon: 'Star',
            points: 30,
            date: '2 weeks ago',
            timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        },
        {
            id: '5',
            type: 'challenge',
            title: 'Completed Weekly Challenge',
            description: 'Solved all problems in record time',
            icon: 'Zap',
            points: 45,
            date: '3 days ago',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
    ];

    // Filter and sort activities
    const filteredActivities = activities
        .filter(activity => filter === 'all' || activity.type === filter)
        .sort((a, b) => {
            if (sortNewest) {
                return b.timestamp - a.timestamp;
            } else {
                return a.timestamp - b.timestamp;
            }
        });

    // Calculate total points
    const totalPoints = activities.reduce((sum, activity) => sum + activity.points, 0);

    // Handle filter change
    const handleFilterChange = (newFilter) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(newFilter);
    };

    // Toggle sort order
    const toggleSortOrder = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSortNewest(!sortNewest);
    };

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
        >
            {/* Header Card */}
            <View className={`p-6 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                <View className="flex-row justify-between items-center mb-6">
                    <Text className={`text-xl font-montserrat-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        Activity History
                    </Text>

                    <View className={`px-4 py-2 rounded-full ${isDark ? 'bg-gray-700' : theme.primary[50]}`}>
                        <View className="flex-row items-center">
                            <Star size={16} color={theme.primary[500]} />
                            <Text className={`ml-2 font-montserrat-semibold`} style={{ color: theme.primary[500] }}>
                                {totalPoints} Points
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Filter Chip Row */}
                <View className="flex-row mb-2 flex-wrap">
                    <TouchableOpacity
                        onPress={() => handleFilterChange('all')}
                        className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                            filter === 'all'
                                ? `bg-primary-500`
                                : isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                    >
                        <Text className={
                            filter === 'all'
                                ? 'text-white font-montserrat-medium'
                                : `${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`
                        }>
                            All
                        </Text>
                    </TouchableOpacity>

                    {Object.entries(activityConfig).map(([type, config]) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => handleFilterChange(type)}
                            className={`mr-2 mb-2 px-3 py-1.5 rounded-full flex-row items-center ${
                                filter === type
                                    ? `bg-primary-500`
                                    : isDark ? 'bg-gray-700' : 'bg-gray-100'
                            }`}
                        >
                            <config.icon
                                size={14}
                                color={filter === type ? '#FFFFFF' : config.iconColor}
                                style={{ marginRight: 4 }}
                            />
                            <Text className={
                                filter === type
                                    ? 'text-white font-montserrat-medium'
                                    : `${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`
                            }>
                                {config.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sort Button */}
                <TouchableOpacity
                    onPress={toggleSortOrder}
                    className={`self-start px-3 py-1.5 rounded-full flex-row items-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                    <TrendingUp size={14} color={isDark ? '#9CA3AF' : '#6B7280'} style={{
                        transform: [{ rotate: sortNewest ? '0deg' : '180deg' }],
                        marginRight: 4
                    }} />
                    <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`}>
                        {sortNewest ? 'Newest first' : 'Oldest first'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Activity Feed */}
            <View className="space-y-0">
                {filteredActivities.length === 0 && (
                    <View className={`p-8 rounded-xl items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <Clock size={32} color={isDark ? '#4B5563' : '#D1D5DB'} />
                        <Text className={`mt-4 text-lg font-montserrat-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            No activities found
                        </Text>
                        <Text className={`mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Try selecting a different filter
                        </Text>
                    </View>
                )}

                {filteredActivities.map((activity, index) => {
                    const config = activityConfig[activity.type];
                    const IconComponent = config.icon;

                    return (
                        <MotiView
                            key={activity.id}
                            from={{ opacity: 0, translateX: -20 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            transition={{ type: 'timing', duration: 400, delay: 100 + index * 100 }}
                            className={`rounded-xl p-6 shadow-sm mb-6 ${
                                isDark ? 'bg-gray-800 shadow-gray-900' : 'bg-white shadow-gray-200'
                            }`}
                        >
                            <View className="flex-row">
                                <View
                                    className="h-14 w-14 rounded-full items-center justify-center mr-4"
                                    style={{ backgroundColor: config.bgColor }}
                                >
                                    <IconComponent size={24} color={config.iconColor} />
                                </View>

                                <View className="flex-1">
                                    <Text className={`font-montserrat-semibold text-base ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                        {activity.title}
                                    </Text>
                                    <Text className={`font-montserrat-regular ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                        {activity.description}
                                    </Text>

                                    <View className="flex-row justify-between items-center mt-3">
                                        <View className="flex-row items-center">
                                            <Clock size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                            <Text className={`ml-2 font-montserrat-medium text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {activity.date}
                                            </Text>
                                        </View>

                                        <View className={`px-3 py-1.5 rounded-full flex-row items-center`}
                                              style={{ backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : theme.primary[50] }}
                                        >
                                            <Star size={16} color={theme.primary[500]} style={{ marginRight: 4 }} />
                                            <Text className={`font-montserrat-semibold text-sm`} style={{ color: theme.primary[500] }}>
                                                +{activity.points}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </MotiView>
                    );
                })}
            </View>
        </MotiView>
    );
};

export default ActivityComponent;