import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

const RenderFrequencyInput = ({ habitData, setHabitData, isDark, daysOfWeek }) => {
    switch (habitData.frequency_type_id) {
        case '1': // Daily
            return (
                <View className="flex-row items-center mb-4">
                    <TextInput
                        className={`flex-1 rounded-xl p-4 font-montserrat mr-2 ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="Times per day"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        keyboardType="numeric"
                        value={habitData.frequency_value}
                        onChangeText={(text) => setHabitData({...habitData, frequency_value: text})}
                    />
                    <Text className={`font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        times per day
                    </Text>
                </View>
            );
        case '2': // Weekly
            return (
                <View>
                    <Text className={`font-montserrat mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Select days:
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {daysOfWeek.map((day, index) => (
                            <TouchableOpacity
                                key={day}
                                className={`px-4 py-2 rounded-full ${
                                    habitData.days_of_week.includes(index + 1)
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                                onPress={() => {
                                    const updatedDays = habitData.days_of_week.includes(index + 1)
                                        ? habitData.days_of_week.filter(d => d !== index + 1)
                                        : [...habitData.days_of_week, index + 1];
                                    setHabitData({...habitData, days_of_week: updatedDays});
                                }}
                            >
                                <Text className={`font-montserrat ${
                                    habitData.days_of_week.includes(index + 1) || isDark
                                        ? 'text-white'
                                        : 'text-gray-900'
                                }`}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        case '3': // Monthly
            return (
                <View>
                    <Text className={`font-montserrat mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Select dates:
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {[...Array(31)].map((_, index) => (
                            <TouchableOpacity
                                key={index}
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    habitData.days_of_month.includes(index + 1)
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                                onPress={() => {
                                    const updatedDates = habitData.days_of_month.includes(index + 1)
                                        ? habitData.days_of_month.filter(d => d !== index + 1)
                                        : [...habitData.days_of_month, index + 1];
                                    setHabitData({...habitData, days_of_month: updatedDates});
                                }}
                            >
                                <Text className={`font-montserrat ${
                                    habitData.days_of_month.includes(index + 1) || isDark
                                        ? 'text-white'
                                        : 'text-gray-900'
                                }`}>
                                    {index + 1}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            );
        default:
            return null;
    }
};

export default RenderFrequencyInput;