import { View, Text, Image, TouchableOpacity, useColorScheme, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import React, { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector, RootState } from '../store/store';
import { MotiView, AnimatePresence } from 'moti';
import { Trophy, Search, Filter, MessageCircle, UserPlus, X, Check, Clock, MoreVertical, UserX, User, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { debounce } from 'lodash';
import { useRouter } from 'expo-router';

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

// Import chat actions
import {
    connectSocket,
    createDirectChat,
    openExistingChat
} from '../store/slices/chatSlice';

interface FriendsComponentProps {
    isDark?: boolean;
}
const FriendsComponent: React.FC<FriendsComponentProps> = ({ isDark }) => {
    // If isDark is not passed as prop, use system setting
    const systemColorScheme = useColorScheme();
    const darkMode = isDark !== undefined ? isDark : systemColorScheme === 'dark';
    const dispatch = useAppDispatch();
    const router = useRouter();

    // Get friendship data from Redux store
    const {
        friends,
        pendingRequests,
        suggestions,
        searchResults,
        loading,
        error
    } = useAppSelector((state: RootState) => state.friendship);

    // Get user data from Redux store
    const currentUserId = useAppSelector((state: RootState) => state.user.user?.user?.user_id);

    // Get chat data from Redux store
    const { chatRooms, loadingChat, socketConnected } = useAppSelector((state: RootState) => state.chat);

    // Search state
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Dropdown menu state
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState<any>(null);

    // Initialize socket connection when component mounts
    useEffect(() => {
        if (!socketConnected) {
            dispatch(connectSocket());
        }
    }, [dispatch, socketConnected]);

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
        debounce((query: string) => {
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
    const handleAddFriend = useCallback((userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        dispatch(sendFriendRequest(userId))
            .unwrap()
            .then(() => {
                Alert.alert('Success', 'Friend request sent successfully');
            })
            .catch((error: any) => {
                Alert.alert('Error', error || 'Failed to send friend request');
            });
    }, [dispatch]);

    // Handle accepting friend request
    const handleAcceptRequest = useCallback((requestId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        dispatch(respondToFriendRequest({ requestId, accept: true }))
            .unwrap()
            .then(() => {
                Alert.alert('Success', 'Friend request accepted');
            })
            .catch((error: any) => {
                Alert.alert('Error', error || 'Failed to accept request');
            });
    }, [dispatch]);

    // Handle rejecting friend request
    const handleRejectRequest = useCallback((requestId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        dispatch(respondToFriendRequest({ requestId, accept: false }))
            .unwrap()
            .then(() => {
                Alert.alert('Info', 'Friend request rejected');
            })
            .catch((error: any) => {
                Alert.alert('Error', error || 'Failed to reject request');
            });
    }, [dispatch]);

    // Enhanced handle messaging a friend
    const handleMessageFriend = useCallback(async (friendId: string, friendName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMenuVisible(false);

        // Ensure we have the current user ID
        if (!currentUserId) {
            Alert.alert('Error', 'User information not available');
            return;
        }

        try {
            // Check if chat room already exists
            const existingRoom = chatRooms.find(room => {
                // Check if it's a direct message with exactly 2 participants
                if (room.type !== 'DM' || room.participants.length !== 2) {
                    return false;
                }

                // Check if both the friend's ID and current user's ID are in the participants
                const participantUserIds = room.participants.map(p => p.user_id);
                return participantUserIds.includes(friendId) && participantUserIds.includes(currentUserId);
            });

            if (existingRoom) {
                // Open existing chat room
                await dispatch(openExistingChat(existingRoom.room_id)).unwrap();

                // Navigate to the chat room
                router.push({
                    pathname: `/(chat)/${existingRoom.room_id}`,
                    params: {
                        name: friendName || '',
                        isDirect: 'true'
                    }
                });
            } else {
                // Create new direct chat room
                const roomData = await dispatch(createDirectChat(friendId)).unwrap();

                // Navigate to the new chat room
                router.push({
                    pathname: `/(chat)/${roomData.room_id}`,
                    params: {
                        name: friendName || '',
                        isDirect: 'true'
                    }
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            Alert.alert('Error', 'Failed to open chat conversation');
        }
    }, [router, dispatch, chatRooms, currentUserId]);

    // Handle removing a friend
    const handleRemoveFriend = useCallback((friendId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuVisible(false);

        Alert.alert(
            'Remove Friend',
            'Are you sure you want to remove this friend?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        dispatch(removeFriend(friendId))
                            .unwrap()
                            .then(() => {
                                Alert.alert('Success', 'Friend removed successfully');
                            })
                            .catch((error: any) => {
                                Alert.alert('Error', error || 'Failed to remove friend');
                            });
                    }
                }
            ]
        );
    }, [dispatch]);

    // Handle blocking a user
    const handleBlockUser = useCallback((friendId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setMenuVisible(false);

        Alert.alert(
            'Block User',
            'Are you sure you want to block this user? They will no longer be able to contact you.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: () => {
                        // Implement block user functionality
                        // This would call your blockUser action from your store
                        Alert.alert('Notice', 'User has been blocked');
                    }
                }
            ]
        );
    }, []);

    // Handle viewing profile
    const handleViewProfile = useCallback((friendId: string, friendName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMenuVisible(false);

        // Navigate to profile
        router.push({
            pathname: `/(profile)/${friendId}`,
            params: {
                name: friendName || ''
            }
        });
    }, [router]);

    // Show dropdown menu for a friend
    const showMenu = useCallback((friend: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFriend(friend);
        setMenuVisible(true);
    }, []);

    return (
        <MotiView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450 }}
            className="space-y-6"
        >
            {/* Search Bar */}
            <View className={`rounded-xl overflow-hidden ${searchActive ? 'mb-4' : ''}`}>
                <View className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full px-4 py-3 flex-row items-center mb-2`}>
                    <Search size={18} className="mr-2" color={darkMode ? "#9CA3AF" : "#6B7280"} />
                    {searchActive ? (
                        <TextInput
                            className={`flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'} font-montserrat-regular`}
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
                            <Text className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} font-montserrat-regular`}>
                                Search friends...
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        className={`p-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
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
                                <ActivityIndicator color={darkMode ? "#86EFAC" : "#22C55E"} />
                                <Text className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} mt-3 font-montserrat-regular`}>
                                    Searching...
                                </Text>
                            </View>
                        ) : searchQuery.length >= 2 && searchResults.length === 0 ? (
                            <View className="py-8 items-center justify-center">
                                <Text className={`${darkMode ? 'text-gray-300' : 'text-gray-500'} font-montserrat-medium`}>
                                    No users found
                                </Text>
                            </View>
                        ) : searchResults.length > 0 ? (
                            <>
                                <Text className={`text-lg font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-3`}>
                                    Search Results
                                </Text>
                                {searchResults.map((user: any, index: number) => (
                                    <MotiView
                                        key={user.user_id}
                                        from={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: 'spring', damping: 15, delay: index * 50 }}
                                        className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                    >
                                        <Image
                                            source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}` }}
                                            className="h-12 w-12 rounded-full"
                                        />

                                        <View className="flex-1 ml-3">
                                            <Text className={`font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {user.user_name}
                                                {user.premium_status && (
                                                    <Text className="text-amber-500"> ★</Text>
                                                )}
                                            </Text>
                                            {user.lastActive && (
                                                <Text className={`font-montserrat-regular ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>
                                                    Last active: {formatLastActive(user.lastActive)}
                                                </Text>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => handleAddFriend(user.user_id)}
                                            disabled={user.request_sent || user.request_received || loading.action}
                                            className={`h-9 w-9 rounded-full ${
                                                user.request_sent || user.request_received
                                                    ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
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
                                    <Text className={`text-lg font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                        Friend Requests {pendingRequests.length > 0 && (
                                        <Text className="text-primary-500 text-sm">{pendingRequests.length}</Text>
                                    )}
                                    </Text>

                                    {loading.requests && (
                                        <ActivityIndicator size="small" color={darkMode ? "#86EFAC" : "#22C55E"} />
                                    )}
                                </View>

                                {pendingRequests.map((request: any) => (
                                    <MotiView
                                        key={request.request_id}
                                        from={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                        className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                    >
                                        {request.sender && (
                                            <>
                                                <Image
                                                    source={{ uri: request.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(request.sender.user_name)}` }}
                                                    className="h-12 w-12 rounded-full"
                                                />

                                                <View className="flex-1 ml-3">
                                                    <Text className={`font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                                        {request.sender.user_name}
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className={`font-montserrat-regular ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
                                                            {formatRequestTime(request.createdAt)}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View className="flex-row items-center space-x-4">
                                                    <TouchableOpacity
                                                        onPress={() => handleRejectRequest(request.request_id)}
                                                        className={`px-3 py-2 rounded-full ${darkMode ? 'bg-red-900/20' : 'bg-red-50'} items-center justify-center flex-row`}
                                                        disabled={loading.action}
                                                    >
                                                        <X size={18} color={darkMode ? "#F87171" : "#EF4444"} />
                                                        <Text className={`ml-1 text-sm font-montserrat-medium ${darkMode ? "text-red-300" : "text-red-500"}`}>
                                                            Reject
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        onPress={() => handleAcceptRequest(request.request_id)}
                                                        className={`px-3 py-2 rounded-full bg-primary-500 items-center justify-center flex-row`}
                                                        disabled={loading.action}
                                                    >
                                                        <Check size={18} color="#FFFFFF" />
                                                        <Text className="ml-1 text-sm font-montserrat-medium text-white">
                                                            Accept
                                                        </Text>
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
                            <Text className={`text-lg font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                My Friends <Text className="text-sm text-gray-400">{friends.length}</Text>
                            </Text>

                            {loading.friends && (
                                <ActivityIndicator size="small" color={darkMode ? "#86EFAC" : "#22C55E"} />
                            )}
                        </View>

                        {!loading.friends && friends.length === 0 ? (
                            <View className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 mb-3 items-center justify-center`}>
                                <Text className={`font-montserrat-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-center mb-2`}>
                                    You don't have any friends yet
                                </Text>
                                <Text className={`font-montserrat-regular ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-center text-sm`}>
                                    Search for users or check the suggested friends below
                                </Text>
                            </View>
                        ) : (
                            friends.map((friend: any, index: number) => (
                                <MotiView
                                    key={friend.user_id}
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{
                                        type: 'timing',
                                        duration: 350,
                                        delay: index * 100  // Stagger animation
                                    }}
                                    className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                >
                                    <View className="relative">
                                        <Image
                                            source={{ uri: friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.user_name)}` }}
                                            className="h-12 w-12 rounded-full"
                                        />
                                        {isRecentlyActive(friend.lastActive) && (
                                            <View className="h-3 w-3 bg-primary-500 rounded-full absolute right-0 bottom-0 border-2 border-white dark:border-gray-800" />
                                        )}
                                    </View>

                                    <View className="flex-1 ml-3">
                                        <Text className={`font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                            {friend.user_name}
                                            {friend.premium_status && (
                                                <Text className="text-amber-500"> ★</Text>
                                            )}
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Text className={`font-montserrat-regular ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-sm`}>
                                                {formatLastActive(friend.lastActive)}
                                            </Text>
                                            {friend.streak > 0 && (
                                                <View className="flex-row items-center ml-2">
                                                    <Text className="text-amber-500 text-xs">🔥 {friend.streak} days</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>

                                    {/* 3-dot menu instead of message and remove icons */}
                                    <TouchableOpacity
                                        onPress={() => showMenu(friend)}
                                        className={`h-9 w-9 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} items-center justify-center active:bg-primary-100 dark:active:bg-primary-800`}
                                    >
                                        <MoreVertical size={16} color={darkMode ? "#86EFAC" : "#22C55E"} />
                                    </TouchableOpacity>
                                </MotiView>
                            ))
                        )}
                    </View>

                    {/* Suggested Friends */}
                    <View>
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`text-lg font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                Suggested Friends
                            </Text>

                            {loading.suggestions && (
                                <ActivityIndicator size="small" color={darkMode ? "#86EFAC" : "#22C55E"} />
                            )}
                        </View>

                        {!loading.suggestions && suggestions.length === 0 ? (
                            <View className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6 mb-3 items-center justify-center`}>
                                <Text className={`font-montserrat-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} text-center`}>
                                    No suggestions available right now
                                </Text>
                            </View>
                        ) : (
                            suggestions.map((user: any, index: number) => (
                                <MotiView
                                    key={user.user_id}
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{
                                        type: 'timing',
                                        duration: 350,
                                        delay: 400 + (index * 100)  // Start after Friends section
                                    }}
                                    className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-3 shadow-sm flex-row items-center`}
                                >
                                    <Image
                                        source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}` }}
                                        className="h-12 w-12 rounded-full"
                                    />

                                    <View className="flex-1 ml-3">
                                        <Text className={`font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                            {user.user_name}
                                            {user.premium_status && (
                                                <Text className="text-amber-500"> ★</Text>
                                            )}
                                        </Text>
                                        <View className="flex-row items-center">
                                            {user.mutualFriends > 0 && (
                                                <Text className={`font-montserrat-regular ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
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
                            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl py-3 items-center justify-center border ${darkMode ? 'border-primary-800' : 'border-primary-200'}`}
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

            {/* Enhanced Friend Action Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                    className={`${darkMode ? 'bg-black/70' : 'bg-black/40'} justify-center items-center px-4`}
                >
                    <MotiView
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 18 }}
                        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl overflow-hidden shadow-2xl w-full max-w-xs`}
                        style={{
                            shadowColor: darkMode ? '#000' : '#333',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: darkMode ? 0.5 : 0.2,
                            shadowRadius: 20,
                            elevation: 10
                        }}
                    >
                        {selectedFriend && (
                            <>
                                {/* Friend info header with avatar - continuing from where it was cut off */}
                                <View className={`px-5 py-5 ${darkMode ? 'bg-primary-900/30' : 'bg-primary-50'} items-center`}>
                                    <Image
                                        source={{ uri: selectedFriend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.user_name)}` }}
                                        className="h-20 w-20 rounded-full border-4 border-white dark:border-gray-700 mb-3"
                                        style={{
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 6,
                                            elevation: 5
                                        }}
                                    />
                                    <Text className={`font-montserrat-bold text-xl ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {selectedFriend.user_name}
                                        {selectedFriend.premium_status && (
                                            <Text className="text-amber-500"> ★</Text>
                                        )}
                                    </Text>
                                    <View className="flex-row items-center mt-1">
                                        <View className={isRecentlyActive(selectedFriend.lastActive) ? "h-2.5 w-2.5 bg-green-500 rounded-full mr-2" : "hidden"} />
                                        <Text className={`font-montserrat-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {formatLastActive(selectedFriend.lastActive)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Menu options */}
                                <View className="px-1 py-1">
                                    <TouchableOpacity
                                        className={`flex-row items-center mx-2 px-4 py-3.5 rounded-xl active:bg-gray-100 dark:active:bg-gray-700`}
                                        onPress={() => handleMessageFriend(selectedFriend.user_id, selectedFriend.user_name)}
                                    >
                                        <View className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-full mr-3">
                                            <MessageCircle size={20} color={darkMode ? "#86EFAC" : "#22C55E"} />
                                        </View>
                                        <View>
                                            <Text className={`${darkMode ? 'text-white' : 'text-gray-800'} font-montserrat-semibold text-base`}>Message</Text>
                                            <Text className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular text-xs`}>
                                                Send a private message
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className={`flex-row items-center mx-2 px-4 py-3.5 rounded-xl active:bg-gray-100 dark:active:bg-gray-700`}
                                        onPress={() => handleViewProfile(selectedFriend.user_id, selectedFriend.user_name)}
                                    >
                                        <View className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
                                            <User size={20} color={darkMode ? "#60A5FA" : "#3B82F6"} />
                                        </View>
                                        <View>
                                            <Text className={`${darkMode ? 'text-white' : 'text-gray-800'} font-montserrat-semibold text-base`}>View Profile</Text>
                                            <Text className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular text-xs`}>
                                                See detailed information
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <View className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1" />

                                <View className="px-1 py-1">
                                    <TouchableOpacity
                                        className={`flex-row items-center mx-2 px-4 py-3.5 rounded-xl active:bg-red-50 dark:active:bg-red-900/20`}
                                        onPress={() => handleRemoveFriend(selectedFriend.user_id)}
                                    >
                                        <View className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
                                            <UserX size={20} color={darkMode ? "#F87171" : "#EF4444"} />
                                        </View>
                                        <View>
                                            <Text className={`${darkMode ? "text-red-300" : "text-red-500"} font-montserrat-semibold text-base`}>Remove Friend</Text>
                                            <Text className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular text-xs`}>
                                                Remove from your friends list
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className={`flex-row items-center mx-2 px-4 py-3.5 rounded-xl active:bg-red-50 dark:active:bg-red-900/20 mb-2`}
                                        onPress={() => handleBlockUser(selectedFriend.user_id)}
                                    >
                                        <View className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full mr-3">
                                            <Shield size={20} color={darkMode ? "#F87171" : "#EF4444"} />
                                        </View>
                                        <View>
                                            <Text className={`${darkMode ? "text-red-300" : "text-red-500"} font-montserrat-semibold text-base`}>Block User</Text>
                                            <Text className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} font-montserrat-regular text-xs`}>
                                                Prevent any contact
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Cancel button */}
                                <TouchableOpacity
                                    className={`w-full py-3.5 mt-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} items-center`}
                                    onPress={() => setMenuVisible(false)}
                                >
                                    <Text className={`font-montserrat-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </MotiView>
                </TouchableOpacity>
            </Modal>
        </MotiView>
    );
};

// Helper function to format last active time
const formatLastActive = (timestamp: string): string => {
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
const isRecentlyActive = (timestamp: string): boolean => {
    if (!timestamp) return false;

    const lastActive = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    return diffMins < 15;
};

// Helper function to format request time
const formatRequestTime = (timestamp: string): string => {
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