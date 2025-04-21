import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    TouchableOpacity,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, ArrowLeft } from 'lucide-react-native';
import HabitForm from '../../components/HabitForm';
import { addHabit, updateHabit } from '../../services/habitService';

const HabitManagementScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // State to control which tab is active
    const [activeTab, setActiveTab] = useState('form'); // 'list' or 'form'
    const [editingHabit, setEditingHabit] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEditHabit = useCallback((habit) => {
        setEditingHabit(habit);
        setActiveTab('form');
    }, []);

    const handleCreateNewHabit = useCallback(() => {
        setEditingHabit(null);
        setActiveTab('form');
    }, []);

    const handleFormSuccess = useCallback(async (formData) => {
        try {
            setIsSubmitting(true);

            if (editingHabit) {
                // Update existing habit
                await updateHabit(editingHabit.habit_id, formData, {
                    preserveExistingReminders: false,
                    fetchAfterUpdate: true
                });

                Alert.alert(
                    "Success",
                    "Habit updated successfully!",
                    [{ text: "OK" }]
                );
            } else {
                // Create new habit
                await addHabit(formData, {
                    autoGenerateReminders: true
                });

                Alert.alert(
                    "Success",
                    "Habit created successfully!",
                    [{ text: "OK" }]
                );
            }

            // Reset and go back to list view
            setEditingHabit(null);
            setActiveTab('list');

        } catch (error) {
            console.error('Error saving habit:', error);
            Alert.alert(
                "Error",
                `Failed to ${editingHabit ? 'update' : 'create'} habit: ${error.message || 'Unknown error'}`,
                [{ text: "OK" }]
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [editingHabit]);

    const handleFormCancel = useCallback(() => {
        // Go back to list view
        setEditingHabit(null);
        setActiveTab('list');
    }, []);

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Main Content */}
                <View className="flex-1">
                    {activeTab === 'form' ? (
                        <HabitForm
                            initialData={editingHabit}
                            onSubmit={handleFormSuccess}
                            onCancel={handleFormCancel}
                            isEditMode={!!editingHabit}
                            isSubmitting={isSubmitting}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center p-4">
                            <Text className={`mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                You don't have any habits yet. Create your first habit to get started!
                            </Text>
                            <TouchableOpacity
                                onPress={handleCreateNewHabit}
                                className={`px-4 py-2 rounded-lg ${isDark ? 'bg-primary-700' : 'bg-primary-500'}`}
                            >
                                <Text className="text-white font-medium">Create Habit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HabitManagementScreen;