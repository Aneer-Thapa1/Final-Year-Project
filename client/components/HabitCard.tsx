import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, TextInput, Modal } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Clock, Flame, CheckCircle2, Calendar, BarChart2, Timer, Hash, Repeat, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Comprehensive Habit Interface matching your schema
interface Habit {
    habit_id?: number;
    id?: number; // Support both field names
    name: string;
    title?: string; // Support both field names
    description?: string;
    frequency_type?: 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'SPECIFIC_DAYS' | 'INTERVAL' | 'X_TIMES_WEEK' | 'X_TIMES_MONTH';
    frequency?: string; // Formatted display value
    frequency_value?: number; // Number of times to complete
    frequency_interval?: number; // Over what period
    time?: string;
    tracking_type?: 'BOOLEAN' | 'DURATION' | 'COUNT' | 'NUMERIC';
    duration_goal?: number; // For timed habits (minutes)
    count_goal?: number; // For countable habits
    numeric_goal?: number; // For measurable habits
    units?: string; // Units for measurement
    difficulty?: 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
    streak?: {
        current_streak?: number;
        longest_streak?: number;
    };
    progress?: number; // For tracking progress today (0-100)
    isCompleted?: boolean;
    completedToday?: boolean;
    domain?: {
        name: string;
        color: string;
    };
    color?: string;
}

// Completion data structure
interface CompletionData {
    habit_id: number;
    completed: boolean;
    completed_at?: string;
    completion_notes?: string;
    duration_completed?: number; // For DURATION habits
    count_completed?: number; // For COUNT habits
    numeric_completed?: number; // For NUMERIC habits
}

// Props Interface
interface HabitCardProps {
    habit: Habit;
    isDark?: boolean;
    onComplete: (completionData: CompletionData) => void;
    isCompleted?: boolean;
}

// Difficulty Color Mapping
const difficultyColors = {
    VERY_EASY: {
        bg: '#E6F4EA',
        text: '#34A853',
        border: '#34A853'
    },
    EASY: {
        bg: '#E6F3FF',
        text: '#4285F4',
        border: '#4285F4'
    },
    MEDIUM: {
        bg: '#FFF4E5',
        text: '#FBBC05',
        border: '#FBBC05'
    },
    HARD: {
        bg: '#FFF0F0',
        text: '#EA4335',
        border: '#EA4335'
    },
    VERY_HARD: {
        bg: '#FFE5E5',
        text: '#D93025',
        border: '#D93025'
    }
};

