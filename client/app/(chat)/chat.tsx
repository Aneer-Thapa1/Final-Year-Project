import { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Plus, Users, MessageCircle, ArrowLeft, Bot } from 'lucide-react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';

// Import components
import CreateGroupModal from '../../components/GroupModal';

// Import services
import {
    createGroupChat,
    createDirectChat,
    useChatRooms,
    getPotentialChatRecipients
} from '../../services/chatServices';

export default function ChatScreen() {
    const navigation = useNavigation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Use custom hook for chat rooms with fallback empty array
    const { chatRooms = [], loading: isLoading, error, refetch } = useChatRooms();

    // State management
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showSearch, setShowSearch] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingFriends, setLoadingFriends] = useState(true);

    // Group modal state
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Fetch friends using the actual API
    const fetchFriends = useCallback(async () => {
        try {
            setLoadingFriends(true);

            // Use the actual API call from your services
            const response = await getPotentialChatRecipients();

            if (response && response.success && response.data) {
                // Add isOnline property to each friend based on lastActive time
                const friendsWithStatus = Array.isArray(response.data)
                    ? response.data.map(friend => ({
                        ...friend,
                        // If isOnline isn't already set, calculate it from lastActive
                        isOnline: friend.isOnline !== undefined
                            ? friend.isOnline
                            : isRecentlyActive(friend.lastActive)
                    }))
                    : [];

                setFriends(friendsWithStatus);
            } else {
                setFriends([]);
                console.warn('Invalid response from getPotentialChatRecipients');
            }
        } catch (error) {
            console.error('Error fetching friends:', error);
            Alert.alert('Error', 'Could not fetch friends');
            setFriends([]);
        } finally {
            setLoadingFriends(false);
        }
    }, []);

    // Handle refresh (pull-to-refresh)
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([refetch(), fetchFriends()]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refetch, fetchFriends]);

    // Initial data fetch
    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // Filter active users safely
    const activeUsers = (friends || []).filter(friend =>
        friend.isOnline || isRecentlyActive(friend.lastActive)
    );

    // Filter chat rooms based on search and active tab - with safety checks
    const filteredRooms = (chatRooms || []).filter(room => {
        // Filter by search query
        if (searchQuery.trim() !== '') {
            if (room.type === 'DM') {
                // Use displayName if available, otherwise find it from participants
                const roomName = room.displayName ||
                    (room.participants?.find(p => p.user_id !== 1)?.user?.user_name || '');
                return roomName.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return (room.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            }
        }

        // Filter by tab
        if (activeTab === 'direct') {
            return room.type === 'DM';
        } else if (activeTab === 'groups') {
            return room.type === 'GROUP';
        }

        return true; // 'all' tab
    });

    // Open group creation modal
    const handleOpenGroupModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowGroupModal(true);
    };

    // Handle creating a new group chat
    const handleCreateGroup = async (groupData) => {
        try {
            setCreatingGroup(true);

            const newGroup = await createGroupChat({
                name: groupData.name,
                description: groupData.description,
                participants: groupData.participants,
                avatar: groupData.avatar,
                is_private: false
            });

            // Refresh chat rooms
            await refetch();

            // Success feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Close the modal
            setShowGroupModal(false);

            // Navigate to the new group chat
            if (newGroup && newGroup.data) {
                router.push({
                    pathname: `/(chat)/${newGroup.data.room_id}`,
                    params: {
                        name: groupData.name,
                        isDirect: 'false'
                    }
                });
            }
        } catch (error) {
            console.error('Group creation error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to create group chat');
        } finally {
            setCreatingGroup(false);
        }
    };

    // Start a direct chat with a user using actual API
    const startDirectChat = async (userId) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const response = await createDirectChat(userId);
            if (response && response.success && response.data) {
                router.push({
                    pathname: `/(chat)/${response.data.room_id}`,
                    params: {
                        name: response.data.displayName || '',
                        isDirect: 'true'
                    }
                });
            }
        } catch (error) {
            console.error('Error creating direct chat:', error);
            Alert.alert('Error', 'Could not start chat');
        }
    };

    // Handle tap on active user
    const handleActiveTap = (userId) => {
        startDirectChat(userId);
    };

    // Navigate to Mindful AI chatbot
    const navigateToChatbot = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/chatbot');
    };

    // Render chat rooms list with Mindful AI at top
    const renderChatRooms = () => {
        if (isLoading && !refreshing && !chatRooms.length) {
            return (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#93C5FD" : "#3B82F6"} />
                    <Text className={`mt-4 font-montserrat ${isDark ? 'text-white' : 'text-black'}`}>
                        Loading chats...
                    </Text>
                </View>
            );
        }

        if (error && !chatRooms.length && !refreshing) {
            return (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className={`text-center mb-4 font-montserrat-medium ${isDark ? 'text-white' : 'text-black'}`}>
                        {error || 'Could not load chats. Please try again.'}
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-500 px-6 py-3 rounded-xl"
                        onPress={refetch}
                    >
                        <Text className="text-white font-montserrat-medium">Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <FlatList
                data={!searchQuery.trim() ? [{isChatbot: true}, ...filteredRooms] : filteredRooms}
                keyExtractor={item => item.isChatbot ? 'chatbot' : item.room_id?.toString() || Math.random().toString()}
                renderItem={({ item, index }) => {
                    // Special render for Mindful AI chatbot
                    if (item.isChatbot) {
                        return (
                            <MotiView
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', delay: 100, duration: 300 }}
                            >
                                <TouchableOpacity
                                    className={`flex-row px-4 py-3 mx-3 mb-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} border-2 border-primary-500`}
                                    onPress={navigateToChatbot}
                                    activeOpacity={0.7}
                                >
                                    {/* Chatbot Avatar */}
                                    <View className="relative mr-3">
                                        <View className="h-14 w-14 rounded-full items-center justify-center bg-primary-500">
                                            <Bot size={24} color="white" />
                                        </View>
                                    </View>

                                    {/* Chatbot Details */}
                                    <View className="flex-1 justify-center">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text
                                                className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                numberOfLines={1}
                                            >
                                                Mindful AI
                                            </Text>
                                            <View className="bg-green-500 rounded-full px-2 py-0.5">
                                                <Text className="text-xs text-white font-montserrat-medium">
                                                    Online
                                                </Text>
                                            </View>
                                        </View>

                                        <Text
                                            className={`text-sm ${isDark ? 'text-gray-400 font-montserrat' : 'text-gray-600 font-montserrat'}`}
                                            numberOfLines={1}
                                        >
                                            Chat with your personal habit assistant
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </MotiView>
                        );
                    }

                    // Regular chat rooms
                    return (
                        <MotiView
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', delay: 100 + index * 50, duration: 300 }}
                        >
                            <TouchableOpacity
                                className={`flex-row px-4 py-3 mx-3 mb-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                                onPress={() => router.push({
                                    pathname: `/(chat)/${item.room_id}`,
                                    params: {
                                        name: getRoomDisplayName(item) || '',
                                        isDirect: item.type === 'DM' ? 'true' : 'false'
                                    }
                                })}
                                activeOpacity={0.7}
                            >
                                {/* Chat Room Avatar with Unread Badge */}
                                <View className="relative mr-3">
                                    {getRoomAvatar(item) ? (
                                        <Image
                                            source={{ uri: getRoomAvatar(item) }}
                                            className="h-14 w-14 rounded-full"
                                        />
                                    ) : (
                                        <View className={`h-14 w-14 rounded-full items-center justify-center ${
                                            item.type === 'GROUP' ? 'bg-amber-500' : 'bg-primary-500'
                                        }`}>
                                            <Text className="text-white text-xl font-montserrat-bold">
                                                {item.type === 'GROUP'
                                                    ? (item.name?.[0] || 'G')
                                                    : (getRoomDisplayName(item)[0] || 'U')
                                                }
                                            </Text>
                                        </View>
                                    )}

                                    {/* Unread message badge */}
                                    {(item.unreadCount && item.unreadCount > 0) ? (
                                        <View className="absolute -top-1 -right-1 bg-secondary-500 rounded-full min-w-5 h-5 items-center justify-center px-1">
                                            <Text className="text-white text-xs font-montserrat-bold">
                                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Chat Room Details */}
                                <View className="flex-1 justify-center">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text
                                            className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                                            numberOfLines={1}
                                        >
                                            {getRoomDisplayName(item)}
                                        </Text>
                                        <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {formatMessageTime(item.lastMessage?.createdAt)}
                                        </Text>
                                    </View>

                                    <Text
                                        className={`text-sm ${
                                            item.unreadCount > 0
                                                ? isDark
                                                    ? 'text-white font-montserrat-semibold'
                                                    : 'text-gray-900 font-montserrat-semibold'
                                                : isDark
                                                    ? 'text-gray-400 font-montserrat'
                                                    : 'text-gray-600 font-montserrat'
                                        }`}
                                        numberOfLines={1}
                                    >
                                        {item.lastMessage?.content || 'No messages yet'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </MotiView>
                    );
                }}
                ListEmptyComponent={searchQuery.trim() ? renderEmptyState() : null}
                contentContainerStyle={{
                    paddingBottom: 80,
                    flexGrow: 1 // Makes sure empty state is centered
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[isDark ? "#93C5FD" : "#3B82F6"]}
                        tintColor={isDark ? "#93C5FD" : "#3B82F6"}
                    />
                }
            />
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View className="flex-1 items-center justify-center px-6 py-10">
            <Text className={`text-lg font-montserrat-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                No conversations found
            </Text>
            <Text className={`text-sm text-center font-montserrat mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {searchQuery
                    ? 'Try a different search term'
                    : 'Start a new chat to begin messaging with your friends'}
            </Text>

            <TouchableOpacity
                className="bg-primary-500 py-3 px-6 rounded-xl shadow-sm"
                onPress={handleOpenGroupModal}
            >
                <Text className="text-white font-montserrat-semibold">
                    Start New Chat
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Helper functions
    const getRoomDisplayName = (room) => {
        // Use displayName property if it exists (from backend)
        if (room.displayName) {
            return room.displayName;
        }

        // Fall back to original logic if displayName isn't provided
        if (room.type === 'DM') {
            // Find the other user in the chat (not the current user)
            const otherParticipant = room.participants?.find(p => p.user_id !== 1);
            return otherParticipant?.user?.user_name || 'User';
        }
        return room.name || 'Group';
    };

    const getRoomAvatar = (room) => {
        if (room.avatar) {
            return room.avatar;
        }

        if (room.type === 'DM') {
            const otherParticipant = room.participants?.find(p => p.user_id !== 1);
            return otherParticipant?.user?.avatar;
        }
        return null;
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <View className="flex-1">
                {/* Header */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                    className={`${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                >
                    <View className="flex-row items-center justify-between px-4 py-3">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="mr-4"
                        >
                            <ArrowLeft
                                size={24}
                                color={isDark ? 'white' : 'black'}
                            />
                        </TouchableOpacity>
                        <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Chats
                        </Text>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={() => setShowSearch(!showSearch)}
                            >
                                <Search size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={handleOpenGroupModal}
                            >
                                <Users size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={handleOpenGroupModal}
                            >
                                <MessageCircle size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search bar */}
                    {showSearch && (
                        <MotiView
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 50 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            className="mx-4 mb-3 flex-row items-center px-3 rounded-xl
                      bg-primary-500/10"
                        >
                            <Search size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            <TextInput
                                className={`flex-1 py-3 px-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-800'}`}
                                placeholder="Search chats..."
                                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </MotiView>
                    )}

                    {/* Tabs */}
                    <View className="flex-row px-4 mb-2">
                        {['all', 'direct', 'groups'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`py-2 px-4 mr-2 rounded-full ${
                                    activeTab === tab
                                        ? 'bg-primary-500'
                                        : `${isDark ? 'bg-gray-700' : 'bg-gray-100'}`
                                }`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text className={`font-montserrat-medium ${
                                    activeTab === tab
                                        ? 'text-white'
                                        : `${isDark ? 'text-gray-300' : 'text-gray-600'}`
                                }`}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </MotiView>

                {/* Active Users */}
                {activeUsers.length > 0 && !searchQuery && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        delay={300}
                        className="mt-4"
                    >
                        <Text className={`text-base font-montserrat-semibold px-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Active Now
                        </Text>
                        <FlatList
                            horizontal
                            data={activeUsers}
                            keyExtractor={item => item.user_id?.toString() || Math.random().toString()}
                            renderItem={({ item }) => (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', delay: 200 }}
                                    className="items-center mr-4 w-16"
                                >
                                    <TouchableOpacity
                                        onPress={() => handleActiveTap(item.user_id)}
                                        className="items-center"
                                    >
                                        <View className="relative">
                                            <Image
                                                source={{
                                                    uri: item.avatar ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name || 'User')}`
                                                }}
                                                className="h-14 w-14 rounded-full"
                                            />
                                            <View className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                                        </View>
                                        <Text
                                            className={`text-xs font-montserrat mt-1 text-center ${
                                                isDark ? 'text-gray-300' : 'text-gray-700'
                                            }`}
                                            numberOfLines={1}
                                        >
                                            {item.user_name}
                                        </Text>
                                    </TouchableOpacity>
                                </MotiView>
                            )}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        />
                    </MotiView>
                )}

                {/* Chat Rooms */}
                <View className="flex-1 mt-4">
                    <Text className={`text-base font-montserrat-semibold px-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Messages
                    </Text>

                    {renderChatRooms()}
                </View>

                {/* Floating New Chat Button */}
                <TouchableOpacity
                    className="absolute bottom-5 right-5"
                    onPress={handleOpenGroupModal}
                    activeOpacity={0.9}
                >
                    <View className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg">
                        <Plus size={24} color="#ffffff" />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Create Group Modal */}
            <CreateGroupModal
                visible={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                friends={friends}
                onCreateGroup={handleCreateGroup}
                loading={creatingGroup}
            />
        </SafeAreaView>
    );
}

// Helper function to determine if a user was recently active
function isRecentlyActive(lastActive) {
    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    return now - lastActiveTime < fifteenMinutes;
}

// Helper function to format message timestamp
function formatMessageTime(timestamp) {
    if (!timestamp) return '';

    const messageTime = new Date(timestamp);
    const now = new Date();

    // Today, show time only
    if (messageTime.toDateString() === now.toDateString()) {
        return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageTime.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    // Within a week, show day name
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    if (messageTime > weekAgo) {
        return messageTime.toLocaleDateString([], { weekday: 'short' });
    }

    // Otherwise show date
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
}