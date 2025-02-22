import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, useColorScheme, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const HabitCard = ({ habit, isDark, onComplete, isCompleted }) => {
    const swipeableRef = useRef(null);

    const renderRightActions = (progress, dragX) => {
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
                <Text className={`mb-4 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {habit.description}
                </Text>
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
                            {habit.streak} days
                        </Text>
                    </View>
                </View>
            </View>
        </Swipeable>
    );
};

const UpcomingHabit = ({ habit, isDark }) => (
    <View className={`mr-4 p-4 rounded-2xl min-w-[200] ${isDark ? 'bg-[#252F3C]' : 'bg-white'}`}>
        <Text className={`font-montserrat-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {habit.title}
        </Text>
        <View className="flex-row items-center mt-2">
            <View className="p-1.5 rounded-full bg-primary-500/10">
                <Clock size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
            </View>
            <Text className={`text-xs ml-2 font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {habit.time}
            </Text>
        </View>
    </View>
);

const SuggestedHabit = ({ habit, isDark }) => (
    <View className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-[#252F3C]' : 'bg-white'}`}>
        <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {habit.title}
        </Text>
        <Text className={`mt-2 text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {habit.description}
        </Text>
    </View>
);

const Home = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [habits, setHabits] = useState([
        {
            id: 1,
            title: 'Morning Meditation',
            description: '15 minutes of mindfulness meditation',
            frequency: 'Daily',
            time: '1 time daily',
            streak: 5,
            completed: false
        },
        {
            id: 2,
            title: 'Evening Run',
            description: '30 minutes jogging',
            frequency: 'Daily',
            time: '1 time daily',
            streak: 3,
            completed: false
        }
    ]);

    const upcomingHabits = [
        {
            id: 1,
            title: 'Evening Run',
            time: 'Today, 6:00 PM'
        },
        {
            id: 2,
            title: 'Reading',
            time: 'Today, 8:00 PM'
        }
    ];

    const suggestedHabits = [
        {
            id: 1,
            title: 'Daily Reading',
            description: 'Read for 30 minutes every day'
        },
        {
            id: 2,
            title: 'Morning Yoga',
            description: '20 minutes of morning stretching'
        }
    ];

    const handleComplete = (habitId) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHabits(habits.map(habit =>
            habit.id === habitId ? { ...habit, completed: true } : habit
        ));
    };

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-[#1C2732]' : 'bg-gray-50'}`}>
            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="px-4">
                    {/* Habits List */}
                    {habits.map(habit => (
                        <HabitCard
                            key={habit.id}
                            habit={habit}
                            isDark={isDark}
                            onComplete={() => handleComplete(habit.id)}
                            isCompleted={habit.completed}
                        />
                    ))}

                    {/* Coming Up Next Section */}
                    <View className="mt-8 mb-6">
                        <Text className={`text-xl font-montserrat-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Coming Up Next
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 16 }}
                        >
                            {upcomingHabits.map(habit => (
                                <UpcomingHabit
                                    key={habit.id}
                                    habit={habit}
                                    isDark={isDark}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {/* Suggested Habits Section */}
                    <View className="mt-2 mb-8">
                        <Text className={`text-xl font-montserrat-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Suggested Habits
                        </Text>
                        {suggestedHabits.map(habit => (
                            <SuggestedHabit
                                key={habit.id}
                                habit={habit}
                                isDark={isDark}
                            />
                        ))}
                    </View>
                </View>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;