const HabitCard = ({
                       habit,
                       isDark = false,
                       onComplete,
                       isCompleted = false,
                   }: HabitCardProps) => {
    const swipeableRef = useRef<Swipeable>(null);
    const router = useRouter();


    // State for tracking type input modals
    const [showInputModal, setShowInputModal] = useState(false);
    const [inputValue, setInputValue] = useState('');

    // Get habit ID (support both field names)
    const habitId = habit.habit_id || habit.id;

    // Get habit name (support both field names)
    const habitName = habit.name || habit.title;

    // Get frequency display text
    const getFrequencyDisplay = () => {
        // If there's a pre-formatted frequency string, use it
        if (habit.frequency) return habit.frequency;

        if (!habit.frequency_type) return "Daily";

        switch (habit.frequency_type) {
            case 'DAILY':
                return "Daily";
            case 'WEEKDAYS':
                return "Weekdays";
            case 'WEEKENDS':
                return "Weekends";
            case 'SPECIFIC_DAYS':
                return "Specific Days";
            case 'INTERVAL':
                return `Every ${habit.frequency_interval || 1} day${habit.frequency_interval !== 1 ? 's' : ''}`;
            case 'X_TIMES_WEEK':
                return `${habit.frequency_value || 1}× per week`;
            case 'X_TIMES_MONTH':
                return `${habit.frequency_value || 1}× per month`;
            default:
                return "Daily";
        }
    };

    // Get tracking type icon and text
    const getTrackingInfo = () => {
        if (!habit.tracking_type || habit.tracking_type === 'BOOLEAN') {
            return {
                icon: <CheckCircle2 size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />,
                text: "Complete",
            };
        }

        switch (habit.tracking_type) {
            case 'DURATION':
                return {
                    icon: <Timer size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />,
                    text: `${habit.duration_goal || 0} min${habit.duration_goal !== 1 ? 's' : ''}`,
                };
            case 'COUNT':
                return {
                    icon: <Hash size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />,
                    text: `${habit.count_goal || 0} ${habit.units || 'times'}`,
                };
            case 'NUMERIC':
                return {
                    icon: <BarChart2 size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />,
                    text: `${habit.numeric_goal || 0} ${habit.units || 'units'}`,
                };
            default:
                return {
                    icon: <CheckCircle2 size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />,
                    text: "Complete",
                };
        }
    };

    // Handle completion based on tracking type
    const handleCompletion = () => {
        // Boolean habits can be completed directly with a swipe
        if (!habit.tracking_type || habit.tracking_type === 'BOOLEAN') {
            submitCompletion();
            return;
        }

        // For other tracking types, show the input modal
        setShowInputModal(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    // Submit completion data
    const submitCompletion = () => {
        const completionData: CompletionData = {
            habit_id: habitId,
            completed: true,
            completed_at: new Date().toISOString(),
        };

        // Add tracking-specific data
        if (habit.tracking_type === 'DURATION' && inputValue) {
            completionData.duration_completed = parseInt(inputValue, 10);
        } else if (habit.tracking_type === 'COUNT' && inputValue) {
            completionData.count_completed = parseInt(inputValue, 10);
        } else if (habit.tracking_type === 'NUMERIC' && inputValue) {
            completionData.numeric_completed = parseFloat(inputValue);
        }

        // Close modal if open
        setShowInputModal(false);
        setInputValue('');

        // Call the onComplete function with the completion data
        onComplete(completionData);

        // Close swipeable if open
        swipeableRef.current?.close();

        // Haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Render Right Swipe Actions
    const renderRightActions = (progress: Animated.Value, dragX: Animated.Value) => {
        const scale = dragX.interpolate({
            inputRange: [-100, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableOpacity
                onPress={handleCompletion}
                className="bg-primary-500 justify-center items-center rounded-2xl mr-4"
                style={{ width: 75 }}
            >
                <Animated.View style={{ transform: [{ scale }] }}>
                    <CheckCircle2
                        size={32}
                        color="white"
                        strokeWidth={2}
                        className="mb-1"
                    />
                    <Text className="text-white text-xs font-montserrat-medium">
                        Complete
                    </Text>
                </Animated.View>
            </TouchableOpacity>
        );
    };

    // Navigate to Habit Details
    const navigateToHabitDetails = () => {
        if (habitId) {
            router.push(`/habits/${habitId}`);
        }
    };

    // Get difficulty colors
    const difficultyStyle = habit.difficulty
        ? difficultyColors[habit.difficulty]
        : difficultyColors.MEDIUM;

    // Get domain/category color
    const domainColor = habit.domain?.color || habit.color || '#6366F1';

    // Get tracking info for display
    const trackingInfo = getTrackingInfo();

    // Get placeholder text for input based on tracking type
    const getInputPlaceholder = () => {
        if (habit.tracking_type === 'DURATION') {
            return `Enter minutes (goal: ${habit.duration_goal || 0})`;
        } else if (habit.tracking_type === 'COUNT') {
            return `Enter count (goal: ${habit.count_goal || 0})`;
        } else if (habit.tracking_type === 'NUMERIC') {
            return `Enter ${habit.units || 'value'} (goal: ${habit.numeric_goal || 0})`;
        }
        return '';
    };

    // Get input label based on tracking type
    const getInputLabel = () => {
        if (habit.tracking_type === 'DURATION') {
            return `Minutes Completed`;
        } else if (habit.tracking_type === 'COUNT') {
            return `Count Completed`;
        } else if (habit.tracking_type === 'NUMERIC') {
            return `${habit.units || 'Value'} Completed`;
        }
        return 'Value';
    };

    return (
        <>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                overshootRight={false}
                enabled={!isCompleted}
            >
                <TouchableOpacity
                    onPress={navigateToHabitDetails}
                    activeOpacity={0.7}
                    className={`
                        mb-4 rounded-2xl relative overflow-hidden
                        ${isDark ? 'bg-[#252F3C]' : 'bg-white'}
                        ${isCompleted ? 'opacity-70' : ''}
                        shadow-sm
                    `}
                    style={{
                        shadowColor: isDark ? '#000' : '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                        borderLeftWidth: 4,
                        borderLeftColor: domainColor,
                    }}
                >
                    {/* Progress Indicator (if applicable) */}
                    {(!isCompleted && habit.progress !== undefined && habit.progress > 0 && habit.progress < 100) && (
                        <View
                            className="absolute top-0 left-0 h-1 bg-primary-500"
                            style={{ width: `${habit.progress}%`, zIndex: 10 }}
                        />
                    )}

                    <View className="p-4">
                        {/* Top Row: Name, Tracking Type, and Completion Status */}
                        <View className="flex-row justify-between items-center mb-2">
                            <View className="flex-row items-center flex-1">
                                <Text
                                    className={`text-lg font-montserrat-bold flex-1 pr-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
                                    numberOfLines={1}
                                >
                                    {habitName}
                                </Text>
                            </View>

                            {/* Frequency Badge */}
                            <View className={`px-2 py-1 rounded-full bg-primary-500/20`}>
                                <Text className="text-xs font-montserrat-medium text-primary-500">
                                    {getFrequencyDisplay()}
                                </Text>
                            </View>
                        </View>

                        {/* Description if available */}
                        {habit.description && (
                            <Text
                                className={`text-sm font-montserrat mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                numberOfLines={2}
                            >
                                {habit.description}
                            </Text>
                        )}

                        {/* Bottom Row: Time/Tracking Info & Streak */}
                        <View className="flex-row justify-between items-center mt-2">
                            {/* Time or Tracking Goal */}
                            <View className="flex-row items-center">
                                <View className="p-2 rounded-xl bg-primary-500/10 mr-2">
                                    {habit.time ? (
                                        <Clock size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />
                                    ) : (
                                        trackingInfo.icon
                                    )}
                                </View>
                                <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {habit.time || trackingInfo.text}
                                </Text>
                            </View>

                            {/* Streak & Completion Status */}
                            <View className="flex-row items-center">
                                {isCompleted ? (
                                    <View className="ml-2 bg-green-500/20 p-1 rounded-full">
                                        <CheckCircle2 size={18} color="#10B981" />
                                    </View>
                                ) : (
                                    <>
                                        <Flame size={18} color="#F97316" />
                                        <Text className="ml-1 font-montserrat-semibold text-accent-500">
                                            {habit.streak?.current_streak || 0} days
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Swipeable>

            {/* Input Modal for tracking types */}
            <Modal
                visible={showInputModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowInputModal(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className={`w-4/5 rounded-xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Complete {habitName}
                            </Text>
                            <TouchableOpacity onPress={() => setShowInputModal(false)}>
                                <X size={24} color={isDark ? "#E5E7EB" : "#4B5563"} />
                            </TouchableOpacity>
                        </View>

                        <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {getInputLabel()}
                        </Text>

                        <TextInput
                            className={`border rounded-lg p-3 mb-4 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                            placeholder={getInputPlaceholder()}
                            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                            keyboardType="numeric"
                            value={inputValue}
                            onChangeText={setInputValue}
                        />

                        <View className="flex-row justify-end">
                            <TouchableOpacity
                                onPress={() => setShowInputModal(false)}
                                className={`py-2 px-4 rounded-lg mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                            >
                                <Text className={`font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={submitCompletion}
                                className="bg-primary-500 py-2 px-4 rounded-lg"
                            >
                                <Text className="text-white font-montserrat-medium">
                                    Complete
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default HabitCard;