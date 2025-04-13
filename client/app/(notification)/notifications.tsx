import { View, Text, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { MotiView } from 'moti';
import { ArrowLeft, Trophy, Bell, Users, Star, MessageCircle, Award, Flag, UserPlus, Calendar, AlertTriangle, Check } from 'lucide-react-native';
import { router } from "expo-router";
import { useNotifications, NotificationType, Notification } from '../../services/NotificationService';

// Map notification types to icons and colors
const typeConfig = {
    'STREAK_MILESTONE': {
        icon: Star,
        color: 'warning',
        emoji: '🔥',
        action: 'View streak'
    },
    'ACHIEVEMENT_UNLOCKED': {
        icon: Trophy,
        color: 'primary',
        emoji: '🏆',
        action: 'View achievement'
    },
    'FRIEND_REQUEST': {
        icon: UserPlus,
        color: 'accent',
        emoji: '👋',
        action: 'Respond'
    },
    'CHALLENGE_INVITE': {
        icon: Flag,
        color: 'secondary',
        emoji: '🎯',
        action: 'View challenge'
    },
    'REMINDER': {
        icon: Bell,
        color: 'secondary',
        emoji: '⏰',
        action: 'View habit'
    },
    'SYSTEM_MESSAGE': {
        icon: Bell,
        color: 'warning',
        emoji: '📢',
        action: 'View details'
    },
    'BLOG_COMMENT': {
        icon: MessageCircle,
        color: 'accent',
        emoji: '💬',
        action: 'View comment'
    },
    'NEW_MESSAGE': {
        icon: MessageCircle,
        color: 'primary',
        emoji: '✉️',
        action: 'Reply'
    },
    'GROUP_INVITATION': {
        icon: Users,
        color: 'secondary',
        emoji: '👥',
        action: 'View invitation'
    },
    'POINTS_AWARDED': {
        icon: Award,
        color: 'primary',
        emoji: '✨',
        action: 'View points'
    }
};

// Custom hook for notification type detection
const useNotificationConfig = (type: NotificationType) => {
    return typeConfig[type] || {
        icon: Bell,
        color: 'secondary',
        emoji: '🔔',
        action: 'View details'
    };
};

const NotificationItem = ({ notification, index, onPress }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const config = useNotificationConfig(notification.type);
    const Icon = config.icon;

    const colorClasses = {
        primary: {
            bg: isDark ? 'bg-primary-900/20' : 'bg-primary-50',
            text: isDark ? 'text-primary-400' : 'text-primary-600',
            icon: isDark ? '#4ADE80' : '#22C55E',
            border: isDark ? 'border-primary-800' : 'border-primary-100'
        },
        secondary: {
            bg: isDark ? 'bg-secondary-900/20' : 'bg-secondary-50',
            text: isDark ? 'text-secondary-400' : 'text-secondary-600',
            icon: isDark ? '#C4B5FD' : '#7C3AED',
            border: isDark ? 'border-secondary-800' : 'border-secondary-100'
        },
        accent: {
            bg: isDark ? 'bg-accent-900/20' : 'bg-accent-50',
            text: isDark ? 'text-accent-400' : 'text-accent-600',
            icon: isDark ? '#FCD34D' : '#F59E0B',
            border: isDark ? 'border-accent-800' : 'border-accent-100'
        },
        warning: {
            bg: isDark ? 'bg-warning-900/20' : 'bg-warning-50',
            text: isDark ? 'text-warning-400' : 'text-warning-600',
            icon: isDark ? '#FBBF24' : '#F59E0B',
            border: isDark ? 'border-warning-800' : 'border-warning-100'
        }
    };

    const colors = colorClasses[config.color];

    return (
        <MotiView
            from={{ opacity: 0, translateX: -20, scale: 0.9 }}
            animate={{ opacity: 1, translateX: 0, scale: 1 }}
            transition={{ delay: index * 100, type: 'timing', duration: 300 }}
            exit={{ opacity: 0, translateX: 20, scale: 0.9 }}
            className="px-4 mb-3"
        >
            <TouchableOpacity
                onPress={() => onPress(notification)}
                className={`
                    rounded-2xl border p-4
                    ${colors.bg} ${colors.border}
                    ${notification.is_read ? 'opacity-60' : 'opacity-100'}
                `}
            >
                <View className="flex-row items-start">
                    <View className={`
                        w-12 h-12 rounded-xl items-center justify-center mr-4
                        ${colors.bg}
                    `}>
                        <Text className="text-2xl mb-1">{config.emoji}</Text>
                    </View>

                    <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                            <Text className={`
                                text-base font-montserrat-bold 
                                ${isDark ? 'text-white' : 'text-gray-900'}
                            `}>
                                {notification.title}
                            </Text>
                            <Text className={`
                                text-xs font-montserrat
                                ${isDark ? 'text-gray-500' : 'text-gray-400'}
                            `}>
                                {notification.timeAgo || ''}
                            </Text>
                        </View>

                        <Text className={`
                            text-sm font-montserrat leading-5
                            ${isDark ? 'text-gray-400' : 'text-gray-600'}
                        `}>
                            {notification.content}
                        </Text>

                        {!notification.is_read && (
                            <View className={`
                                flex-row items-center mt-2 pt-2 border-t
                                ${colors.border}
                            `}>
                                <Icon size={16} color={colors.icon} />
                                <Text className={`
                                    ml-2 text-sm font-montserrat-medium
                                    ${colors.text}
                                `}>
                                    {config.action}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
};

const EmptyState = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400 }}
            className="flex-1 items-center justify-center px-6 py-20"
        >
            <View className={`
                w-16 h-16 rounded-full items-center justify-center mb-4
                ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
            `}>
                <Bell size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </View>
            <Text className={`
                text-lg font-montserrat-bold text-center mb-2
                ${isDark ? 'text-white' : 'text-gray-900'}
            `}>
                No notifications yet
            </Text>
            <Text className={`
                text-sm font-montserrat text-center
                ${isDark ? 'text-gray-400' : 'text-gray-500'}
            `}>
                When you get notifications, they'll appear here
            </Text>
        </MotiView>
    );
};

