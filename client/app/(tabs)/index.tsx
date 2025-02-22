import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserHabits, logHabitCompletion, getUpcomingHabits } from '../../services/habitService';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import HabitCard from '../../components/HabitCard';
import EmptyState from '../../components/EmptyState';
import UpcomingHabit from '../../components/UpcomingHabit';

const Home = () => {
    const [habits, setHabits] = useState([]);
    const [upcomingHabits, setUpcomingHabits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const swipeableRefs = useRef({});

    useEffect(() => {
        fetchHabits();
    }, []);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const fetchHabits = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [habitsResponse, upcomingResponse] = await Promise.all([
                getUserHabits(),
                getUpcomingHabits()
            ]);
            setHabits(habitsResponse.data);
            setUpcomingHabits(upcomingResponse.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to fetch habits');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const isHabitCompletedToday = (habitLogs) => {
        if (!habitLogs?.length) return false;
        const today = new Date();
        return habitLogs.some(log => {
            const logDate = new Date(log.completed_at);
            return logDate.getDate() === today.getDate() &&
                logDate.getMonth() === today.getMonth() &&
                logDate.getFullYear() === today.getFullYear();
        });
    };

    const handleCompleteHabit = async (habitId) => {
        // First check if habit is already completed
        const habit = habits.find(h => h.habit_id === habitId);
        if (!habit || isHabitCompletedToday(habit.habitLogs)) {
            return; // Early return if already completed
        }

        try {
            setError(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const response = await logHabitCompletion(habitId, {
                completed_at: new Date(),
                mood_rating: 5
            });

            if (response.success) {
                if (swipeableRefs.current[habitId]) {
                    swipeableRefs.current[habitId].close();
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                fetchHabits();
            } else {
                throw new Error(response.message || 'Failed to complete habit');
            }
        } catch (error) {
            setError(error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const renderRightActions = (progress, dragX, habit) => {
        // Don't render if completed
        if (isHabitCompletedToday(habit.habitLogs)) return null;

        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0.8],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [-100, -50, 0],
            outputRange: [1, 0.5, 0],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View
                style={[{ opacity }, { transform: [{ scale }] }]}
                className="flex-row items-center justify-center pr-4"
            >
                <TouchableOpacity
                    onPress={() => handleCompleteHabit(habit.habit_id)}
                    className="bg-primary-500 justify-center items-center p-6 rounded-2xl"
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-montserrat-medium text-sm mt-2">
                        Complete
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderHabitItem = (item, index) => {
        const isCompleted = isHabitCompletedToday(item.habitLogs);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                    type: 'timing',
                    duration: 500,
                    delay: index * 100
                }}
                key={item.habit_id}
            >
                <Swipeable
                    ref={ref => swipeableRefs.current[item.habit_id] = ref}
                    renderRightActions={(progress, dragX) =>
                        renderRightActions(progress, dragX, item)
                    }
                    enabled={!isCompleted}
                    rightThreshold={40}
                    overshootRight={false}
                    friction={2}
                    onSwipeableWillOpen={() => {
                        // Close other open swipeables
                        Object.keys(swipeableRefs.current).forEach(key => {
                            if (key !== item.habit_id && swipeableRefs.current[key]) {
                                swipeableRefs.current[key].close();
                            }
                        });
                    }}
                >
                    <HabitCard
                        habit={item}
                        isCompleted={isCompleted}
                        isDark={isDark}
                    />
                </Swipeable>
            </MotiView>
        );
    };

    if (isLoading) {
        return (
            <View className={`flex-1 justify-center items-center ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
                <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                >
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 600 }}
                        className="px-4"
                    >
                        {error && (
                            <MotiView
                                from={{ opacity: 0, translateY: -10 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                exit={{ opacity: 0, translateY: -10 }}
                                className="bg-error-500/10 px-4 py-3 rounded-xl mb-4"
                            >
                                <Text className="text-error-500 font-montserrat-medium text-sm">
                                    {error}
                                </Text>
                            </MotiView>
                        )}

                        <View className="mb-8">
                            <Text className={`text-3xl font-montserrat-bold mb-2
                                ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Your Habits
                            </Text>
                            <Text className={`text-sm font-montserrat
                                ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {habits.length > 0
                                    ? 'Swipe left to mark a habit as complete'
                                    : 'Add your first habit to get started'}
                            </Text>
                        </View>

                        {habits.length === 0 ? (
                            <EmptyState isDark={isDark} />
                        ) : (
                            habits.map((item, index) => renderHabitItem(item, index))
                        )}

                        {upcomingHabits.length > 0 && (
                            <View className="mt-8 mb-6">
                                <Text className={`text-xl font-montserrat-bold mb-4
                                    ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Coming Up Next
                                </Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingRight: 16 }}
                                    className="gap-4"
                                >
                                    {upcomingHabits.slice(0, 3).map((item, index) => (
                                        <UpcomingHabit
                                            key={item.habit_id}
                                            habit={item}
                                            index={index}
                                            isDark={isDark}
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View className="mt-2 flex-row justify-between items-center mb-8">
                            <Text className={`text-xl font-montserrat-bold
                                ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Suggested Habits
                            </Text>
                            <TouchableOpacity
                                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                                className="px-4 py-2 rounded-xl bg-primary-500/10"
                            >
                                <Text className="font-montserrat-medium text-sm text-primary-500">
                                    View All
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;