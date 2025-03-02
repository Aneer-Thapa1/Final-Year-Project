// components/habits/RemindersSection.js
import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, TextInput, Switch, Alert } from 'react-native';
import { Bell, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Picker } from '@react-native-picker/picker';
import SectionHeader from './SectionHeader';
import { reminderTypes, daysOfWeek, dayNumbers } from '../constants/habit';

const RemindersSection = ({
                              habitData,
                              setHabitData,
                              isExpanded,
                              toggleSection,
                              showReminderTime,
                              setShowReminderTime,
                              editingReminderIndex,
                              setEditingReminderIndex,
                              renderDatePicker
                          }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Add a reminder
    const addReminder = (time) => {
        if (time) {
            const updatedReminders = [...habitData.reminder_times];

            if (editingReminderIndex !== null) {
                updatedReminders[editingReminderIndex] = time;
            } else {
                updatedReminders.push(time);
            }

            setHabitData({
                ...habitData,
                reminder_times: updatedReminders
            });
        }
    };

    // Remove a reminder
    const removeReminder = (index) => {
        const updatedReminders = [...habitData.reminder_times];
        updatedReminders.splice(index, 1);
        setHabitData({ ...habitData, reminder_times: updatedReminders });
    };

    // Toggle a reminder day
    const toggleReminderDay = (day) => {
        const currentDays = [...habitData.reminder_days];
        const dayIndex = currentDays.indexOf(day);

        if (dayIndex === -1) {
            currentDays.push(day);
        } else {
            currentDays.splice(dayIndex, 1);
        }

        setHabitData({
            ...habitData,
            reminder_days: currentDays
        });
    };

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Reminders"
                icon={<Bell size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('reminders')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    {/* Reminder times */}
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Reminder Times
                    </Text>

                    {habitData.reminder_times.length > 0 ? (
                        <View className="mb-4">
                            {habitData.reminder_times.map((reminder, index) => (
                                <View
                                    key={index}
                                    className={`flex-row items-center justify-between mb-2 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                >
                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <View className="flex-row">
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingReminderIndex(index);
                                                setShowReminderTime(true);
                                            }}
                                            className="mr-2 bg-primary-500/20 p-2 rounded-lg"
                                            activeOpacity={0.7}
                                        >
                                            <Edit2 size={16} color={isDark ? '#A5B4FC' : '#6366F1'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => removeReminder(index)}
                                            className="bg-red-500/20 p-2 rounded-lg"
                                            activeOpacity={0.7}
                                        >
                                            <Trash2 size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                            <Text className={`font-montserrat text-center ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                                No reminders set. Add a reminder to help build your habit.
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            setEditingReminderIndex(null);
                            setShowReminderTime(true);
                        }}
                        className="bg-primary-500 px-4 py-3 rounded-lg flex-row justify-center items-center mb-6"
                        activeOpacity={0.7}
                    >
                        <Plus size={16} color="#FFFFFF" />
                        <Text className="text-white font-montserrat-medium ml-1">
                            Add Reminder
                        </Text>
                    </TouchableOpacity>

                    {renderDatePicker(
                        showReminderTime,
                        editingReminderIndex !== null && habitData.reminder_times[editingReminderIndex]
                            ? habitData.reminder_times[editingReminderIndex]
                            : new Date(),
                        (event, selectedTime) => {
                            if (event.type === "set" && selectedTime) {
                                addReminder(selectedTime);
                                setShowReminderTime(false);
                                setEditingReminderIndex(null);
                            } else {
                                setShowReminderTime(false);
                                setEditingReminderIndex(null);
                            }
                        },
                        () => {
                            setShowReminderTime(false);
                            setEditingReminderIndex(null);
                        },
                        'time'
                    )}

                    {/* Reminder Type */}
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Reminder Type
                    </Text>
                    <View className={`mb-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Picker
                            selectedValue={habitData.reminder_type}
                            onValueChange={(value) => setHabitData({...habitData, reminder_type: value})}
                            style={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        >
                            {reminderTypes.map(type => (
                                <Picker.Item key={type.id} label={type.name} value={type.id} />
                            ))}
                        </Picker>
                    </View>

                    {/* Reminder Message */}
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Custom Message (Optional)
                    </Text>
                    <TextInput
                        className={`p-4 rounded-xl mb-4 font-montserrat ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="Reminder message"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={habitData.reminder_message}
                        onChangeText={(text) => setHabitData({...habitData, reminder_message: text})}
                    />

                    {/* Reminder Days */}
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Remind on These Days
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {dayNumbers.map((day, index) => (
                            <TouchableOpacity
                                key={day}
                                className={`py-2 px-3 rounded-lg ${
                                    habitData.reminder_days.includes(day)
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}
                                onPress={() => toggleReminderDay(day)}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-montserrat text-center ${
                                    habitData.reminder_days.includes(day)
                                        ? 'text-white'
                                        : isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {daysOfWeek[index]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Additional reminder settings */}
                    <View className="mb-2">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Enable Snoozing
                            </Text>
                            <Switch
                                value={habitData.snooze_enabled}
                                onValueChange={(value) => setHabitData({...habitData, snooze_enabled: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.snooze_enabled ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        {habitData.snooze_enabled && (
                            <View className="flex-row items-center mb-4">
                                <Text className={`font-montserrat-medium mr-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Snooze Duration:
                                </Text>
                                <TextInput
                                    className={`p-2 rounded-lg w-20 text-center font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    value={habitData.snooze_duration.toString()}
                                    onChangeText={(text) => {
                                        const numValue = text.replace(/[^0-9]/g, '');
                                        setHabitData({
                                            ...habitData,
                                            snooze_duration: numValue ? parseInt(numValue) : 10
                                        });
                                    }}
                                    keyboardType="numeric"
                                />
                                <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    minutes
                                </Text>
                            </View>
                        )}

                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Only remind when due
                            </Text>
                            <Switch
                                value={habitData.only_when_due}
                                onValueChange={(value) => setHabitData({...habitData, only_when_due: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.only_when_due ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Smart Timing (AI-optimized)
                            </Text>
                            <Switch
                                value={habitData.smart_reminder}
                                onValueChange={(value) => setHabitData({...habitData, smart_reminder: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.smart_reminder ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center">
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Adaptive Timing
                            </Text>
                            <Switch
                                value={habitData.adaptive_timing}
                                onValueChange={(value) => setHabitData({...habitData, adaptive_timing: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.adaptive_timing ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </MotiView>
            )}
        </View>
    );
};

export default RemindersSection;