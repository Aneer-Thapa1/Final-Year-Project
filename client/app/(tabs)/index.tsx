import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, useColorScheme, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { ChevronRight, Zap } from 'lucide-react-native';
import { router } from 'expo-router';

// Components
import TodayHabits from '../../components/TodayHabits';
import HabitStreakCard from '../../components/HabitStreakCard';
import ErrorMessage from '../../components/ErrorMessage';

// Services
import { getUserHabits, logHabitCompletion } from '../../services/habitService';

const Home = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isFocused = useIsFocused();

    const [habits, setHabits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Get active domains from habits
    const activeDomains = [...new Set(habits.map(habit => habit.domain?.name || 'General'))];

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

            // Ensure we have arrays before filtering
            const habitsData = Array.isArray(habitsResponse) ? habitsResponse : [];

            // Safe filtering after ensuring habitsData is an array
            const activeHabits = habitsData.filter(habit =>
                habit && typeof habit === 'object' && habit.is_active === true
            );

            setHabits(activeHabits);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
    };

    const handleComplete = async (habitId, completionData) => {
        try {
            // Map the CompletionData from the modal to what the API expects
            const apiCompletionData = {
                completed_at: completionData.completed_at,
                notes: completionData.notes,
                mood_rating: completionData.mood_rating,
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
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <SafeAreaView edges={['left', 'right']} className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingTop: 4 }}
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

                    {/* Header Section - Just Title */}
                    <View className="px-4 mt-0.5 mb-2">
                        <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            My Habits
                        </Text>
                    </View>

                    {/* Today's Habits Section */}
                    <View className="px-4">
                        <TodayHabits
                            habits={habits}
                            onComplete={handleComplete}
                            isDark={isDark}
                        />
                    </View>

                    {/* Domain-Based Habits Section */}
                    {activeDomains.length > 0 && (
                        <View className="mt-2 px-4">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Habit Categories
                                </Text>
                                <TouchableOpacity
                                    className="flex-row items-center"
                                    onPress={() => router.push('/categories')}
                                >
                                    <Text className="text-primary-500 font-montserrat-medium text-sm mr-1">
                                        View All
                                    </Text>
                                    <ChevronRight size={16} color="#6366F1" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 8 }}
                                className="mb-2"
                            >
                                {activeDomains.map((domain, index) => {
                                    const domainHabits = habits.filter(h => h.domain?.name === domain || (!h.domain && domain === 'General'));
                                    const color = getColorForDomain(domain, index);

                                    return (
                                        <TouchableOpacity
                                            key={domain}
                                            className={`mr-2.5 p-3 rounded-xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'} w-36`}
                                            style={{ elevation: 1 }}
                                            onPress={() => router.push({
                                                pathname: '/domain/[name]',
                                                params: { name: domain }
                                            })}
                                        >
                                            <View className={`mb-1 p-1.5 rounded-full w-7 h-7 items-center justify-center`}
                                                  style={{ backgroundColor: `${color}20` }} // 20% opacity
                                            >
                                                <Zap size={16} color={color} />
                                            </View>
                                            <Text className={`text-base font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                                                {domain}
                                            </Text>
                                            <Text className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {domainHabits.length} habit{domainHabits.length !== 1 ? 's' : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Streak Leaders Section */}
                    {habits.filter(h => h.streak?.current_streak > 0).length > 0 && (
                        <View className="px-4 mb-2">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Streak Leaders
                                </Text>
                            </View>

                            {habits
                                .filter(h => h.streak?.current_streak > 0)
                                .sort((a, b) => (b.streak?.current_streak || 0) - (a.streak?.current_streak || 0))
                                .slice(0, 3)
                                .map((habit, index) => (
                                    <HabitStreakCard
                                        key={habit.habit_id || index}
                                        habit={habit}
                                        isDark={isDark}
                                        onPress={() => router.push({
                                            pathname: '/habit/[id]',
                                            params: { id: habit.habit_id }
                                        })}
                                    />
                                ))
                            }
                        </View>
                    )}

                    {/* Add some bottom padding for better scrolling experience */}
                    <View className="h-14" />
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

// Helper function to get a consistent color for each domain
const getColorForDomain = (domain, index) => {
    const colors = [
        '#6366F1', // indigo
        '#10B981', // emerald
        '#F59E0B', // amber
        '#8B5CF6', // purple
        '#EF4444', // red
        '#3B82F6', // blue
        '#EC4899', // pink
    ];

    // Use the domain name to get a consistent color
    const hashCode = domain.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hashCode) % colors.length] || colors[index % colors.length];
};

export default Home;