// AddHabit.js
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5 } from '@expo/vector-icons';

const AddHabit = () => {
    const [habitData, setHabitData] = useState({
        name: '',
        description: '',
        domain_id: '',
        frequency_type_id: '',
        frequency_value: '',
        frequency_interval: '',
        start_date: new Date(),
        end_date: null,
        specific_time: null,
        days_of_week: [],
        days_of_month: [],
        reminder_time: null
    });

    return (
        <SafeAreaView className="flex-1 bg-theme-background">
            <ScrollView className="flex-1 px-4">
                {/* Header */}
                <View className="py-6">
                    <Text className="font-montserrat-bold text-2xl text-theme-text-primary">
                        Create New Habit
                    </Text>
                    <Text className="font-montserrat text-theme-text-secondary mt-2">
                        Build a new healthy habit
                    </Text>
                </View>

                {/* Basic Info Section */}
                <View className="bg-theme-card rounded-card p-card-padding mb-4">
                    <Text className="font-montserrat-semibold text-lg text-theme-text-primary mb-4">
                        Basic Information
                    </Text>

                    <TextInput
                        className="bg-theme-input rounded-input p-4 font-montserrat text-theme-text-primary mb-4"
                        placeholder="Habit Name"
                        placeholderTextColor="#9CA3AF"
                        value={habitData.name}
                        onChangeText={(text) => setHabitData({...habitData, name: text})}
                    />

                    <TextInput
                        className="bg-theme-input rounded-input p-4 font-montserrat text-theme-text-primary mb-4"
                        placeholder="Description"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={3}
                        value={habitData.description}
                        onChangeText={(text) => setHabitData({...habitData, description: text})}
                    />
                </View>

                {/* Domain Selection */}
                <View className="bg-theme-card rounded-card p-card-padding mb-4">
                    <Text className="font-montserrat-semibold text-lg text-theme-text-primary mb-4">
                        Category
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {domains.map((domain) => (
                            <TouchableOpacity
                                key={domain.id}
                                className={`px-4 py-3 rounded-button flex-row items-center ${
                                    habitData.domain_id === domain.id
                                        ? 'bg-primary-500'
                                        : 'bg-theme-input'
                                }`}
                                onPress={() => setHabitData({...habitData, domain_id: domain.id})}
                            >
                                <Text className={`font-montserrat ${
                                    habitData.domain_id === domain.id
                                        ? 'text-white'
                                        : 'text-theme-text-primary'
                                }`}>
                                    {domain.icon} {domain.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Frequency Selection */}
                <View className="bg-theme-card rounded-card p-card-padding mb-4">
                    <Text className="font-montserrat-semibold text-lg text-theme-text-primary mb-4">
                        Frequency
                    </Text>
                    <View className="flex-row gap-4 mb-4">
                        <TextInput
                            className="flex-1 bg-theme-input rounded-input p-4 font-montserrat text-theme-text-primary"
                            placeholder="Times"
                            keyboardType="numeric"
                            value={habitData.frequency_value}
                            onChangeText={(text) => setHabitData({...habitData, frequency_value: text})}
                        />
                        <View className="flex-1">
                            <Picker
                                selectedValue={habitData.frequency_type_id}
                                onValueChange={(value) => setHabitData({...habitData, frequency_type_id: value})}
                            >
                                <Picker.Item label="Daily" value="1" />
                                <Picker.Item label="Weekly" value="2" />
                                <Picker.Item label="Monthly" value="3" />
                            </Picker>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className="bg-primary-500 rounded-button py-4 mb-8"
                    onPress={handleSubmit}
                >
                    <Text className="text-white font-montserrat-semibold text-center text-lg">
                        Create Habit
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const domains = [
    { id: 1, name: 'Health', icon: '🏥' },
    { id: 2, name: 'Fitness', icon: '💪' },
    { id: 3, name: 'Education', icon: '📚' },
    { id: 4, name: 'Finance', icon: '💰' },
    { id: 5, name: 'Career', icon: '💼' },
    { id: 6, name: 'Mindfulness', icon: '🧘' }
];

export default AddHabit;