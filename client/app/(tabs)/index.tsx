import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, Animated, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserHabits, logHabitCompletion, getUpcomingHabits } from '../../services/habitService';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { BlurView } from 'expo-blur';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
                style={[
                    { opacity },
                    { transform: [{ scale }] }
                ]}
                className="flex-row items-center justify-center pr-4"
            >
                <TouchableOpacity
                    onPress={() => handleCompleteHabit(habitId)}
                    className="bg-primary-500 justify-center items-center p-6 rounded-2xl"
                >
                    <Ionicons name="checkmark-circle" size={32} color="white" />
                    <Text className="text-white font-montserrat-semibold text-sm mt-2">Complete</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderHabitItem = (item, index) => {
        const scaleY = scrollY.interpolate({
            inputRange: [-1, 0, 100 * index, 100 * (index + 2)],
            outputRange: [1, 1, 1, 0.9],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View
                style={{ transform: [{ scaleY }] }}
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
                    <View className={`mb-4 rounded-card shadow-card-${isDark ? 'dark' : 'light'} 
                        ${isDark ? 'bg-theme-card-dark' : 'bg-theme-card'}`}>
                        <View className="p-card-padding">
                            <View className="flex-row justify-between items-center mb-element-gap">
                                <Text className={`text-lg font-montserrat-bold 
                                    ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                    {item.name}
                                </Text>
                                <View className={`px-4 py-1.5 rounded-pill 
                                    ${isDark ? 'bg-secondary-900' : 'bg-secondary-100'}`}>
                                    <Text className={`text-xs font-montserrat-medium
                                        ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>
                                        {item.frequencyType?.name}
                                    </Text>
                                </View>
                            </View>
                            <Text className={`mb-4 text-sm font-montserrat leading-relaxed
                                ${isDark ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary'}`}>
                                {item.description}
                            </Text>
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <View className={`p-2 rounded-full
                                        ${isDark ? 'bg-primary-900' : 'bg-primary-100'}`}>
                                        <Ionicons
                                            name="time-outline"
                                            size={18}
                                            color={isDark ? '#86EFAC' : '#15803D'}
                                        />
                                    </View>
                                    <Text className={`ml-2 text-sm font-montserrat
                                        ${isDark ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'}`}>
                                        {item.frequency_value} times {item.frequencyType?.name.toLowerCase()}
                                    </Text>
                                </View>
                                <View className={`flex-row items-center px-3 py-1.5 rounded-full
                                    ${isDark ? 'bg-accent-900' : 'bg-accent-100'}`}>
                                    <Ionicons
                                        name="flame"
                                        size={18}
                                        color={isDark ? '#FCD34D' : '#B45309'}
                                    />
                                    <Text className={`ml-1 font-montserrat-semibold
                                        ${isDark ? 'text-accent-300' : 'text-accent-700'}`}>
                                        {item.streak?.current_streak || 0} days
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Swipeable>
            </Animated.View>
        );
    };

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-theme-background'}`}>
            <SafeAreaView className="flex-1">
                <Animated.ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                >
                    <View className="mb-section-spacing mt-4">
                        <Text className={`text-3xl font-montserrat-bold mb-2
                            ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Your Habits
                        </Text>
                        <Text className={`text-sm font-montserrat
                            ${isDark ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'}`}>
                            Swipe left to mark a habit as complete
                        </Text>
                    </View>

                    {habits.map((item, index) => renderHabitItem(item, index))}

                    <View className="mt-section-spacing mb-6">
                        <Text className={`text-xl font-montserrat-bold mb-4
                            ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Coming Up Next
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingRight: 16 }}
                            className="gap-4"
                        >
                            {upcomingHabits.slice(0, 3).map((item) => (
                                <View
                                    key={item.habit_id}
                                    className={`p-4 rounded-lg shadow-md w-48
                                        ${isDark ? 'bg-theme-card-dark' : 'bg-theme-card'}`}
                                >
                                    <Text className={`font-montserrat-semibold mb-2
                                        ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                        {item.name}
                                    </Text>
                                    <View className="flex-row items-center mt-2">
                                        <View className={`p-1.5 rounded-full
                                            ${isDark ? 'bg-secondary-900' : 'bg-secondary-100'}`}>
                                            <Ionicons
                                                name="calendar"
                                                size={14}
                                                color={isDark ? '#C4B5FD' : '#5B21B6'}
                                            />
                                        </View>
                                        <Text className={`text-xs ml-2 font-montserrat
                                            ${isDark ? 'text-theme-text-muted-dark' : 'text-theme-text-muted'}`}>
                                            {new Date(item.next_due_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <View className="mt-2 flex-row justify-between items-center mb-8">
                        <Text className={`text-xl font-montserrat-bold
                            ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                            Suggested Habits
                        </Text>
                        <TouchableOpacity
                            className={`px-4 py-2 rounded-button
                                ${isDark ? 'bg-primary-900' : 'bg-primary-100'}`}
                        >
                            <Text className={`font-montserrat-semibold text-sm
                                ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                                View All
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;