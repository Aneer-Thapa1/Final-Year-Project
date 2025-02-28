// screens/Analytics.tsx
import React from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'recharts';
import { MotiView } from 'moti';
import {
    Trophy,
    Flame,
    Calendar,
    TrendingUp,
    Activity
} from 'lucide-react-native';

const Analytics = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const mockData = {
        weeklyCompletion: [
            { name: 'Mon', value: 85 },
            { name: 'Tue', value: 90 },
            { name: 'Wed', value: 75 },
            { name: 'Thu', value: 95 },
            { name: 'Fri', value: 80 },
            { name: 'Sat', value: 70 },
            { name: 'Sun', value: 85 }
        ],
        monthlyProgress: [
            { name: 'Week 1', completed: 22, total: 28 },
            { name: 'Week 2', completed: 25, total: 28 },
            { name: 'Week 3', completed: 24, total: 28 },
            { name: 'Week 4', completed: 26, total: 28 }
        ],
        topHabits: [
            { name: 'Morning Meditation', streak: 15, completion: 95 },
            { name: 'Evening Run', streak: 12, completion: 88 },
            { name: 'Reading', streak: 10, completion: 82 }
        ]
    };

    const StatsCard = ({ title, value, icon, subtitle }: {
        title: string;
        value: string;
        icon: React.ReactNode;
        subtitle: string;
    }) => (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} flex-1 mx-2`}
        >
            <View className="flex-row items-center justify-between mb-2">
                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {title}
                </Text>
                {icon}
            </View>
            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {value}
            </Text>
            <Text className={`text-xs font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {subtitle}
            </Text>
        </MotiView>
    );

    const HabitProgressCard = ({ habit }: {
        habit: { name: string; streak: number; completion: number }
    }) => (
        <View className={`mb-3 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-2">
                <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {habit.name}
                </Text>
                <View className="flex-row items-center">
                    <Flame size={16} color="#F97316" />
                    <Text className="ml-1 font-montserrat text-orange-500">
                        {habit.streak} days
                    </Text>
                </View>
            </View>
            <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${habit.completion}%` }}
                />
            </View>
            <Text className={`mt-1 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {habit.completion}% completion rate
            </Text>
        </View>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="px-4 pb-6">
                    <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Analytics
                    </Text>
                    <Text className={`text-sm font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Track your progress and insights
                    </Text>
                </View>

                {/* Stats Overview */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="px-2 mb-6"
                >
                    <StatsCard
                        title="Current Streak"
                        value="15 days"
                        icon={<Flame size={20} color="#F97316" />}
                        subtitle="Best: 21 days"
                    />
                    <StatsCard
                        title="Monthly Average"
                        value="87%"
                        icon={<TrendingUp size={20} color="#2563EB" />}
                        subtitle="Last month: 82%"
                    />
                    <StatsCard
                        title="Total Habits"
                        value="8"
                        icon={<Activity size={20} color="#10B981" />}
                        subtitle="5 active now"
                    />
                </ScrollView>

                {/* Weekly Progress */}
                <View className="px-4 mb-6">
                    <View className="flex-row items-center mb-4">
                        <Calendar size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                        <Text className={`text-lg font-montserrat-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Weekly Progress
                        </Text>
                    </View>
                    <View className={`p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        {/* Replace with actual chart component */}
                        <View className="h-48 justify-center items-center">
                            <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Chart placeholder
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Top Performing Habits */}
                <View className="px-4 mb-6">
                    <View className="flex-row items-center mb-4">
                        <Trophy size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                        <Text className={`text-lg font-montserrat-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Top Performing Habits
                        </Text>
                    </View>
                    {mockData.topHabits.map((habit, index) => (
                        <HabitProgressCard key={index} habit={habit} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Analytics;