// components/NoHabitsPlaceholder.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus, ClipboardList } from 'lucide-react-native';

const NoHabitsPlaceholder = ({ onAddHabit, isDark, message }) => {
    return (
        <View
            className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} items-center`}
        >
            <View
                className={`w-12 h-12 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} 
          items-center justify-center mb-2`}
            >
                <ClipboardList size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </View>

            <Text
                className={`text-base font-montserrat-medium text-center mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                }`}
            >
                {message || "No habits yet"}
            </Text>

            <Text
                className={`text-xs text-center mb-3 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
            >
                Start building better habits by adding your first one
            </Text>

            <TouchableOpacity
                onPress={onAddHabit}
                className="bg-primary-500 rounded-lg px-4 py-2 flex-row items-center"
            >
                <Plus size={16} color="#FFFFFF" />
                <Text className="ml-1 text-white font-montserrat-medium">
                    Add Habit
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default NoHabitsPlaceholder;