// src/components/HabitCard.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, useColorScheme, Alert } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { Clock, Check, ChevronRight, Calendar, X, PlusCircle, MinusCircle, BarChart, Target, Repeat, SkipForward } from 'lucide-react-native';
import { CompletionData } from './CompletionFormModal';
import { Habit } from '../constants/habit';

interface HabitCardProps {
    habit: Habit;
    isDark?: boolean;
    onComplete: (data: CompletionData) => void;
    onSkip?: (habitId: number) => void;
    onReset?: (habitId: number) => void;
    onIncrementCount?: (habitId: number, amount: number) => void;
    isCompleted: boolean;
    onPress?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
                                                        habit,
                                                        isDark: forceDark,
                                                        onComplete,
                                                        onSkip,
                                                        onReset,
                                                        onIncrementCount,
                                                        isCompleted,
                                                        onPress
                                                    }) => {
    // Use device color scheme if isDark is not provided
    const colorScheme = useColorScheme();
    const isDark = forceDark !== undefined ? forceDark : colorScheme === 'dark';

    const swipeableRef = useRef<Swipeable>(null);
    const [swipeThreshold, setSwipeThreshold] = useState(75);

    // State for tracking daily progress for multi-completion habits
    const [currentCount, setCurrentCount] = useState<number>(habit.current_count || 0);
    const targetCount = getTargetCount();
    const isMultiCompletion = targetCount > 1;

    // Animation values
    const completeIconScale = useRef(new Animated.Value(1)).current;

    // Update currentCount when habit data changes
    useEffect(() => {
        setCurrentCount(habit.current_count || 0);
    }, [habit.current_count]);

    useEffect(() => {
        if (isCompleted) {
            // Pulse animation when completed
            Animated.sequence([
                Animated.timing(completeIconScale, {
                    toValue: 1.2,
                    duration: 200,
                    useNativeDriver: true
                }),
                Animated.timing(completeIconScale, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [isCompleted]);

    // Get the target count based on habit type
    function getTargetCount(): number {
        const type = habit.tracking_type || 'BOOLEAN';

        switch (type) {
            case 'COUNT':
                return habit.count_goal || 1;
            case 'NUMERIC':
                return habit.numeric_goal || 1;
            case 'DURATION':
                return habit.duration_goal || 1;
            case 'BOOLEAN':
            default:
                return 1;
        }
    }

    // Calculate completion percentage
    const completionPercentage = Math.min(100, (currentCount / targetCount) * 100);

    // Format the count display based on habit type
    function formatCountDisplay(): string {
        const type = habit.tracking_type || 'BOOLEAN';

        switch (type) {
            case 'COUNT':
                return `${currentCount}/${targetCount}`;
            case 'NUMERIC':
                return `${currentCount}/${targetCount}${habit.units ? ' ' + habit.units : ''}`;
            case 'DURATION':
                return `${currentCount}/${targetCount} mins`;
            case 'BOOLEAN':
            default:
                return isCompleted ? 'Completed' : 'Incomplete';
        }
    }

    // Handle increment for multi-completion habits
    const handleIncrement = () => {
        if (currentCount < targetCount) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const newCount = currentCount + 1;
            setCurrentCount(newCount);

            if (onIncrementCount) {
                onIncrementCount(habit.habit_id, 1);
            }

            // If reached target, mark as completed
            if (newCount >= targetCount && !isCompleted) {
                onComplete({
                    completed_at: new Date().toISOString(),
                    notes: '',
                    mood_rating: 5
                });
            }
        }
    };

    // Handle decrement for multi-completion habits
    const handleDecrement = () => {
        if (currentCount > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentCount(currentCount - 1);

            if (onIncrementCount) {
                onIncrementCount(habit.habit_id, -1);
            }
        }
    };

    // Handle skip function
    const handleSkip = () => {
        Alert.alert(
            "Skip Habit",
            `Are you sure you want to skip "${habit.name}" for today?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Skip",
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (onSkip) {
                            onSkip(habit.habit_id);
                        }
                        swipeableRef.current?.close();
                    },
                    style: "destructive"
                }
            ]
        );
    };

    // Handle reset function
    const handleReset = () => {
        Alert.alert(
            "Reset Progress",
            `Are you sure you want to reset progress for "${habit.name}"?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Reset",
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setCurrentCount(0);
                        if (onReset) {
                            onReset(habit.habit_id);
                        }
                    }
                }
            ]
        );
    };

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-swipeThreshold * 2, -swipeThreshold, 0],
            outputRange: [0, 0, swipeThreshold],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [-swipeThreshold, -20],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        const scale = dragX.interpolate({
            inputRange: [-swipeThreshold, -30],
            outputRange: [1, 0.8],
            extrapolate: 'clamp',
        });

        // Complete button or Skip button based on multi-completion status
        return (
            <Animated.View
                style={[
                    styles.completeButtonContainer,
                    {
                        transform: [{ translateX: trans }, { scale }],
                        opacity
                    }
                ]}
            >
                {isMultiCompletion ? (
                    // For multi-completion habits, show increment button instead of complete
                    <TouchableOpacity
                        onPress={handleIncrement}
                        className={`h-full justify-center items-center rounded-xl ${
                            isDark ? 'bg-primary-900' : 'bg-primary-500'
                        }`}
                        style={styles.completeButton}
                    >
                        <Animated.View
                            style={{
                                transform: [{ scale: completeIconScale }],
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <PlusCircle size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text className="text-white text-base font-montserrat-semibold">Add One</Text>
                        </Animated.View>
                    </TouchableOpacity>
                ) : (
                    // For boolean habits, show complete button
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            // Pass empty data for now, would typically come from a modal
                            onComplete({
                                completed_at: new Date().toISOString(),
                                notes: '',
                                mood_rating: 5
                            });
                            swipeableRef.current?.close();
                        }}
                        className={`h-full justify-center items-center rounded-xl ${
                            isDark ? 'bg-primary-900' : 'bg-primary-500'
                        }`}
                        style={styles.completeButton}
                    >
                        <Animated.View
                            style={{
                                transform: [{ scale: completeIconScale }],
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Check size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text className="text-white text-base font-montserrat-semibold">Complete</Text>
                        </Animated.View>
                    </TouchableOpacity>
                )}
            </Animated.View>
        );
    };

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [0, swipeThreshold, swipeThreshold * 2],
            outputRange: [-swipeThreshold, 0, 0],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [20, swipeThreshold],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        const scale = dragX.interpolate({
            inputRange: [30, swipeThreshold],
            outputRange: [0.8, 1],
            extrapolate: 'clamp',
        });

        return (
            <Animated.View
                style={[
                    styles.skipButtonContainer,
                    {
                        transform: [{ translateX: trans }, { scale }],
                        opacity
                    }
                ]}
            >
                <TouchableOpacity
                    onPress={handleSkip}
                    className={`h-full justify-center items-center rounded-xl bg-gray-500`}
                    style={styles.skipButton}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <SkipForward size={22} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text className="text-white text-base font-montserrat-semibold">Skip</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const cardPress = () => {
        if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    // Get tracking type icon
    const getTrackingIcon = () => {
        const type = habit.tracking_type || 'BOOLEAN';

        switch (type) {
            case 'DURATION':
                return <Clock size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />;
            case 'COUNT':
                return <BarChart size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />;
            case 'NUMERIC':
                return <Target size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />;
            case 'BOOLEAN':
            default:
                return <Check size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />;
        }
    };

    // Format date as time string
    const formatTime = (date?: string | Date) => {
        if (!date) return 'Anytime';

        try {
            const dateObj = typeof date === 'string' ? new Date(date) : date;
            return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Anytime';
        }
    };

    const currentStreak = habit.streak?.current_streak || 0;
    const longestStreak = habit.streak?.longest_streak || 0;

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            renderLeftActions={renderLeftActions}
            overshootRight={false}
            overshootLeft={false}
            friction={2}
            enabled={!isCompleted}
            onSwipeableWillOpen={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            containerStyle={{
                borderRadius: 12,
                overflow: 'hidden'
            }}
        >
            <TouchableOpacity
                activeOpacity={onPress ? 0.7 : 1}
                onPress={cardPress}
                className={`p-4 rounded-xl shadow-sm ${
                    isDark
                        ? isCompleted ? 'bg-gray-800/80' : 'bg-gray-800'
                        : isCompleted ? 'bg-white/90' : 'bg-white'
                } ${isCompleted ? 'opacity-85' : ''}`}
                style={{ elevation: isCompleted ? 0 : 1 }}
            >
                <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                        <View className="flex-row items-center">
                            <Text className={`text-base font-montserrat-bold ${
                                isCompleted
                                    ? isDark ? 'text-gray-400' : 'text-gray-500'
                                    : isDark ? 'text-white' : 'text-gray-900'
                            } mr-2`}>
                                {habit.name}
                            </Text>

                            {isCompleted && (
                                <View className="bg-green-500/20 p-1 rounded-full">
                                    <Check size={12} color="#10B981" />
                                </View>
                            )}
                        </View>

                        {habit.description ? (
                            <Text className={`mt-0.5 text-sm font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            } ${isCompleted ? 'opacity-70' : ''}`} numberOfLines={2}>
                                {habit.description}
                            </Text>
                        ) : null}
                    </View>

                    {/* Multi-Completion Controls */}
                    {isMultiCompletion ? (
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={handleDecrement}
                                className={`p-1.5 rounded-full mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                disabled={currentCount <= 0 || isCompleted}
                            >
                                <MinusCircle size={18} color={currentCount <= 0 || isCompleted ?
                                    isDark ? '#4B5563' : '#9CA3AF' :
                                    isDark ? '#D1D5DB' : '#4B5563'} />
                            </TouchableOpacity>

                            <Text className={`font-montserrat-semibold text-lg ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                {currentCount}
                            </Text>

                            <TouchableOpacity
                                onPress={handleIncrement}
                                className={`p-1.5 rounded-full ml-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                disabled={currentCount >= targetCount || isCompleted}
                            >
                                <PlusCircle size={18} color={currentCount >= targetCount || isCompleted ?
                                    isDark ? '#4B5563' : '#9CA3AF' :
                                    isDark ? '#D1D5DB' : '#4B5563'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className={`px-2 py-1 rounded-full ${
                            isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                            <Text className={`text-xs font-montserrat-medium ${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                {habit.frequency_type === 'DAILY' ? 'Daily' : habit.frequency_type?.toLowerCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Progress Bar for Multi-Completion Habits */}
                {isMultiCompletion && (
                    <>
                        <View className={`h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded-full mb-2 overflow-hidden`}>
                            <View
                                className={`h-2 rounded-full ${
                                    isCompleted ? 'bg-green-500' : 'bg-primary-500'
                                }`}
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className={`text-xs font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Progress
                            </Text>
                            <Text className={`text-xs font-montserrat-medium ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                                {formatCountDisplay()}
                            </Text>
                        </View>
                    </>
                )}

                {/* Bottom section: Time + Streak */}
                <View className="flex-row justify-between items-center">
                    {/* Reminder time */}
                    <View className="flex-row items-center">
                        <View className={`p-1.5 rounded-lg mr-2 ${
                            isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                            <Clock size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
                        </View>
                        <Text className={`text-sm font-montserrat ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {formatTime(habit.reminder_time)}
                        </Text>
                    </View>

                    {/* Actions for multi-completion or Streak for regular habits */}
                    {isMultiCompletion ? (
                        <TouchableOpacity
                            onPress={handleReset}
                            className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                        >
                            <Text className={`text-xs font-montserrat-medium ${
                                isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                                Reset
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        currentStreak > 0 && (
                            <View className="flex-row items-center">
                                <View className={`flex-row items-center bg-amber-500/10 px-2.5 py-1 rounded-full ${longestStreak > currentStreak ? 'mr-2' : ''}`}>
                                    <Text className="text-amber-500 font-montserrat-semibold">
                                        🔥 {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
                                    </Text>
                                </View>

                                {/* Longest streak badge */}
                                {longestStreak > currentStreak && (
                                    <View className="flex-row items-center bg-gray-500/10 px-2 py-0.5 rounded-full">
                                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Best: {longestStreak}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )
                    )}
                </View>

                {!isCompleted && !isMultiCompletion && (
                    <View className="absolute right-2 top-1/2 transform -translate-y-4 opacity-20">
                        <ChevronRight size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </View>
                )}

                {/* Swipe hints */}
                {!isCompleted && (
                    <View className="absolute right-2 bottom-2 opacity-20">
                        <Text className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Swipe to complete
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    completeButtonContainer: {
        width: 120,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeButton: {
        width: 110,
        height: '100%',
    },
    skipButtonContainer: {
        width: 100,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        width: 90,
        height: '100%',
    }
});