// screens/Home.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { HabitCard } from '../../components/HabitCard';
import { UpcomingHabit } from '../../components/UpcomingHabit';
import { getUserHabits, getUpcomingHabits, logHabitCompletion } from '../../services/habitService';

interface Habit {
    habit_id: number;
    name: string;
    description: string | null;
    domain_id: number;
    frequency_type_id: number;
    frequency_value: number;
    frequency_interval: number;
    start_date: string;
    end_date: string | null;
    specific_time: string | null;
    is_active: boolean;
    skip_on_vacation: boolean;
    streak: {
        current_streak: number;
        longest_streak: number;
    };
    logs: {
        completed_at: string;
        mood_rating?: number;
        notes?: string;
    }[];
}

export const Home = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [habits, setHabits] = useState<Habit[]>([]);
    const [upcomingHabits, setUpcomingHabits] = useState<Habit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [habitsData, upcomingData] = await Promise.all([
                getUserHabits(),
                getUpcomingHabits()
            ]);

            // Filter active habits
            const activeHabits = habitsData.filter((habit: Habit) => habit.is_active);

            setHabits(activeHabits);
            setUpcomingHabits(upcomingData);
            setError(null);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load habits');
        } finally {
            setIsLoading(false);
        }
    };

    const isHabitCompletedToday = (habit: Habit): boolean => {
        if (!habit.logs || habit.logs.length === 0) return false;

        const today = new Date();
        const lastLog = new Date(habit.logs[habit.logs.length - 1].completed_at);

        return (
            lastLog.getDate() === today.getDate() &&
            lastLog.getMonth() === today.getMonth() &&
            lastLog.getFullYear() === today.getFullYear()
        );
    };

    const handleComplete = async (habitId: number) => {
        try {
            const completionData = {
                completed_at: new Date().toISOString(),
                mood_rating: 5 // Default mood rating, you might want to make this configurable
            };

            await logHabitCompletion(habitId, completionData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData(); // Reload data to get updated streaks
        } catch (err) {
            console.error('Error completing habit:', err);
            setError('Failed to complete habit');
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0284c7" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
            <SafeAreaView className="flex-1" edges={['top']}>
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                >
                    {error && (
                        <Text className="text-red-500 text-center my-4">{error}</Text>
                    )}

                    {/* Today's Habits */}
                    <Text className={`text-xl font-montserrat-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Today's Habits
                    </Text>
                    {habits.map(habit => (
                        <HabitCard
                            key={habit.habit_id}
                            habit={{
                                title: habit.name,
                                description: habit.description || '',
                                frequency: `${habit.frequency_value} times per ${
                                    habit.frequency_interval === 1 ? 'day' :
                                        habit.frequency_interval === 7 ? 'week' : 'month'
                                }`,
                                time: habit.specific_time
                                    ? new Date(habit.specific_time).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : 'Anytime',
                                streak: habit.streak?.current_streak || 0
                            }}
                            isDark={isDark}
                            onComplete={() => handleComplete(habit.habit_id)}
                            isCompleted={isHabitCompletedToday(habit)}
                        />
                    ))}

                    {/* Coming Up Next Section */}
                    {upcomingHabits.length > 0 && (
                        <View className="mt-8 mb-6">
                            <Text className={`text-xl font-montserrat-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Coming Up Next
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 16 }}
                            >
                                {upcomingHabits.map(habit => (
                                    <UpcomingHabit
                                        key={habit.habit_id}
                                        habit={{
                                            title: habit.name,
                                            time: habit.specific_time
                                                ? new Date(habit.specific_time).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'Anytime'
                                        }}
                                        isDark={isDark}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;