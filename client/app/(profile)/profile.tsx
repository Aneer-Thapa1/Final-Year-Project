import {
    Image,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    StatusBar,
    RefreshControl,
    FlatList,
    ActivityIndicator
} from 'react-native'
import React, { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux';
import { ArrowLeft, Settings, Trophy, Activity, Users, Calendar, Star, Award, BookOpen, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import icons from "../../constants/images";

// Import the tab components
import ActivityComponent from '../../components/ActivityComponent';
import AchievementsComponent from '../../components/AchievementsComponent';
import FriendsComponent from '../../components/FriendsComponent';
import Blog from '../../components/Blogs';
import { getUserBlogs } from '../../services/blogService';

const Profile = () => {
    const userDetails = useSelector((state) => state.user);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = useState('Activity');
    const [refreshing, setRefreshing] = useState(false);
    const [userStats, setUserStats] = useState({
        streakDays: userDetails?.currentDailyStreak || 0,
        completedHabits: userDetails?.totalHabitsCompleted || 0,
        totalPoints: userDetails?.points_gained || 1250,
        level: userDetails?.dailyGoal || 1,
    });

    // Blogs state
    const [blogs, setBlogs] = useState([]);
    const [blogsLoading, setBlogsLoading] = useState(false);
    const [blogsError, setBlogsError] = useState(null);

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

    // Fetch user blogs when Blogs tab is active
    useEffect(() => {
        if (activeTab === 'Blogs') {
            fetchUserBlogs();
        }
    }, [activeTab]);

    // Function to fetch user blogs
    const fetchUserBlogs = async () => {
        try {
            setBlogsLoading(true);
            setBlogsError(null);

            const response = await getUserBlogs(userDetails?.user_id);

            if (response && response.success && response.data) {
                setBlogs(response.data);
            } else {
                setBlogsError('Failed to fetch blogs');
            }
        } catch (err) {
            console.error('Error fetching blogs:', err);
            setBlogsError(err.toString());
        } finally {
            setBlogsLoading(false);
            setRefreshing(false);
        }
    };

    // Handle blog deletion
    const handleDeleteBlog = (blogId) => {
        // Remove blog from state
        setBlogs(prevBlogs => prevBlogs.filter(blog => blog.blog_id !== blogId));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    console.log(blogs)

    // Handle blog update
    const handleBlogUpdated = (updatedBlog) => {
        setBlogs(prevBlogs =>
            prevBlogs.map(blog =>
                blog.blog_id === updatedBlog.blog_id ? updatedBlog : blog
            )
        );
    };

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

        // If on the blogs tab, refresh blogs
        if (activeTab === 'Blogs') {
            await fetchUserBlogs();
        } else {
            // Simulate data refresh for other tabs
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
        }
    }, [activeTab]);

    // Navigation handlers
    const handleBackPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleSettingsPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings');
    };

    // Navigate to create new blog
    const handleCreateNewBlog = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('(tabs)/explore');
    };

    // Render blogs content
    const renderBlogsContent = () => {
        if (blogsLoading && !refreshing && blogs.length === 0) {
            return (
                <View className="flex-1 items-center justify-center py-8">
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading your blogs...
                    </Text>
                </View>
            );
        }

        if (blogsError && blogs.length === 0) {
            return (
                <View className="flex-1 items-center justify-center p-4">
                    <Text className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Couldn't load your blogs
                    </Text>
                    <Text className={`text-center mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {blogsError}
                    </Text>
                    <TouchableOpacity
                        onPress={fetchUserBlogs}
                        className="bg-primary-500 px-4 py-2 rounded-lg"
                    >
                        <Text className="text-white font-medium">Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <>
                {/* Create New Blog Button */}
                <TouchableOpacity
                    onPress={handleCreateNewBlog}
                    className={`mb-4 rounded-xl p-4 flex-row items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-primary-50'}`}
                >
                    <Plus size={18} color="#6366F1" />
                    <Text className="ml-2 font-medium text-primary-600">
                        Create New Blog
                    </Text>
                </TouchableOpacity>

                {blogs.length === 0 ? (
                    <View className="items-center justify-center py-8">
                        <BookOpen size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className={`mt-4 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            No blogs yet
                        </Text>
                        <Text className={`text-center mt-2 mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Share your habit journey by creating your first blog
                        </Text>
                    </View>
                ) : (
                    blogs.map((blog, index) => (
                        <Blog
                            key={blog.blog_id?.toString() || index.toString()}
                            blog={blog}
                            isDark={isDark}
                            onDeleteBlog={handleDeleteBlog}
                            onBlogUpdated={handleBlogUpdated}
                        />
                    ))
                )}
            </>
        );
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

                                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                                        source={userDetails?.avatar ? { uri: userDetails.avatar } : icons.blogImage}
                                        className="h-24 w-24 rounded-full"
                                    />
                                    <View className="absolute -bottom-1 -right-1 bg-primary-500 h-8 w-8 rounded-full items-center justify-center border-2 border-white">
                                        <Text className="text-white font-bold text-xs">{userStats.level}</Text>
                                    </View>
                                </MotiView>

                                <View className="flex-1">
                                    <MotiText
                                        from={{ opacity: 0, translateY: 10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ type: 'timing', duration: 600, delay: 300 }}
                                        className={`text-xl font-bold mb-1 ${
                                            isDark ? 'text-white' : 'text-gray-900'
                                        }`}
                                    >
                                        {userDetails?.user_name || "Name not found!"}
                                    </MotiText>

                                    <MotiView
                                        from={{ opacity: 0, translateY: 10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ type: 'timing', duration: 600, delay: 400 }}
                                    >
                                        <View className="flex-row items-center mb-2">
                                            <Award size={14} color="#6366F1" />
                                            <Text className={`ml-1.5 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                Habit Master
                                            </Text>
                                        </View>

                                        <View className="flex-row items-center bg-primary-100 rounded-full py-1.5 px-3 self-start">
                                            <Trophy size={14} color="#6366F1" />
                                            <Text className="ml-1.5 text-primary-700 font-medium text-sm">
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
                                        <Text className={`ml-1.5 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userStats.streakDays}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
                                        Day Streak
                                    </Text>
                                </View>

                                <View className="h-12 w-px bg-gray-600/20"></View>

                                <View className="items-center flex-1 px-2">
                                    <View className="flex-row items-center justify-center">
                                        <Star size={16} color="#6366F1" />
                                        <Text className={`ml-1.5 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userStats.completedHabits}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
                                        Habits Done
                                    </Text>
                                </View>

                                <View className="h-12 w-px bg-gray-600/20"></View>

                                <View className="items-center flex-1 px-2">
                                    <View className="flex-row items-center justify-center">
                                        <Award size={16} color="#6366F1" />
                                        <Text className={`ml-1.5 font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {userStats.level}
                                        </Text>
                                    </View>
                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center mt-1`}>
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
                            {activeTab === 'Blogs' && renderBlogsContent()}
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
                                        className={`text-xs font-medium mt-1 ${
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