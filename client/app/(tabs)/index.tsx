import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserHabits, logHabitCompletion, getUpcomingHabits } from '../../services/habitService';
import { Ionicons } from '@expo/vector-icons';

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
            fetchHabits();
        } catch (error) {
            console.error("Error completing habit:", error);
        }
    };

    const renderHabitItem = (item) => (
        <TouchableOpacity
            key={item.habit_id}
            onPress={() => handleCompleteHabit(item.habit_id)}
            className={`p-4 mb-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-md`}
        >
            <View className="flex-row justify-between items-center mb-2">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</Text>
                <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-blue-900' : 'bg-blue-100'}`}>
                    <Text className={`text-xs ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>
                        {item.frequencyType?.name}
                    </Text>
                </View>
            </View>
            <Text className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</Text>
            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    <Text className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.frequency_value} times {item.frequencyType?.name.toLowerCase()}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Ionicons name="flame" size={16} color={isDark ? '#F59E0B' : '#D97706'} />
                    <Text className={`ml-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {item.streak?.current_streak || 0} day streak
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ScrollView className="flex-1"  contentContainerStyle={{ padding: 16 }}>
                <View className="mb-6">
                    <Text className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Habits</Text>
                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tap to complete a habit</Text>
                </View>

                {habits.map(renderHabitItem)}

                <View className="mt-6 mb-4">
                    <Text className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upcoming Habits</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {upcomingHabits.slice(0, 3).map((item) => (
                            <View key={item.habit_id} className={`mr-4 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                                <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</Text>
                                <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {new Date(item.next_due_date).toLocaleDateString()}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View className="mt-2 ">
                    <Text className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Suggestions for you</Text>
                    <TouchableOpacity>
                        <Text className="font-bold text-sm text-blue-500">VIEW ALL</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Home;