import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

const UpcomingHabit = ({ habit, index, isDark }) => (
    <MotiView
        from={{ opacity: 0, translateX: 20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{
            type: 'timing',
            duration: 500,
            delay: index * 100
        }}
    >
        <View className={`p-4 rounded-2xl shadow-sm w-48
            ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}
        >
            <View className="flex-row justify-between items-start">
                <Text className={`font-montserrat-semibold text-base mb-2 flex-1 pr-2
                    ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {habit.name}
                </Text>
                <View className={`px-2 py-1 rounded-full bg-primary-500/10`}>
                    <Text className="text-xs font-montserrat-medium text-primary-500">
                        {habit.frequencyType?.name}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center mt-2">
                <View className="p-1.5 rounded-full bg-primary-500/10">
                    <Ionicons
                        name="calendar"
                        size={14}
                        color="#22C55E"
                    />
                </View>
                <Text className={`text-xs ml-2 font-montserrat
                    ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(habit.next_due_date).toLocaleDateString()}
                </Text>
            </View>

            <View className="flex-row items-center mt-3">
                <View className="p-1.5 rounded-full bg-accent-500/10">
                    <Ionicons
                        name="time-outline"
                        size={14}
                        color="#F59E0B"
                    />
                </View>
                <Text className={`text-xs ml-2 font-montserrat
                    ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {habit.frequency_value} times {habit.frequencyType?.name.toLowerCase()}
                </Text>
            </View>
        </View>
    </MotiView>
);

export default UpcomingHabit;