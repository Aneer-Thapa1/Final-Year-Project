// src/components/HabitStreakCard.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Flame, Award, Calendar, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const HabitStreakCard = ({ habit, isDark, onPress }) => {
    // Safely extract streak from habit object with fallback
    const streak = habit?.streak?.current_streak || 0;
    const bestStreak = habit?.streak?.best_streak || 0;

    // Memoize colors and values to prevent unnecessary re-renders
    const { streakColor, streakIcon, streakLabel, progressPercent } = useMemo(() => {
        // Helper function to determine streak color and icon
        let color, icon, label;

        if (streak >= 30) {
            color = '#EF4444'; // Red for 30+ days (hot!)
            icon = Flame;
            label = 'On Fire!';
        } else if (streak >= 14) {
            color = '#F59E0B'; // Amber for 14+ days
            icon = Flame;
            label = 'Hot Streak';
        } else if (streak >= 7) {
            color = '#10B981'; // Emerald for 7+ days
            icon = TrendingUp;
            label = 'Building Momentum';
        } else if (streak > 0) {
            color = '#6366F1'; // Default indigo
            icon = Calendar;
            label = 'Getting Started';
        } else {
            color = '#9CA3AF'; // Gray for no streak
            icon = Calendar;
            label = 'Start Your Streak';
        }

        // Calculate progress percentage (capped at 100%)
        const percent = Math.min(100, (streak / 30) * 100);

        return {
            streakColor: color,
            streakIcon: icon,
            streakLabel: label,
            progressPercent: percent
        };
    }, [streak]);

    // Safely extract habit info with defaults
    const {
        name = 'Untitled Habit',
        description = '',
        frequency_type = 'Daily'
    } = habit || {};

    // Format the frequency type for display
    const formattedFrequency = frequency_type?.toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()) || 'Daily Habit';

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress && onPress();
    };

    const StreakIcon = streakIcon;

    return (
        <Pressable
            onPress={handlePress}
            className={`mb-3 p-4 rounded-xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{ elevation: 2 }}
        >
            <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1 mr-3">
                    <Text
                        className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'} text-base`}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                    <Text
                        className={`font-montserrat-regular ${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs mt-0.5`}
                        numberOfLines={1}
                    >
                        {description || formattedFrequency}
                    </Text>
                </View>

                <View
                    className="flex-row items-center rounded-full px-3 py-1"
                    style={{ backgroundColor: `${streakColor}20` }}
                >
                    <StreakIcon size={14} color={streakColor} />
                    <Text
                        className="ml-1.5 font-montserrat-bold text-sm"
                        style={{ color: streakColor }}
                    >
                        {streak} {streak === 1 ? 'day' : 'days'}
                    </Text>
                </View>
            </View>

            {/* Progress indicator section */}
            <View className="mt-2">
                <View className="flex-row justify-between items-center mb-1">
                    <Text
                        className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                    >
                        {streakLabel}
                    </Text>

                    {bestStreak > 0 && (
                        <View className="flex-row items-center">
                            <Award size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text
                                className={`ml-1 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                                Best: {bestStreak}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Progress bar */}
                <View
                    className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}
                >
                    <View
                        className="h-2 rounded-full"
                        style={{
                            width: `${progressPercent}%`,
                            backgroundColor: streakColor
                        }}
                    />
                </View>
            </View>
        </Pressable>
    );
};

export default HabitStreakCard;