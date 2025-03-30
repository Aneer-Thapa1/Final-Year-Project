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
    Layers
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

// Import services
import {
    getUserHabits,
    deleteHabit,
    toggleFavorite
} from '../../services/habitService';

// Types
type DifficultyLevel = 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
type TrackingType = 'BOOLEAN' | 'DURATION' | 'COUNT' | 'NUMERIC';
type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'X_TIMES_WEEK' | 'INTERVAL';

interface Streak {
    current_streak: number;
}

interface Habit {
    habit_id: number;
    id?: number; // For backward compatibility
    name: string;
    description?: string;
    frequency_type: FrequencyType;
    frequency_value: number;
    is_active: boolean;
    is_favorite: boolean;
    start_date: string;
    end_date?: string;
    current_streak?: number;
    longest_streak?: number;
    domain_name?: string;
    domain_color?: string;
    difficulty: DifficultyLevel;
    tracking_type: TrackingType;
    streak: { current_streak: number }[];
}

interface HabitsScreenProps {
    navigation: any;
}

const HabitsScreen: React.FC<HabitsScreenProps> = ({ navigation }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // State
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

    // Refresh habits when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchHabits();
        }, [])
    );

    // Format frequency for display
    const formatFrequency = (type: string, value: number): string => {
        switch (type) {
            case 'DAILY':
                return 'Every Day';
            case 'WEEKDAYS':
                return 'Weekdays';
            case 'WEEKENDS':
                return 'Weekends';
            case 'X_TIMES_WEEK':
                return `${value} Times per Week`;
            case 'INTERVAL':
                return `Every ${value} Days`;
            default:
                return type.replace('_', ' ');
        }
    };

    // Get difficulty styles
    const getDifficultyStyles = (difficulty: DifficultyLevel) => {
        const styles = {
            'VERY_EASY': { text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            'EASY': { text: 'text-green-500', bg: 'bg-green-500/10' },
            'MEDIUM': { text: 'text-amber-500', bg: 'bg-amber-500/10' },
            'HARD': { text: 'text-rose-500', bg: 'bg-rose-500/10' },
            'VERY_HARD': { text: 'text-red-500', bg: 'bg-red-500/10' }
        };

        return styles[difficulty] || { text: 'text-gray-500', bg: 'bg-gray-500/10' };
    };

    // Handle habit actions
    const showHabitOptions = (habit: Habit) => {
        setSelectedHabit(habit);
        setIsOptionsModalVisible(true);
    };

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

    const navigateToEditHabit = () => {
        if (!selectedHabit) return;

        setIsOptionsModalVisible(false);
        navigation.navigate('EditHabit', { habit: selectedHabit });
    };

    const confirmDeleteHabit = () => {
        setIsOptionsModalVisible(false);
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to delete this habit?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDeleteHabit }
            ]
        );
    };

    // Components
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
                            onPress={navigateToEditHabit}
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
                            onPress={confirmDeleteHabit}
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

    const renderHabitItem = ({ item }: { item: Habit }) => {
        const difficultyStyles = getDifficultyStyles(item.difficulty);
        const displayId = item.habit_id || item.id;
        const currentStreak = item.streak?.[0]?.current_streak || item.current_streak || 0;

        return (
            <TouchableOpacity
                className={`mb-4 p-4 rounded-xl border ${
                    isDarkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                } shadow-sm`}
                onPress={() => router.push({
                    pathname: `(habits)/${displayId}`,
                    params: { habit: JSON.stringify(item) }
                })}
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
                                    color={item.domain_color || '#4F46E5'}
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
                    <TouchableOpacity
                        onPress={() => showHabitOptions(item)}
                        className="p-1"
                    >
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
                            {currentStreak} Days
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Empty state component
    const EmptyState = () => (
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
    );

    // Loading state component
    const LoadingState = () => (
        <View className="flex-1 justify-center items-center">
            <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                Loading habits...
            </Text>
        </View>
    );

    return (
        <View className={`flex-1 pt-12 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Screen Header */}
            <View className="flex-row items-center px-4 mb-6">
                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => router.push('/')}
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

            {/* Main Content */}
            {isLoading ? (
                <LoadingState />
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
                <EmptyState />
            )}

            {/* Habit Options Modal */}
            <HabitOptionsModal />
        </View>
    );
};

export default HabitsScreen;