import { View, Text, Image, TouchableOpacity, useColorScheme } from 'react-native'
import React, { useCallback, useState } from 'react'
import { MotiView, AnimatePresence } from 'moti'
import { Trophy, Search, Plus, MessageCircle, UserPlus, X, Check, Filter } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const FriendsComponent = ({ isDark }) => {
    // If isDark is not passed as prop, use system setting
    const systemColorScheme = useColorScheme();
    const darkMode = isDark !== undefined ? isDark : systemColorScheme === 'dark';

    const [searchActive, setSearchActive] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([
        {
            id: '7',
            name: 'Rajesh Tamang',
            username: '@rajeshtmg',
            points: 735,
            imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?fit=crop&w=200&h=200',
            requestTime: '2h ago'
        }
    ]);

    // Friends data with Nepali names
    const friends = [
        {
            id: '1',
            name: 'Aarav Sharma',
            username: '@aaravs',
            points: 1250,
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&h=200',
            online: true,
            streak: 14
        },
        {
            id: '2',
            name: 'Sita Adhikari',
            username: '@sitaa',
            points: 980,
            imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=crop&w=200&h=200',
            online: false,
            streak: 8
        },
        {
            id: '3',
            name: 'Niraj Poudel',
            username: '@nirajp',
            points: 1430,
            imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&h=200',
            online: true,
            streak: 21
        },
        {
            id: '4',
            name: 'Priya Gurung',
            username: '@priyag',
            points: 890,
            imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fit=crop&w=200&h=200',
            online: false,
            streak: 5
        },
    ]

    // Suggested friends data with Nepali names
    const suggestedFriends = [
        {
            id: '5',
            name: 'Anisha Thapa',
            username: '@anishat',
            points: 1100,
            imageUrl: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?fit=crop&w=200&h=200',
            mutualFriends: 3
        },
        {
            id: '6',
            name: 'Rohan KC',
            username: '@rohank',
            points: 1320,
            imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?fit=crop&w=200&h=200',
            mutualFriends: 5
        },
    ]

    const handleAddFriend = useCallback((friendId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Add friend logic would go here
        // For now, just remove from suggested list in UI
        const updatedSuggested = suggestedFriends.filter(friend => friend.id !== friendId);
        // In real app, would call API and update state
    }, []);

    const handleAcceptRequest = useCallback((requestId) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        // In real app, would add to friends list and call API
    }, []);

    const handleRejectRequest = useCallback((requestId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        // In real app, would call API
    }, []);

    const handleMessageFriend = useCallback((friendId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Open message thread with friend
        console.log(`Opening message with friend: ${friendId}`);
    }, []);

    // Theme-based styles
    const styles = {
        container: darkMode ? 'bg-gray-900' : 'bg-gray-50',
        cardBg: darkMode ? 'bg-gray-800' : 'bg-white',
        cardBgAlt: darkMode ? 'bg-gray-700' : 'bg-gray-50',
        searchBg: darkMode ? 'bg-gray-700' : 'bg-gray-100',
        text: darkMode ? 'text-white' : 'text-gray-800',
        textMuted: darkMode ? 'text-gray-300' : 'text-gray-500',
        textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
        iconColor: darkMode ? '#9CA3AF' : '#6B7280',
        badgeBg: darkMode ? 'bg-primary-900/30' : 'bg-primary-50',
        badgeText: darkMode ? 'text-primary-300' : 'text-primary-700',
        actionBtnBg: darkMode ? 'bg-gray-700' : 'bg-gray-100',
    };

    return (
        <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450 }}
            className="space-y-6"
        >
            {/* Search Bar */}
            <View className={`rounded-xl overflow-hidden ${searchActive ? 'mb-4' : ''}`}>
                <View className={`${styles.searchBg} rounded-full px-4 py-3 flex-row items-center mb-2`}>
                    <Search size={18} color={darkMode ? "#9CA3AF" : "#6B7280"} className="mr-2" />
                    <Text className={`flex-1 ${styles.textMuted} font-montserrat-regular`}>
                        Search friends...
                    </Text>
                    <TouchableOpacity
                        className={`p-1 rounded-full ${styles.actionBtnBg}`}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSearchActive(!searchActive);
                        }}
                    >
                        <Filter size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Friend Requests Section - Only show if there are pending requests */}
            {pendingRequests.length > 0 && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2"
                >
                    <Text className={`text-lg font-montserrat-semibold ${styles.text} mb-3`}>
                        Friend Requests <Text className="text-primary-500 text-sm">{pendingRequests.length}</Text>
                    </Text>

                    {pendingRequests.map((request) => (
                        <MotiView
                            key={request.id}
                            from={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className={`${styles.cardBgAlt} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                        >
                            <Image
                                source={{ uri: request.imageUrl }}
                                className="h-12 w-12 rounded-full"
                            />

                            <View className="flex-1 ml-3">
                                <Text className={`font-montserrat-semibold ${styles.text}`}>
                                    {request.name}
                                </Text>
                                <View className="flex-row items-center">
                                    <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                                        {request.username}
                                    </Text>
                                    <Text className={`font-montserrat-regular ${styles.textSecondary} text-xs ml-2`}>
                                        · {request.requestTime}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center space-x-2">
                                <TouchableOpacity
                                    onPress={() => handleRejectRequest(request.id)}
                                    className={`h-9 w-9 rounded-full ${styles.actionBtnBg} items-center justify-center`}
                                >
                                    <X size={18} color={darkMode ? "#F87171" : "#EF4444"} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => handleAcceptRequest(request.id)}
                                    className="h-9 w-9 rounded-full bg-primary-500 items-center justify-center"
                                >
                                    <Check size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </MotiView>
                    ))}
                </MotiView>
            )}

            {/* My Friends */}
            <View>
                <Text className={`text-lg font-montserrat-semibold ${styles.text} mb-3`}>
                    My Friends <Text className="text-sm text-gray-400">{friends.length}</Text>
                </Text>

                {friends.map((friend, index) => (
                    <MotiView
                        key={friend.id}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{
                            type: 'timing',
                            duration: 350,
                            delay: index * 100  // Stagger animation
                        }}
                        className={`${styles.cardBg} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                    >
                        <View className="relative">
                            <Image
                                source={{ uri: friend.imageUrl }}
                                className="h-12 w-12 rounded-full"
                            />
                            {friend.online && (
                                <View className="h-3 w-3 bg-green-500 rounded-full absolute right-0 bottom-0 border-2 border-white" />
                            )}
                        </View>

                        <View className="flex-1 ml-3">
                            <Text className={`font-montserrat-semibold ${styles.text}`}>
                                {friend.name}
                            </Text>
                            <View className="flex-row items-center">
                                <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                                    {friend.username}
                                </Text>
                                {friend.streak > 0 && (
                                    <View className="flex-row items-center ml-2">
                                        <Text className="text-amber-500 text-xs">🔥 {friend.streak} days</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View className="flex-row items-center">
                            <View className={`${styles.badgeBg} px-3 py-1 rounded-full flex-row items-center mr-2`}>
                                <Trophy size={14} color={darkMode ? "#818CF8" : "#4F46E5"} className="mr-1" />
                                <Text className={`font-montserrat-medium ${styles.badgeText}`}>
                                    {friend.points}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => handleMessageFriend(friend.id)}
                                className={`h-9 w-9 rounded-full ${styles.actionBtnBg} items-center justify-center`}
                            >
                                <MessageCircle size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                ))}
            </View>

            {/* Suggested Friends */}
            <View>
                <Text className={`text-lg font-montserrat-semibold ${styles.text} mb-3`}>
                    Suggested Friends
                </Text>

                {suggestedFriends.map((friend, index) => (
                    <MotiView
                        key={friend.id}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{
                            type: 'timing',
                            duration: 350,
                            delay: 400 + (index * 100)  // Start after Friends section
                        }}
                        className={`${styles.cardBgAlt} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                    >
                        <Image
                            source={{ uri: friend.imageUrl }}
                            className="h-12 w-12 rounded-full"
                        />

                        <View className="flex-1 ml-3">
                            <Text className={`font-montserrat-semibold ${styles.text}`}>
                                {friend.name}
                            </Text>
                            <View className="flex-row items-center">
                                <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                                    {friend.username}
                                </Text>
                                {friend.mutualFriends > 0 && (
                                    <Text className={`font-montserrat-regular ${styles.textSecondary} text-xs ml-2`}>
                                        · {friend.mutualFriends} mutual friends
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View className="flex-row items-center space-x-2">
                            <View className="flex-row items-center">
                                <Trophy size={14} color={darkMode ? "#9CA3AF" : "#6B7280"} className="mr-1" />
                                <Text className={`font-montserrat-medium ${styles.textSecondary}`}>
                                    {friend.points}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => handleAddFriend(friend.id)}
                                className="h-9 w-9 rounded-full bg-primary-500 items-center justify-center"
                            >
                                <UserPlus size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </MotiView>
                ))}
            </View>

            {/* Find More Friends button */}
            <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', delay: 600 }}
            >
                <TouchableOpacity
                    className={`${styles.cardBg} rounded-xl py-3 items-center justify-center border border-gray-200 ${darkMode ? 'border-gray-700' : ''}`}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                    <Text className="text-primary-500 font-montserrat-semibold">
                        Find More Friends
                    </Text>
                </TouchableOpacity>
            </MotiView>
        </MotiView>
    )
}

export default FriendsComponent