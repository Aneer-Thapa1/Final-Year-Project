import { View, Text, Image, TouchableOpacity, useColorScheme, ActivityIndicator, ScrollView, RefreshControl } from 'react-native'
import React, { useState, useCallback, useEffect } from 'react'
import { MotiView, MotiText, AnimatePresence } from 'moti'
import { Trophy, Zap, BookOpen, Clock, Target, CheckCircle, Award, TrendingUp, Star, Layers, Shield, HeartPulse, Brain, Coffee, Moon, Users, Calendar } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { getUserAchievements, getUpcomingAchievements, getAchievementStats } from '../services/achievementService'

const AchievementsComponent = ({ isDark }) => {
    // If isDark is not passed as prop, use system setting
    const systemColorScheme = useColorScheme();
    const darkMode = isDark !== undefined ? isDark : systemColorScheme === 'dark';

    // State for achievements data
    const [achievements, setAchievements] = useState([]);
    const [upcomingAchievements, setUpcomingAchievements] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // State for filtering achievements
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'inProgress'
    const [showDetails, setShowDetails] = useState(null);

    // Icon mapping for achievement types
    const iconMapping = {
        'STREAK_LENGTH': Clock,
        'TOTAL_COMPLETIONS': CheckCircle,
        'CONSECUTIVE_DAYS': Calendar,
        'PERFECT_WEEK': Star,
        'PERFECT_MONTH': Trophy,
        'HABIT_DIVERSITY': Layers,
        'DOMAIN_MASTERY': Shield,
        'SOCIAL_ENGAGEMENT': Users
    };

    // Domain icon mapping
    const domainIconMapping = {
        'fitness': HeartPulse,
        'nutrition': Coffee,
        'mindfulness': Brain,
        'sleep': Moon,
        'learning': BookOpen,
        'productivity': Target,
        'default': Award
    };

    // Load achievements data
    const loadAchievements = async () => {
        try {
            setLoading(true);
            setError(null);

            // Call our service to get all achievements
            const data = await getUserAchievements();
            if (data) {
                setAchievements(data.achievements || []);

                // Also fetch upcoming achievements
                const upcomingData = await getUpcomingAchievements();
                if (upcomingData) {
                    setUpcomingAchievements(upcomingData);
                }

                // Get achievement stats
                const statsData = await getAchievementStats();
                if (statsData) {
                    setStats(statsData);
                }
            } else {
                setError('Failed to load achievements');
            }
        } catch (err) {
            console.error('Error loading achievements:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadAchievements();
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadAchievements();
    }, []);

    // Get icon for achievement based on type or domain
    const getAchievementIcon = (achievement) => {
        // First check if it's a specific type
        if (iconMapping[achievement.criteria_type]) {
            return iconMapping[achievement.criteria_type];
        }

        // Check if there's a domain-specific icon
        const domain = achievement.domain?.toLowerCase() || 'default';
        return domainIconMapping[domain] || Award;
    };

    // Filter achievements based on selected filter
    const filteredAchievements = achievements.filter(achievement => {
        if (filter === 'all') return true;
        if (filter === 'completed') return achievement.unlocked;
        if (filter === 'inProgress') return !achievement.unlocked;
        return true;
    });

    // Count completed achievements
    const completedCount = stats?.summary?.unlocked || achievements.filter(a => a.unlocked).length;
    const totalCount = stats?.summary?.total || achievements.length;

    // Calculate total points earned
    const totalPoints = stats?.summary?.total_points_earned ||
        achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.points_awarded || 0), 0);

    // Handle achievement card press
    const handleAchievementPress = useCallback((id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowDetails(showDetails === id ? null : id);
    }, [showDetails]);

    // Handle filter change
    const handleFilterChange = useCallback((newFilter) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(newFilter);
    }, []);

    // Theme-based styles
    const styles = {
        container: darkMode ? 'bg-gray-900' : 'bg-gray-50',
        card: darkMode ? 'bg-gray-800' : 'bg-white',
        cardCompleted: darkMode ? 'bg-primary-900/30' : 'bg-primary-50',
        text: darkMode ? 'text-white' : 'text-gray-800',
        textMuted: darkMode ? 'text-gray-300' : 'text-gray-500',
        subText: darkMode ? 'text-gray-400' : 'text-gray-600',
        iconBg: darkMode ? 'bg-gray-700' : 'bg-gray-100',
        iconBgCompleted: darkMode ? 'bg-primary-800/50' : 'bg-primary-100',
        progressBg: darkMode ? 'bg-gray-700' : 'bg-gray-200',
        badgeBg: darkMode ? 'bg-gray-700' : 'bg-white',
        buttonActive: darkMode ? 'bg-primary-800' : 'bg-primary-500',
        buttonInactive: darkMode ? 'bg-gray-800' : 'bg-gray-200',
        detailsBg: darkMode ? 'bg-gray-700/80' : 'bg-gray-100/90',
    };

    // Generate a badge color based on achievement name (for consistency)
    const getBadgeColor = (name, unlocked) => {
        if (!unlocked) return '#9CA3AF'; // gray for locked

        // Generate a consistent color based on the string
        const colors = [
            '#4F46E5', // indigo
            '#7C3AED', // purple
            '#EC4899', // pink
            '#10B981', // green
            '#F59E0B', // amber
            '#3B82F6', // blue
            '#EF4444', // red
            '#8B5CF6', // violet
        ];

        // Hash the name to get a consistent index
        const hash = name.split('').reduce((acc, char) => {
            return acc + char.charCodeAt(0);
        }, 0);

        return colors[hash % colors.length];
    };

    // Decide which image to use for badge
    const getBadgeImage = (achievement) => {
        // Check if a badge_image is provided
        if (achievement.badge_image) {
            return { uri: achievement.badge_image };
        }

        // Default badge images based on type
        const defaultBadges = {
            'STREAK_LENGTH': 'https://cdn-icons-png.flaticon.com/512/2919/2919610.png',
            'TOTAL_COMPLETIONS': 'https://cdn-icons-png.flaticon.com/512/5219/5219398.png',
            'CONSECUTIVE_DAYS': 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png',
            'PERFECT_WEEK': 'https://cdn-icons-png.flaticon.com/512/3075/3075919.png',
            'PERFECT_MONTH': 'https://cdn-icons-png.flaticon.com/512/2447/2447774.png',
            'HABIT_DIVERSITY': 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png',
            'DOMAIN_MASTERY': 'https://cdn-icons-png.flaticon.com/512/628/628283.png',
            'SOCIAL_ENGAGEMENT': 'https://cdn-icons-png.flaticon.com/512/745/745205.png'
        };

        return { uri: defaultBadges[achievement.criteria_type] || 'https://cdn-icons-png.flaticon.com/512/3176/3176366.png' };
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 items-center justify-center py-10">
                <ActivityIndicator size="large" color="#6366F1" />
                <Text className={`mt-4 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Loading achievements...
                </Text>
            </View>
        );
    }

    if (error && !refreshing) {
        return (
            <View className="flex-1 items-center justify-center py-10">
                <Award size={48} color={darkMode ? "#9CA3AF" : "#D1D5DB"} />
                <Text className={`mt-4 font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Couldn't load achievements
                </Text>
                <Text className={`mt-2 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {error}
                </Text>
                <TouchableOpacity
                    onPress={loadAchievements}
                    className="mt-6 bg-primary-500 py-3 px-6 rounded-full"
                >
                    <Text className="text-white font-medium">
                        Try Again
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={['#6366F1']}
                    tintColor={darkMode ? '#6366F1' : '#6366F1'}
                />
            }
        >
            <MotiView
                from={{ opacity: 0, translateY: 15 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
            >
                {/* Header with overall progress */}
                <View className={`${styles.card} rounded-xl p-6 shadow-sm`}>
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className={`text-xl font-bold ${styles.text}`}>
                                My Achievements
                            </Text>
                            <Text className={`font-medium ${styles.textMuted} text-sm mt-2`}>
                                Keep building good habits!
                            </Text>
                        </View>
                        <View className={`${styles.badgeBg} px-4 py-2 rounded-full shadow-sm`}>
                            <View className="flex-row items-center">
                                <Trophy size={16} color={darkMode ? "#A5B4FC" : "#4F46E5"} />
                                <Text className={`ml-2 font-semibold text-primary-${darkMode ? '400' : '600'}`}>
                                    {totalPoints} Points
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between mb-4">
                        <Text className={`font-medium ${styles.subText}`}>
                            Overall Progress
                        </Text>
                        <Text className={`font-semibold ${styles.text}`}>
                            {completedCount}/{totalCount} Completed
                        </Text>
                    </View>

                    <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <MotiView
                            animate={{
                                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`
                            }}
                            transition={{ type: 'timing', duration: 1000 }}
                            className="h-3 bg-primary-500 rounded-full"
                        />
                    </View>
                </View>

                {/* Filter options */}
                <View className="flex-row justify-between mt-6 mb-6">
                    <TouchableOpacity
                        onPress={() => handleFilterChange('all')}
                        className={`flex-1 py-3 px-3 rounded-full mx-1.5 ${filter === 'all' ? styles.buttonActive : styles.buttonInactive}`}
                    >
                        <Text className={`text-center font-medium text-sm ${filter === 'all' ? 'text-white' : styles.textMuted}`}>
                            All
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleFilterChange('completed')}
                        className={`flex-1 py-3 px-3 rounded-full mx-1.5 ${filter === 'completed' ? styles.buttonActive : styles.buttonInactive}`}
                    >
                        <Text className={`text-center font-medium text-sm ${filter === 'completed' ? 'text-white' : styles.textMuted}`}>
                            Completed
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleFilterChange('inProgress')}
                        className={`flex-1 py-3 px-3 rounded-full mx-1.5 ${filter === 'inProgress' ? styles.buttonActive : styles.buttonInactive}`}
                    >
                        <Text className={`text-center font-medium text-sm ${filter === 'inProgress' ? 'text-white' : styles.textMuted}`}>
                            In Progress
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Achievement Cards */}
                <AnimatePresence>
                    {filteredAchievements.map((achievement, index) => {
                        const isUnlocked = achievement.unlocked;
                        const Icon = getAchievementIcon(achievement);
                        const badgeImage = getBadgeImage(achievement);
                        const percentComplete = isUnlocked ? 100 : achievement.progress.percent_complete;

                        return (
                            <MotiView
                                key={achievement.achievement_id}
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                    type: 'timing',
                                    duration: 350,
                                    delay: index * 70
                                }}
                                className={`rounded-xl overflow-hidden shadow-sm mb-6 
                                    ${isUnlocked ? styles.cardCompleted : styles.card}`}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleAchievementPress(achievement.achievement_id)}
                                    className="p-6"
                                >
                                    <View className="flex-row items-center mb-4">
                                        <Image
                                            source={badgeImage}
                                            className="h-16 w-16 mr-5"
                                            resizeMode="contain"
                                            style={{
                                                opacity: isUnlocked ? 1 : 0.5
                                            }}
                                        />

                                        <View className="flex-1">
                                            <Text className={`font-bold text-lg mb-2
                                                ${isUnlocked ?
                                                `text-primary-${darkMode ? '400' : '700'}` :
                                                styles.text
                                            }`}
                                            >
                                                {achievement.name}
                                            </Text>
                                            <Text className={`font-normal ${styles.subText} text-sm`}>
                                                {achievement.description}
                                            </Text>
                                        </View>

                                        <View className={`${styles.badgeBg} px-4 py-2 rounded-full flex-row items-center shadow-sm ml-3`}>
                                            <Trophy
                                                size={16}
                                                color={isUnlocked ?
                                                    (darkMode ? "#A5B4FC" : "#4F46E5") :
                                                    (darkMode ? "#9CA3AF" : "#6B7280")
                                                }
                                            />
                                            <Text className={`ml-1.5 font-semibold 
                                                ${isUnlocked ?
                                                `text-primary-${darkMode ? '400' : '700'}` :
                                                styles.subText
                                            }`}
                                            >
                                                {isUnlocked ? achievement.points_awarded : achievement.points_reward}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className={`h-4 ${styles.progressBg} rounded-full mt-4 overflow-hidden`}>
                                        <MotiView
                                            animate={{ width: `${percentComplete}%` }}
                                            transition={{ type: 'timing', duration: 1000 }}
                                            className={`h-4 ${isUnlocked ? 'bg-green-500' : 'bg-primary-500'} rounded-full`}
                                        />
                                    </View>

                                    <View className="flex-row justify-between items-center mt-3">
                                        <Text className={`font-medium text-sm ${styles.subText}`}>
                                            Progress
                                        </Text>
                                        <Text className={`font-semibold text-sm ${styles.text}`}>
                                            {percentComplete}%
                                        </Text>
                                    </View>

                                    {/* Details section - only shown when expanded */}
                                    <AnimatePresence>
                                        {showDetails === achievement.achievement_id && (
                                            <MotiView
                                                from={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ type: 'timing', duration: 300 }}
                                                className={`mt-6 p-5 rounded-lg ${styles.detailsBg}`}
                                            >
                                                <Text className={`font-medium text-base ${styles.text} mb-3`}>
                                                    Achievement Details:
                                                </Text>
                                                <Text className={`font-normal ${styles.subText} text-sm mb-4`}>
                                                    {achievement.description}
                                                </Text>

                                                {isUnlocked && (
                                                    <View className="flex-row items-center mt-2">
                                                        <CheckCircle size={16} color={darkMode ? "#10B981" : "#059669"} />
                                                        <Text className={`ml-2.5 font-medium text-sm text-green-${darkMode ? '500' : '600'}`}>
                                                            Completed on {new Date(achievement.unlocked_at).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                )}

                                                {!isUnlocked && (
                                                    <View className="flex-row items-center justify-between mt-2">
                                                        <View className="flex-row items-center">
                                                            <Clock size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                                            <Text className={`ml-2.5 font-medium text-sm ${styles.textMuted}`}>
                                                                In progress
                                                            </Text>
                                                        </View>

                                                        <Text className={`font-semibold text-sm ${styles.text}`}>
                                                            {percentComplete < 100 ?
                                                                `${100 - percentComplete}% remaining` :
                                                                'Ready to claim!'
                                                            }
                                                        </Text>
                                                    </View>
                                                )}

                                                <View className="flex-row items-center mt-4">
                                                    <Trophy size={16} color={darkMode ? "#A5B4FC" : "#4F46E5"} />
                                                    <Text className={`ml-2.5 font-medium text-sm text-primary-${darkMode ? '400' : '600'}`}>
                                                        {achievement.criteria_type.replace(/_/g, ' ')}
                                                    </Text>
                                                </View>

                                                <View className="flex-row items-center mt-3">
                                                    <Target size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                                    <Text className={`ml-2.5 font-medium text-sm ${styles.textMuted}`}>
                                                        Target: {achievement.progress.target_value}
                                                        {achievement.criteria_type === 'STREAK_LENGTH' ? ' days' : ''}
                                                    </Text>
                                                </View>

                                                <View className="flex-row items-center mt-3">
                                                    <TrendingUp size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                                    <Text className={`ml-2.5 font-medium text-sm ${styles.textMuted}`}>
                                                        Current: {achievement.progress.current_value}
                                                        {achievement.criteria_type === 'STREAK_LENGTH' ? ' days' : ''}
                                                    </Text>
                                                </View>
                                            </MotiView>
                                        )}
                                    </AnimatePresence>
                                </TouchableOpacity>
                            </MotiView>
                        );
                    })}
                </AnimatePresence>

                {filteredAchievements.length === 0 && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                        className={`${styles.card} rounded-xl p-10 my-8 items-center justify-center`}
                    >
                        <Award size={48} color={darkMode ? "#9CA3AF" : "#D1D5DB"} />
                        <Text className={`mt-6 font-semibold text-lg text-center ${styles.text}`}>
                            No {filter === 'completed' ? 'completed' : 'in-progress'} achievements
                        </Text>
                        <Text className={`mt-4 font-normal text-sm text-center ${styles.textMuted} px-4`}>
                            {filter === 'completed' ?
                                'Keep building habits to earn achievements!' :
                                'Check back soon for new challenges.'
                            }
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleFilterChange('all')}
                            className="mt-6 bg-primary-500 py-3 px-6 rounded-full"
                        >
                            <Text className="text-white font-medium">
                                View All Achievements
                            </Text>
                        </TouchableOpacity>
                    </MotiView>
                )}
            </MotiView>
        </ScrollView>
    );
};

export default AchievementsComponent;