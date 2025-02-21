import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HabitCard = ({ habit, isCompleted, isDark }) => (
    <View className={`rounded-3xl shadow-sm ${isDark ? 'bg-theme-card-dark' : 'bg-white'} 
        ${isCompleted ? 'opacity-75' : ''} mb-4`}>
        <View className="p-4">
            <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center space-x-2">
                    <Text className={`text-lg font-montserrat-bold
                        ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {habit.name}
                    </Text>
                    {isCompleted && (
                        <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#22C55E"
                        />
                    )}
                </View>
                <View className={`px-4 py-1.5 rounded-full 
                    ${isCompleted ? 'bg-success-500/10' : 'bg-primary-500/10'}`}>
                    <Text className={`text-xs font-montserrat-medium
                        ${isCompleted ? 'text-success-500' : 'text-primary-500'}`}>
                        {isCompleted ? 'Completed' : habit.frequencyType?.name}
                    </Text>
                </View>
            </View>

            {habit.description && (
                <Text className={`mb-4 text-sm font-montserrat
                    ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {habit.description}
                </Text>
            )}

            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                    <View className="p-2 rounded-xl bg-primary-500/10">
                        <Ionicons
                            name="time-outline"
                            size={18}
                            color="#22C55E"
                        />
                    </View>
                    <Text className={`ml-2 text-sm font-montserrat
                        ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {habit.frequency_value} times {habit.frequencyType?.name.toLowerCase()}
                    </Text>
                </View>
                <View className="flex-row items-center px-3 py-1.5 rounded-full bg-accent-500/10">
                    <Ionicons name="flame" size={18} color="#F59E0B" />
                    <Text className="ml-1 font-montserrat-semibold text-accent-500">
                        {habit.streak?.current_streak || 0} days
                    </Text>
                </View>
            </View>
        </View>
    </View>
);

export default HabitCard;