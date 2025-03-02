// src/components/TodayHabits.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { HabitCard } from './HabitCard';
import { CompletionData } from './CompletionFormModal';
import { Habit } from '../constants/habit';

interface TodayHabitsProps {
    habits: Habit[];
    isDark: boolean;
    onComplete: (habitId: number, data: CompletionData) => void;
}

const TodayHabits: React.FC<TodayHabitsProps> = ({ habits, isDark, onComplete }) => {
    // Get today's date for the header
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', dateOptions);

    // Filter habits that are scheduled for today
    const todayHabits = habits.filter(habit => {
        // This is a simple implementation - you'd need to check actual scheduling logic
        // based on your habit data structure
        return true; // For now, show all habits
    });

    return (
        <View className="mb-6">
            <View className="mb-4">
                <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Today's Habits
                </Text>
                <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'} font-montserrat`}>
                    {formattedDate}
                </Text>
            </View>

            {todayHabits.length === 0 ? (
                <View className={`p-4 rounded-xl mb-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <Text className={`text-center font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        No habits scheduled for today. Add a new habit to get started!
                    </Text>
                </View>
            ) : (
                <ScrollView>
                    {todayHabits.map((habit) => (
                        <HabitCard
                            key={habit.habit_id}
                            habit={{
                                title: habit.name,
                                description: habit.description || '',
                                frequency: habit.frequency || 'Daily',
                                time: habit.reminder_time || 'Anytime',
                                streak: habit.current_streak || 0
                            }}
                            isDark={isDark}
                            onComplete={(data: CompletionData) => {
                                console.log('Completing habit in TodayHabits:', habit.habit_id);
                                onComplete(habit.habit_id, data);
                            }}
                            isCompleted={habit.is_completed_today || false}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );
};

export default TodayHabits;