// components/home/UpcomingHabitsSection.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { UpcomingHabit } from './UpcomingHabit';
import { Habit } from '../constants/habit';

interface UpcomingHabitsSectionProps {
    upcomingHabits: Habit[];
    isDark: boolean;
}

const UpcomingHabitsSection: React.FC<UpcomingHabitsSectionProps> = ({ upcomingHabits, isDark }) => {
    const getHabitTime = (habit: Habit): string => {
        // Check if schedules exist and have times_of_day
        if (habit.schedules &&
            habit.schedules.length > 0 &&
            habit.schedules[0].times_of_day &&
            habit.schedules[0].times_of_day.length > 0) {
            try {
                return new Date(habit.schedules[0].times_of_day[0]).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                console.error('Error formatting time:', error);
            }
        }

        // If no specific time or error in formatting, return default
        return 'Anytime';
    };

    return (
        <View className="mt-4 mb-6">
            <Text className={`text-xl font-montserrat-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Coming Up Next
            </Text>
            {upcomingHabits.length === 0 ? (
                <View className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <Text className={`text-center font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        No upcoming habits scheduled.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 16 }}
                    className="pb-2" // Add padding to avoid clipping shadows
                >
                    {upcomingHabits.map(habit => (
                        <UpcomingHabit
                            key={habit.habit_id}
                            habit={{
                                title: habit.name,
                                time: getHabitTime(habit)
                            }}
                            isDark={isDark}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

export default UpcomingHabitsSection;