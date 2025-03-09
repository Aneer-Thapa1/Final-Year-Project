import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Flame } from 'lucide-react-native';

const HabitStreakCard = ({ habit, isDark, onPress }) => {
    // Get streak from habit object
    const streak = habit?.streak?.current_streak || 0;

    // Helper function to determine streak color
    const getStreakColor = (streakValue) => {
        if (streakValue >= 30) return '#EF4444'; // Red for 30+ days (hot!)
        if (streakValue >= 14) return '#F59E0B'; // Amber for 14+ days
        if (streakValue >= 7) return '#10B981'; // Emerald for 7+ days
        return '#6366F1'; // Default indigo
    };

    // Calculate progress percentage for the progress bar
    // We'll cap it at 100% and use 30 days as the "full" progress
    const progressPercent = Math.min(100, (streak / 30) * 100);
    const streakColor = getStreakColor(streak);

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`mb-2 p-3 rounded-xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{ elevation: 1 }}
        >
            <View className="flex-row items-center justify-between mb-1">
                <View className="flex-1">
                    <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'} text-base`} numberOfLines={1}>
                        {habit.name}
                    </Text>
                    <Text className={`font-montserrat-regular ${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mt-0.5`} numberOfLines={1}>
                        {habit.description || habit.frequency_type?.toLowerCase() || 'Daily Habit'}
                    </Text>
                </View>

                <View className="flex-row items-center bg-gray-100/10 rounded-full px-2 py-0.5">
                    <Flame size={14} color={streakColor} />
                    <Text className="ml-1 font-montserrat-bold text-sm" style={{ color: streakColor }}>
                        {streak} {streak === 1 ? 'day' : 'days'}
                    </Text>
                </View>
            </View>

            {/* Progress bar */}
            <View className={`h-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mt-1 overflow-hidden`}>
                <View
                    className="h-1.5 rounded-full"
                    style={{
                        width: `${progressPercent}%`,
                        backgroundColor: streakColor
                    }}
                />
            </View>
        </TouchableOpacity>
    );
};

export default HabitStreakCard;