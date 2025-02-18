import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { getUserHabits, logHabitCompletion, getUpcomingHabits } from '../../services/habitService';
import { MotiView } from 'moti';
import { Feather } from '@expo/vector-icons';

const Home = () => {
    const [habits, setHabits] = useState([]);
    const [upcomingHabits, setUpcomingHabits] = useState([]);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        fetchHabits();
    }, []);

    const fetchHabits = async () => {
        try {
            const [habitsResponse, upcomingResponse] = await Promise.all([
                getUserHabits(),
                getUpcomingHabits()
            ]);
            setHabits(habitsResponse.data);
            setUpcomingHabits(upcomingResponse.data);
        } catch (error) {
            console.error("Error fetching habits:", error);
        }
    };

    const handleCompleteHabit = async (habitId) => {
        try {
            await logHabitCompletion(habitId, { completed_at: new Date() });
            fetchHabits();
        } catch (error) {
            console.error("Error completing habit:", error);
        }
    };

    const renderHabitItem = ({ item }) => (
        <Swipeable
            renderRightActions={() => (
                <TouchableOpacity
                    onPress={() => handleCompleteHabit(item.habit_id)}
                    className={`justify-center items-center w-20 ${isDark ? 'bg-green-700' : 'bg-green-500'} rounded-r-lg`}
                >
                    <Feather name="check" size={24} color="white" />
                </TouchableOpacity>
            )}
        >
            <MotiView
                from={{ opacity: 0, translateY: 50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500 }}
                className={`p-4 mb-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-md`}
            >
                <View className="flex-row justify-between items-center mb-2">
                    <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</Text>
                    <View className={`px-2 py-1 rounded-full ${isDark ? 'bg-blue-700' : 'bg-blue-100'}`}>
                        <Text className={`text-xs ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                            {item.frequencyType.name}
                        </Text>
                    </View>
                </View>
                <Text className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</Text>
                <View className="flex-row justify-between">
                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Frequency: {item.frequency_value} times
                    </Text>
                    <View className="flex-row items-center">
                        <Feather name="trending-up" size={16} color={isDark ? '#60A5FA' : '#3B82F6'} />
                        <Text className={`ml-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            Streak: {item.streak?.current_streak || 0} days
                        </Text>
                    </View>
                </View>
            </MotiView>
        </Swipeable>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <View className="px-4 py-6">
                <Text className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Habits</Text>
                <Text className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Swipe right to complete a habit</Text>
            </View>

            <FlatList
                data={habits}
                renderItem={renderHabitItem}
                keyExtractor={(item) => item.habit_id.toString()}
                className="px-4"
                showsVerticalScrollIndicator={false}
            />

            <View className="p-4 mt-4">
                <Text className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upcoming Habits</Text>
                <FlatList
                    data={upcomingHabits.slice(0, 3)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View className={`mr-4 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</Text>
                            <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(item.next_due_date).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                    keyExtractor={(item) => item.habit_id.toString()}
                />
            </View>

            <View className="p-4">
                <Text className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Suggestions for you</Text>
                <TouchableOpacity>
                    <Text className="font-bold text-sm text-blue-500 mt-2">VIEW ALL</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default Home;