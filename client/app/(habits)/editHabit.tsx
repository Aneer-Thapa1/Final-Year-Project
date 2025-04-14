import React, { useState, useEffect } from 'react';
import {
    View,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
    useColorScheme,
    Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

// Import services
import { getHabitDetails, updateHabit } from '../../services/habitService';

// Import our modern form component
import ModernHabitForm from '../../components/HabitForm';

const EditHabitScreen = () => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const params = useLocalSearchParams();

    // Get habit ID from params
    const habitId = params.id || params.habitId;

    console.log(params.habitId);
    // State
    const [habit, setHabit] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch habit details
    useEffect(() => {
        const fetchHabitDetails = async () => {
            try {
                setIsLoading(true);

                if (habitId) {
                    const habitDetails = await getHabitDetails(habitId);
                    setHabit(habitDetails.data);
                }
            } catch (err) {
                console.error('Error fetching habit details:', err);
                Alert.alert('Error', 'Failed to load habit data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchHabitDetails();
    }, [habitId]);

    // Handle form submission
    const handleSubmit = async (formData) => {
        try {
            await updateHabit(habitId, formData);
            Alert.alert('Success', 'Habit updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err) {
            Alert.alert('Error', 'Failed to update habit');
        }
    };

    // Get status bar style
    const getStatusBarStyle = () => {
        return isDarkMode ? 'light-content' : 'dark-content';
    };

    // Theme
    const theme = {
        bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    };

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView className={`flex-1 ${theme.bg}`}>
                <StatusBar
                    barStyle={getStatusBarStyle()}
                    backgroundColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                    translucent={Platform.OS === 'android'}
                />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#22C55E" />
                </View>
            </SafeAreaView>
        );
    }

    // Render form with prefilled data
    return (
        <SafeAreaView className={`flex-1 ${theme.bg}`}>
            <StatusBar
                barStyle={getStatusBarStyle()}
                backgroundColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                translucent={Platform.OS === 'android'}
            />

            {/* Just render the form with habit data */}
            <ModernHabitForm
                initialData={habit}
                onSubmit={handleSubmit}
                onCancel={() => router.back()}
                isEditMode={true}
            />
        </SafeAreaView>
    );
};

export default EditHabitScreen;