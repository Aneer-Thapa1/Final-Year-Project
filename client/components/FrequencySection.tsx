// components/habits/FrequencySection.js
import React from 'react';
import { View, Text, TextInput, useColorScheme } from 'react-native';
import { Repeat } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Picker } from '@react-native-picker/picker';
import SectionHeader from './SectionHeader';

const FrequencySection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Helper function to get frequency text
    const getFrequencyText = () => {
        const type = habitData.frequency_type_id;
        const value = parseInt(habitData.frequency_value);
        const interval = parseInt(habitData.frequency_interval);

        let typeText = "";
        switch(type) {
            case "1": typeText = "day"; break;
            case "2": typeText = "week"; break;
            case "3": typeText = "month"; break;
            default: typeText = "day";
        }

        if (interval > 1) {
            typeText = `${interval} ${typeText}s`;
        }

        return `${value} time${value > 1 ? 's' : ''} per ${typeText}`;
    };

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Frequency"
                icon={<Repeat size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('frequency')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Frequency Type
                    </Text>
                    <View className={`mb-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Picker
                            selectedValue={habitData.frequency_type_id}
                            onValueChange={(value) => setHabitData({...habitData, frequency_type_id: value})}
                            style={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        >
                            <Picker.Item label="Daily" value="1" />
                            <Picker.Item label="Weekly" value="2" />
                            <Picker.Item label="Monthly" value="3" />
                        </Picker>
                    </View>

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Frequency Value
                    </Text>
                    <View className="flex-row mb-4">
                        <View className="flex-1 flex-row items-center">
                            <TextInput
                                className={`flex-1 p-4 rounded-xl font-montserrat ${
                                    isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                                placeholder="How many times?"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={habitData.frequency_value}
                                onChangeText={(text) => {
                                    const numValue = text.replace(/[^0-9]/g, '');
                                    setHabitData({
                                        ...habitData,
                                        frequency_value: numValue || '1'
                                    });
                                }}
                                keyboardType="numeric"
                            />
                            <Text className={`ml-3 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                times
                            </Text>
                        </View>
                    </View>

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Every
                    </Text>
                    <View className="flex-row mb-4">
                        <View className="flex-1 flex-row items-center">
                            <TextInput
                                className={`flex-1 p-4 rounded-xl font-montserrat ${
                                    isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                                placeholder="Interval"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                value={habitData.frequency_interval}
                                onChangeText={(text) => {
                                    const numValue = text.replace(/[^0-9]/g, '');
                                    setHabitData({
                                        ...habitData,
                                        frequency_interval: numValue || '1'
                                    });
                                }}
                                keyboardType="numeric"
                            />
                            <Text className={`ml-3 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {parseInt(habitData.frequency_interval) > 1
                                    ? habitData.frequency_type_id === "1"
                                        ? "days"
                                        : habitData.frequency_type_id === "2"
                                            ? "weeks"
                                            : "months"
                                    : habitData.frequency_type_id === "1"
                                        ? "day"
                                        : habitData.frequency_type_id === "2"
                                            ? "week"
                                            : "month"}
                            </Text>
                        </View>
                    </View>

                    <View className={`mt-2 p-3 rounded-lg ${isDark ? 'bg-primary-500/20' : 'bg-primary-500/10'}`}>
                        <Text className={`font-montserrat-medium text-center ${isDark ? 'text-primary-300' : 'text-primary-600'}`}>
                            {getFrequencyText()}
                        </Text>
                    </View>
                </MotiView>
            )}
        </View>
    );
};

export default FrequencySection;