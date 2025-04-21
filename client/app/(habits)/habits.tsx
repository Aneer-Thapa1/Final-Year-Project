    import React, { useState, useCallback, useRef, useEffect } from 'react';
    import {
        View,
        Text,
        FlatList,
        TouchableOpacity,
        Modal,
        RefreshControl,
        Alert,
        useColorScheme,
        StatusBar,
        Platform,
        ActivityIndicator,
        SafeAreaView,
        Animated,
        Pressable
    } from 'react-native';
    import {
        Flame,
        PlusCircle,
        ArrowLeft,
        MoreVertical,
        Star,
        Edit2,
        Trash2,
        Layers,
        X,
        Award,
        TrendingUp
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

        // Animation values
        const fadeAnim = useRef(new Animated.Value(0)).current;
        const slideAnim = useRef(new Animated.Value(100)).current;
        const modalSlideAnim = useRef(new Animated.Value(300)).current;

        // State
        const [habits, setHabits] = useState<Habit[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [isRefreshing, setIsRefreshing] = useState(false);
        const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
        const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
        const [error, setError] = useState<string | null>(null);

        // Animation references for list items
        const itemAnimations = useRef(new Map()).current;

        // Pre-initialize animation values for items
        const getItemAnimations = (itemId: number, index: number) => {
            if (!itemAnimations.has(itemId)) {
                const fadeAnim = new Animated.Value(0);
                const slideAnim = new Animated.Value(50);

                // Start the animation
                const delay = index * 100; // Stagger effect
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        delay,
                        useNativeDriver: true
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        delay,
                        useNativeDriver: true
                    })
                ]).start();

                itemAnimations.set(itemId, { fadeAnim, slideAnim });
            }

            return itemAnimations.get(itemId);
        };

        // Fetch habits
        const fetchHabits = async (showRefreshing = false) => {
            try {
                if (showRefreshing) {
                    setIsRefreshing(true);
                } else {
                    setIsLoading(true);
                }
                setError(null);

                const { habits: fetchedHabits } = await getUserHabits({
                    sort_by: 'createdAt',
                    sort_order: 'desc'
                });

                setHabits(fetchedHabits);

                // Animate items in
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true
                    })
                ]).start();

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Could not fetch habits';
                setError(`Failed to load habits: ${errorMessage}`);

                // Show error alert with retry option
                Alert.alert(
                    'Error Fetching Habits',
                    'We encountered a problem loading your habits.',
                    [
                        {
                            text: 'Try Again',
                            onPress: () => fetchHabits(showRefreshing)
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
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
                'VERY_EASY': { text: 'text-success-500', bg: 'bg-success-100' },
                'EASY': { text: 'text-success-600', bg: 'bg-success-100' },
                'MEDIUM': { text: 'text-accent-500', bg: 'bg-accent-100' },
                'HARD': { text: 'text-error-500', bg: 'bg-error-100' },
                'VERY_HARD': { text: 'text-error-600', bg: 'bg-error-100' }
            };

            return styles[difficulty] || { text: 'text-gray-500', bg: 'bg-gray-100' };
        };

        // Handle habit actions
        const showHabitOptions = (habit: Habit) => {
            setSelectedHabit(habit);
            setIsOptionsModalVisible(true);
        };

        const handleDeleteHabit = async () => {
            if (!selectedHabit) return;

            try {
                setIsLoading(true);
                await deleteHabit(selectedHabit.habit_id);
                setHabits(currentHabits =>
                    currentHabits.filter(habit => habit.habit_id !== selectedHabit.habit_id)
                );
                setIsOptionsModalVisible(false);

                // Success feedback
                Alert.alert(
                    'Habit Deleted',
                    'Your habit has been successfully deleted.'
                );
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                Alert.alert(
                    'Delete Failed',
                    `Could not delete habit: ${errorMessage}`,
                    [
                        {
                            text: 'Try Again',
                            onPress: handleDeleteHabit
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            } finally {
                setIsLoading(false);
            }
        };

        const handleToggleFavorite = async () => {
            if (!selectedHabit) return;

            try {
                setIsLoading(true);
                await toggleFavorite(selectedHabit.habit_id);

                // Update local state
                setHabits(currentHabits =>
                    currentHabits.map(habit =>
                        habit.habit_id === selectedHabit.habit_id
                            ? { ...habit, is_favorite: !habit.is_favorite }
                            : habit
                    )
                );

                // Close modal
                setIsOptionsModalVisible(false);

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                Alert.alert(
                    'Action Failed',
                    `Could not update favorite status: ${errorMessage}`,
                    [
                        {
                            text: 'Try Again',
                            onPress: handleToggleFavorite
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            } finally {
                setIsLoading(false);
            }
        };

        const navigateToEditHabit = () => {
            if (!selectedHabit) return;

            setIsOptionsModalVisible(false);
            router.push({
                pathname: '(habits)/editHabit',
                params: { habitId: JSON.stringify(selectedHabit.habit_id) }
            });
        };

        const confirmDeleteHabit = () => {
            setIsOptionsModalVisible(false);
            Alert.alert(
                'Delete Habit',
                'Are you sure you want to delete this habit? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: handleDeleteHabit
                    }
                ]
            );
        };

        // Modal animation
        useEffect(() => {
            if (isOptionsModalVisible) {
                // Reset position before animating
                modalSlideAnim.setValue(300);

                // Animate in
                Animated.spring(modalSlideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 8,
                    tension: 40
                }).start();
            }
        }, [isOptionsModalVisible]);

        const closeModal = () => {
            Animated.timing(modalSlideAnim, {
                toValue: 300,
                duration: 250,
                useNativeDriver: true
            }).start(() => {
                setIsOptionsModalVisible(false);
            });
        };

        // Streak Badge Component - Attractive & Cool Design
        // Attractive Streak Badge Component with Emojis
        const StreakBadge = ({ streak = 0 }) => {
            const isDarkMode = useColorScheme() === 'dark';
            const pulseAnim = useRef(new Animated.Value(1)).current;

            useEffect(() => {
                // For streaks >= 7, add pulse animation
                if (streak >= 7) {
                    Animated.loop(
                        Animated.sequence([
                            Animated.timing(pulseAnim, {
                                toValue: 1.05,
                                duration: 1000,
                                useNativeDriver: true
                            }),
                            Animated.timing(pulseAnim, {
                                toValue: 1,
                                duration: 1000,
                                useNativeDriver: true
                            })
                        ])
                    ).start();
                }
            }, [streak]);

            // Get emoji based on streak level
            const getEmoji = () => {
                if (streak >= 30) return "🔥"; // Fire
                if (streak >= 21) return "💎"; // Diamond
                if (streak >= 14) return "🏆"; // Trophy
                if (streak >= 7) return "⚡"; // Lightning
                if (streak > 0) return "✨"; // Sparkles
                return "📅"; // Calendar for no streak
            };

            // Get background colors based on streak
            const getBadgeStyles = () => {
                if (streak >= 30) {
                    return {
                        containerClass: 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500',
                        textClass: 'text-white',
                        labelClass: 'text-pink-200'
                    };
                } else if (streak >= 21) {
                    return {
                        containerClass: 'bg-gradient-to-r from-violet-500 to-purple-500',
                        textClass: 'text-white',
                        labelClass: 'text-purple-200'
                    };
                } else if (streak >= 14) {
                    return {
                        containerClass: 'bg-gradient-to-r from-cyan-500 to-blue-500',
                        textClass: 'text-white',
                        labelClass: 'text-blue-200'
                    };
                } else if (streak >= 7) {
                    return {
                        containerClass: 'bg-gradient-to-r from-emerald-400 to-teal-500',
                        textClass: 'text-white',
                        labelClass: 'text-teal-100'
                    };
                } else if (streak > 0) {
                    return {
                        containerClass: isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200',
                        textClass: isDarkMode ? 'text-white' : 'text-gray-900',
                        labelClass: isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    };
                } else {
                    return {
                        containerClass: isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-100 border border-gray-200',
                        textClass: isDarkMode ? 'text-gray-400' : 'text-gray-500',
                        labelClass: isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    };
                }
            };

            const styles = getBadgeStyles();
            const emoji = getEmoji();
            const shouldAnimate = streak >= 7;

            return (
                <Animated.View
                    style={{
                        transform: [{ scale: shouldAnimate ? pulseAnim : 1 }]
                    }}
                    className="items-end"
                >
                    <View className={`rounded-xl overflow-hidden shadow-md ${streak >= 7 ? 'p-[1px]' : ''}`}>
                        <View className={`py-2 px-3 rounded-xl ${styles.containerClass}`}>
                            <View className="flex-row items-center justify-center">
                                <Text className="text-xl mr-1">{emoji}</Text>
                                <Text className={`text-base font-montserrat-bold ${styles.textClass}`}>
                                    {streak}
                                </Text>
                            </View>

                            {streak > 0 && (
                                <Text className={`text-xs font-montserrat-medium text-center mt-0.5 ${styles.labelClass}`}>
                                    {streak === 1 ? 'day' : 'days'}
                                </Text>
                            )}
                        </View>
                    </View>
                </Animated.View>
            );
        };

        // Components
        const HabitOptionsModal = () => {
            if (!selectedHabit) return null;

            const modalStyle = {
                transform: [{ translateY: modalSlideAnim }]
            };

            return (
                <Modal
                    transparent={true}
                    visible={isOptionsModalVisible}
                    animationType="fade"
                    onRequestClose={closeModal}
                >
                    <Pressable
                        className="flex-1 justify-end bg-black/50"
                        onPress={closeModal}
                        activeOpacity={1}
                    >
                        <Animated.View style={modalStyle}>
                            <Pressable>
                                <View className={`p-5 rounded-t-card shadow-lg ${isDarkMode ? 'bg-theme-card-dark' : 'bg-theme-card-DEFAULT'}`}>
                                    {/* Modal Header */}
                                    <View className="flex-row justify-between items-center mb-5">
                                        <Text className={`text-xl font-montserrat-bold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT'}`}>
                                            {selectedHabit.name}
                                        </Text>

                                        {/* Close Button */}
                                        <TouchableOpacity
                                            onPress={closeModal}
                                            className={`p-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                                        >
                                            <X size={20} className={isDarkMode ? 'text-white' : 'text-black'} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Option List */}
                                    <View className="mb-2">
                                        {/* Favorite Toggle */}
                                        <TouchableOpacity
                                            className={`flex-row items-center py-3.5 px-2 mb-1 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-black/2'}`}
                                            onPress={handleToggleFavorite}
                                        >
                                            <Star
                                                size={24}
                                                color={selectedHabit.is_favorite ? "#FFD700" : "#6B7280"}
                                                fill={selectedHabit.is_favorite ? "#FFD700" : "none"}
                                            />
                                            <Text className={`ml-3 text-base font-montserrat-medium ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT'}`}>
                                                {selectedHabit.is_favorite
                                                    ? 'Remove from Favorites'
                                                    : 'Add to Favorites'}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Edit Habit */}
                                        <TouchableOpacity
                                            className={`flex-row items-center py-3.5 px-2 mb-1 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-black/2'}`}
                                            onPress={navigateToEditHabit}
                                        >
                                            <Edit2
                                                size={24}
                                                className="text-secondary-500"
                                            />
                                            <Text className={`ml-3 text-base font-montserrat-medium ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT'}`}>
                                                Edit Habit
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Delete Habit */}
                                        <TouchableOpacity
                                            className={`flex-row items-center py-3.5 px-2 mb-1 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-black/2'}`}
                                            onPress={confirmDeleteHabit}
                                        >
                                            <Trash2
                                                size={24}
                                                className="text-error-500"
                                            />
                                            <Text className="ml-3 text-base font-montserrat-medium text-error-500">
                                                Delete Habit
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Action Button */}
                                    <TouchableOpacity
                                        onPress={closeModal}
                                        className="py-3.5 mt-3 rounded-button bg-primary-500 shadow-button-light dark:shadow-button-dark"
                                    >
                                        <Text className="text-base font-montserrat-bold text-white text-center">
                                            Close
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Pressable>
                        </Animated.View>
                    </Pressable>
                </Modal>
            );
        };

        const renderHabitItem = ({ item, index }: { item: Habit, index: number }) => {
            const difficultyStyles = getDifficultyStyles(item.difficulty);
            const displayId = item.habit_id || item.id;
            const currentStreak = item.streak?.[0]?.current_streak || item.current_streak || 0;

            // Get pre-initialized animations
            const animations = getItemAnimations(item.habit_id, index);

            return (
                <Animated.View
                    style={{
                        opacity: animations.fadeAnim,
                        transform: [{ translateY: animations.slideAnim }]
                    }}
                >
                    <TouchableOpacity
                        className={`mb-4 p-4 rounded-card border shadow-card-light dark:shadow-card-dark ${isDarkMode ? 'bg-theme-card-dark border-theme-border-dark' : 'bg-theme-card-DEFAULT border-theme-border-DEFAULT'}`}
                        onPress={() => router.push({
                            pathname: `(habits)/${displayId}`,
                            params: { habit: JSON.stringify(item) }
                        })}
                        activeOpacity={0.7}
                    >
                        {/* Header with Name, Favorite, and Options */}
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center flex-1">
                                {/* Domain Indicator */}
                                {item.domain_name && (
                                    <View
                                        className="mr-3 p-2 rounded-full"
                                        style={{
                                            backgroundColor: item.domain_color
                                                ? `${item.domain_color}20`
                                                : 'rgba(34, 197, 94, 0.1)'
                                        }}
                                    >
                                        <Layers
                                            size={18}
                                            color={item.domain_color || '#22C55E'}
                                        />
                                    </View>
                                )}

                                {/* Habit Name and Favorite */}
                                <View className="flex-row items-center flex-1">
                                    <Text
                                        className={`text-lg font-montserrat-bold mr-2 flex-1 ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT'}`}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>

                                    {/* Favorite Icon */}
                                    {item.is_favorite && (
                                        <Star
                                            size={18}
                                            color="#FFD700"
                                            fill="#FFD700"
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Options Button */}
                            <TouchableOpacity
                                onPress={() => showHabitOptions(item)}
                                className={`p-2 rounded-full ml-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                            >
                                <MoreVertical
                                    size={18}
                                    className={isDarkMode ? 'text-white' : 'text-black'}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Habit Details */}
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1 mr-3">
                                {/* Frequency */}
                                <Text
                                    className={`text-sm mb-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT'}`}
                                >
                                    {formatFrequency(item.frequency_type, item.frequency_value)}
                                </Text>

                                {/* Domain Name */}
                                {item.domain_name && (
                                    <View className="flex-row items-center">
                                        <Text
                                            className={`text-xs mr-2 ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT'}`}
                                        >
                                            {item.domain_name}
                                        </Text>
                                    </View>
                                )}

                                {/* Difficulty Badge */}
                                <View
                                    className={`px-3 py-1 rounded-full mt-2 self-start ${difficultyStyles.bg}`}
                                >
                                    <Text
                                        className={`text-xs font-montserrat-semibold ${difficultyStyles.text}`}
                                    >
                                        {item.difficulty.replace(/_/g, ' ')}
                                    </Text>
                                </View>
                            </View>

                            {/* Enhanced Streak Display */}
                            <StreakBadge streak={currentStreak} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            );
        };

        // Empty state component
        const EmptyState = () => (
            <Animated.View
                className="flex-1 justify-center items-center px-6"
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }}
            >
                <View className="items-center mb-6">
                    <Layers
                        size={60}
                        className={isDarkMode ? 'text-white/30' : 'text-black/20'}
                    />
                </View>

                <Text
                    className={`text-lg text-center mb-2 font-montserrat-semibold ${isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT'}`}
                >
                    No habits created yet
                </Text>

                <Text
                    className={`text-base text-center mb-8 font-montserrat ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT'}`}
                >
                    Start building your routine by creating your first habit!
                </Text>

                <TouchableOpacity
                    className="px-6 py-3.5 rounded-button bg-primary-500 shadow-button-light dark:shadow-button-dark"
                    onPress={() => router.push('(tabs)/add')}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-montserrat-bold text-base text-center">
                        Create First Habit
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );

        // Error state component
        const ErrorState = () => (
            <View className="flex-1 justify-center items-center px-6">
                <Text
                    className="text-lg text-center mb-4 font-montserrat-semibold text-error-500"
                >
                    Something went wrong
                </Text>

                <Text
                    className={`text-base text-center mb-6 font-montserrat ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT'}`}
                >
                    {error || "We couldn't load your habits."}
                </Text>

                <TouchableOpacity
                    className="px-6 py-3 rounded-button bg-primary-500 shadow-button-light dark:shadow-button-dark"
                    onPress={() => fetchHabits()}
                >
                    <Text className="text-white font-montserrat-bold text-base text-center">
                        Try Again
                    </Text>
                </TouchableOpacity>
            </View>
        );

        // Loading state component
        const LoadingState = () => (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator
                    size="large"
                    color="#22C55E" // Primary color
                />
                <Text
                    className={`mt-4 text-base font-montserrat ${isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT'}`}
                >
                    Loading habits...
                </Text>
            </View>
        );

        // Get status bar style based on mode
        const getStatusBarStyle = () => {
            return isDarkMode ? 'light-content' : 'dark-content';
        };

        return (
            <SafeAreaView
                className={isDarkMode ? 'flex-1 bg-theme-background-dark' : 'flex-1 bg-theme-background-DEFAULT'}
            >
                <StatusBar
                    barStyle={getStatusBarStyle()}
                    backgroundColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                    translucent={Platform.OS === 'android'}
                />

                <View
                    className="flex-1"
                    style={{
                        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
                    }}
                >
                    {/* Screen Header - Enhanced for both platforms */}
                    <View
                        className={`flex-row items-center justify-between px-4 py-3 border-b ${
                            isDarkMode
                                ? 'bg-theme-background-dark border-theme-border-dark'
                                : 'bg-theme-background-DEFAULT border-theme-border-DEFAULT'
                        }`}
                    >
                        {/* Back Button */}
                        <TouchableOpacity
                            onPress={() => router.back('')}
                            className={`p-2 rounded-full mr-3 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}
                            activeOpacity={0.7}
                        >
                            <ArrowLeft
                                size={22}
                                className={isDarkMode ? 'text-white' : 'text-black'}
                            />
                        </TouchableOpacity>

                        <Text
                            className={`flex-1 text-xl font-montserrat-bold ${
                                isDarkMode
                                    ? 'text-theme-text-primary-dark'
                                    : 'text-theme-text-primary-DEFAULT'
                            }`}
                        >
                            My Habits
                        </Text>

                        {/* Create New Habit Button */}
                        <TouchableOpacity
                            onPress={() => router.push('/add')}
                            className="p-2 rounded-full px-5 bg-primary-500"
                            activeOpacity={0.8}
                        >
                           <Text className='text-white font-bold'>Add new habit</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Main Content */}
                    {isLoading ? (
                        <LoadingState />
                    ) : error ? (
                        <ErrorState />
                    ) : habits.length > 0 ? (<FlatList
                            data={habits}
                            renderItem={renderHabitItem}
                            keyExtractor={(item) => item.habit_id.toString()}
                            contentContainerStyle={{ padding: 16 }}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefreshing}
                                    onRefresh={() => fetchHabits(true)}
                                    colors={['#22C55E']} // Primary color
                                    tintColor={isDarkMode ? '#E2E8F0' : '#22C55E'}
                                    progressBackgroundColor={isDarkMode ? '#1E293B' : '#F8FAFC'}
                                />
                            }
                        />
                    ) : (
                        <EmptyState />
                    )}

                    {/* Habit Options Modal */}
                    <HabitOptionsModal />
                </View>
            </SafeAreaView>
        );
    };

    export default HabitsScreen;