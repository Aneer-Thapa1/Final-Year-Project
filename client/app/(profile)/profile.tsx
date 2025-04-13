import { Image, Text, View, ScrollView, TouchableOpacity, useColorScheme, StatusBar, RefreshControl } from 'react-native'
import React, { useState, useCallback } from 'react'
import { useSelector } from 'react-redux';
import { ArrowLeft, Settings, Trophy, Activity, Users, Calendar, Clock, Star, Award, BookOpen } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Import the tab components
import ActivityComponent from '../../components/ActivityComponent';
import AchievementsComponent from '../../components/AchievementsComponent';
import FriendsComponent from '../../components/FriendsComponent';
import BlogsComponent from '../../components/UserBlog';

const Profile = () => {
    const userDetails = useSelector((state) => state.user);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState('Activity');
    const [refreshing, setRefreshing] = useState(false);
    const [userStats, setUserStats] = useState({
        streakDays: 28,
        completedHabits: 143,
        totalPoints: userDetails?.user?.user?.points_gained || 1250,
        level: 7
    });

    // Tab definitions with enhanced metadata
    const tabs = [
        {
            id: 'Activity',
            icon: Activity,
            description: 'Your daily progress and recent activities'
        },
        {
            id: 'Achievements',
            icon: Trophy,
            description: 'Milestones and badges you\'ve earned'
        },
        {
            id: 'Friends',
            icon: Users,
            description: 'Connect and compete with friends'
        },
        {
            id: 'Blogs',
            icon: BookOpen,
            description: 'Your published blogs and articles'
        }
    ];

    // Handle tab changes with haptic feedback
    const handleTabChange = (tabId) => {
        if (activeTab !== tabId) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(tabId);
        }
    };

    // Pull-to-refresh implementation
    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        // Simulate data refresh
        setTimeout(() => {
            // Update any data needed
            setUserStats(prev => ({
                ...prev,
                streakDays: prev.streakDays + 1,
                totalPoints: prev.totalPoints + 25
            }));
            setRefreshing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 1500);
    }, []);

    // Navigation handlers
    const handleBackPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleSettingsPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings');
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View className="flex-1">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={isDark ? "#E5E7EB" : "#6366F1"}
                            colors={[isDark ? "#E5E7EB" : "#6366F1"]}
                        />
                    }
                >
                    {/* Profile Header Section */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                        className="w-full"
                    >
                        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} px-4 pt-4 pb-6`}>
                            {/* Top Navigation Bar */}
                            <View className="flex-row justify-between items-center mb-6">
                                <TouchableOpacity
                                    onPress={handleBackPress}
                                    className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                >
                                    <ArrowLeft size={20} color={isDark ? '#E2E8F0' : '#1F2937'} />
                                </TouchableOpacity>

                                <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Profile
                                </Text>

                                <TouchableOpacity
                                    onPress={handleSettingsPress}
                                    className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                >
                                    <Settings size={20} color={isDark ? '#E2E8F0' : '#1F2937'} />
                                </TouchableOpacity>
                            </View>

                            {/* Profile Info */}
                            <View className="flex-row items-center">
                                <MotiView
                                    from={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', delay: 200 }}
                                    className="mr-4"
                                >
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?fit=crop&w=300&h=300' }}
                                        className="h-24 w-24 rounded-full"
                                    />
                                    <View className="absolute -bottom-1 -right-1 bg-primary-500 h-8 w-8 rounded-full items-center justify-center border-2 border-white">
                                        <Text className="text-white font-montserrat-bold text-xs">{userDetails?.user?.user?.dailyGoal || 7}</Text>
                                    </View>
                                </MotiView>

                                <View className="flex-1">
                                    <MotiText
                                        from={{ opacity: 0, translateY: 10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ type: 'timing', duration: 600, delay: 300 }}
                                        className={`text-xl font-montserrat-bold mb-1 ${
                                            isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                    >
                                        {userDetails?.user?.user?.user_name || "John Doe"}
                                    </MotiText>

                                    <MotiView
                                        from={{ opacity: 0, translateY: 10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ type: 'timing', duration: 600, delay: 400 }}
                                    >
                                        <View className="flex-row items-center mb-2">
                                            <Award size={14} color="#6366F1" />
                                            <Text className={`ml-1.5 text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                Habit Master
                                            </Text>
                                        </View>

                                        <View className="flex-row items-center bg-primary-100 rounded-full py-1.5 px-3 self-start">
                                            <Trophy size={14} color="#6366F1" />
                                            <Text className="ml-1.5 text-primary-700 font-montserrat-medium text-sm">
                                                {userStats.totalPoints.toLocaleString()} Points
                                            </Text>
                                        </View>
                                    </MotiView>
                                </View>
                            </View>

                            {/* User Stats Section */}
                            <MotiView
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', duration: 600, delay: 500 }}
                                className={`flex-row justify-between mt-6 p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            >
                                <View className="items-center flex-1 px-2">
                                    <View className="flex-row items-center justify-center">
                                        <Calendar size={16} color="#6366F1" />
                                        <Text className={`ml-1.5 font-montserrat-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userDetails?.user?.user?.currentDailyStreak || userStats.streakDays}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
                                        Day Streak
                                    </Text>
                                </View>

                                <View className="h-12 w-px bg-gray-600/20"></View>

                                <View className="items-center flex-1 px-2">
                                    <View className="flex-row items-center justify-center">
                                        <Star size={16} color="#6366F1" />
                                        <Text className={`ml-1.5 font-montserrat-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userDetails?.user?.user?.totalHabitsCompleted || userStats.completedHabits}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
                                        Habits Done
                                    </Text>
                                </View>

                                <View className="h-12 w-px bg-gray-600/20"></View>

                                <View className="items-center flex-1 px-2">
                                    <View className="flex-row items-center justify-center">
                                        <Award size={16} color="#6366F1" />
                                        <Text className={`ml-1.5 font-montserrat-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userDetails?.user?.user?.dailyGoal || userStats.level}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
                                        Daily Goal
                                    </Text>
                                </View>
                            </MotiView>
                        </View>
                    </MotiView>

                    {/* Tab Content */}
                    <AnimatePresence>
                        <MotiView
                            key={activeTab}
                            from={{ opacity: 0, translateX: 10 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            exit={{ opacity: 0, translateX: -10 }}
                            transition={{ type: 'timing', duration: 300 }}
                            className="p-4 flex-1 min-h-[400px]"
                        >
                            {activeTab === 'Activity' && <ActivityComponent isDark={isDark} />}
                            {activeTab === 'Achievements' && <AchievementsComponent isDark={isDark} />}
                            {activeTab === 'Friends' && <FriendsComponent isDark={isDark} />}
                            {activeTab === 'Blogs' && <BlogsComponent isDark={isDark} />}
                        </MotiView>
                    </AnimatePresence>

                    {/* Extra padding to avoid tab bar overlap */}
                    <View className="h-24" />
                </ScrollView>

                {/* Fixed Tab Bar at Bottom */}
                <View className={`absolute bottom-0 left-0 right-0 ${isDark ? 'bg-gray-800' : 'bg-white'} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
                    <SafeAreaView edges={['bottom']}>
                        <View className="flex-row justify-around items-center py-2">
                            {tabs.map((tab) => (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => handleTabChange(tab.id)}
                                    className="items-center py-1 px-3"
                                >
                                    <tab.icon
                                        size={22}
                                        color={activeTab === tab.id ? '#6366F1' : isDark ? '#9CA3AF' : '#6B7280'}
                                    />
                                    <Text
                                        className={`text-xs font-montserrat-medium mt-1 ${
                                            activeTab === tab.id ? 'text-primary-500' : isDark ? 'text-gray-400' : 'text-gray-500'
                                        }`}
                                    >
                                        {tab.id}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default Profile;