// screens/Rank.tsx
import React from 'react';
import { View, Text, ScrollView, Image, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Trophy, Medal, Crown, Star, ChevronRight, Award } from 'lucide-react-native';

interface LeaderboardUser {
    id: number;
    name: string;
    avatar: string;
    points: number;
    streak: number;
    rank: number;
    badges: string[];
    completionRate: number;
}

const Rank = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const mockLeaderboardData: LeaderboardUser[] = [
        {
            id: 1,
            name: "Sarah Johnson",
            avatar: "/api/placeholder/40/40",
            points: 2840,
            streak: 45,
            rank: 1,
            badges: ["🏃‍♂️", "📚", "🧘‍♀️"],
            completionRate: 98
        },
        {
            id: 2,
            name: "John Smith",
            avatar: "/api/placeholder/40/40",
            points: 2720,
            streak: 38,
            rank: 2,
            badges: ["💪", "🎨", "🏃‍♂️"],
            completionRate: 95
        },
        {
            id: 3,
            name: "Emily Davis",
            avatar: "/api/placeholder/40/40",
            points: 2650,
            streak: 32,
            rank: 3,
            badges: ["📚", "🧘‍♀️", "🎯"],
            completionRate: 92
        },
        // Add more users here...
    ];

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
                    return { bg: 'bg-gray-600', text: `#${rank}` };
            }
        };

        const { bg, icon, text } = getBadgeColors();

        return (
            <View className={`w-8 h-8 rounded-full ${bg} items-center justify-center`}>
                {icon || <Text className="text-white font-montserrat-bold">{text}</Text>}
            </View>
        );
    };

    const LeaderboardCard = ({ user, index }: { user: LeaderboardUser; index: number }) => (
        <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ delay: index * 100 }}
            className={`mb-3 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
            <View className="flex-row items-center">
                <RankBadge rank={user.rank} />
                <Image
                    source={{ uri: user.avatar }}
                    className="w-10 h-10 rounded-full mx-3"
                />
                <View className="flex-1">
                    <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.points} pts
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-gray-400 mx-2" />
                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {user.streak} day streak
                        </Text>
                    </View>
                </View>
                <View className="flex-row items-center">
                    {user.badges.map((badge, idx) => (
                        <Text key={idx} className="text-lg ml-1">{badge}</Text>
                    ))}
                </View>
            </View>
        </MotiView>
    );

    const AchievementCard = ({ title, description, icon, progress }: {
        title: string;
        description: string;
        icon: React.ReactNode;
        progress: number;
    }) => (
        <View className={`p-4 rounded-2xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                    <View className="p-2 rounded-xl bg-primary-500/10 mr-3">
                        {icon}
                    </View>
                    <View>
                        <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </Text>
                        <Text className={`text-xs font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {description}
                        </Text>
                    </View>
                </View>
                <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {progress}%
                </Text>
            </View>
            <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${progress}%` }}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="px-4 pb-6">
                    <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Leaderboard
                    </Text>
                    <Text className={`text-sm font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        See how you rank against others
                    </Text>
                </View>

                {/* Your Rank Section */}
                <View className="px-4 mb-8">
                    <Text className={`text-lg font-montserrat-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Your Position
                    </Text>
                    <MotiView
                        from={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Image
                                    source={{ uri: "/api/placeholder/48/48" }}
                                    className="w-12 h-12 rounded-full"
                                />
                                <View className="ml-3">
                                    <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Your Profile
                                    </Text>
                                    <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Rank #4 • 2580 points
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity className="p-2">
                                <ChevronRight size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </View>

                {/* Top Rankings */}
                <View className="px-4 mb-8">
                    <Text className={`text-lg font-montserrat-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Top Rankings
                    </Text>
                    {mockLeaderboardData.map((user, index) => (
                        <LeaderboardCard key={user.id} user={user} index={index} />
                    ))}
                </View>

                {/* Achievements */}
                <View className="px-4 mb-8">
                    <Text className={`text-lg font-montserrat-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Your Achievements
                    </Text>
                    <AchievementCard
                        title="Habit Master"
                        description="Complete all habits for 30 days"
                        icon={<Trophy size={24} color="#2563EB" />}
                        progress={75}
                    />
                    <AchievementCard
                        title="Early Bird"
                        description="Complete morning habits for 14 days"
                        icon={<Star size={24} color="#F59E0B" />}
                        progress={90}
                    />
                    <AchievementCard
                        title="Consistency King"
                        description="Maintain 45-day streak"
                        icon={<Award size={24} color="#10B981" />}
                        progress={60}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Rank;