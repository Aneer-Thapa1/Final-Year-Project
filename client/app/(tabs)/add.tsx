// AddHabit.js
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useColorScheme, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { addHabit } from '../../services/habitService';
import { MotiView } from 'moti';
import { ArrowLeft } from 'lucide-react-native';
import { router } from "expo-router";
import RenderFrequencyInput from '../../components/RenderFrequencyInput';
import { domains } from '../../constants/domains';

const Add = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [habitData, setHabitData] = useState({
        name: '',
        description: '',
        domain_id: '',
        frequency_type_id: '1',
        frequency_value: '1',
        frequency_interval: '1',
        start_date: new Date(),
        end_date: null,
        specific_time: null,
        days_of_week: [],
        days_of_month: [],
        reminder_time: []
    });

    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [showReminderTime, setShowReminderTime] = useState(false);
    const [editingReminderIndex, setEditingReminderIndex] = useState(null);

    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const handleSubmit = async () => {
        try {
            const response = await addHabit(habitData);
            Alert.alert('Success', 'Habit created successfully!');

        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleDateChange = (event, selectedDate, dateType) => {
        const currentDate = selectedDate || habitData[dateType];
        setHabitData({ ...habitData, [dateType]: currentDate });
    };

    const renderDatePicker = (visible, currentDate, onChange, onClose, mode = 'date') => {
        if (Platform.OS === 'ios') {
            return (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={visible}
                    onRequestClose={onClose}
                >
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <View style={{ backgroundColor: isDark ? '#1F2937' : 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                            <DateTimePicker
                                value={currentDate}
                                mode={mode}
                                display="spinner"
                                onChange={onChange}
                                style={{ backgroundColor: isDark ? '#1F2937' : 'white' }}
                                textColor={isDark ? 'white' : 'black'}
                            />
                            <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}>
                                <Text style={{ color: '#007AFF', textAlign: 'center', fontSize: 18 }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            );
        } else {
            return visible && (
                <DateTimePicker
                    value={currentDate}
                    mode={mode}
                    display="default"
                    onChange={(event, selectedDate) => {
                        onChange(event, selectedDate);
                        onClose();
                    }}
                />
            );
        }
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ScrollView className="flex-1">
                {/* Header */}
                <View className={`px-4 pt-2 pb-4 flex-row items-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-3 p-2 -ml-2"
                    >
                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                    </TouchableOpacity>
                    <View>
                        <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Create New Habit
                        </Text>
                        <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Build a new healthy habit
                        </Text>
                    </View>
                </View>

                {/* Form Sections */}
                <View className="px-4 py-6">
                    {/* Basic Info Section */}
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 100 }}
                        className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Basic Information
                        </Text>
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
                            value={habitData.description}
                            onChangeText={(text) => setHabitData({...habitData, description: text})}
                        />
                    </MotiView>

                    {/* Domain Selection */}
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                        className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Category
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {domains.map((domain) => (
                                <TouchableOpacity
                                    key={domain.id}
                                    className={`px-4 py-3 rounded-xl flex-row items-center ${
                                        habitData.domain_id === domain.id
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                    onPress={() => setHabitData({...habitData, domain_id: domain.id})}
                                >
                                    <Text className={`font-montserrat ${
                                        habitData.domain_id === domain.id || isDark
                                            ? 'text-white'
                                            : 'text-gray-900'
                                    }`}>
                                        {domain.icon} {domain.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </MotiView>

                    {/* Frequency Selection */}
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 300 }}
                        className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Frequency
                        </Text>
                        <View className={`mb-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
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
                        <RenderFrequencyInput
                            habitData={habitData}
                            setHabitData={setHabitData}
                            isDark={isDark}
                            daysOfWeek={daysOfWeek}
                        />
                    </MotiView>

                    {/* Date Selection */}
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 400 }}
                        className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Date Range
                        </Text>
                        <TouchableOpacity
                            className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            onPress={() => setShowStartDate(true)}
                        >
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Start Date: {habitData.start_date.toDateString()}
                            </Text>
                        </TouchableOpacity>
                        {renderDatePicker(
                            showStartDate,
                            habitData.start_date,
                            (event, selectedDate) => handleDateChange(event, selectedDate, 'start_date'),
                            () => setShowStartDate(false)
                        )}
                        <TouchableOpacity
                            className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            onPress={() => setShowEndDate(true)}
                        >
                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                End Date: {habitData.end_date ? habitData.end_date.toDateString() : 'Not set'}
                            </Text>
                        </TouchableOpacity>
                        {renderDatePicker(
                            showEndDate,
                            habitData.end_date || new Date(),
                            (event, selectedDate) => handleDateChange(event, selectedDate, 'end_date'),
                            () => setShowEndDate(false)
                        )}
                    </MotiView>

                    {/* Reminder */}
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 500 }}
                        className={`mb-6 p-4 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    >
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Reminders
                        </Text>
                        {habitData.reminder_time.map((reminder, index) => (
                            <View key={index} className="flex-row items-center justify-between mb-2">
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <View className="flex-row">
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingReminderIndex(index);
                                            setShowReminderTime(true);
                                        }}
                                        className="mr-2 bg-blue-500 px-3 py-1 rounded"
                                    >
                                        <Text className="text-white">Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const newReminders = [...habitData.reminder_time];
                                            newReminders.splice(index, 1);
                                            setHabitData({...habitData, reminder_time: newReminders});
                                        }}
                                        className="bg-red-500 px-3 py-1 rounded"
                                    >
                                        <Text className="text-white">Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <TouchableOpacity
                            onPress={() => {
                                setEditingReminderIndex(null);
                                setShowReminderTime(true);
                            }}
                            className="bg-primary-500 px-4 py-2 rounded mt-2"
                        >
                            <Text className="text-white text-center">Add Reminder</Text>
                        </TouchableOpacity>
                        {renderDatePicker(
                            showReminderTime,
                            editingReminderIndex !== null ? habitData.reminder_time[editingReminderIndex] : new Date(),
                            (event, selectedTime) => {
                                if (event.type === "set" && selectedTime) {
                                    const newReminders = [...habitData.reminder_time];
                                    if (editingReminderIndex !== null) {
                                        newReminders[editingReminderIndex] = selectedTime;
                                    } else {
                                        newReminders.push(selectedTime);
                                    }
                                    setHabitData({...habitData, reminder_time: newReminders});
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
                    </MotiView>

                    {/* Submit Button */}
                    <View className="pb-20">
                        <TouchableOpacity
                            className="bg-primary-500 rounded-xl py-4"
                            onPress={handleSubmit}
                        >
                            <Text className="text-white font-montserrat-semibold text-center text-lg">
                                Create Habit
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Add