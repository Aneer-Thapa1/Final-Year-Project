import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

const EmptyState = ({ isDark, onCreateHabit }) => (
    <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
            type: 'spring',
            duration: 700,
            springDamping: 14
        }}
    >
        <View className={`rounded-3xl p-6 items-center justify-center
            ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}
        >
            <View className="w-16 h-16 rounded-full bg-primary-500/10 items-center justify-center mb-4">
                <Ionicons
                    name="leaf-outline"
                    size={32}
                    color="#22C55E"
                />
            </View>

            <Text className={`text-xl font-montserrat-bold text-center mb-2
                ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Start Your Journey
            </Text>

            <Text className={`text-sm font-montserrat text-center mb-6
                ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Create your first habit and begin building a better routine. Track your progress and stay motivated!
            </Text>

            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onCreateHabit?.();
                }}
                className="bg-primary-500 px-6 py-3 rounded-2xl flex-row items-center"
            >
                <Ionicons
                    name="add-circle"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                />
                <Text className="text-white font-montserrat-semibold">
                    Create New Habit
                </Text>
            </TouchableOpacity>

            <View className="mt-8 w-full">
                <Text className={`text-sm font-montserrat-bold mb-4
                    ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Quick Tips:
                </Text>
                <View className="space-y-3">
                    {[
                        'Start with small, achievable goals',
                        'Choose a specific time for your habit',
                        'Track your progress daily',
                        'Celebrate small wins'
                    ].map((tip, index) => (
                        <View key={index} className="flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-primary-500 mr-3" />
                            <Text className={`text-sm font-montserrat flex-1
                                ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {tip}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    </MotiView>
);

export default EmptyState;