// src/components/TodayHabits.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { CheckCircle2, Calendar, AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { HabitCard } from './HabitCard';
import { CompletionData } from './CompletionFormModal';
import { Habit } from '../constants/habit';

interface TodayHabitsProps {
    habits: Habit[];
    isDark?: boolean;
    onComplete: (habitId: number, data: CompletionData) => void;
    onHabitPress?: (habit: Habit) => void;
}

const TodayHabits: React.FC<TodayHabitsProps> = ({
                                                     habits,
                                                     isDark: forceDark,
                                                     onComplete,
                                                     onHabitPress
                                                 }) => {
    // Use device color scheme if isDark is not provided
    const colorScheme = useColorScheme();
    const isDark = forceDark !== undefined ? forceDark : colorScheme === 'dark';

    // State for filtering and sorting
    const [sortBy, setSortBy] = useState<'name' | 'time' | 'streak' | 'domain'>('time');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [filterOptions, setFilterOptions] = useState({
        showCompleted: true,
        filterByDomain: null as string | null,
        filterByDifficulty: null as string | null
    });
    const [showFilters, setShowFilters] = useState(false);

    // Get today's date for the header
    const today = new Date();
    const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', dateOptions);

    // Calculate completion stats
    const completedHabits = habits.filter(habit => habit.is_completed_today).length;
    const totalHabits = habits.length;
    const progress = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

    // Get unique domains for filtering
    const domains = [...new Set(habits.map(h => h.domain?.name || 'General'))];

    // Get unique difficulties for filtering
    const difficulties = [...new Set(habits.map(h => h.difficulty || 'MEDIUM'))];

    // Filter and sort habits
    const processedHabits = [...habits]
        // Apply filters
        .filter(habit => {
            // Filter completed/incomplete
            if (!filterOptions.showCompleted && habit.is_completed_today) {
                return false;
            }

            // Filter by domain
            if (filterOptions.filterByDomain &&
                (habit.domain?.name !== filterOptions.filterByDomain) &&
                !(filterOptions.filterByDomain === 'General' && !habit.domain)) {
                return false;
            }

            // Filter by difficulty
            if (filterOptions.filterByDifficulty && habit.difficulty !== filterOptions.filterByDifficulty) {
                return false;
            }

            return true;
        })
        // Apply sorting
        .sort((a, b) => {
            let valueA, valueB;

            // Determine sort values based on sortBy
            switch (sortBy) {
                case 'name':
                    valueA = a.name || '';
                    valueB = b.name || '';
                    break;
                case 'time':
                    valueA = a.reminder_time ? new Date(a.reminder_time).getTime() : 0;
                    valueB = b.reminder_time ? new Date(b.reminder_time).getTime() : 0;
                    break;
                case 'streak':
                    valueA = a.streak?.current_streak || 0;
                    valueB = b.streak?.current_streak || 0;
                    break;
                case 'domain':
                    valueA = a.domain?.name || 'General';
                    valueB = b.domain?.name || 'General';
                    break;
                default:
                    valueA = a.name || '';
                    valueB = b.name || '';
            }

            // Apply sort direction
            if (sortDirection === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

    // Toggle sort direction or change sort field
    const handleSort = (field: 'name' | 'time' | 'streak' | 'domain') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (sortBy === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, reset to ascending
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    // Toggle filter panel
    const toggleFilters = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowFilters(!showFilters);
    };

    // Reset all filters
    const resetFilters = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFilterOptions({
            showCompleted: true,
            filterByDomain: null,
            filterByDifficulty: null
        });
        setSortBy('time');
        setSortDirection('asc');
    };

    // Set domain filter
    const setDomainFilter = (domain: string | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilterOptions({
            ...filterOptions,
            filterByDomain: domain
        });
    };

    // Set difficulty filter
    const setDifficultyFilter = (difficulty: string | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilterOptions({
            ...filterOptions,
            filterByDifficulty: difficulty
        });
    };

    // Format difficulty for display
    const formatDifficulty = (difficulty: string) => {
        return difficulty
            .replace('_', ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    // Render empty state
    const renderEmptyState = () => (
        <View className={`p-5 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm items-center justify-center`}
              style={{ elevation: 1, minHeight: 120 }}>
            <Calendar size={28} color={isDark ? '#9CA3AF' : '#D1D5DB'} />
            <Text className={`mt-3 text-center font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                No habits scheduled for today
            </Text>
            <Text className={`mt-1 text-center font-montserrat text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Add a new habit to get started!
            </Text>
        </View>
    );

    // Render filtered empty state
    const renderFilteredEmptyState = () => (
        <View className={`p-5 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm items-center justify-center`}
              style={{ elevation: 1, minHeight: 120 }}>
            <AlertCircle size={28} color={isDark ? '#9CA3AF' : '#D1D5DB'} />
            <Text className={`mt-3 text-center font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                No habits match your filters
            </Text>
            <TouchableOpacity
                onPress={resetFilters}
                className="mt-2 bg-primary-500 px-3 py-1 rounded-full"
            >
                <Text className="text-white font-montserrat-medium text-sm">
                    Reset Filters
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Render individual habit item
    const renderHabitItem = ({ item }: { item: Habit }) => (
        <HabitCard
            habit={item}
            isDark={isDark}
            onComplete={(data: CompletionData) => {
                onComplete(item.habit_id, data);
            }}
            isCompleted={item.is_completed_today || false}
            onPress={onHabitPress ? () => onHabitPress(item) : undefined}
        />
    );

    return (
        <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
                <View>
                    <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Today's Habits
                    </Text>
                    <Text className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-xs font-montserrat`}>
                        {formattedDate}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    {totalHabits > 0 && (
                        <View className={`py-1 px-2.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'} flex-row items-center mr-2`}
                              style={{ shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                            <CheckCircle2
                                size={14}
                                color={
                                    progress === 100 ? '#10B981' :
                                        progress > 0 ? '#6366F1' :
                                            isDark ? '#6B7280' : '#9CA3AF'
                                }
                            />
                            <Text className={`ml-1 text-xs font-montserrat-medium ${
                                progress === 100 ? 'text-emerald-500' :
                                    progress > 0 ? 'text-primary-500' :
                                        isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                {completedHabits}/{totalHabits}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={toggleFilters}
                        className={`p-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                        style={{ shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}
                    >
                        <Filter size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Progress bar for habits completion */}
            {totalHabits > 0 && (
                <View className={`h-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mb-3 overflow-hidden`}>
                    <View
                        className={`h-1.5 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </View>
            )}

            {/* Filters and Sort Panel */}
            {showFilters && (
                <View className={`mb-3 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                    {/* Sort Options */}
                    <View className="mb-3">
                        <Text className={`mb-2 font-montserrat-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Sort By
                        </Text>
                        <View className="flex-row flex-wrap">
                            {[
                                { id: 'name', label: 'Name' },
                                { id: 'time', label: 'Time' },
                                { id: 'streak', label: 'Streak' },
                                { id: 'domain', label: 'Category' }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    onPress={() => handleSort(option.id as any)}
                                    className={`mr-2 mb-2 px-2.5 py-1 rounded-full flex-row items-center ${
                                        sortBy === option.id
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                >
                                    <Text className={`text-xs font-montserrat-medium ${
                                        sortBy === option.id
                                            ? 'text-white'
                                            : isDark ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                        {option.label}
                                    </Text>

                                    {sortBy === option.id && (
                                        sortDirection === 'asc'
                                            ? <ChevronUp size={14} color="#FFFFFF" className="ml-1" />
                                            : <ChevronDown size={14} color="#FFFFFF" className="ml-1" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Domain Filter */}
                    {domains.length > 0 && (
                        <View className="mb-3">
                            // src/components/TodayHabits.tsx (continued)
                            <Text className={`mb-2 font-montserrat-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Filter by Category
                            </Text>
                            <View className="flex-row flex-wrap">
                                <TouchableOpacity
                                    onPress={() => setDomainFilter(null)}
                                    className={`mr-2 mb-2 px-2.5 py-1 rounded-full ${
                                        filterOptions.filterByDomain === null
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                >
                                    <Text className={`text-xs font-montserrat-medium ${
                                        filterOptions.filterByDomain === null
                                            ? 'text-white'
                                            : isDark ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                        All
                                    </Text>
                                </TouchableOpacity>

                                {domains.map((domain) => (
                                    <TouchableOpacity
                                        key={domain}
                                        onPress={() => setDomainFilter(domain)}
                                        className={`mr-2 mb-2 px-2.5 py-1 rounded-full ${
                                            filterOptions.filterByDomain === domain
                                                ? 'bg-primary-500'
                                                : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                        }`}
                                    >
                                        <Text className={`text-xs font-montserrat-medium ${
                                            filterOptions.filterByDomain === domain
                                                ? 'text-white'
                                                : isDark ? 'text-gray-300' : 'text-gray-600'
                                        }`}>
                                            {domain}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Difficulty Filter */}
                    {difficulties.length > 0 && (
                        <View className="mb-3">
                            <Text className={`mb-2 font-montserrat-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Filter by Difficulty
                            </Text>
                            <View className="flex-row flex-wrap">
                                <TouchableOpacity
                                    onPress={() => setDifficultyFilter(null)}
                                    className={`mr-2 mb-2 px-2.5 py-1 rounded-full ${
                                        filterOptions.filterByDifficulty === null
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                >
                                    <Text className={`text-xs font-montserrat-medium ${
                                        filterOptions.filterByDifficulty === null
                                            ? 'text-white'
                                            : isDark ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                        All
                                    </Text>
                                </TouchableOpacity>

                                {difficulties.map((difficulty) => (
                                    <TouchableOpacity
                                        key={difficulty}
                                        onPress={() => setDifficultyFilter(difficulty)}
                                        className={`mr-2 mb-2 px-2.5 py-1 rounded-full ${
                                            filterOptions.filterByDifficulty === difficulty
                                                ? 'bg-primary-500'
                                                : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                        }`}
                                    >
                                        <Text className={`text-xs font-montserrat-medium ${
                                            filterOptions.filterByDifficulty === difficulty
                                                ? 'text-white'
                                                : isDark ? 'text-gray-300' : 'text-gray-600'
                                        }`}>
                                            {formatDifficulty(difficulty)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Show Completed Toggle */}
                    <View className="flex-row justify-between items-center">
                        <Text className={`font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Show Completed
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setFilterOptions({
                                    ...filterOptions,
                                    showCompleted: !filterOptions.showCompleted
                                });
                            }}
                            className={`px-3 py-1 rounded-full ${
                                filterOptions.showCompleted
                                    ? 'bg-primary-500'
                                    : isDark ? 'bg-gray-700' : 'bg-gray-100'
                            }`}
                        >
                            <Text className={`text-xs font-montserrat-medium ${
                                filterOptions.showCompleted
                                    ? 'text-white'
                                    : isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                {filterOptions.showCompleted ? 'Yes' : 'No'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reset Button */}
                    <TouchableOpacity
                        onPress={resetFilters}
                        className="mt-3 bg-gray-200 py-2 rounded-lg items-center"
                        style={{ backgroundColor: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 0.8)' }}
                    >
                        <Text className={`font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Reset Filters
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Habits List or Empty State */}
            {habits.length === 0 ? (
                renderEmptyState()
            ) : processedHabits.length === 0 ? (
                renderFilteredEmptyState()
            ) : (
                <FlatList
                    data={processedHabits}
                    renderItem={renderHabitItem}
                    keyExtractor={(item) => item.habit_id?.toString() || Math.random().toString()}
                    scrollEnabled={false} // No scrolling within the flat list
                    contentContainerStyle={{ gap: 8 }} // Consistent gap between items
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

export default TodayHabits;