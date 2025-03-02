import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, useColorScheme, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';

// Components
import TodayHabits from '../../components/TodayHabits';
import UpcomingHabitsSection from '../../components/UpcomingHabitsSection';
import ErrorMessage from '../../components/ErrorMessage';

// Services
import { getUpcomingHabits, getUserHabits, logHabitCompletion } from '../../services/habitService';

// Types
import { Habit } from '../../constants/habit';
import { CompletionData } from '../../components/CompletionFormModal';

const Home = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isFocused = useIsFocused();

    const [habits, setHabits] = useState<Habit[]>([]);
    const [upcomingHabits, setUpcomingHabits] = useState<Habit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isFocused) {
            loadData();
        }
    }, [isFocused]);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Fetch habits with better error handling
            let habitsResponse;
            try {
                habitsResponse = await getUserHabits();
            } catch (err) {
                console.error('Failed to fetch habits:', err);
                habitsResponse = [];
            }

            // Fetch upcoming habits with better error handling
            let upcomingResponse;
            try {
                upcomingResponse = await getUpcomingHabits();
            } catch (err) {
                console.error('Failed to fetch upcoming habits:', err);
                upcomingResponse = [];
            }

            // Ensure we have arrays before filtering
            const habitsData = Array.isArray(habitsResponse) ? habitsResponse : [];
            const upcomingData = Array.isArray(upcomingResponse) ? upcomingResponse : [];

            // Safe filtering after ensuring habitsData is an array
            const activeHabits = habitsData.filter(habit =>
                habit && typeof habit === 'object' && habit.is_active === true
            );

            setHabits(activeHabits);
            setUpcomingHabits(upcomingData);
            setError(null);
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load habits');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
    };

    const handleComplete = async (habitId: number, completionData: CompletionData) => {
        try {
            console.log('Completing habit with ID:', habitId);
            console.log('Completion data:', completionData);

            // Map the CompletionData from the modal to what the API expects
            const apiCompletionData = {
                completed_at: completionData.completed_at,
                notes: completionData.notes,
                mood_rating: completionData.mood_rating,
                // Include other fields as needed by your API
            };

            await logHabitCompletion(habitId, apiCompletionData);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData(); // Reload data to get updated streaks
        } catch (err) {
            console.error('Error completing habit:', err);
            setError('Failed to complete habit');
        }
    };

    if (isLoading && !isRefreshing) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#6366F1" /> {/* Using primary-500 color */}
            </View>
        );
    }

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <SafeAreaView className="flex-1" edges={['top']}>
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#6366F1']}
                            tintColor={isDark ? '#E5E7EB' : '#6366F1'}
                        />
                    }
                >
                    {error && <ErrorMessage message={error} />}

                    <TodayHabits
                        habits={habits}
                        onComplete={handleComplete}
                        isDark={isDark}
                    />

                    {upcomingHabits && upcomingHabits.length > 0 ? (
                        <UpcomingHabitsSection
                            upcomingHabits={upcomingHabits}
                            isDark={isDark}
                        />
                    ) : (
                        <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            <Text className={`text-center font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                No upcoming habits.
                            </Text>
                        </View>
                    )}

                    {/* Add some bottom padding for better scrolling experience */}
                    <View className="h-20" />
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

export default Home;