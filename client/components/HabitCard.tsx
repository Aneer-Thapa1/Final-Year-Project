// src/components/HabitCard.tsx
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Clock, Award, CheckCircle } from 'lucide-react-native';
import CompletionFormModal, { CompletionData } from './CompletionFormModal';

interface HabitCardProps {
    habit: {
        title: string;
        description: string;
        frequency: string;
        time: string;
        streak: number;
    };
    isDark: boolean;
    onComplete: (data: CompletionData) => void;
    isCompleted: boolean;
}

export const HabitCard: React.FC<HabitCardProps> = ({
                                                        habit,
                                                        isDark,
                                                        onComplete,
                                                        isCompleted
                                                    }) => {
    const swipeableRef = useRef(null);
    const [showCompletionForm, setShowCompletionForm] = useState(false);

    const handleCompletePress = () => {
        if (!isCompleted) {
            setShowCompletionForm(true);
        }
    };

    const handleSubmitCompletion = (data: CompletionData) => {
        console.log('Submitting completion in HabitCard for:', habit.title);
        onComplete(data);
        setShowCompletionForm(false);
        swipeableRef.current?.close();
    };

    const renderRightActions = (progress, dragX) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                onPress={handleCompletePress}
                className="bg-primary-500 justify-center items-center rounded-2xl mr-4"
                style={{ width: 80 }}
                activeOpacity={0.8}
            >
                <Animated.View style={{ transform: [{ scale }] }} className="items-center">
                    <CheckCircle size={30} color="white" strokeWidth={2.5} />
                    <Text className="text-white text-xs font-montserrat-medium mt-1">Complete</Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                enabled={!isCompleted}
            >
                <View
                    className={`mb-4 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} 
            ${isCompleted ? 'opacity-70' : ''}`}
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2
                    }}
                >
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center flex-1">
                            <Text
                                className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
                                numberOfLines={1}
                            >
                                {habit.title}
                            </Text>
                            {isCompleted && (
                                <View className="ml-2 bg-green-500/20 p-1 rounded-full">
                                    <CheckCircle size={16} color="#10B981" />
                                </View>
                            )}
                        </View>

                        <View className="px-3 py-1 rounded-full bg-primary-500/20">
                            <Text className="text-xs font-montserrat-medium text-primary-500" numberOfLines={1}>
                                {habit.frequency}
                            </Text>
                        </View>
                    </View>

                    {habit.description ? (
                        <Text
                            className={`mb-3 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                            numberOfLines={2}
                        >
                            {habit.description}
                        </Text>
                    ) : null}

                    <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center">
                            <View className="p-2 rounded-xl bg-primary-500/10">
                                <Clock size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
                            </View>
                            <Text className={`ml-2 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {habit.time}
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <Award size={16} color="#F59E0B" />
                            <Text className="ml-1 font-montserrat-semibold text-amber-500">
                                {habit.streak} {habit.streak === 1 ? 'day' : 'days'}
                            </Text>
                        </View>
                    </View>


                </View>
            </Swipeable>

            <CompletionFormModal
                visible={showCompletionForm}
                onClose={() => setShowCompletionForm(false)}
                onSubmit={handleSubmitCompletion}
                habitName={habit.title}
                isDark={isDark}
            />
        </>
    );
};