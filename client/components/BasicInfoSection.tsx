// components/habits/BasicInfoSection.js
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { HelpCircle } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';
import { difficultyLevels } from '../constants/habit';

const BasicInfoSection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Basic Information"
                icon={<HelpCircle size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('basicInfo')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <TextInput
                        className={`p-4 rounded-xl mb-4 font-montserrat ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="Habit Name"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={habitData.name}
                        onChangeText={(text) => setHabitData({...habitData, name: text})}
                    />
                    <TextInput
                        className={`p-4 rounded-xl mb-4 font-montserrat ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="Description"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        value={habitData.description}
                        onChangeText={(text) => setHabitData({...habitData, description: text})}
                    />

                    <Text className={`mt-2 mb-3 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Difficulty Level
                    </Text>
                    <View className="flex-row justify-between mb-2">
                        {difficultyLevels.map((level) => (
                            <TouchableOpacity
                                key={level.id}
                                onPress={() => setHabitData({...habitData, difficulty_id: level.id})}
                                className={`py-2 px-3 rounded-lg ${
                                    habitData.difficulty_id === level.id
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}
                                style={habitData.difficulty_id !== level.id ? { borderColor: level.color, borderWidth: 1 } : {}}
                                activeOpacity={0.7}
                            >
                                <Text
                                    className={`text-xs font-montserrat-medium ${
                                        habitData.difficulty_id === level.id
                                            ? 'text-white'
                                            : isDark ? 'text-white' : 'text-gray-800'
                                    }`}
                                >
                                    {level.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </MotiView>
            )}
        </View>
    );
};

export default BasicInfoSection;