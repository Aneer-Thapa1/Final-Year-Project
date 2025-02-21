import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserHabits, logHabitCompletion, getUpcomingHabits } from '../../services/habitService';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

const Home = () => {
    const [habits, setHabits] = useState([]);
    const [upcomingHabits, setUpcomingHabits] = useState([]);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const swipeableRefs = useRef({});
    const scrollY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchHabits();
        StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    }, [isDark]);

    const fetchHabits = async () => {
        try {
            const habitsResponse = await getUserHabits();
            const upcomingResponse = await getUpcomingHabits();
            setHabits(habitsResponse.data);
            setUpcomingHabits(upcomingResponse.data);
        } catch (error) {
            console.error("Error fetching habits:", error);
        }
    };

    const handleCompleteHabit = async (habitId) => {
        try {
            await logHabitCompletion(habitId, { completed_at: new Date() });
            if (swipeableRefs.current[habitId]) {
                swipeableRefs.current[habitId].close();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchHabits();
        } catch (error) {
            console.error("Error completing habit:", error);
        }
    };

    const renderRightActions = (progress, dragX, habitId) => {
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
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        handleCompleteHabit(habitId);
                    }}
                    className="bg-primary-500 justify-center items-center p-6 rounded-2xl"
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-montserrat-semibold text-sm mt-2">Complete</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderHabitItem = (item, index) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: index * 100 }}
            key={item.habit_id}
        >
            <Swipeable
                ref={ref => swipeableRefs.current[item.habit_id] = ref}
                renderRightActions={(progress, dragX) =>
                    renderRightActions(progress, dragX, item.habit_id)
                }
                rightThreshold={40}
                overshootRight={false}
            >
                <View className={`mb-4 rounded-3xl shadow-sm ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
                    <View className="p-4">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`text-lg font-montserrat-bold ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                {item.name}
                            </Text>
                            <View className={`px-4 py-1.5 rounded-full bg-primary-500/10`}>
                                <Text className="text-xs font-montserrat-medium text-primary-500">
                                    {item.frequencyType?.name}
                                </Text>
                            </View>
                        </View>
                        <Text className={`mb-4 text-sm font-montserrat ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {item.description}
                        </Text>
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center">
                                <View className="p-2 rounded-xl bg-primary-500/10">
                                    <Ionicons
                                        name="time-outline"
                                        size={18}
                                        color="#22C55E"
                                    />
                                </View>
                                <Text className={`ml-2 text-sm font-montserrat ${
                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {item.frequency_value} times {item.frequencyType?.name.toLowerCase()}
                                </Text>
                            </View>
                            <View className="flex-row items-center px-3 py-1.5 rounded-full bg-accent-500/10">
                                <Ionicons
                                    name="flame"
                                    size={18}
                                    color="#F59E0B"
                                />
                                <Text className="ml-1 font-montserrat-semibold text-accent-500">
                                    {item.streak?.current_streak || 0} days
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Swipeable>
        </MotiView>
    );

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
            <SafeAreaView className="flex-1">
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600 }}
                    className="flex-1"
                >
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 16 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: true }
                        )}
                    >
                        <View className="mb-8">
                            <Text className={`text-3xl font-montserrat-bold mb-2 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Your Habits
                            </Text>
                            <Text className={`text-sm font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Swipe left to mark a habit as complete
                            </Text>
                        </View>

                        {habits.map((item, index) => renderHabitItem(item, index))}

                        <View className="mt-8 mb-6">
                            <Text className={`text-xl font-montserrat-bold mb-4 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Coming Up Next
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 16 }}
                                className="gap-4"
                            >
                                {upcomingHabits.slice(0, 3).map((item, index) => (
                                    <MotiView
                                        key={item.habit_id}
                                        from={{ opacity: 0, translateX: 20 }}
                                        animate={{ opacity: 1, translateX: 0 }}
                                        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
                                    >
                                        <View className={`p-4 rounded-2xl shadow-sm w-48 ${
                                            isDark ? 'bg-theme-card-dark' : 'bg-white'
                                        }`}>
                                            <Text className={`font-montserrat-semibold mb-2 ${
                                                isDark ? 'text-white' : 'text-gray-900'
                                            }`}>
                                                {item.name}
                                            </Text>
                                            <View className="flex-row items-center mt-2">
                                                <View className="p-1.5 rounded-full bg-primary-500/10">
                                                    <Ionicons
                                                        name="calendar"
                                                        size={14}
                                                        color="#22C55E"
                                                    />
                                                </View>
                                                <Text className={`text-xs ml-2 font-montserrat ${
                                                    isDark ? 'text-gray-400' : 'text-gray-600'
                                                }`}>
                                                    {new Date(item.next_due_date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                    </MotiView>
                                ))}
                            </ScrollView>
                        </View>

                        <View className="mt-2 flex-row justify-between items-center mb-8">
                            <Text className={`text-xl font-montserrat-bold ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Suggested Habits
                            </Text>
                            <TouchableOpacity
                                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                                className="px-4 py-2 rounded-xl bg-primary-500/10"
                            >
                                <Text className="font-montserrat-semibold text-sm text-primary-500">
                                    View All
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </MotiView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;