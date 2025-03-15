import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    RefreshControl,
    Alert,
    useColorScheme
} from 'react-native';
import {
    Flame,
    PlusCircle,
    ArrowLeft,
    MoreVertical,
    Star,
    Edit2,
    Trash2,
    Award,
    Layers
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

// Import services
import {
    getUserHabits,
    deleteHabit,
    toggleFavorite
} from '../../services/habitService';

// Comprehensive Habit Interface based on Prisma schema
interface Habit {
    habit_id: number;
    name: string;
    description?: string;
    frequency_type: string;
    frequency_value: number;
    is_active: boolean;
    is_favorite: boolean;
    start_date: string;
    end_date?: string;
    current_streak?: number;
    longest_streak?: number;
    domain_name?: string;
    domain_color?: string;
    difficulty: 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
    tracking_type: 'BOOLEAN' | 'DURATION' | 'COUNT' | 'NUMERIC';
}

const HabitsScreen = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // State management
    const [habits, setHabits] = useState<Habit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
    const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);

    // Fetch habits
    const fetchHabits = async () => {
        try {
            setIsLoading(true);
            const { habits: fetchedHabits } = await getUserHabits({
                sort_by: 'createdAt',
                sort_order: 'desc'
            });
            setHabits(fetchedHabits);
        } catch (err) {
            Alert.alert('Error', 'Could not fetch habits. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Use focus effect to refresh habits when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchHabits();
        }, [])
    );

    // Format frequency for display
    const formatFrequency = (type: string, value: number) => {
        switch (type) {
            case 'DAILY': return 'Every Day';
            case 'WEEKDAYS': return 'Weekdays';
            case 'WEEKENDS': return 'Weekends';
            case 'X_TIMES_WEEK': return `${value} Times per Week`;
            case 'INTERVAL': return `Every ${value} Days`;
            default: return type.replace('_', ' ');
        }
    };

    // Get difficulty color and background
    const getDifficultyStyles = (difficulty: string) => {
        switch (difficulty) {
            case 'VERY_EASY':
                return {
                    text: 'text-emerald-500',
                    bg: 'bg-emerald-500/10'
                };
            case 'EASY':
                return {
                    text: 'text-green-500',
                    bg: 'bg-green-500/10'
                };
            case 'MEDIUM':
                return {
                    text: 'text-amber-500',
                    bg: 'bg-amber-500/10'
                };
            case 'HARD':
                return {
                    text: 'text-rose-500',
                    bg: 'bg-rose-500/10'
                };
            case 'VERY_HARD':
                return {
                    text: 'text-red-500',
                    bg: 'bg-red-500/10'
                };
            default:
                return {
                    text: 'text-gray-500',
                    bg: 'bg-gray-500/10'
                };
        }
    };

    // Handle habit options
    const showHabitOptions = (habit: Habit) => {
        setSelectedHabit(habit);
        setIsOptionsModalVisible(true);
    };

    // Handle delete habit
    const handleDeleteHabit = async () => {
        if (!selectedHabit) return;

        try {
            await deleteHabit(selectedHabit.habit_id);
            setHabits(currentHabits =>
                currentHabits.filter(habit => habit.habit_id !== selectedHabit.habit_id)
            );
            setIsOptionsModalVisible(false);
            Alert.alert('Success', 'Habit deleted successfully');
        } catch (err) {
            Alert.alert('Error', 'Could not delete habit');
        }
    };

    // Handle toggle favorite
    const handleToggleFavorite = async () => {
        if (!selectedHabit) return;

        try {
            await toggleFavorite(selectedHabit.habit_id);
            setHabits(currentHabits =>
                currentHabits.map(habit =>
                    habit.habit_id === selectedHabit.habit_id
                        ? { ...habit, is_favorite: !habit.is_favorite }
                        : habit
                )
            );
            setIsOptionsModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Could not toggle favorite status');
        }
    };

    // Render individual habit item
    const renderHabitItem = ({ item }: { item: Habit }) => {
        const difficultyStyles = getDifficultyStyles(item.difficulty);

        return (
            <TouchableOpacity
                className={`mb-4 p-4 rounded-xl border ${
                    isDarkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                } shadow-sm`}
                onPress={() => navigation.navigate('SingleHabit', { habit: item })}
            >
                {/* Header with Name, Favorite, and Options */}
                <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                        {/* Domain Indicator */}
                        {item.domain_name && (
                            <View
                                className="mr-2 p-2 rounded-full"
                                style={{
                                    backgroundColor: item.domain_color
                                        ? `${item.domain_color}20`
                                        : 'rgba(79, 70, 229, 0.1)'
                                }}
                            >
                                <Layers
                                    size={16}
                                    color={
                                        item.domain_color
                                        || '#4F46E5'
                                    }
                                />
                            </View>
                        )}

                        {/* Habit Name */}
                        <Text className={`text-lg font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        } mr-2`}>
                            {item.name}
                        </Text>

                        {/* Favorite Icon */}
                        {item.is_favorite && (
                            <Star
                                size={16}
                                color="#FFD700"
                                fill="#FFD700"
                            />
                        )}
                    </View>

                    {/* Options Button */}
                    <TouchableOpacity onPress={() => showHabitOptions(item)}>
                        <MoreVertical
                            size={20}
                            color={isDarkMode ? 'white' : 'black'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Habit Details */}
                <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-3">
                        {/* Frequency */}
                        <Text className={`text-sm mb-2 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {formatFrequency(item.frequency_type, item.frequency_value)}
                        </Text>

                        {/* Domain Name */}
                        {item.domain_name && (
                            <View className="flex-row items-center">
                                <Text className={`text-xs mr-2 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    {item.domain_name}
                                </Text>
                            </View>
                        )}

                        {/* Difficulty Badge */}
                        <View
                            className={`px-2 py-1 rounded-full mt-2 self-start ${difficultyStyles.bg}`}
                        >
                            <Text
                                className={`text-xs font-semibold ${difficultyStyles.text}`}
                            >
                                {item.difficulty.replace('_', ' ')}
                            </Text>
                        </View>
                    </View>

                    {/* Streak */}
                    <View className="flex-row items-center">
                        <Flame
                            size={20}
                            color={isDarkMode ? '#F59E0B' : '#D97706'}
                        />
                        <Text className={`ml-1 text-base ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                            {item.current_streak || 0} Days
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Habit Options Modal (keep the previous implementation)
    const HabitOptionsModal = () => {
        if (!selectedHabit) return null;

        return (
            <Modal
                transparent={true}
                visible={isOptionsModalVisible}
                animationType="slide"
                onRequestClose={() => setIsOptionsModalVisible(false)}
            >
                <View
                    className="flex-1 justify-end"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                    <View className={`p-4 rounded-t-2xl ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                        <Text className={`text-xl font-bold mb-4 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                            Habit Options
                        </Text>

                        {/* Favorite Toggle */}
                        <TouchableOpacity
                            className="flex-row items-center mb-4"
                            onPress={handleToggleFavorite}
                        >
                            <Star
                                size={24}
                                color={selectedHabit.is_favorite ? "#FFD700" : "#6B7280"}
                                fill={selectedHabit.is_favorite ? "#FFD700" : "none"}
                            />
                            <Text className={`ml-3 text-base ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                {selectedHabit.is_favorite
                                    ? 'Remove from Favorites'
                                    : 'Add to Favorites'}
                            </Text>
                        </TouchableOpacity>

                        {/* Edit Habit */}
                        <TouchableOpacity
                            className="flex-row items-center mb-4"
                            onPress={() => {
                                setIsOptionsModalVisible(false);
                                navigation.navigate('EditHabit', { habit: selectedHabit });
                            }}
                        >
                            <Edit2
                                size={24}
                                color={isDarkMode ? '#9CA3AF' : '#4B5563'}
                            />
                            <Text className={`ml-3 text-base ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Edit Habit
                            </Text>
                        </TouchableOpacity>

                        {/* Delete Habit */}
                        <TouchableOpacity
                            className="flex-row items-center mb-4"
                            onPress={() => {
                                setIsOptionsModalVisible(false);
                                Alert.alert(
                                    'Delete Habit',
                                    'Are you sure you want to delete this habit?',
                                    [
                                        {
                                            text: 'Cancel',
                                            style: 'cancel'
                                        },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: handleDeleteHabit
                                        }
                                    ]
                                );
                            }}
                        >
                            <Trash2
                                size={24}
                                color="#EF4444"
                            />
                            <Text className="ml-3 text-base text-red-500">
                                Delete Habit
                            </Text>
                        </TouchableOpacity>

                        {/* Close Button */}
                        <TouchableOpacity
                            className="items-center mt-2"
                            onPress={() => setIsOptionsModalVisible(false)}
                        >
                            <Text className={`text-base font-bold ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View className={`flex-1 pt-12 ${
            isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
            {/* Screen Header */}
            <View className="flex-row items-center px-4 mb-6">
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="mr-4"
                >
                    <ArrowLeft
                        size={24}
                        color={isDarkMode ? 'white' : 'black'}
                    />
                </TouchableOpacity>

                <Text className={`flex-1 text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                    My Habits
                </Text>

                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateHabit')}
                    className="p-2"
                >
                    <PlusCircle
                        size={24}
                        color={isDarkMode ? 'white' : 'black'}
                    />
                </TouchableOpacity>
            </View>

            {/* Habits List */}
            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <Text className={`${isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        Loading habits...
                    </Text>
                </View>
            ) : habits.length > 0 ? (
                <FlatList
                    data={habits}
                    renderItem={renderHabitItem}
                    keyExtractor={(item) => item.habit_id.toString()}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={fetchHabits}
                            colors={['#4F46E5']}
                            tintColor={isDarkMode ? 'white' : 'black'}
                        />
                    }
                />
            ) : (
                <View className="flex-1 justify-center items-center px-4">
                    <Text className={`text-base text-center ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    } mb-6`}>
                        No habits yet. Start building your routine!
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-500 px-6 py-3 rounded-xl"
                        onPress={() => navigation.navigate('CreateHabit')}
                    >
                        <Text className="text-white font-bold text-base text-center">
                            Create First Habit
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Habit Options Modal */}
            <HabitOptionsModal />
        </View>
    );
};

export default HabitsScreen;