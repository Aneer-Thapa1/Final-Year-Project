import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { MotiView } from 'moti';
import { ArrowLeft, Trophy, Bell, Users, Star } from 'lucide-react-native';
import { router } from "expo-router";

const notifications = [
    {
        id: '1',
        type: 'achievement',
        icon: Trophy,
        title: 'Achievement Unlocked!',
        message: 'Completed your first week of consistent meditation practice. Keep up the momentum!',
        time: '2h ago',
        read: false,
        color: 'primary',
        emoji: '🎯'
    },
    {
        id: '2',
        type: 'reminder',
        icon: Bell,
        title: 'Time for Mindfulness',
        message: 'Your scheduled meditation session starts in 5 minutes.',
        time: '5h ago',
        read: true,
        color: 'secondary',
        emoji: '⏰'
    },
    {
        id: '3',
        type: 'social',
        icon: Users,
        title: 'New Connection',
        message: 'Sarah joined your mindfulness journey. Send a welcome note!',
        time: '1d ago',
        read: false,
        color: 'accent',
        emoji: '👋'
    },
    {
        id: '4',
        type: 'streak',
        icon: Star,
        title: 'Streak Milestone',
        message: "You've maintained your practice for 7 days straight!",
        time: '2d ago',
        read: true,
        color: 'warning',
        emoji: '🔥'
    }
];

const NotificationItem = ({ notification, index }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const Icon = notification.icon;

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

    const colors = colorClasses[notification.color];

    return (
        <MotiView
            from={{ opacity: 0, translateX: -20, scale: 0.9 }}
            animate={{ opacity: 1, translateX: 0, scale: 1 }}
            transition={{ delay: index * 100 }}
            className="px-4 mb-3"
        >
            <TouchableOpacity
                className={`
                    rounded-2xl border p-4
                    ${colors.bg} ${colors.border}
                    ${notification.read ? 'opacity-60' : 'opacity-100'}
                `}
            >
                <View className="flex-row items-start">
                    <View className={`
                        w-12 h-12 rounded-xl items-center justify-center mr-4
                        ${colors.bg}
                    `}>
                        <Text className="text-2xl mb-1">{notification.emoji}</Text>
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
                                {notification.time}
                            </Text>
                        </View>

                        <Text className={`
                            text-sm font-montserrat leading-5
                            ${isDark ? 'text-gray-400' : 'text-gray-600'}
                        `}>
                            {notification.message}
                        </Text>

                        {!notification.read && (
                            <View className={`
                                flex-row items-center mt-2 pt-2 border-t
                                ${colors.border}
                            `}>
                                <Icon size={16} color={colors.icon} />
                                <Text className={`
                                    ml-2 text-sm font-montserrat-medium
                                    ${colors.text}
                                `}>
                                    {notification.type === 'social' ? 'Send welcome' : 'View details'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
};

const Notifications = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className="px-4 pt-2 pb-4 flex-row items-center justify-between bg-white dark:bg-gray-900">
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

                <View className={`
                    px-3 py-1.5 rounded-full
                    ${isDark ? 'bg-secondary-900/20' : 'bg-secondary-50'}
                `}>
                    <Text className={`
                        text-sm font-montserrat-medium
                        ${isDark ? 'text-secondary-400' : 'text-secondary-600'}
                    `}>
                        4 New
                    </Text>
                </View>
            </View>

            {/* Notifications List */}
            <ScrollView
                className="flex-1 pt-2"
                showsVerticalScrollIndicator={false}
            >
                {notifications.map((notification, index) => (
                    <NotificationItem
                        key={notification.id}
                        notification={notification}
                        index={index}
                    />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Notifications;