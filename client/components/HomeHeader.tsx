// components/home/HomeHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PlusCircle, Settings, Bell } from 'lucide-react-native';
import { router } from 'expo-router';

interface HomeHeaderProps {
    isDark: boolean;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ isDark }) => {
    // Function to get greeting based on time of day
    const getGreeting = (): string => {
        const hour = new Date().getHours();

        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <View className={`px-4 pt-2 pb-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center">
                <View>
                    <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getGreeting()}
                    </Text>
                    <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        My Habits
                    </Text>
                </View>

                <View className="flex-row">
                    <TouchableOpacity
                        className="p-2 mr-3"
                        onPress={() => router.push('/notifications')}
                        activeOpacity={0.7}
                    >
                        <Bell size={24} color={isDark ? '#E5E7EB' : '#374151'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="p-2"
                        onPress={() => router.push('/settings')}
                        activeOpacity={0.7}
                    >
                        <Settings size={24} color={isDark ? '#E5E7EB' : '#374151'} />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                className={`mt-4 py-3 px-4 rounded-xl flex-row items-center justify-center bg-primary-500`}
                onPress={() => router.push('/add')}
                activeOpacity={0.7}
            >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text className="ml-2 text-white font-montserrat-semibold">
                    Add New Habit
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default HomeHeader;