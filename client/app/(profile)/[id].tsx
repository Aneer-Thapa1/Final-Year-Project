// src/app/(app)/profile/[id].tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    useColorScheme,
    RefreshControl,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import {
    ArrowLeft,
    Calendar,
    Trophy,
    Edit,
    User,
    MessageCircle,
    UserPlus,
    Shield,
    Settings,
    MoreVertical,
    Check,
    Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Import your profile service hooks and functions
import { useProfile, sendFriendRequest, useUserStats, useUserFriends } from '../../services/profileService';
import { useAppSelector } from '../../store/store';

// Import your BlogPost component
import BlogPost from '../../components/BlogPost';
import images from '../../constants/images';

// Helper functions for date formatting
const formatJoinDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatLastActive = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';

    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastActive.toLocaleDateString();
};

export default function ProfileScreen() {
    const params = useLocalSearchParams();
    const userId = params.id as string;
    const router = useRouter();

    // Color scheme for dark/light mode
    const systemColorScheme = useColorScheme();
    const isDark = systemColorScheme === 'dark';

    // Get current user from state
    const currentUser = useAppSelector(state => state.user.user?.user);
    const isOwnProfile = currentUser?.user_id.toString() === userId;

    // Fetch profile data using custom hook
    const { profile, loading: loadingProfile, error: profileError, refetch: refetchProfile } = useProfile(parseInt(userId));

    // Additional data hooks
    const { stats } = useUserStats(parseInt(userId));
    const { friends } = useUserFriends(parseInt(userId));

    // Local state
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'stats', 'friends'

    // Pull to refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        await refetchProfile();
        setRefreshing(false);
    };

    // Handle sending friend request
    const handleFriendRequest = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await sendFriendRequest(parseInt(userId));
            Alert.alert('Success', 'Friend request sent');
            refetchProfile();
        } catch (error) {
            Alert.alert('Error', 'Failed to send friend request');
        }
    };

    // Handle messaging user
    const handleMessage = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
            pathname: `/(chat)/direct`,
            params: {
                recipientId: userId,
                name: profile?.user?.user_name || 'Chat'
            }
        });
    };

    // Navigate to edit profile
    const handleEditProfile = () => {
        router.push('/(app)/edit-profile');
    };

    // Handle showing the profile menu
    const handleShowMenu = () => {
        Alert.alert(
            'Profile Options',
            'Choose an action',
            [
                { text: 'View User Habits', onPress: () => console.log('View habits') },
                { text: 'Block User', onPress: () => console.log('Block user') },
                { text: 'Report User', onPress: () => console.log('Report user'), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    // Loading state
    if (loadingProfile && !profile) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Stack.Screen
                    options={{
                        headerShown: false,
                    }}
                />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#86EFAC" : "#22C55E"} />
                    <Text className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`}>
                        Loading profile...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (profileError) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Stack.Screen
                    options={{
                        headerShown: false,
                    }}
                />
                <View className="flex-1 justify-center items-center px-4">
                    <Text className={`text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'} font-montserrat-medium`}>
                        {profileError}
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-500 px-6 py-3 rounded-xl"
                        onPress={refetchProfile}
                    >
                        <Text className="text-white font-montserrat-medium">Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Custom Header */}
            <View className={`px-4 py-2 flex-row items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2"
                >
                    <ArrowLeft size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>

                <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {isOwnProfile ? 'My Profile' : 'Profile'}
                </Text>

                {!isOwnProfile ? (
                    <TouchableOpacity
                        onPress={handleShowMenu}
                        className="p-2"
                    >
                        <MoreVertical size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => router.push('/(app)/settings')}
                        className="p-2"
                    >
                        <Settings size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={isDark ? "#86EFAC" : "#22C55E"}
                    />
                }
            >
                {/* Profile Header Section */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 500 }}
                    className={`px-4 pt-6 pb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    {/* User Cover Image */}
                    {profile?.user?.cover_image && (
                        <View className="h-32 -mx-4 -mt-6 mb-4">
                            <Image
                                source={{ uri: profile.user.cover_image }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    <View className="flex-row">
                        {/* Profile Image */}
                        <View className="mr-4">
                            <Image
                                source={profile?.user?.avatar ? { uri: profile.user.avatar } : images.maleProfile}
                                className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800"
                            />

                            {/* Online status indicator */}
                            {profile?.user?.isOnline && (
                                <View className="absolute bottom-1 right-1 bg-primary-500 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800" />
                            )}
                        </View>

                        {/* Profile Stats */}
                        <View className="flex-1 justify-center">
                            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile?.user?.user_name}
                                {profile?.user?.premium_status && (
                                    <Text className="text-amber-500"> ★</Text>
                                )}
                            </Text>

                            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium mb-2`}>
                                {profile?.user?.bio || 'No bio available'}
                            </Text>

                            <View className="flex-row items-center">
                                <Calendar size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                <Text className={`ml-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular`}>
                                    Joined {formatJoinDate(profile?.user?.registeredAt)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Profile Actions */}
                    <View className="flex-row mt-4">
                        {isOwnProfile ? (
                            <TouchableOpacity
                                onPress={handleEditProfile}
                                className={`flex-1 py-2 rounded-lg flex-row justify-center items-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            >
                                <Edit size={16} color={isDark ? "#E5E7EB" : "#374151"} />
                                <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Edit Profile
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {/* Friend/Follow Button */}
                                {profile?.user?.friendship_status === 'none' ? (
                                    <TouchableOpacity
                                        onPress={handleFriendRequest}
                                        className="flex-1 py-2 rounded-lg flex-row justify-center items-center mr-2 bg-primary-500"
                                    >
                                        <UserPlus size={16} color="#FFFFFF" />
                                        <Text className="ml-2 text-white font-montserrat-medium">
                                            Add Friend
                                        </Text>
                                    </TouchableOpacity>
                                ) : profile?.user?.friendship_status === 'pending_sent' ? (
                                    <TouchableOpacity
                                        disabled
                                        className={`flex-1 py-2 rounded-lg flex-row justify-center items-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                    >
                                        <Clock size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                        <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Request Sent
                                        </Text>
                                    </TouchableOpacity>
                                ) : profile?.user?.friendship_status === 'friends' ? (
                                    <TouchableOpacity
                                        disabled
                                        className={`flex-1 py-2 rounded-lg flex-row justify-center items-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                    >
                                        <Check size={16} color={isDark ? "#86EFAC" : "#22C55E"} />
                                        <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Friends
                                        </Text>
                                    </TouchableOpacity>
                                ) : null}

                                {/* Message Button */}
                                <TouchableOpacity
                                    onPress={handleMessage}
                                    className={`flex-1 py-2 rounded-lg flex-row justify-center items-center ml-2 ${profile?.user?.friendship_status === 'friends' ? 'bg-primary-500' : isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                >
                                    <MessageCircle size={16} color={profile?.user?.friendship_status === 'friends' ? "#FFFFFF" : isDark ? "#E5E7EB" : "#374151"} />
                                    <Text className={`ml-2 font-montserrat-medium ${profile?.user?.friendship_status === 'friends' ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'}`}>
                                        Message
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Profile Stats Highlights */}
                    <View className="flex-row justify-between mt-6 py-3 border-t border-b border-gray-200 dark:border-gray-700">
                        <View className="items-center">
                            <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile?.user?.currentDailyStreak || 0}
                            </Text>
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium`}>
                                Day Streak
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile?.user?.posts_count || 0}
                            </Text>
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium`}>
                                Posts
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile?.user?.friends_count || 0}
                            </Text>
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium`}>
                                Friends
                            </Text>
                        </View>

                        <View className="items-center">
                            <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {profile?.user?.achievements_count || 0}
                            </Text>
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium`}>
                                Achievements
                            </Text>
                        </View>
                    </View>
                </MotiView>

                {/* Tab Menu */}
                <View className={`flex-row ${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <TouchableOpacity
                        className={`flex-1 py-3 px-4 ${activeTab === 'posts' ? 'border-b-2 border-primary-500' : ''}`}
                        onPress={() => setActiveTab('posts')}
                    >
                        <Text className={`text-center font-montserrat-medium ${activeTab === 'posts' ? 'text-primary-500' : isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                            Posts
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 py-3 px-4 ${activeTab === 'stats' ? 'border-b-2 border-primary-500' : ''}`}
                        onPress={() => setActiveTab('stats')}
                    >
                        <Text className={`text-center font-montserrat-medium ${activeTab === 'stats' ? 'text-primary-500' : isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                            Stats
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 py-3 px-4 ${activeTab === 'friends' ? 'border-b-2 border-primary-500' : ''}`}
                        onPress={() => setActiveTab('friends')}
                    >
                        <Text className={`text-center font-montserrat-medium ${activeTab === 'friends' ? 'text-primary-500' : isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                            Friends
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content - Posts Tab */}
                {activeTab === 'posts' && (
                    <View className="min-h-80">
                        {loadingProfile ? (
                            <View className="py-10 justify-center items-center">
                                <ActivityIndicator color={isDark ? "#86EFAC" : "#22C55E"} />
                                <Text className={`mt-3 ${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium`}>
                                    Loading posts...
                                </Text>
                            </View>
                        ) : profile?.posts?.length === 0 ? (
                            <View className="py-10 justify-center items-center">
                                <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat-medium text-center px-8`}>
                                    {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}
                                </Text>
                                {isOwnProfile && (
                                    <TouchableOpacity
                                        onPress={() => router.push('/(app)/create-post')}
                                        className="mt-4 bg-primary-500 py-2 px-6 rounded-full"
                                    >
                                        <Text className="text-white font-montserrat-semibold">
                                            Create First Post
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View className="pb-10">
                                {profile?.posts?.map((post) => (
                                    <BlogPost
                                        key={post.id}
                                        post={{
                                            ...post,
                                            content: post.content,
                                            author: profile.user.user_name,
                                            createdAt: post.createdAt,
                                            likes: post.likes,
                                            comments: post.comments,
                                            relatedHabits: []
                                        }}
                                        isDark={isDark}
                                        authorProfile={profile.user.avatar ? { uri: profile.user.avatar } : images.maleProfile}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Tab Content - Stats Tab */}
                {activeTab === 'stats' && (
                    <View className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} min-h-80`}>
                        <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} text-lg mb-4`}>
                            Habit Stats
                        </Text>

                        {profile?.streak_data ? (
                            <>
                                {/* Weekly Progress */}
                                <View className="mb-6">
                                    <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                                        Weekly Streak
                                    </Text>
                                    <View className="flex-row justify-between">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                                            <View key={index} className="items-center">
                                                <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs font-montserrat-medium mb-1`}>
                                                    {day}
                                                </Text>
                                                <View
                                                    className={`h-10 w-10 rounded-full items-center justify-center ${
                                                        profile.streak_data?.weekly_progress?.[index]?.percentage >= 100
                                                            ? 'bg-primary-500'
                                                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                                    }`}
                                                >
                                                    {profile.streak_data?.weekly_progress?.[index]?.percentage >= 100 && (
                                                        <Check size={18} color="#FFFFFF" />
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {/* Monthly Summary */}
                                <View className="mb-6">
                                    <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                                        Monthly Overview
                                    </Text>
                                    <View className="flex-row justify-between items-center">
                                        <View className={`p-4 flex-1 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'} mr-2`}>
                                            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs font-montserrat-medium mb-1`}>
                                                Days Active
                                            </Text>
                                            <Text className={`${isDark ? 'text-white' : 'text-gray-900'} text-xl font-montserrat-bold`}>
                                                {profile.streak_data?.monthly_active_days || 0}/30
                                            </Text>
                                        </View>

                                        <View className={`p-4 flex-1 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'} ml-2`}>
                                            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs font-montserrat-medium mb-1`}>
                                                Completion
                                            </Text>
                                            <Text className={`${isDark ? 'text-white' : 'text-gray-900'} text-xl font-montserrat-bold`}>
                                                {Math.round((profile.streak_data?.monthly_active_days || 0) / 30 * 100)}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Achievements */}
                                <View className="mb-6">
                                    <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
                                        Achievements
                                    </Text>
                                    {profile.achievements?.length ? (
                                        <View className="flex-row flex-wrap">
                                            {profile.achievements.map((achievement) => (
                                                <View
                                                    key={achievement.id}
                                                    className={`p-2 m-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} items-center`}
                                                    style={{ width: '30%' }}
                                                >
                                                    <Trophy size={24} color="#F59E0B" />
                                                    <Text className={`${isDark ? 'text-white' : 'text-gray-900'} text-xs font-montserrat-medium mt-1 text-center`}>
                                                        {achievement.name}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular`}>
                                            No achievements yet.
                                        </Text>
                                    )}
                                </View>
                            </>
                        ) : (
                            <View className="items-center justify-center py-8">
                                <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium text-center`}>
                                    {isOwnProfile ?
                                        "You haven't started tracking habits yet." :
                                        "This user hasn't started tracking habits yet."}
                                </Text>
                                {isOwnProfile && (
                                    <TouchableOpacity
                                        onPress={() => router.push('/(app)/habits')}
                                        className="mt-4 bg-primary-500 py-2 px-6 rounded-full"
                                    >
                                        <Text className="text-white font-montserrat-semibold">
                                            Start Tracking Habits
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Tab Content - Friends Tab */}
                {activeTab === 'friends' && (
                    <View className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} min-h-80`}>
                        <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} text-lg mb-4`}>
                            Friends
                        </Text>

                        {profile?.friends?.length ? (
                            <View>
                                {profile.friends.map((friend) => (
                                    <TouchableOpacity
                                        key={friend.user_id}
                                        className={`flex-row items-center p-3 mb-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                        onPress={() => router.push(`/(app)/profile/${friend.user_id}`)}
                                    >
                                        <Image
                                            source={friend.avatar ? { uri: friend.avatar } : images.maleProfile}
                                            className="h-12 w-12 rounded-full"
                                        />

                                        <View className="flex-1 ml-3">
                                            <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {friend.user_name}
                                                {friend.premium_status && (
                                                    <Text className="text-amber-500"> ★</Text>
                                                )}
                                            </Text>

                                            <View className="flex-row items-center">
                                                {friend.isOnline ? (
                                                    <View className="flex-row items-center">
                                                        <View className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                                                        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular`}>
                                                            Online
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular`}>
                                                        {friend.lastActive ? `Last seen ${formatLastActive(friend.lastActive)}` : "Offline"}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            className={`h-9 w-9 rounded-full ${isDark ? 'bg-gray-600' : 'bg-white'} items-center justify-center`}
                                            onPress={() => {
                                                // Navigate to chat with this friend
                                                router.push({
                                                    pathname: `/(chat)/direct`,
                                                    params: {
                                                        recipientId: friend.user_id,
                                                        name: friend.user_name
                                                    }
                                                });
                                            }}
                                        >
                                            <MessageCircle size={16} color={isDark ? "#E5E7EB" : "#4B5563"} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <View className="items-center justify-center py-8">
                                <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat-medium text-center`}>
                                    {isOwnProfile ?
                                        "You haven't added any friends yet." :
                                        "This user hasn't added any friends yet."}
                                </Text>
                                {isOwnProfile && (
                                    <TouchableOpacity
                                        onPress={() => router.push('/(app)/friends')}
                                        className="mt-4 bg-primary-500 py-2 px-6 rounded-full"
                                    ><Text className="text-white font-montserrat-semibold">
                                        Find Friends
                                    </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}