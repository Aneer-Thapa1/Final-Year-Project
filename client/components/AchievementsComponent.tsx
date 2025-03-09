import { View, Text, Image, TouchableOpacity, useColorScheme } from 'react-native'
import React, { useState, useCallback } from 'react'
import { MotiView, MotiText, AnimatePresence } from 'moti'
import { Trophy, Zap, BookOpen, Clock, Target, CheckCircle, Award, TrendingUp, Code, Layers, BarChart } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const AchievementsComponent = ({ isDark }) => {
    // If isDark is not passed as prop, use system setting
    const systemColorScheme = useColorScheme();
    const darkMode = isDark !== undefined ? isDark : systemColorScheme === 'dark';

    // State for filtering achievements
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'inProgress'
    const [showDetails, setShowDetails] = useState(null);

    // Achievement data with improved content
    const achievements = [
        {
            id: '1',
            title: 'Getting Started',
            description: 'Complete your first week of habit tracking',
            longDescription: 'You\'ve successfully tracked your habits for a full week, establishing the foundation for lasting positive change in your life.',
            icon: Zap,
            progress: 100,
            completed: true,
            date: '2023-05-12',
            points: 100,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/5219/5219398.png' },
            category: 'beginner'
        },
        {
            id: '2',
            title: 'Fitness Enthusiast',
            description: 'Track fitness habits for 30 days',
            longDescription: 'You\'ve committed to your health by consistently tracking fitness habits for a full month, building a strong foundation for physical wellbeing.',
            icon: TrendingUp,
            progress: 85,
            completed: false,
            points: 200,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/2936/2936886.png' },
            category: 'health'
        },
        {
            id: '3',
            title: 'Hydration Hero',
            description: 'Drink 8 glasses of water daily for 14 days',
            longDescription: 'Staying properly hydrated is essential for health. You\'ve built the important habit of drinking adequate water consistently for two full weeks.',
            icon: Clock,
            progress: 60,
            completed: false,
            points: 150,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/2447/2447774.png' },
            category: 'health'
        },
        {
            id: '4',
            title: 'Mindfulness Master',
            description: 'Meditate for 10 minutes daily for 21 days',
            longDescription: 'Mental wellbeing is just as important as physical health. You\'ve developed a consistent meditation practice that helps keep your mind clear and focused.',
            icon: Target,
            progress: 40,
            completed: false,
            points: 300,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/3075/3075919.png' },
            category: 'mindfulness'
        },
        {
            id: '5',
            title: 'Learning Enthusiast',
            description: 'Read or study for 30 minutes daily for 15 days',
            longDescription: 'Continuous learning is the key to growth. You\'ve dedicated time to expand your knowledge and skills through regular reading and study sessions.',
            icon: BookOpen,
            progress: 25,
            completed: false,
            points: 250,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/2232/2232688.png' },
            category: 'education'
        },
        {
            id: '6',
            title: 'Early Bird',
            description: 'Wake up before 6 AM for 10 consecutive days',
            longDescription: 'Rising early sets the tone for a productive day. You\'ve established the powerful habit of starting your day before dawn, giving you more time to achieve your goals.',
            icon: Clock,
            progress: 100,
            completed: true,
            date: '2023-06-20',
            points: 200,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/2919/2919610.png' },
            category: 'lifestyle'
        },
        {
            id: '7',
            title: 'Nature Explorer',
            description: 'Spend time outdoors for 15 minutes daily for 14 days',
            longDescription: 'Connecting with nature refreshes the mind and body. You\'ve made it a habit to step outside and enjoy the natural world around you regularly.',
            icon: Layers,
            progress: 100,
            completed: true,
            date: '2023-04-05',
            points: 150,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/628/628283.png' },
            category: 'lifestyle'
        },
    ];

    // Filter achievements based on selected filter
    const filteredAchievements = achievements.filter(achievement => {
        if (filter === 'all') return true;
        if (filter === 'completed') return achievement.completed;
        if (filter === 'inProgress') return !achievement.completed;
        return true;
    });

    // Count completed achievements
    const completedCount = achievements.filter(a => a.completed).length;

    // Calculate total points earned
    const totalPoints = achievements
        .filter(a => a.completed)
        .reduce((sum, a) => sum + a.points, 0);

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

    return (
        <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
        >
            {/* Header with overall progress */}
            <View className={`${styles.card} rounded-xl p-6 shadow-sm`}>
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className={`text-xl font-montserrat-semibold ${styles.text}`}>
                            My Achievements
                        </Text>
                        <Text className={`font-montserrat-regular ${styles.textMuted} text-sm mt-2`}>
                            Keep building good habits!
                        </Text>
                    </View>
                    <View className={`${styles.badgeBg} px-4 py-2 rounded-full shadow-sm`}>
                        <View className="flex-row items-center">
                            <Trophy size={16} color={darkMode ? "#A5B4FC" : "#4F46E5"} />
                            <Text className={`ml-2 font-montserrat-semibold text-primary-${darkMode ? '400' : '600'}`}>
                                {totalPoints} Points
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row items-center justify-between mb-4">
                    <Text className={`font-montserrat-medium ${styles.subText}`}>
                        Overall Progress
                    </Text>
                    <Text className={`font-montserrat-semibold ${styles.text}`}>
                        {completedCount}/{achievements.length} Completed
                    </Text>
                </View>

                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <MotiView
                        animate={{
                            width: `${(completedCount / achievements.length) * 100}%`
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
                    <Text className={`text-center font-montserrat-medium text-sm ${filter === 'all' ? 'text-white' : styles.textMuted}`}>
                        All
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleFilterChange('completed')}
                    className={`flex-1 py-3 px-3 rounded-full mx-1.5 ${filter === 'completed' ? styles.buttonActive : styles.buttonInactive}`}
                >
                    <Text className={`text-center font-montserrat-medium text-sm ${filter === 'completed' ? 'text-white' : styles.textMuted}`}>
                        Completed
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleFilterChange('inProgress')}
                    className={`flex-1 py-3 px-3 rounded-full mx-1.5 ${filter === 'inProgress' ? styles.buttonActive : styles.buttonInactive}`}
                >
                    <Text className={`text-center font-montserrat-medium text-sm ${filter === 'inProgress' ? 'text-white' : styles.textMuted}`}>
                        In Progress
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Achievement Cards */}
            <AnimatePresence>
                {filteredAchievements.map((achievement, index) => (
                    <MotiView
                        key={achievement.id}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                            type: 'timing',
                            duration: 350,
                            delay: index * 70
                        }}
                        className={`rounded-xl overflow-hidden shadow-sm mb-6 
                            ${achievement.completed ? styles.cardCompleted : styles.card}`}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleAchievementPress(achievement.id)}
                            className="p-6"
                        >
                            <View className="flex-row items-center mb-4">
                                {achievement.badgeUrl ? (
                                    <Image
                                        source={achievement.badgeUrl}
                                        className="h-16 w-16 mr-5"
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View className={`h-14 w-14 rounded-full items-center justify-center mr-5 
                                        ${achievement.completed ? styles.iconBgCompleted : styles.iconBg}`}
                                    >
                                        <achievement.icon
                                            size={24}
                                            color={achievement.completed ?
                                                (darkMode ? "#A5B4FC" : "#4F46E5") :
                                                (darkMode ? "#9CA3AF" : "#6B7280")
                                            }
                                        />
                                    </View>
                                )}

                                <View className="flex-1">
                                    <Text className={`font-montserrat-bold text-lg mb-2
                                        ${achievement.completed ?
                                        `text-primary-${darkMode ? '400' : '700'}` :
                                        styles.text
                                    }`}
                                    >
                                        {achievement.title}
                                    </Text>
                                    <Text className={`font-montserrat-regular ${styles.subText} text-sm`}>
                                        {achievement.description}
                                    </Text>
                                </View>

                                <View className={`${styles.badgeBg} px-4 py-2 rounded-full flex-row items-center shadow-sm ml-3`}>
                                    <Trophy
                                        size={16}
                                        color={achievement.completed ?
                                            (darkMode ? "#A5B4FC" : "#4F46E5") :
                                            (darkMode ? "#9CA3AF" : "#6B7280")
                                        }
                                    />
                                    <Text className={`ml-1.5 font-montserrat-semibold 
                                        ${achievement.completed ?
                                        `text-primary-${darkMode ? '400' : '700'}` :
                                        styles.subText
                                    }`}
                                    >
                                        {achievement.points}
                                    </Text>
                                </View>
                            </View>

                            <View className={`h-4 ${styles.progressBg} rounded-full mt-4 overflow-hidden`}>
                                <MotiView
                                    animate={{ width: `${achievement.progress}%` }}
                                    transition={{ type: 'timing', duration: 1000 }}
                                    className={`h-4 ${achievement.completed ? 'bg-green-500' : 'bg-primary-500'} rounded-full`}
                                />
                            </View>

                            <View className="flex-row justify-between items-center mt-3">
                                <Text className={`font-montserrat-medium text-sm ${styles.subText}`}>
                                    Progress
                                </Text>
                                <Text className={`font-montserrat-semibold text-sm ${styles.text}`}>
                                    {achievement.progress}%
                                </Text>
                            </View>

                            {/* Details section - only shown when expanded */}
                            <AnimatePresence>
                                {showDetails === achievement.id && (
                                    <MotiView
                                        from={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ type: 'timing', duration: 300 }}
                                        className={`mt-6 p-5 rounded-lg ${styles.detailsBg}`}
                                    >
                                        <Text className={`font-montserrat-medium text-base ${styles.text} mb-3`}>
                                            Achievement Details:
                                        </Text>
                                        <Text className={`font-montserrat-regular ${styles.subText} text-sm mb-4`}>
                                            {achievement.longDescription || achievement.description}
                                        </Text>

                                        {achievement.completed && (
                                            <View className="flex-row items-center mt-2">
                                                <CheckCircle size={16} color={darkMode ? "#10B981" : "#059669"} />
                                                <Text className={`ml-2.5 font-montserrat-medium text-sm text-green-${darkMode ? '500' : '600'}`}>
                                                    Completed {achievement.date ? `on ${new Date(achievement.date).toLocaleDateString()}` : ''}
                                                </Text>
                                            </View>
                                        )}

                                        {!achievement.completed && (
                                            <View className="flex-row items-center justify-between mt-2">
                                                <View className="flex-row items-center">
                                                    <Clock size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                                    <Text className={`ml-2.5 font-montserrat-medium text-sm ${styles.textMuted}`}>
                                                        In progress
                                                    </Text>
                                                </View>

                                                <Text className={`font-montserrat-semibold text-sm ${styles.text}`}>
                                                    {achievement.progress < 100 ?
                                                        `${100 - achievement.progress}% remaining` :
                                                        'Ready to claim!'
                                                    }
                                                </Text>
                                            </View>
                                        )}
                                    </MotiView>
                                )}
                            </AnimatePresence>
                        </TouchableOpacity>
                    </MotiView>
                ))}
            </AnimatePresence>

            {filteredAchievements.length === 0 && (
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className={`${styles.card} rounded-xl p-10 my-8 items-center justify-center`}
                >
                    <Award size={48} color={darkMode ? "#9CA3AF" : "#D1D5DB"} />
                    <Text className={`mt-6 font-montserrat-semibold text-lg text-center ${styles.text}`}>
                        No {filter === 'completed' ? 'completed' : 'in-progress'} achievements
                    </Text>
                    <Text className={`mt-4 font-montserrat-regular text-sm text-center ${styles.textMuted} px-4`}>
                        {filter === 'completed' ?
                            'Keep building habits to earn achievements!' :
                            'Check back soon for new challenges.'
                        }
                    </Text>
                    <TouchableOpacity
                        onPress={() => handleFilterChange('all')}
                        className="mt-6 bg-primary-500 py-3 px-6 rounded-full"
                    >
                        <Text className="text-white font-montserrat-medium">
                            View All Achievements
                        </Text>
                    </TouchableOpacity>
                </MotiView>
            )}
        </MotiView>
    )
}

export default AchievementsComponent