const FilterChip = ({ active, label, onPress, isDark }) => (
    <TouchableOpacity
        onPress={onPress}
        className={`
            mr-2 px-4 py-1.5 rounded-full
            ${active
            ? isDark
                ? 'bg-secondary-900/20'
                : 'bg-secondary-50'
            : isDark
                ? 'bg-gray-800'
                : 'bg-gray-100'
        }
        `}
    >
        <Text
            className={`
                text-sm font-montserrat-medium
                ${active
                ? isDark
                    ? 'text-secondary-400'
                    : 'text-secondary-600'
                : isDark
                    ? 'text-gray-400'
                    : 'text-gray-600'
            }
            `}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

const NotificationsScreen = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [refreshing, setRefreshing] = useState(false);
    const [filterType, setFilterType] = useState<NotificationType | null>(null);
    const [showReadFilter, setShowReadFilter] = useState<boolean | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    const {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    } = useNotifications();

    // Apply filters when component mounts
    useEffect(() => {
        const loadNotifications = async () => {
            await fetchNotifications(1, 20);
        };
        loadNotifications();
    }, []);

    // Handle notification tap
    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.notification_id);
        }

        // Handle navigation based on notification type and related_id
        if (notification.action_url) {
            router.push(notification.action_url);
        } else {
            // Default navigation based on type
            switch (notification.type) {
                case 'FRIEND_REQUEST':
                    router.push('/friends');
                    break;
                case 'ACHIEVEMENT_UNLOCKED':
                    router.push('/achievements');
                    break;
                case 'STREAK_MILESTONE':
                    router.push('/stats');
                    break;
                case 'REMINDER':
                    if (notification.related_id) {
                        router.push(`/habits/${notification.related_id}`);
                    } else {
                        router.push('/habits');
                    }
                    break;
                default:
                    console.log('Notification tapped:', notification.notification_id);
            }
        }
    };

    // Refresh notifications
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications(1, 20, {
            type: filterType || undefined,
            read: showReadFilter
        });
        setRefreshing(false);
    };

    // Handle filtering notifications by type
    const handleFilterChange = async (type: NotificationType | null) => {
        // Toggle filter if already selected
        const newFilter = filterType === type ? null : type;
        setFilterType(newFilter);

        // Apply filters
        try {
            await fetchNotifications(1, 20, {
                type: newFilter || undefined,
                read: showReadFilter
            });
        } catch (error) {
            console.error("Error applying filter:", error);
        }
    };

    // Handle filtering by read/unread status
    const handleReadFilterChange = async (readStatus: boolean | null) => {
        // Toggle filter if already selected
        const newFilter = showReadFilter === readStatus ? null : readStatus;
        setShowReadFilter(newFilter);

        // Apply filters
        try {
            await fetchNotifications(1, 20, {
                type: filterType || undefined,
                read: newFilter
            });
        } catch (error) {
            console.error("Error applying read filter:", error);
        }
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        if (markingAll) return;

        try {
            setMarkingAll(true);
            await markAllAsRead();
            // Fetch notifications again with current filters
            await fetchNotifications(1, 20, {
                type: filterType || undefined,
                read: showReadFilter
            });
        } catch (error) {
            console.error("Error marking all as read:", error);
        } finally {
            setMarkingAll(false);
        }
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className="px-4 pt-2 pb-3 bg-white dark:bg-gray-900">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="mr-3 p-2 -ml-2"
                        >
                            <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                        </TouchableOpacity>
                        <View>
                            <Text className={`text-xl font-montserrat-bold ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                Notifications
                            </Text>
                            <Text className={`text-sm font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                Stay updated with your progress
                            </Text>
                        </View>
                    </View>

                    {unreadCount > 0 && (
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className={`
                                px-3 py-1.5 rounded-full
                                ${isDark ? 'bg-secondary-900/20' : 'bg-secondary-50'}
                            `}
                        >
                            <Text className={`
                                text-sm font-montserrat-medium
                                ${isDark ? 'text-secondary-400' : 'text-secondary-600'}
                            `}>
                                {unreadCount} New
                            </Text>
                        </MotiView>
                    )}
                </View>

                {/* Filter chips row */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row mt-4"
                    contentContainerStyle={{ paddingRight: 16 }}
                >
                    <FilterChip
                        label="All"
                        active={filterType === null && showReadFilter === null}
                        onPress={() => {
                            setFilterType(null);
                            setShowReadFilter(null);
                            fetchNotifications(1, 20);
                        }}
                        isDark={isDark}
                    />
                    <FilterChip
                        label="Unread"
                        active={showReadFilter === false}
                        onPress={() => handleReadFilterChange(false)}
                        isDark={isDark}
                    />
                    <FilterChip
                        label="Friends"
                        active={filterType === 'FRIEND_REQUEST'}
                        onPress={() => handleFilterChange('FRIEND_REQUEST')}
                        isDark={isDark}
                    />
                    <FilterChip
                        label="Streaks"
                        active={filterType === 'STREAK_MILESTONE'}
                        onPress={() => handleFilterChange('STREAK_MILESTONE')}
                        isDark={isDark}
                    />
                    <FilterChip
                        label="Achievements"
                        active={filterType === 'ACHIEVEMENT_UNLOCKED'}
                        onPress={() => handleFilterChange('ACHIEVEMENT_UNLOCKED')}
                        isDark={isDark}
                    />
                    <FilterChip
                        label="System"
                        active={filterType === 'SYSTEM_MESSAGE'}
                        onPress={() => handleFilterChange('SYSTEM_MESSAGE')}
                        isDark={isDark}
                    />
                </ScrollView>

                {/* Mark all as read button - Only show if there are unread notifications */}
                {unreadCount > 0 && (
                    <TouchableOpacity
                        onPress={handleMarkAllAsRead}
                        disabled={markingAll}
                        className={`
                            mt-4 px-4 py-2.5 rounded-xl flex-row items-center justify-center
                            ${isDark ? 'bg-secondary-900/20' : 'bg-secondary-50'}
                        `}
                    >
                        {markingAll ? (
                            <ActivityIndicator size="small" color={isDark ? '#C4B5FD' : '#7C3AED'} />
                        ) : (
                            <Check size={18} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                        )}
                        <Text className={`
                            ml-2 font-montserrat-medium text-sm
                            ${isDark ? 'text-secondary-400' : 'text-secondary-600'}
                        `}>
                            {markingAll ? 'Marking all as read...' : 'Mark all as read'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Notifications List */}
            {loading.notifications && !refreshing ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? '#E2E8F0' : '#6B7280'} />
                    <Text className={`mt-4 font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Loading notifications...
                    </Text>
                </View>
            ) : notifications.length === 0 ? (
                <EmptyState />
            ) : (
                <ScrollView
                    className="flex-1 pt-2"
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={isDark ? '#E2E8F0' : '#6B7280'}
                            colors={[isDark ? '#E2E8F0' : '#6B7280']}
                        />
                    }
                >
                    {notifications.map((notification, index) => (
                        <NotificationItem
                            key={notification.notification_id}
                            notification={notification}
                            index={index}
                            onPress={handleNotificationPress}
                        />
                    ))}

                    {/* Bottom padding */}
                    <View className="h-6" />
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default NotificationsScreen;