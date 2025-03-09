import { View, Text, Image, TouchableOpacity, useColorScheme, ActivityIndicator, TextInput, Alert } from 'react-native';
import React, { useCallback, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MotiView, AnimatePresence } from 'moti';
import { Trophy, Search, Filter, MessageCircle, UserPlus, X, Check, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { debounce } from 'lodash';

// Import Redux actions
import {
    fetchFriends,
    fetchPendingRequests,
    fetchFriendSuggestions,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers,
    clearSearchResults
} from '../store/slices/friendshipSlice';

const FriendsComponent = ({ isDark, navigation }) => {
    // If isDark is not passed as prop, use system setting
    const systemColorScheme = useColorScheme();
    const darkMode = isDark !== undefined ? isDark : systemColorScheme === 'dark';
    const dispatch = useDispatch();

    // Get friendship data from Redux store
    const {
        friends,
        pendingRequests,
        suggestions,
        searchResults,
        loading,
        error
    } = useSelector(state => state.friendship);

    // Search state
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch all data on initial mount
    useEffect(() => {
        dispatch(fetchFriends());
        dispatch(fetchPendingRequests());
        dispatch(fetchFriendSuggestions());
    }, [dispatch]);

    // Show errors in alert instead of toast
    useEffect(() => {
        if (error) {
            Alert.alert('Error', error);
        }
    }, [error]);

    // Handle search with debounce
    const debouncedSearch = useCallback(
        debounce((query) => {
            if (query.length >= 2) {
                dispatch(searchUsers(query));
            } else {
                dispatch(clearSearchResults());
            }
        }, 500),
        [dispatch]
    );

    // Handle search input changes
    useEffect(() => {
        debouncedSearch(searchQuery);
        return () => debouncedSearch.cancel();
    }, [searchQuery, debouncedSearch]);

    // Handle adding friend
    const handleAddFriend = useCallback((userId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        dispatch(sendFriendRequest(userId))
            .unwrap()
            .then(() => {
                Alert.alert('Success', 'Friend request sent successfully');
            })
            .catch((error) => {
                Alert.alert('Error', error || 'Failed to send friend request');
            });
    }, [dispatch]);

    // Handle accepting friend request
    const handleAcceptRequest = useCallback((requestId) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        dispatch(respondToFriendRequest({ requestId, accept: true }))
            .unwrap()
            .then(() => {
                Alert.alert('Success', 'Friend request accepted');
            })
            .catch((error) => {
                Alert.alert('Error', error || 'Failed to accept request');
            });
    }, [dispatch]);

    // Handle rejecting friend request
    const handleRejectRequest = useCallback((requestId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        dispatch(respondToFriendRequest({ requestId, accept: false }))
            .unwrap()
            .then(() => {
                Alert.alert('Info', 'Friend request rejected');
            })
            .catch((error) => {
                Alert.alert('Error', error || 'Failed to reject request');
            });
    }, [dispatch]);

    // Handle messaging a friend
    const handleMessageFriend = useCallback((friendId, friendName) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to messaging screen
        if (navigation) {
            navigation.navigate('Messages', { friendId, friendName });
        } else {
            console.log(`Opening message with friend: ${friendId}`);
        }
    }, [navigation]);

    // Handle removing a friend
    const handleRemoveFriend = useCallback((friendId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        dispatch(removeFriend(friendId))
            .unwrap()
            .then(() => {
                Alert.alert('Success', 'Friend removed successfully');
            })
            .catch((error) => {
                Alert.alert('Error', error || 'Failed to remove friend');
            });
    }, [dispatch]);

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
                    {searchActive ? (
                        <TextInput
                            className={`flex-1 ${styles.textMuted} font-montserrat-regular`}
                            placeholder="Search friends..."
                            placeholderTextColor={darkMode ? "#9CA3AF" : "#6B7280"}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    ) : (
                        <TouchableOpacity
                            className="flex-1"
                            onPress={() => setSearchActive(true)}
                            activeOpacity={0.8}
                        >
                            <Text className={`${styles.textMuted} font-montserrat-regular`}>
                                Search friends...
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        className={`p-1 rounded-full ${styles.actionBtnBg}`}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSearchActive(!searchActive);
                            if (searchActive) {
                                setSearchQuery('');
                                dispatch(clearSearchResults());
                            }
                        }}
                    >
                        {searchActive ? (
                            <X size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                        ) : (
                            <Filter size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Results */}
            <AnimatePresence>
                {searchActive && (
                    <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-2"
                    >
                        {loading.search ? (
                            <View className="py-8 items-center justify-center">
                                <ActivityIndicator color="#4F46E5" />
                                <Text className={`${styles.textMuted} mt-3 font-montserrat-regular`}>
                                    Searching...
                                </Text>
                            </View>
                        ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
                            <View className="py-8 items-center justify-center">
                                <Text className={`${styles.textMuted} font-montserrat-medium`}>
                                    No users found
                                </Text>
                            </View>
                        ) : searchResults.length > 0 ? (
                            <>
                                <Text className={`text-lg font-montserrat-semibold ${styles.text} mb-3`}>
                                    Search Results
                                </Text>
                                {searchResults.map((user, index) => (
                                    <MotiView
                                        key={user.user_id}
                                        from={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: 'spring', damping: 15, delay: index * 50 }}
                                        className={`${styles.cardBgAlt} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                    >
                                        <Image
                                            source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}` }}
                                            className="h-12 w-12 rounded-full"
                                        />

                                        <View className="flex-1 ml-3">
                                            <Text className={`font-montserrat-semibold ${styles.text}`}>
                                                {user.user_name}
                                                {user.premium_status && (
                                                    <Text className="text-amber-500"> ★</Text>
                                                )}
                                            </Text>
                                            {user.lastActive && (
                                                <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                                                    Last active: {formatLastActive(user.lastActive)}
                                                </Text>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => handleAddFriend(user.user_id)}
                                            disabled={user.request_sent || user.request_received || loading.action}
                                            className={`h-9 w-9 rounded-full ${
                                                user.request_sent || user.request_received
                                                    ? styles.actionBtnBg
                                                    : 'bg-primary-500'
                                            } items-center justify-center`}
                                        >
                                            {user.request_sent ? (
                                                <Clock size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                            ) : user.request_received ? (
                                                <Check size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                            ) : (
                                                <UserPlus size={16} color="#FFFFFF" />
                                            )}
                                        </TouchableOpacity>
                                    </MotiView>
                                ))}
                            </>
                        ) : null}
                    </MotiView>
                )}
            </AnimatePresence>

            {/* Main Content - Only show when not actively searching */}
            {!searchActive && (
                <>
                    {/* Friend Requests Section */}
                    <AnimatePresence>
                        {pendingRequests.length > 0 && (
                            <MotiView
                                from={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-2"
                            >
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className={`text-lg font-montserrat-semibold ${styles.text}`}>
                                        Friend Requests {pendingRequests.length > 0 && (
                                        <Text className="text-primary-500 text-sm">{pendingRequests.length}</Text>
                                    )}
                                    </Text>

                                    {loading.requests && (
                                        <ActivityIndicator size="small" color="#4F46E5" />
                                    )}
                                </View>

                                {pendingRequests.map((request) => (
                                    <MotiView
                                        key={request.request_id}
                                        from={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                        className={`${styles.cardBgAlt} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                    >
                                        {request.sender && (
                                            <>
                                                <Image
                                                    source={{ uri: request.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.sender.user_name)}` }}
                                                    className="h-12 w-12 rounded-full"
                                                />

                                                <View className="flex-1 ml-3">
                                                    <Text className={`font-montserrat-semibold ${styles.text}`}>
                                                        {request.sender.user_name}
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className={`font-montserrat-regular ${styles.textSecondary} text-xs`}>
                                                            {formatRequestTime(request.createdAt)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View className="flex-row items-center space-x-2">
                                                    <TouchableOpacity
                                                        onPress={() => handleRejectRequest(request.request_id)}
                                                        className={`h-9 w-9 rounded-full ${styles.actionBtnBg} items-center justify-center`}
                                                        disabled={loading.action}
                                                    >
                                                        <X size={18} color={darkMode ? "#F87171" : "#EF4444"} />
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        onPress={() => handleAcceptRequest(request.request_id)}
                                                        className="h-9 w-9 rounded-full bg-primary-500 items-center justify-center"
                                                        disabled={loading.action}
                                                    >
                                                        <Check size={18} color="#FFFFFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        )}
                                    </MotiView>
                                ))}
                            </MotiView>
                        )}
                    </AnimatePresence>

                    {/* My Friends */}
                    <View>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`text-lg font-montserrat-semibold ${styles.text}`}>
                                My Friends <Text className="text-sm text-gray-400">{friends.length}</Text>
                            </Text>

                            {loading.friends && (
                                <ActivityIndicator size="small" color="#4F46E5" />
                            )}
                        </View>

                        {!loading.friends && friends.length === 0 ? (
                            <View className={`${styles.cardBg} rounded-xl p-6 mb-3 items-center justify-center`}>
                                <Text className={`font-montserrat-medium ${styles.textMuted} text-center mb-2`}>
                                    You don't have any friends yet
                                </Text>
                                <Text className={`font-montserrat-regular ${styles.textSecondary} text-center text-sm`}>
                                    Search for users or check the suggested friends below
                                </Text>
                            </View>
                        ) : (
                            friends.map((friend, index) => (
                                <MotiView
                                    key={friend.user_id}
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
                                            source={{ uri: friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.user_name)}` }}
                                            className="h-12 w-12 rounded-full"
                                        />
                                        {isRecentlyActive(friend.lastActive) && (
                                            <View className="h-3 w-3 bg-green-500 rounded-full absolute right-0 bottom-0 border-2 border-white" />
                                        )}
                                    </View>

                                    <View className="flex-1 ml-3">
                                        <Text className={`font-montserrat-semibold ${styles.text}`}>
                                            {friend.user_name}
                                            {friend.premium_status && (
                                                <Text className="text-amber-500"> ★</Text>
                                            )}
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                                                {formatLastActive(friend.lastActive)}
                                            </Text>
                                            {friend.streak > 0 && (
                                                <View className="flex-row items-center ml-2">
                                                    <Text className="text-amber-500 text-xs">🔥 {friend.streak} days</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    <View className="flex-row items-center space-x-3">
                                        <TouchableOpacity
                                            onPress={() => handleMessageFriend(friend.user_id, friend.user_name)}
                                            className={`h-9 w-9 rounded-full ${styles.actionBtnBg} items-center justify-center`}
                                        >
                                            <MessageCircle size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleRemoveFriend(friend.user_id)}
                                            className={`h-9 w-9 rounded-full ${styles.actionBtnBg} items-center justify-center`}
                                            disabled={loading.action}
                                        >
                                            <X size={16} color={darkMode ? "#F87171" : "#EF4444"} />
                                        </TouchableOpacity>
                                    </View>
                                </MotiView>
                            ))
                        )}
                    </View>

                    {/* Suggested Friends */}
                    <View>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`text-lg font-montserrat-semibold ${styles.text}`}>
                                Suggested Friends
                            </Text>

                            {loading.suggestions && (
                                <ActivityIndicator size="small" color="#4F46E5" />
                            )}
                        </View>

                        {!loading.suggestions && suggestions.length === 0 ? (
                            <View className={`${styles.cardBgAlt} rounded-xl p-6 mb-3 items-center justify-center`}>
                                <Text className={`font-montserrat-medium ${styles.textMuted} text-center`}>
                                    No suggestions available right now
                                </Text>
                            </View>
                        ) : (
                            suggestions.map((user, index) => (
                                <MotiView
                                    key={user.user_id}
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
                                        source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}` }}
                                        className="h-12 w-12 rounded-full"
                                    />

                                    <View className="flex-1 ml-3">
                                        <Text className={`font-montserrat-semibold ${styles.text}`}>
                                            {user.user_name}
                                            {user.premium_status && (
                                                <Text className="text-amber-500"> ★</Text>
                                            )}
                                        </Text>
                                        <View className="flex-row items-center">
                                            {user.mutualFriends > 0 && (
                                                <Text className={`font-montserrat-regular ${styles.textSecondary} text-xs`}>
                                                    {user.mutualFriends} mutual {user.mutualFriends === 1 ? 'friend' : 'friends'}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleAddFriend(user.user_id)}
                                        className="h-9 w-9 rounded-full bg-primary-500 items-center justify-center"
                                        disabled={loading.action}
                                    >
                                        <UserPlus size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </MotiView>
                            ))
                        )}
                    </View>

                    {/* Find More Friends button */}
                    <MotiView
                        from={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', delay: 600 }}
                    >
                        <TouchableOpacity
                            className={`${styles.cardBg} rounded-xl py-3 items-center justify-center border border-gray-200 ${darkMode ? 'border-gray-700' : ''}`}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSearchActive(true);
                            }}
                        >
                            <Text className="text-primary-500 font-montserrat-semibold">
                                Find More Friends
                            </Text>
                        </TouchableOpacity>
                    </MotiView>
                </>
            )}
        </MotiView>
    );
};

// Helper function to format last active time
const formatLastActive = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastActive.toLocaleDateString();
};

// Helper function to check if user was active in the last 15 minutes
const isRecentlyActive = (timestamp) => {
    if (!timestamp) return false;

    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    return diffMins < 15;
};

// Helper function to format request time
const formatRequestTime = (timestamp) => {
    if (!timestamp) return '';

    const requestTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - requestTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return requestTime.toLocaleDateString();
};

export default FriendsComponent;