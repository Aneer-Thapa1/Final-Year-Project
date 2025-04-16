import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Switch,
    StatusBar,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { useSelector } from 'react-redux';

// Import custom components
import AddMembersModal from '../../components/AddMembersModal';

// Import services
import {
    getChatRoomDetails,
    getGroupChatParticipants,
    addGroupChatParticipants,
    removeGroupChatParticipants,
    updateChatRoom,
    getPotentialChatRecipients,
} from '../../services/chatServices';
import { API_BASE_URL} from '../../services/api'

const ChatInfoScreen = () => {
    // Get room ID from URL parameters
    const params = useLocalSearchParams();
    // Make sure roomId is either converted to a number or has a fallback
    const roomId = params.roomId ? parseInt(params.roomId) : 0;

    // Get color scheme from nativewind
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Get current user from Redux store
    const currentUser = useSelector((state) => state.user);
    const currentUserId = currentUser?.user_id || 0;

    // State management
    const [roomDetails, setRoomDetails] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [potentialMembers, setPotentialMembers] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState(null);

    // Modal states
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [fetchingFriends, setFetchingFriends] = useState(false);

    // Determine if current user is admin - with additional error checking
    const checkIfAdmin = useCallback((participantsList) => {
        if (!participantsList || !Array.isArray(participantsList) || !currentUserId) return false;
        const currentParticipant = participantsList.find(p => p.user_id === currentUserId);
        return currentParticipant?.isAdmin || false;
    }, [currentUserId]);

    // Fetch room details and participants with error handling
    const fetchRoomData = useCallback(async () => {
        if (!roomId) {
            setError('Invalid room ID');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Get room details
            const roomResponse = await getChatRoomDetails(roomId);
            if (roomResponse && roomResponse.success && roomResponse.data) {
                setRoomDetails(roomResponse.data);

                // For Direct Messages, we don't need participants
                if (roomResponse.data.type === 'DM') {
                    setLoading(false);
                    return;
                }

                // For Group chats, get participants
                const participantsResponse = await getGroupChatParticipants(roomId);
                if (participantsResponse && participantsResponse.success && participantsResponse.data) {
                    const participantsList = Array.isArray(participantsResponse.data)
                        ? participantsResponse.data
                        : [];

                    setParticipants(participantsList);
                    setIsAdmin(checkIfAdmin(participantsList));
                } else {
                    // Handle case when participants data is not in expected format
                    setParticipants([]);
                    setIsAdmin(false);
                }
            } else {
                setError('Failed to load room details');
            }
        } catch (err) {
            console.error('Error fetching room data:', err);
            setError('Failed to load chat information');
        } finally {
            setLoading(false);
        }
    }, [roomId, checkIfAdmin]);

    // Fetch potential members for adding to group - with error handling
    const fetchPotentialMembers = useCallback(async () => {
        try {
            setFetchingFriends(true);

            // Get all potential friends that can be added to the chat
            const response = await getPotentialChatRecipients();
            if (response && response.success && response.data) {
                // Ensure response.data is an array
                const friendsList = Array.isArray(response.data) ? response.data : [];

                // Filter out users already in the group
                const existingMemberIds = participants.map(p => p.user_id);
                const filteredMembers = friendsList.filter(user =>
                    user && user.user_id && !existingMemberIds.includes(user.user_id)
                );

                // Add isOnline property to each friend if not already set
                const friendsWithStatus = filteredMembers.map(friend => ({
                    ...friend,
                    isOnline: friend.isOnline !== undefined
                        ? friend.isOnline
                        : isRecentlyActive(friend.lastActive)
                }));

                setPotentialMembers(friendsWithStatus);
            } else {
                // Set to empty array if no data
                setPotentialMembers([]);
                console.warn('No friends data available');
            }
        } catch (err) {
            console.error('Error fetching potential members:', err);
            setPotentialMembers([]);
            Alert.alert('Error', 'Failed to load potential members');
        } finally {
            setFetchingFriends(false);
        }
    }, [participants]);

    // Effect for initial data load
    useEffect(() => {
        fetchRoomData();
    }, [fetchRoomData]);

    // Add participants to group with improved error handling
    const handleAddParticipants = async (userIds) => {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            Alert.alert('Error', 'No members selected');
            return;
        }

        try {
            setIsAdding(true);

            // Call API to add members
            const response = await addGroupChatParticipants(roomId, userIds);

            if (response && response.success) {
                // Refresh participants list
                await fetchRoomData();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `${userIds.length} ${userIds.length === 1 ? 'member' : 'members'} added successfully`);

                // Close the modal
                setShowAddMembersModal(false);
            } else {
                // Handle unsuccessful response
                Alert.alert('Error', response?.message || 'Failed to add members to the group');
            }
        } catch (err) {
            console.error('Error adding participants:', err);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to add members to the group');
        } finally {
            setIsAdding(false);
        }
    };

    // Open Add Members modal
    const handleOpenAddMembers = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Fetch potential members before opening modal
            await fetchPotentialMembers();

            // Open the modal
            setShowAddMembersModal(true);
        } catch (err) {
            console.error('Error preparing to add members:', err);
            Alert.alert('Error', 'Failed to load friends list');
        }
    };

    // Remove participant from group with additional checks
    const handleRemoveParticipant = async (userId) => {
        if (!userId) {
            Alert.alert('Error', 'Invalid user ID');
            return;
        }

        try {
            // Don't allow removing yourself if you're the only admin
            if (userId === currentUserId && isAdmin) {
                const otherAdmins = participants.filter(p => p.isAdmin && p.user_id !== currentUserId);
                if (otherAdmins.length === 0) {
                    Alert.alert(
                        'Cannot Remove Yourself',
                        'You are the only admin. Please assign another admin before leaving the group.'
                    );
                    return;
                }
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            Alert.alert(
                'Remove Member',
                'Are you sure you want to remove this member from the group?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                            setIsRemoving(true);
                            try {
                                const response = await removeGroupChatParticipants(roomId, [userId]);

                                if (response && response.success) {
                                    // If removing yourself, go back to chat list
                                    if (userId === currentUserId) {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        router.replace('/(tabs)/chats');
                                        return;
                                    }

                                    // Otherwise, refresh participants list
                                    await fetchRoomData();
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } else {
                                    // Handle unsuccessful response
                                    Alert.alert('Error', response?.message || 'Failed to remove member');
                                }
                            } catch (err) {
                                console.error('Error removing participant:', err);
                                Alert.alert('Error', 'Failed to remove member');
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            } finally {
                                setIsRemoving(false);
                            }
                        }
                    }
                ]
            );
        } catch (err) {
            console.error('Error initiating participant removal:', err);
        }
    };

    // Toggle admin status for a participant
    const toggleAdminStatus = async (userId, currentAdminStatus) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // This would require a specific API endpoint - placeholder for now
            Alert.alert(
                `${currentAdminStatus ? 'Remove' : 'Make'} Admin`,
                `Are you sure you want to ${currentAdminStatus ? 'remove' : 'make'} this user ${currentAdminStatus ? 'from' : 'an'} admin?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Confirm',
                        onPress: async () => {
                            // This is a placeholder - would need actual API implementation
                            Alert.alert('Feature Coming Soon', 'Admin status change will be available in the next update');
                        }
                    }
                ]
            );
        } catch (err) {
            console.error('Error toggling admin status:', err);
            Alert.alert('Error', 'Failed to update admin status');
        }
    };

    // Delete group or leave group
    const handleDeleteOrLeaveGroup = () => {
        if (isAdmin) {
            Alert.alert(
                'Delete Group',
                'Are you sure you want to delete this group? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                // This would require a specific API endpoint to delete the group
                                // Placeholder for now - would call the API and then navigate back
                                Alert.alert('Feature Coming Soon', 'Group deletion will be available in the next update');
                            } catch (err) {
                                console.error('Error deleting group:', err);
                                Alert.alert('Error', 'Failed to delete group');
                            }
                        }
                    }
                ]
            );
        } else {
            // Handle leaving group (same as removing self)
            handleRemoveParticipant(currentUserId);
        }
    };

    // Delete conversation (for DMs)
    const handleDeleteConversation = () => {
        Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation? This will remove the chat history.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // This would require a specific API endpoint to delete the conversation
                            // Placeholder for now - would call the API and then navigate back
                            Alert.alert('Feature Coming Soon', 'Conversation deletion will be available in the next update');
                        } catch (err) {
                            console.error('Error deleting conversation:', err);
                            Alert.alert('Error', 'Failed to delete conversation');
                        }
                    }
                }
            ]
        );
    };

    // Toggle notifications
    const toggleNotifications = () => {
        setNotificationsEnabled(!notificationsEnabled);
        // This would need an API call to update notification preferences in a real app
    };

    // Helper function to get other user in DM with error handling
    const getOtherUser = () => {
        if (!roomDetails || roomDetails.type !== 'DM') return null;

        // If otherParticipant is directly provided in room details
        if (roomDetails.otherParticipant) {
            return roomDetails.otherParticipant;
        }

        // Otherwise, find other user from participants
        if (roomDetails.participants && Array.isArray(roomDetails.participants)) {
            const otherParticipant = roomDetails.participants.find(
                p => p && p.user_id && p.user_id !== currentUserId
            );
            return otherParticipant?.user;
        }

        return null;
    };

    // Get the other user in a DM
    const otherUser = getOtherUser();

    // Helper function to check if user was active in the last 15 minutes
    const isRecentlyActive = (timestamp) => {
        if (!timestamp) return false;

        try {
            const lastActive = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - lastActive.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));

            return diffMins < 15;
        } catch (err) {
            console.error('Error checking last active time:', err);
            return false;
        }
    };

    // Check if other user is online
    const isOtherUserOnline = otherUser && (otherUser.isOnline || isRecentlyActive(otherUser.lastActive));

    // Progress stats for DM accountability partnership
    const dmProgress = {
        totalSessions: 42,
        sharedHabits: 3,
        longestStreak: 19,
        accountability: '92%'
    };

    // Sample shared habits for group
    const sharedHabits = [
        { id: 1, name: 'Morning Run', participants: 4, completedToday: 2, streak: 12 },
        { id: 2, name: 'Daily Meditation', participants: 3, completedToday: 3, streak: 8 },
        { id: 3, name: 'Healthy Meal', participants: 4, completedToday: 1, streak: 5 },
    ];

    // Determine if chat is Direct Message
    const isDirect = roomDetails && roomDetails.type === 'DM';

    // Get display name for chat room with error handling
    const getDisplayName = () => {
        if (!roomDetails) return 'Chat';

        if (isDirect && otherUser) {
            return otherUser.user_name || 'User';
        }

        return roomDetails.name || 'Group';
    };

    // Get avatar URL - proper handling like in chat screen
    const getAvatarUrl = () => {
        try {
            // If room has avatar, use it
            if (roomDetails?.avatar) {
                // Check if it's already a full URL
                if (roomDetails.avatar.startsWith('http://') || roomDetails.avatar.startsWith('https://')) {
                    return roomDetails.avatar;
                }

                // Generate full URL using API base URL
                return `${API_BASE_URL}${roomDetails.avatar}`;

            }

            // For direct messages, try to get other user's avatar
            if (isDirect && otherUser?.avatar) {
                // Check if it's already a full URL
                if (otherUser.avatar.startsWith('http://') || otherUser.avatar.startsWith('https://')) {
                    return otherUser.avatar;
                }

                // Generate full URL using API base URL
                return `${API_BASE_URL}${otherUser.avatar}`;
            }
        } catch (err) {
            console.error('Error getting avatar URL:', err);
        }

        // Fallback to generated avatar
        const name = getDisplayName();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C5CE7&color=fff`;
    };

    // Get avatar URL for a participant - same pattern as above
    const getParticipantAvatarUrl = (participant) => {
        try {
            if (!participant?.user?.avatar) {
                return `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.user?.user_name || 'User')}&background=6C5CE7&color=fff`;
            }

            if (participant.user.avatar.startsWith('http://') || participant.user.avatar.startsWith('https://')) {
                return participant.user.avatar;
            }

            return `${API_BASE_URL}${participant.user.avatar}`;
        } catch (err) {
            console.error('Error getting participant avatar URL:', err);
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(participant?.user?.user_name || 'User')}&background=6C5CE7&color=fff`;
        }
    };

    if (loading) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                    </TouchableOpacity>
                    <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Chat Info</Text>
                </View>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6C5CE7" />
                    <Text className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading chat info...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View className={`flex-row items-center px-4 py-3 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <Ionicons name="arrow-back" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                    </TouchableOpacity>
                    <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Chat Info</Text>
                </View>
                <View className="flex-1 justify-center items-center p-4">
                    <Text className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Something went wrong</Text>
                    <Text className={`text-center mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{error}</Text>
                    <TouchableOpacity
                        className="bg-indigo-600 py-3 px-6 rounded-xl"
                        onPress={fetchRoomData}
                    >
                        <Text className="text-white font-medium">Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#6C5CE7" />
                </TouchableOpacity>
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {isDirect ? 'Chat Info' : 'Group Info'}
                </Text>
                <TouchableOpacity>
                    <Feather name="settings" size={22} color="#6C5CE7" />
                </TouchableOpacity>
            </MotiView>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Profile Card */}
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 300, delay: 100 }}
                    className={`m-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                    <View className="items-center p-5">
                        <View className="relative mb-3">
                            <Image
                                source={{ uri: getAvatarUrl() }}
                                className="w-20 h-20 rounded-full"
                            />
                            <TouchableOpacity className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                                <Feather name="camera" size={14} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {isDirect ? (
                            // DM Info
                            <>
                                <Text className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {getDisplayName()}
                                </Text>
                                <Text className={`text-sm mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {isOtherUserOnline ? 'Online now' : otherUser?.lastActive ? `Last seen ${new Date(otherUser.lastActive).toLocaleString()}` : 'Offline'}
                                </Text>

                                <View className="flex-row mt-2.5">
                                    <View className="flex-row items-center px-2.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900">
                                        <FontAwesome5 name="user-friends" size={14} color="#00D9B3" />
                                        <Text className="text-xs font-medium ml-1 text-emerald-600 dark:text-emerald-400">Accountability Partner</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            // Group Info
                            <>
                                <Text className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {getDisplayName()}
                                </Text>
                                <Text className={`text-sm mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Created on {new Date(roomDetails?.createdAt || Date.now()).toLocaleDateString()}
                                </Text>
                                <Text className={`text-sm mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {participants.length} members
                                </Text>

                                {isAdmin && (
                                    <View className="flex-row mt-2.5">
                                        <View className="flex-row items-center px-2.5 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900">
                                            <Feather name="shield" size={14} color="#6C5CE7" />
                                            <Text className="text-xs font-medium ml-1 text-indigo-600 dark:text-indigo-400">You're an admin</Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {isDirect && (
                        <View className={`border-t p-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <Text className={`text-base font-semibold mb-2.5 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>Partnership Progress</Text>
                            <View className="flex-row justify-around px-1">
                                <View className="items-center">
                                    <Text className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{dmProgress.totalSessions}</Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-ins</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{dmProgress.sharedHabits}</Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shared Habits</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{dmProgress.longestStreak}</Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Best Streak</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="text-lg font-bold text-emerald-500">{dmProgress.accountability}</Text>
                                    <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Completion</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </MotiView>

                {/* Notifications Toggle */}
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: 150 }}
                    className={`mx-4 mb-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                    <View className="flex-row items-center justify-between p-4">
                        <View className="flex-row items-center">
                            <Feather
                                name={notificationsEnabled ? "bell" : "bell-off"}
                                size={20}
                                color={notificationsEnabled ? "#6C5CE7" : isDark ? '#999999' : '#6B7280'}
                            />
                            <Text className={`ml-4 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: '#767577', true: '#6C5CE7' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </MotiView>

                {/* Settings Options */}
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: 200 }}
                    className={`mx-4 mb-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                    {/* Media & Files */}
                    <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <View className="flex-row items-center">
                            <Feather name="image" size={20} color="#6C5CE7" />
                            <Text className={`ml-4 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Media & Files</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                    </TouchableOpacity>


                    {/* Scheduled Check-ins */}
                    <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <View className="flex-row items-center">
                            <Feather name="calendar" size={20} color="#6C5CE7" />
                            <Text className={`ml-4 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Scheduled Check-ins</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                    </TouchableOpacity>

                    {/* Group Goals (only for groups) */}
                    {!isDirect && (
                        <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <View className="flex-row items-center">
                                <Feather name="target" size={20} color="#6C5CE7" />
                                <Text className={`ml-4 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Group Goals</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                        </TouchableOpacity>
                    )}

                    {/* Privacy Settings / Partner Preferences */}
                    <TouchableOpacity className={`flex-row items-center justify-between p-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <View className="flex-row items-center">
                            <Feather name={!isDirect ? "lock" : "user"} size={20} color="#6C5CE7" />
                            <Text className={`ml-4 text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {!isDirect ? "Privacy Settings" : "Partner Preferences"}
                            </Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                    </TouchableOpacity>
                </MotiView>

                {/* Group Specific: Shared Habits */}
                {!isDirect && (
                    <>
                        <Text className={`text-xs font-semibold mx-4 mt-4 mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            SHARED HABITS
                        </Text>
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 300, delay: 250 }}
                            className={`mx-4 mb-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                        >
                            {sharedHabits.map((habit, index) => (
                                <TouchableOpacity
                                    key={habit.id.toString()}
                                    className={`flex-row items-center justify-between p-4 ${
                                        index !== sharedHabits.length - 1 ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}` : ''
                                    }`}
                                >
                                    <View>
                                        <Text className={`text-base font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>{habit.name}</Text>
                                        <View className="flex-row items-center">
                                            <View className="flex-row items-center mr-3">
                                                <Feather name="users" size={14} color={isDark ? '#999999' : '#6B7280'} />
                                                <Text className={`ml-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{habit.participants}</Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <FontAwesome5 name="fire" size={14} color="#6C5CE7" />
                                                <Text className={`ml-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{habit.streak}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View className="items-end">
                                        <Text className="text-sm font-medium mb-1 text-emerald-500">
                                            {habit.completedToday}/{habit.participants} Today
                                        </Text>
                                        <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                                    </View>
                                </TouchableOpacity>
                            ))}

                            <TouchableOpacity
                                className={`flex-row items-center justify-center p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                                activeOpacity={0.7}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    // Navigate to create habit screen with group ID
                                    Alert.alert('Feature Coming Soon', 'Group habit creation will be available in the next update');
                                }}
                            >
                                <Feather name="plus-circle" size={20} color="#6C5CE7" />
                                <Text className="text-base font-semibold ml-2 text-indigo-600 dark:text-indigo-400">Create New Group Habit</Text>
                            </TouchableOpacity>
                        </MotiView>
                    </>
                )}

                {/* Group Specific: Members */}
                {!isDirect && participants && participants.length > 0 && (
                    <>
                        <View className="flex-row justify-between items-center mx-4 mt-4 mb-2">
                            <Text className={`text-xs font-semibold tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>MEMBERS</Text>
                            {isAdmin && (
                                <TouchableOpacity
                                    className="flex-row items-center"
                                    onPress={handleOpenAddMembers}
                                >
                                    <Feather name="user-plus" size={18} color="#6C5CE7" />
                                    <Text className="text-sm font-semibold ml-1 text-indigo-600 dark:text-indigo-400">Invite</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 300, delay: 300 }}
                            className={`mx-4 mb-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                        >
                            {participants.map((participant, index) => (
                                <TouchableOpacity
                                    key={participant.user_id ? participant.user_id.toString() : index.toString()}
                                    className={`flex-row items-center justify-between p-3 ${
                                        index !== participants.length - 1 ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}` : ''
                                    }`}
                                    onPress={() => {
                                        // Show user profile or action menu
                                        if (isAdmin && participant.user_id !== currentUserId) {
                                            Alert.alert(
                                                'Member Options',
                                                `What would you like to do with ${participant.user?.user_name || 'this member'}?`,
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    {
                                                        text: participant.isAdmin ? 'Remove Admin' : 'Make Admin',
                                                        onPress: () => toggleAdminStatus(participant.user_id, participant.isAdmin)
                                                    },
                                                    {
                                                        text: 'Remove from Group',
                                                        style: 'destructive',
                                                        onPress: () => handleRemoveParticipant(participant.user_id)
                                                    }
                                                ]
                                            );
                                        }
                                    }}
                                >
                                    <View className="flex-row items-center">
                                        <View className="relative">
                                            <Image
                                                source={{ uri: getParticipantAvatarUrl(participant) }}
                                                className="w-10 h-10 rounded-full"
                                            />
                                            {participant.user?.isOnline && (
                                                <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 bg-emerald-500" />
                                            )}
                                        </View>

                                        <View className="ml-3">
                                            <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                {participant.user_id === currentUserId
                                                    ? 'You'
                                                    : participant.user?.user_name || 'User'}
                                            </Text>
                                            {participant.isAdmin && (
                                                <Text className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Admin</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View className="flex-row items-center">
                                        {participant.user?.streak && (
                                            <View className="flex-row items-center mr-4">
                                                <FontAwesome5 name="fire" size={12} color="#6C5CE7" />
                                                <Text className={`ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{participant.user.streak}</Text>
                                            </View>
                                        )}
                                        <Feather name="chevron-right" size={20} color={isDark ? '#999999' : '#6B7280'} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </MotiView>
                    </>
                )}

                {/* Danger Zone */}
                <Text className={`text-xs font-semibold mx-4 mt-4 mb-2 tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    DANGER ZONE
                </Text>
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300, delay: 350 }}
                    className={`mx-4 mb-4 rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                    {!isDirect ? (
                        <>
                            <TouchableOpacity
                                className={`flex-row items-center justify-between p-4 ${isAdmin ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}` : ''}`}
                                onPress={() => handleRemoveParticipant(currentUserId)}
                            >
                                <View className="flex-row items-center">
                                    <Feather name="log-out" size={20} color="#FF4757" />
                                    <Text className="ml-4 text-base text-red-500">Leave Group</Text>
                                </View>
                            </TouchableOpacity>

                            {isAdmin && (
                                <TouchableOpacity
                                    className="flex-row items-center justify-between p-4"
                                    onPress={handleDeleteOrLeaveGroup}
                                >
                                    <View className="flex-row items-center">
                                        <Feather name="trash-2" size={20} color="#FF4757" />
                                        <Text className="ml-4 text-base text-red-500">Delete Group</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <TouchableOpacity
                            className="flex-row items-center justify-between p-4"
                            onPress={handleDeleteConversation}
                        >
                            <View className="flex-row items-center">
                                <Feather name="trash-2" size={20} color="#FF4757" />
                                <Text className="ml-4 text-base text-red-500">Delete Conversation</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </MotiView>
            </ScrollView>

            {/* Add Members Modal */}
            {typeof AddMembersModal === 'function' && (
                <AddMembersModal
                    visible={showAddMembersModal}
                    onClose={() => setShowAddMembersModal(false)}
                    friends={potentialMembers || []}
                    onAddMembers={handleAddParticipants}
                    loading={isAdding}
                    fetchingFriends={fetchingFriends}
                    alreadyAddedIds={participants.map(p => p.user_id)}
                />
            )}
        </SafeAreaView>
    );
};

export default ChatInfoScreen;