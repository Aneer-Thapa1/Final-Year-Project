// src/components/habits/HabitCard.tsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Clock } from 'lucide-react-native';

// Define a more explicit interface for the habit object
interface Habit {
    habit_id?: number;
    title?: string;
    description?: string;
    frequency?: string;
    time?: string;
    streak?: number;
    isCompleted?: boolean;
    completedToday?: boolean;
}

interface HabitCardProps {
    habit: Habit;
    isDark?: boolean;
    onComplete: (data?: any) => void;
    onSkip?: (reason?: string) => void;
    isCompleted?: boolean;
    isSkipped?: boolean;
    onPress?: () => void;
}

const HabitCard: React.FC<HabitCardProps> = ({
                                                 habit,
                                                 isDark = false,
                                                 onComplete,
                                                 onSkip,
                                                 isCompleted = false,
                                                 isSkipped = false,
                                                 onPress
                                             }) => {
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (progress: Animated.Value, dragX: Animated.Value) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                onPress={() => {
                    onComplete();
                    swipeableRef.current?.close();
                }}
                className="bg-primary-500 justify-center items-center rounded-2xl mr-4"
                style={{ width: 75 }}
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    <Text className="text-white text-3xl mb-1">✓</Text>
                    <Text className="text-white text-xs font-montserrat-medium">Complete</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    // Safely get habit properties with default values
    const habitTitle = habit?.title || 'Unnamed Habit';
    const habitDescription = habit?.description || 'No description';
    const habitFrequency = habit?.frequency || 'Not specified';
    const habitTime = habit?.time || '--:--';
    const habitStreak = habit?.streak || 0;

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            enabled={!isCompleted && !isSkipped}
        >
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={onPress ? 0.7 : 1}
                className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-[#252F3C]' : 'bg-white'} 
                    ${(isCompleted || isSkipped) ? 'opacity-60' : ''}`}
            >
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {habitTitle}
                        </Text>
                        {(isCompleted || habit?.completedToday) && (
                            <View className="ml-2 bg-green-500/20 p-1 rounded-full">
                                <Text className="text-green-500">✓</Text>
                            </View>
                        )}
                    </View>
                    <View className={`px-3 py-1 rounded-full bg-primary-500/20`}>
                        <Text className="text-xs font-montserrat-medium text-primary-500">
                            {habitFrequency}
                        </Text>
                    </View>
                </View>
                <Text className={`mb-4 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {habitDescription}
                </Text>
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        <View className="p-2 rounded-xl bg-primary-500/10">
                            <Clock size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                        </View>
                        <Text className={`ml-2 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {habitTime}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Text>🔥</Text>
                        <Text className="ml-1 font-montserrat-semibold text-accent-500">
                            {habitStreak} days
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
};

export default HabitCard;