import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    useColorScheme
} from 'react-native';
import {
    RepeatIcon,
    Flame,
    CheckCircle2,
    Edit3,
    TrendingUp,
    AlertCircle
} from 'lucide-react-native';

// Habit Interface matching Prisma model
interface Habit {
    habit_id: number;
    name: string;
    description?: string;
    frequency_type: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'SPECIFIC_DAYS' | 'INTERVAL' | 'X_TIMES_WEEK' | 'X_TIMES_MONTH';
    frequency_value: number;
    difficulty: 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
    start_date: Date;
    tracking_type: 'BOOLEAN' | 'DURATION' | 'COUNT' | 'NUMERIC';
    current_streak?: number;
    longest_streak?: number;
    domain_name?: string;
}

const SingleHabitScreen: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Static Habit Data
    const habit: Habit = {
        habit_id: 1,
        name: 'Daily Meditation',
        description: 'Practice mindfulness and reduce stress through daily meditation',
        frequency_type: 'DAILY',
        frequency_value: 1,
        difficulty: 'MEDIUM',
        start_date: new Date('2024-01-01'),
        tracking_type: 'DURATION',
        current_streak: 14,
        longest_streak: 21,
        domain_name: 'Mental Wellness'
    };

    // State for tracking actions
    const [isCompleted, setIsCompleted] = useState(false);

    // Helper function to format frequency
    const formatFrequency = (type: string, value: number) => {
        switch (type) {
            case 'DAILY': return 'Every Day';
            case 'WEEKDAYS': return 'Weekdays Only';
            case 'WEEKENDS': return 'Weekends Only';
            case 'X_TIMES_WEEK': return `${value} Times per Week`;
            case 'INTERVAL': return `Every ${value} Days`;
            default: return type.replace('_', ' ');
        }
    };

    // Difficulty color and background mapping
    const getDifficultyStyles = (difficulty: string) => {
        switch (difficulty) {
            case 'VERY_EASY':
                return {
                    text: 'text-emerald-500',
                    bg: 'bg-emerald-500/10'
                };
            case 'EASY':
                return {
                    text: 'text-green-500',
                    bg: 'bg-green-500/10'
                };
            case 'MEDIUM':
                return {
                    text: 'text-amber-500',
                    bg: 'bg-amber-500/10'
                };
            case 'HARD':
                return {
                    text: 'text-rose-500',
                    bg: 'bg-rose-500/10'
                };
            case 'VERY_HARD':
                return {
                    text: 'text-red-500',
                    bg: 'bg-red-500/10'
                };
            default:
                return {
                    text: 'text-gray-500',
                    bg: 'bg-gray-500/10'
                };
        }
    };

    // Handle habit completion
    const handleComplete = () => {
        setIsCompleted(!isCompleted);
    };

    return (
        <ScrollView
            className={`flex-1 p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        >
            {/* Habit Header */}
            <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {habit.name}
                    </Text>

                    <View className={`px-3 py-1 rounded-full ${
                        getDifficultyStyles(habit.difficulty).bg
                    }`}>
                        <Text className={`text-xs font-semibold ${
                            getDifficultyStyles(habit.difficulty).text
                        }`}>
                            {habit.difficulty.replace('_', ' ')}
                        </Text>
                    </View>
                </View>

                <Text className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {habit.description}
                </Text>
            </View>

            {/* Habit Details Grid */}
            <View className="flex-row justify-between mb-6">
                {/* Frequency */}
                <View className={`w-[30%] p-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    <View className="items-center">
                        <RepeatIcon
                            size={24}
                            color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        />
                        <Text className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Frequency
                        </Text>
                        <Text className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatFrequency(habit.frequency_type, habit.frequency_value)}
                        </Text>
                    </View>
                </View>

                {/* Current Streak */}
                <View className={`w-[30%] p-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    <View className="items-center">
                        <Flame
                            size={24}
                            color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        />
                        <Text className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Current Streak
                        </Text>
                        <Text className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {habit.current_streak || 0} Days
                        </Text>
                    </View>
                </View>

                {/* Longest Streak */}
                <View className={`w-[30%] p-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    <View className="items-center">
                        <TrendingUp
                            size={24}
                            color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                        />
                        <Text className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Longest Streak
                        </Text>
                        <Text className={`mt-1 text-base font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {habit.longest_streak || 0} Days
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View className="flex-row justify-between">
                <TouchableOpacity
                    onPress={handleComplete}
                    className={`flex-1 flex-row items-center justify-center p-3 rounded-xl mr-2 ${
                        isCompleted
                            ? 'bg-emerald-500'
                            : (isDarkMode ? 'bg-gray-800' : 'bg-white')
                    } border ${
                        isCompleted
                            ? 'border-emerald-500'
                            : (isDarkMode ? 'border-gray-700' : 'border-gray-200')
                    }`}
                >
                    <CheckCircle2
                        size={20}
                        color={isCompleted ? 'white' : (isDarkMode ? '#10B981' : '#059669')}
                    />
                    <Text className={`ml-2 font-semibold ${
                        isCompleted
                            ? 'text-white'
                            : (isDarkMode ? 'text-white' : 'text-gray-900')
                    }`}>
                        {isCompleted ? 'Completed' : 'Mark Complete'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className={`flex-1 flex-row items-center justify-center p-3 rounded-xl ml-2 ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                    } border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                >
                    <Edit3
                        size={20}
                        color={isDarkMode ? '#6366F1' : '#4F46E5'}
                    />
                    <Text className={`ml-2 font-semibold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        Edit Habit
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Additional Information */}
            {habit.domain_name && (
                <View className="mt-6 p-4 rounded-xl bg-primary-500/10">
                    <View className="flex-row items-center mb-2">
                        <AlertCircle
                            size={20}
                            color="#4F46E5"
                            className="mr-2"
                        />
                        <Text className="text-primary-500 font-semibold">
                            Category Information
                        </Text>
                    </View>
                    <Text className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Domain: {habit.domain_name}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

export default SingleHabitScreen;