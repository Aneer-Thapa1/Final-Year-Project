// screens/Leaderboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, useColorScheme, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Trophy, Medal, Crown, Award, ChevronRight, Calendar, Flame, BarChart2, Users, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Import the leaderboard service
import { useLeaderboard, LeaderboardUser, DomainLeaderboardItem } from '../../services/leaderboardService';

const LeaderboardScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [activeTab, setActiveTab] = useState<'points' | 'streaks' | 'domains'>('points');
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

    const {
        leaderboardData,
        currentUser,
        userTopDomain,
        loading,
        error,
        fetchLeaderboard
    } = useLeaderboard();

    // Initialize data on mount and when tab/timeframe changes
    useEffect(() => {
        fetchLeaderboard(activeTab, timeframe);
    }, [activeTab, timeframe]);

    const handleRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchLeaderboard(activeTab, timeframe);
    };

    const changeTab = (tab: 'points' | 'streaks' | 'domains') => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const changeTimeframe = (newTimeframe: 'weekly' | 'monthly' | 'allTime') => {
        if (newTimeframe !== timeframe) {
            setTimeframe(newTimeframe);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const RankBadge = ({ rank }: { rank: number }) => {
        const getBadgeColors = () => {
            switch (rank) {
                case 1:
                    return { bg: 'bg-yellow-500', icon: <Crown size={20} color="#FFF" /> };
                case 2:
                    return { bg: 'bg-gray-400', icon: <Medal size={20} color="#FFF" /> };
                case 3:
                    return { bg: 'bg-orange-500', icon: <Trophy size={20} color="#FFF" /> };
                default:
                    return { bg: isDark ? 'bg-gray-700' : 'bg-gray-200', text: `${rank}` };
            }
        };

        const { bg, icon, text } = getBadgeColors();

        return (
            <View className={`w-8 h-8 rounded-full ${bg} items-center justify-center`}>
                {icon || <Text className={`text-sm font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>{text}</Text>}
            </View>
        );
    };

    const LeaderboardUserCard = ({ user, index }: { user: LeaderboardUser; index: number }) => (
        <MotiView
            key={`user-${user.user_id}-${index}`}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: index * 100 }}
            className={`mb-3 p-4 rounded-2xl ${user.isCurrentUser ? (isDark ? 'bg-primary-900/20' : 'bg-primary-50') : (isDark ? 'bg-gray-800' : 'bg-white')}`}
        >
            <View className="flex-row items-center">
                <RankBadge rank={user.rank} />

                <View className="w-10 h-10 mx-3 rounded-full overflow-hidden bg-gray-200">
                    {user.avatar ? (
                        <Image
                            source={{ uri: user.avatar }}
                            className="w-10 h-10"
                        />
                    ) : (
                        <View className="w-10 h-10 items-center justify-center bg-gray-300">
                            <Users size={18} color="#666" />
                        </View>
                    )}
                </View>

                <View className="flex-1">
                    <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user.user_name}
                        {user.isCurrentUser && <Text className="text-primary-500"> (You)</Text>}
                    </Text>

                    <View className="flex-row items-center mt-1">
                        {activeTab === 'points' && (
                            <>
                                <Award size={14} color={isDark ? "#9CA3AF" : "#4B5563"} />
                                <Text className={`ml-1 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {user.points || 0} points
                                </Text>
                            </>
                        )}

                        {activeTab === 'streaks' && (
                            <>
                                <Flame size={14} color="#F97316" />
                                <Text className={`ml-1 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {user.currentStreak || 0} day streak
                                </Text>
                            </>
                        )}

                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />

                        {user.longestStreak > 0 && (
                            <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Best: {user.longestStreak} days
                            </Text>
                        )}
                    </View>
                </View>

                <View className="bg-primary-100 rounded-full px-3 py-1">
                    <Text className="text-primary-600 text-xs font-montserrat-semibold">
                        {activeTab === 'streaks'
                            ? `${user.currentStreak || 0}🔥`
                            : activeTab === 'points'
                                ? `${user.points || 0}pts`
                                : `${user.totalCompletions || 0}✓`}
                    </Text>
                </View>
            </View>
        </MotiView>
    );

    const DomainCard = ({ domain, index }: { domain: DomainLeaderboardItem; index: number }) => (
        <MotiView
            key={`domain-${domain.domain_id}-${index}`}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: index * 100 }}
            className={`mb-3 p-4 rounded-2xl ${domain.domain_id === userTopDomain?.domain_id ? (isDark ? 'bg-primary-900/20' : 'bg-primary-50') : (isDark ? 'bg-gray-800' : 'bg-white')}`}
        >
            <View className="flex-row items-center">
                <RankBadge rank={domain.rank} />

                <View
                    className="w-10 h-10 mx-3 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${domain.color}20` }}
                >
                    {domain.icon ? (
                        <Text className="text-lg">{domain.icon}</Text>
                    ) : (
                        <BarChart2 size={20} color={domain.color || '#6366F1'} />
                    )}
                </View>

                <View className="flex-1">
                    <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {domain.name}
                        {domain.domain_id === userTopDomain?.domain_id && <Text className="text-primary-500"> (Your Top)</Text>}
                    </Text>

                    <View className="flex-row items-center mt-1">
                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {domain.habitCount} habits
                        </Text>

                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />

                        <Users size={14} color={isDark ? "#9CA3AF" : "#4B5563"} />
                        <Text className={`ml-1 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {domain.userCount} users
                        </Text>
                    </View>
                </View>

                <View className="bg-primary-100 rounded-full px-3 py-1">
                    <Text className="text-primary-600 text-xs font-montserrat-semibold">
                        {domain.completions}✓
                    </Text>
                </View>
            </View>
        </MotiView>
    );

    const CurrentUserRankCard = () => {
        if (!currentUser && !userTopDomain) return null;

        if (activeTab === 'domains' && userTopDomain) {
            return (
                <MotiView
                    from={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    <Text className={`font-montserrat-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Your Top Category
                    </Text>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ backgroundColor: `${userTopDomain.color}20` }}
                            >
                                {userTopDomain.icon ? (
                                    <Text className="text-lg">{userTopDomain.icon}</Text>
                                ) : (
                                    <BarChart2 size={20} color={userTopDomain.color || '#6366F1'} />
                                )}
                            </View>
                            <View className="ml-3">
                                <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {userTopDomain.name}
                                </Text>
                                <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Rank #{userTopDomain.rank} • {userTopDomain.completions} completions
                                </Text>
                            </View>
                        </View>
                        <View className="bg-primary-100 rounded-full w-9 h-9 items-center justify-center">
                            <Text className="font-montserrat-bold text-primary-600">
                                #{userTopDomain.rank}
                            </Text>
                        </View>
                    </View>
                </MotiView>
            );
        }

        if (currentUser) {
            return (
                <MotiView
                    from={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    <Text className={`font-montserrat-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Your Position
                    </Text>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                {currentUser.avatar ? (
                                    <Image
                                        source={{ uri: currentUser.avatar }}
                                        className="w-10 h-10"
                                    />
                                ) : (
                                    <View className="w-10 h-10 items-center justify-center bg-gray-300">
                                        <Users size={18} color="#666" />
                                    </View>
                                )}
                            </View>
                            <View className="ml-3">
                                <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {currentUser.user_name}
                                </Text>
                                <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Rank #{currentUser.rank} • {
                                    activeTab === 'streaks'
                                        ? `${currentUser.currentStreak || 0} day streak`
                                        : activeTab === 'points'
                                            ? `${currentUser.points || 0} points`
                                            : `${currentUser.totalCompletions || 0} completions`
                                }
                                </Text>
                            </View>
                        </View>
                        <View className="bg-primary-100 rounded-full w-9 h-9 items-center justify-center">
                            <Text className="font-montserrat-bold text-primary-600">
                                #{currentUser.rank}
                            </Text>
                        </View>
                    </View>
                </MotiView>
            );
        }

        return null;
    };

    // Type guard to check if leaderboard data is user type or domain type
    const isUserLeaderboard = activeTab !== 'domains';

    return (
        <SafeAreaView edges={[ 'left', 'right']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={handleRefresh}
                        colors={['#6366F1']}
                        tintColor={isDark ? '#E5E7EB' : '#6366F1'}
                    />
                }
            >
                {/* Header */}
                <View className="px-4 pt-2 pb-4">
                    <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Leaderboard
                    </Text>
                    <Text className={`text-sm font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        See how you rank against others
                    </Text>
                </View>

                {/* Timeframe Toggle - Only show for points and domains tabs */}
                {activeTab !== 'streaks' && (
                    <View className="flex-row px-4 mb-4">
                        <TouchableOpacity
                            className={`flex-1 items-center py-2 rounded-l-lg border ${
                                timeframe === 'weekly'
                                    ? (isDark ? 'bg-primary-900 border-primary-700' : 'bg-primary-100 border-primary-200')
                                    : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
                            }`}
                            onPress={() => changeTimeframe('weekly')}
                        >
                            <Text className={`font-montserrat-medium ${
                                timeframe === 'weekly'
                                    ? 'text-primary-500'
                                    : (isDark ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                                This Week
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 items-center py-2 border ${
                                timeframe === 'monthly'
                                    ? (isDark ? 'bg-primary-900 border-primary-700' : 'bg-primary-100 border-primary-200')
                                    : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
                            }`}
                            onPress={() => changeTimeframe('monthly')}
                        >
                            <Text className={`font-montserrat-medium ${
                                timeframe === 'monthly'
                                    ? 'text-primary-500'
                                    : (isDark ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                                This Month
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 items-center py-2 rounded-r-lg border ${
                                timeframe === 'allTime'
                                    ? (isDark ? 'bg-primary-900 border-primary-700' : 'bg-primary-100 border-primary-200')
                                    : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
                            }`}
                            onPress={() => changeTimeframe('allTime')}
                        >
                            <Text className={`font-montserrat-medium ${
                                timeframe === 'allTime'
                                    ? 'text-primary-500'
                                    : (isDark ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                                All Time
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tab Navigation */}
                <View className={`flex-row px-2 mb-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <TouchableOpacity
                        className={`flex-1 items-center py-3 ${activeTab === 'points' ? (isDark ? 'border-b-2 border-primary-400' : 'border-b-2 border-primary-500') : ''}`}
                        onPress={() => changeTab('points')}
                    >
                        <Award size={20} color={activeTab === 'points' ? (isDark ? '#A5B4FC' : '#6366F1') : (isDark ? '#9CA3AF' : '#6B7280')} />
                        <Text className={`mt-1 text-xs font-montserrat-medium ${activeTab === 'points' ? (isDark ? 'text-primary-400' : 'text-primary-500') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                            Points
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 items-center py-3 ${activeTab === 'streaks' ? (isDark ? 'border-b-2 border-primary-400' : 'border-b-2 border-primary-500') : ''}`}
                        onPress={() => changeTab('streaks')}
                    >
                        <Flame size={20} color={activeTab === 'streaks' ? (isDark ? '#A5B4FC' : '#6366F1') : (isDark ? '#9CA3AF' : '#6B7280')} />
                        <Text className={`mt-1 text-xs font-montserrat-medium ${activeTab === 'streaks' ? (isDark ? 'text-primary-400' : 'text-primary-500') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                            Streaks
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 items-center py-3 ${activeTab === 'domains' ? (isDark ? 'border-b-2 border-primary-400' : 'border-b-2 border-primary-500') : ''}`}
                        onPress={() => changeTab('domains')}
                    >
                        <BarChart2 size={20} color={activeTab === 'domains' ? (isDark ? '#A5B4FC' : '#6366F1') : (isDark ? '#9CA3AF' : '#6B7280')} />
                        <Text className={`mt-1 text-xs font-montserrat-medium ${activeTab === 'domains' ? (isDark ? 'text-primary-400' : 'text-primary-500') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                            Categories
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Your Rank Section */}
                {(currentUser || userTopDomain) && (
                    <View className="px-4 mb-6">
                        <CurrentUserRankCard />
                    </View>
                )}

                {/* Leaderboard List */}
                <View className="px-4 mb-8">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {activeTab === 'points' ? 'Top Points' :
                                activeTab === 'streaks' ? 'Longest Streaks' :
                                    'Top Categories'}
                        </Text>
                        <View className="flex-row items-center">
                            {activeTab !== 'streaks' && (
                                <Text className={`mr-2 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {timeframe === 'weekly' ? 'This Week' :
                                        timeframe === 'monthly' ? 'This Month' : 'All Time'}
                                </Text>
                            )}
                            <Calendar size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        </View>
                    </View>

                    {loading && !leaderboardData.length ? (
                        <View className="py-12 items-center justify-center">
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text className={`mt-4 font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Loading leaderboard...
                            </Text>
                        </View>
                    ) : error ? (
                        <View className="py-12 items-center justify-center">
                            <Text className={`text-center font-montserrat-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                {error}
                            </Text>
                            <TouchableOpacity
                                className="mt-4 flex-row items-center bg-primary-100 px-4 py-2 rounded-lg"
                                onPress={handleRefresh}
                            >
                                <RefreshCw size={16} color="#6366F1" />
                                <Text className="ml-2 text-primary-600 font-montserrat-medium">
                                    Try Again
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : leaderboardData.length === 0 ? (
                        <View className="py-12 items-center justify-center">
                            <Text className={`text-center font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                No data available for this time period.
                            </Text>
                        </View>
                    ) : isUserLeaderboard ? (
                        // For points and streaks tabs
                        leaderboardData.map((user, index) => (
                            <LeaderboardUserCard
                                key={`user-${(user as LeaderboardUser).user_id}-${index}`}
                                user={user as LeaderboardUser}
                                index={index}
                            />
                        ))
                    ) : (
                        // For domains tab
                        leaderboardData.map((domain, index) => (
                            <DomainCard
                                key={`domain-${(domain as DomainLeaderboardItem).domain_id}-${index}`}
                                domain={domain as DomainLeaderboardItem}
                                index={index}
                            />
                        ))
                    )}
                </View>

                {/* Bottom space for better scrolling */}
                <View className="h-16" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default LeaderboardScreen;