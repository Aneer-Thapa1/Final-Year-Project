
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useColorScheme, Switch } from 'react-native';
import { Target, Plus, Trash } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';
import { trackingTypes } from '../constants/habit';

const TrackingMethodSection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Subtask management
    const [newSubtask, setNewSubtask] = useState({ name: '', description: '', is_required: true });

    // Add a subtask
    const addSubtask = () => {
        if (!newSubtask.name.trim()) {
            Alert.alert('Invalid Subtask', 'Please provide a name for the subtask');
            return;
        }

        setHabitData({
            ...habitData,
            subtasks: [...habitData.subtasks, { ...newSubtask, sort_order: habitData.subtasks.length }]
        });
        setNewSubtask({ name: '', description: '', is_required: true });
    };

    // Remove a subtask
    const removeSubtask = (index) => {
        const updatedSubtasks = [...habitData.subtasks];
        updatedSubtasks.splice(index, 1);
        // Update sort order for remaining items
        const reindexedSubtasks = updatedSubtasks.map((item, idx) => ({ ...item, sort_order: idx }));
        setHabitData({ ...habitData, subtasks: reindexedSubtasks });
    };

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Tracking Method"
                icon={<Target size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('trackingType')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {trackingTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                className={`px-4 py-3 rounded-xl flex-1 min-w-[45%] ${
                                    habitData.tracking_type === type.id
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}
                                onPress={() => setHabitData({...habitData, tracking_type: type.id})}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-montserrat text-center ${
                                    habitData.tracking_type === type.id
                                        ? 'text-white'
                                        : isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {type.icon} {type.name}
                                </Text>
                                <Text className={`text-xs text-center mt-1 ${
                                    habitData.tracking_type === type.id
                                        ? 'text-white opacity-80'
                                        : isDark ? 'text-gray-300' : 'text-gray-500'
                                }`}>
                                    {type.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Tracking type specific inputs */}
                    {habitData.tracking_type === 'COUNTABLE' && (
                        <View className="mt-2">
                            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Count Goal
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    className={`flex-1 p-4 rounded-xl font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    placeholder="How many times?"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={habitData.count_goal ? habitData.count_goal.toString() : ''}
                                    onChangeText={(text) => {
                                        const numValue = text.replace(/[^0-9]/g, '');
                                        setHabitData({
                                            ...habitData,
                                            count_goal: numValue ? parseInt(numValue) : null
                                        });
                                    }}
                                    keyboardType="numeric"
                                />
                                <Text className={`ml-3 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    times
                                </Text>
                            </View>
                        </View>
                    )}

                    {habitData.tracking_type === 'TIMER' && (
                        <View className="mt-2">
                            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Duration Goal
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    className={`flex-1 p-4 rounded-xl font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    placeholder="How many minutes?"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={habitData.duration_goal ? habitData.duration_goal.toString() : ''}
                                    onChangeText={(text) => {
                                        const numValue = text.replace(/[^0-9]/g, '');
                                        setHabitData({
                                            ...habitData,
                                            duration_goal: numValue ? parseInt(numValue) : null
                                        });
                                    }}
                                    keyboardType="numeric"
                                />
                                <Text className={`ml-3 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    minutes
                                </Text>
                            </View>
                        </View>
                    )}

                    {habitData.tracking_type === 'NUMERIC' && (
                        <View className="mt-2">
                            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Numeric Goal
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    className={`flex-1 p-4 rounded-xl font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    placeholder="Value"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={habitData.numeric_goal ? habitData.numeric_goal.toString() : ''}
                                    onChangeText={(text) => {
                                        const numValue = text.replace(/[^0-9.]/g, '');
                                        setHabitData({
                                            ...habitData,
                                            numeric_goal: numValue ? parseFloat(numValue) : null
                                        });
                                    }}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    className={`ml-3 p-4 rounded-xl w-24 font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    placeholder="Units"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={habitData.units}
                                    onChangeText={(text) => setHabitData({...habitData, units: text})}
                                />
                            </View>
                        </View>
                    )}

                    {habitData.tracking_type === 'CHECKLIST' && (
                        <View className="mt-2">
                            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Subtasks
                            </Text>

                            {/* Existing subtasks */}
                            {habitData.subtasks.map((subtask, index) => (
                                <View key={index} className={`mb-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <View className="flex-row justify-between items-center">
                                        <Text className={`font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {subtask.name}
                                        </Text>
                                        <TouchableOpacity onPress={() => removeSubtask(index)} activeOpacity={0.7}>
                                            <Trash size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    {subtask.description ? (
                                        <Text className={`text-sm mt-1 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {subtask.description}
                                        </Text>
                                    ) : null}
                                    <View className="flex-row items-center mt-1">
                                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Required:
                                        </Text>
                                        <Text className={`ml-1 text-xs font-montserrat-medium ${
                                            subtask.is_required ? 'text-green-500' : 'text-amber-500'
                                        }`}>
                                            {subtask.is_required ? 'Yes' : 'No'}
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            {/* Add new subtask */}
                            <View className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                <TextInput
                                    className={`mb-2 p-3 rounded-lg font-montserrat ${
                                        isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'
                                    }`}
                                    placeholder="Subtask name"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={newSubtask.name}
                                    onChangeText={(text) => setNewSubtask({...newSubtask, name: text})}
                                />
                                <TextInput
                                    className={`mb-2 p-3 rounded-lg font-montserrat ${
                                        isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'
                                    }`}
                                    placeholder="Description (optional)"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={newSubtask.description}
                                    onChangeText={(text) => setNewSubtask({...newSubtask, description: text})}
                                />
                                <View className="flex-row items-center mb-3">
                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Required:
                                    </Text>
                                    <Switch
                                        value={newSubtask.is_required}
                                        onValueChange={(value) => setNewSubtask({...newSubtask, is_required: value})}
                                        trackColor={{ false: '#767577', true: '#6366F1' }}
                                        thumbColor={newSubtask.is_required ? '#FFFFFF' : '#f4f3f4'}
                                        className="ml-2"
                                    />
                                </View>
                                <TouchableOpacity
                                    className="bg-primary-500 p-3 rounded-lg flex-row justify-center items-center"
                                    onPress={addSubtask}
                                    activeOpacity={0.7}
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                    <Text className="text-white font-montserrat-medium ml-1">
                                        Add Subtask
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </MotiView>
            )}
        </View>
    );
};

export default TrackingMethodSection;