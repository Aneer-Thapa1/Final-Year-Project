import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import {
    ArrowLeft,
    Clock,
    Flame,
    Target,
    BarChart2,
    Calendar
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getHabitById } from '@/services/habitService';

// Interfaces
interface HabitLog {
    log_id: number;
    completed: boolean;
    completed_at: string;
    mood?: number;
    duration_completed?: number;
    count_completed?: number;
    numeric_completed?: number;
}

interface Streak {
    current_streak?: number;
    longest_streak?: number;
    start_date?: string;
}

interface HabitDetails {
    habit_id: number;
    name: string;
    description?: string;
    frequency: string;
    time: string;
    difficulty: string;
    tracking_type: string;
    streak?: Streak | Streak[]; // Updated to handle both object and array
    logs: HabitLog[];
}

export default function HabitDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [habitDetails, setHabitDetails] = useState<HabitDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHabitDetails = async () => {
            try {
                setIsLoading(true);
                // Convert id to number
                const habitId = parseInt(id || '0', 10);

                if (isNaN(habitId)) {
                    throw new Error('Invalid habit ID');
                }

                const details = await getHabitById(habitId);
                setHabitDetails(details);
            } catch (error) {
                console.error('Failed to fetch habit details', error);
                setError('Failed to load habit details');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHabitDetails();
    }, [id]);

    // Helper function to safely get streak values
    const getStreakValues = () => {
        if (!habitDetails?.streak) {
            return { current: 0, longest: 0 };
        }

        // If streak is an array, get the first element
        if (Array.isArray(habitDetails.streak)) {
            const firstStreak = habitDetails.streak[0] || {};
            return {
                current: firstStreak.current_streak || 0,
                longest: firstStreak.longest_streak || 0
            };
        }

        // If streak is an object
        return {
            current: habitDetails.streak.current_streak || 0,
            longest: habitDetails.streak.longest_streak || 0
        };
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    if (error || !habitDetails) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
                <Text className="text-red-500">{error || 'No habit details found'}</Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 px-4 py-2 bg-primary-500 rounded"
                >
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Get streak values for display
    const streakValues = getStreakValues();

    return (
        <ScrollView
            className="flex-1 bg-white dark:bg-gray-900"
            contentContainerStyle={{ paddingBottom: 20 }}
        >
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4"
                >
                    <ArrowLeft
                        size={24}
                        color="#6366F1"
                    />
                </TouchableOpacity>
                <Text className="text-xl font-montserrat-bold dark:text-white">
                    {habitDetails.name}
                </Text>
            </View>

            {/* Habit Overview */}
            <View className="p-4">
                {/* Description */}
                {habitDetails.description && (
                    <View className="mb-4">
                        <Text className="text-gray-600 dark:text-gray-300">
                            {habitDetails.description}
                        </Text>
                    </View>
                )}

                {/* Habit Details */}
                <View className="space-y-3">
                    {/* Frequency */}
                    <View className="flex-row items-center">
                        <Calendar
                            size={20}
                            color="#6366F1"
                            className="mr-3"
                        />
                        <Text className="text-gray-700 dark:text-gray-200">
                            Frequency: {habitDetails.frequency}
                        </Text>
                    </View>

                    {/* Time */}
                    <View className="flex-row items-center">
                        <Clock
                            size={20}
                            color="#6366F1"
                            className="mr-3"
                        />
                        <Text className="text-gray-700 dark:text-gray-200">
                            Time: {habitDetails.time}
                        </Text>
                    </View>

                    {/* Streak */}
                    <View className="flex-row items-center">
                        <Flame
                            size={20}
                            color="#F97316"
                            className="mr-3"
                        />
                        <Text className="text-gray-700 dark:text-gray-200">
                            Current Streak: {streakValues.current} days
                            {' '}(Longest: {streakValues.longest} days)
                        </Text>
                    </View>

                    {/* Difficulty */}
                    <View className="flex-row items-center">
                        <Target
                            size={20}
                            color="#6366F1"
                            className="mr-3"
                        />
                        <Text className="text-gray-700 dark:text-gray-200">
                            Difficulty: {habitDetails.difficulty}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Habit Logs */}
            <View className="p-4">
                <Text className="text-lg font-montserrat-bold mb-3 dark:text-white">
                    Habit History
                </Text>
                {habitDetails.logs.length === 0 ? (
                    <Text className="text-gray-500 dark:text-gray-400">
                        No logs yet. Start tracking your habit!
                    </Text>
                ) : (
                    habitDetails.logs.map((log) => (
                        <View
                            key={log.log_id}
                            className={`
                                flex-row justify-between items-center 
                                p-3 rounded-lg mb-2
                                ${log.completed
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-red-50 dark:bg-red-900/20'
                            }
                            `}
                        >
                            <View>
                                <Text className={`
                                    font-montserrat-medium
                                    ${log.completed
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-red-700 dark:text-red-300'
                                }
                                `}>
                                    {log.completed ? 'Completed' : 'Missed'}
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(log.completed_at).toLocaleDateString()}
                                </Text>
                            </View>
                            {log.mood && (
                                <Text className="text-sm text-gray-600 dark:text-gray-300">
                                    Mood: {log.mood}/5
                                </Text>
                            )}
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}