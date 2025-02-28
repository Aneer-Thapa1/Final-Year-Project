import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Clock } from 'lucide-react-native';

interface HabitCardProps {
    habit: {
        title: string;
        description: string;
        frequency: string;
        time: string;
        streak: number;
    };
    isDark: boolean;
    onComplete: () => void;
    isCompleted: boolean;
}

export const HabitCard: React.FC<HabitCardProps> = ({
                                                        habit,
                                                        isDark,
                                                        onComplete,
                                                        isCompleted
                                                    }) => {
    const swipeableRef = useRef<Swipeable>(null);

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
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

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            enabled={!isCompleted}
        >
            <View className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-[#252F3C]' : 'bg-white'} 
                ${isCompleted ? 'opacity-60' : ''}`}
            >
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {habit.title}
                        </Text>
                        {isCompleted && (
                            <View className="ml-2 bg-green-500/20 p-1 rounded-full">
                                <Text className="text-green-500">✓</Text>
                            </View>
                        )}
                    </View>
                    <View className={`px-3 py-1 rounded-full bg-primary-500/20`}>
                        <Text className="text-xs font-montserrat-medium text-primary-500">
                            {habit.frequency}
                        </Text>
                    </View>
                </View>

                {habit.description && (
                    <Text className={`mb-4 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {habit.description}
                    </Text>
                )}

                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        <View className="p-2 rounded-xl bg-primary-500/10">
                            <Clock size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                        </View>
                        <Text className={`ml-2 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {habit.time}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Text>🔥</Text>
                        <Text className="ml-1 font-montserrat-semibold text-accent-500">
                            {habit.streak} {habit.streak === 1 ? 'day' : 'days'}
                        </Text>
                    </View>
                </View>
            </View>
        </Swipeable>
    );
};