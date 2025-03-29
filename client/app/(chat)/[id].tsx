import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    FlatList,
    Alert  // Added missing import
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import {
    ArrowLeft,
    Send,
    Info,
    MoreVertical,
    Phone,
    Video
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// Import services
import {
    getChatRoomDetails,
    getChatMessages,
    sendMessage,
    markMessagesAsRead,
    updateTypingStatus
} from '../../services/chatServices';

// Import store/socket related functionality if needed
import { useSelector } from 'react-redux';

export default function ChatDetailScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    // Get room ID and other params from the URL
    const params = useLocalSearchParams();
    const roomId = parseInt(params.id || "0");
    const roomName = params.name || 'Chat';
    const isDirect = params.isDirect === 'true';

    // State management
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [roomDetails, setRoomDetails] = useState(null);
    const [error, setError] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Store the current user ID in component state as a backup
    const [currentUserId, setCurrentUserId] = useState(null);

    // References
    const scrollViewRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const flatListRef = useRef(null);

    // Get socket connection status and user from Redux store
    const socketConnected = useSelector(state => state.chat?.socketConnected) || false;
    const currentUser = useSelector(state => state.user?.user);

    // Load initial data and set current user ID
    useEffect(() => {
        // If currentUser is available from Redux, store the ID in component state
        if (currentUser && currentUser.user.user_id) {
            setCurrentUserId(currentUser.user.user_id);
        } else {
            // Fallback user ID if not available from Redux
            setCurrentUserId(1); // Default user ID or fetch from another source
        }

        fetchRoomDetails();
        fetchMessages();

        // Mark messages as read when the chat is opened
        markAsRead();

        return () => {
            clearTypingTimeout();
        };
    }, [roomId, currentUser]);

    // Mark messages as read
    const markAsRead = async () => {
        try {
            await markMessagesAsRead(roomId);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    // Fetch room details
    const fetchRoomDetails = async () => {
        try {
            const response = await getChatRoomDetails(roomId);
            if (response && response.success && response.data) {
                setRoomDetails(response.data);
            }
        } catch (error) {
            console.error('Error fetching room details:', error);
            setError('Failed to load chat details');
        }
    };

    // Fetch messages
    const fetchMessages = async (nextPage = 1) => {
        try {
            setLoading(nextPage === 1);
            if (nextPage > 1) setLoadingMore(true);

            const response = await getChatMessages(roomId, { page: nextPage, limit: 20 });

            if (response && response.success && response.data) {
                if (nextPage === 1) {
                    setMessages(response.data);
                } else {
                    setMessages(prev => [...prev, ...response.data]);
                }

                setHasMore(response.data.hasMore);
                setPage(nextPage);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            setError('Failed to load messages');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Load more messages when scrolling up
    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            fetchMessages(page + 1);
        }
    };

    // Send a message
    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Clear input and typing status immediately for better UX
            const messageText = inputText;
            setInputText('');
            clearTypingTimeout();

            // Send typing stopped notification
            try {
                await updateTypingStatus(roomId, false);
            } catch (typingError) {
                console.error('Error updating typing status:', typingError);
            }

            // Send the actual message
            const response = await sendMessage(roomId, { content: messageText });

            if (response && response.success && response.data) {
                // Add the new message to the list
                // Note: You might not need this if you're using sockets and receiving the message that way
                setMessages(prev => [response.data, ...prev]);

                // Scroll to bottom
                if (flatListRef.current) {
                    flatListRef.current.scrollToOffset({ offset: 0, animated: true });
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert('Error', 'Failed to send message');
            // Restore the input text in case of error
            setInputText(messageText);
        }
    };

    // Handle typing status
    const handleInputChange = (text) => {
        setInputText(text);

        // Send typing status
        if (!isTyping) {
            setIsTyping(true);
            updateTypingStatus(roomId, true).catch(console.error);
        }

        // Clear previous timeout
        clearTypingTimeout();

        // Set new timeout
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            updateTypingStatus(roomId, false).catch(console.error);
        }, 3000);
    };

    const clearTypingTimeout = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    // Get other user details for direct messages
    const getOtherUser = () => {
        if (!roomDetails || !isDirect) return null;

        const otherParticipant = roomDetails.participants?.find(
            p => p.user_id !== currentUserId
        );

        return otherParticipant?.user;
    };

    const otherUser = getOtherUser();

    // Helper function to check if user was active in the last 15 minutes
    const isRecentlyActive = (timestamp) => {
        if (!timestamp) return false;

        const lastActive = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - lastActive.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        return diffMins < 15;
    };

    const isOtherUserOnline = otherUser && (otherUser.isOnline || isRecentlyActive(otherUser.lastActive));

    // Render functions
    const renderMessage = ({ item }) => {
        // Use the local state currentUserId which is more reliable
        const isMyMessage = item.sender?.user_id === currentUserId;

        // Safety check - if sender is missing, default to false
        if (!item.sender) {
            console.warn('Message is missing sender information', item);
            return null;
        }

        return (
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                className={`mx-4 my-1 max-w-[80%] ${isMyMessage ? 'self-end' : 'self-start'}`}
            >
                <View className={`rounded-2xl p-3 ${
                    isMyMessage
                        ? isDark ? 'bg-primary-600' : 'bg-primary-500'
                        : isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                    <Text className={`${
                        isMyMessage
                            ? 'text-white'
                            : isDark ? 'text-white' : 'text-gray-800'
                    } font-montserrat`}>
                        {item.content}
                    </Text>
                </View>

                <View className={`flex-row items-center mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat`}>
                        {formatMessageTime(item.createdAt)}
                    </Text>
                </View>
            </MotiView>
        );
    };

    // Format message time
    const formatMessageTime = (timestamp) => {
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
            return `Yesterday ${messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Within a week, show day name
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        if (messageTime > weekAgo) {
            return `${messageTime.toLocaleDateString([], { weekday: 'short' })} ${messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Otherwise show date
        return `${messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Header */}
            <View className={`px-4 py-2 flex-row items-center justify-between ${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 mr-2"
                    >
                        <ArrowLeft size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                    </TouchableOpacity>

                    <View className="flex-row items-center">
                        {/* Avatar or Group Icon */}
                        {roomDetails?.avatar ? (
                            <Image
                                source={{ uri: roomDetails.avatar }}
                                className="h-10 w-10 rounded-full"
                            />
                        ) : isDirect && otherUser?.avatar ? (
                            <Image
                                source={{ uri: otherUser.avatar }}
                                className="h-10 w-10 rounded-full"
                            />
                        ) : (
                            <View className={`h-10 w-10 rounded-full items-center justify-center ${
                                isDirect
                                    ? 'bg-primary-500'
                                    : 'bg-amber-500'
                            }`}>
                                <Text className="text-white text-lg font-montserrat-bold">
                                    {roomName ? roomName[0].toUpperCase() : isDirect ? 'C' : 'G'}
                                </Text>
                            </View>
                        )}

                        <View className="ml-3">
                            <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {roomName || (isDirect ? otherUser?.user_name : 'Group Chat')}
                            </Text>

                            {/* Online Status Indicator for Direct Messages */}
                            {isDirect && (
                                <View className="flex-row items-center">
                                    <View className={`h-2 w-2 rounded-full mr-1.5 ${
                                        socketConnected ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                    <Text className={`text-xs font-montserrat ${
                                        socketConnected
                                            ? isDark ? 'text-green-400' : 'text-green-600'
                                            : isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                        {socketConnected ? 'Online' : 'Offline'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View className="flex-row">
                    {isDirect && (
                        <>
                            <TouchableOpacity className="p-2">
                                <Phone size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>

                            <TouchableOpacity className="p-2">
                                <Video size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        className="p-2"
                        onPress={() => {
                            // Navigate to chat info/settings
                            router.push({
                                pathname: isDirect
                                    ? `/(chat)/profile/${otherUser?.user_id}`
                                    : `/(chat)/group/${roomId}`,
                                params: {
                                    name: roomName || ''
                                }
                            });
                        }}
                    >
                        <Info size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <View className={`px-4 py-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <Text className={`italic text-xs ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </Text>
                </View>
            )}

            {/* Message List */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#93C5FD" : "#3B82F6"} />
                    <Text className={`mt-3 ${isDark ? 'text-gray-300' : 'text-gray-600'} font-montserrat`}>
                        Loading messages...
                    </Text>
                </View>
            ) : error ? (
                <View className="flex-1 justify-center items-center px-4">
                    <Text className={`text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'} font-montserrat-medium`}>
                        {error}
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-500 px-6 py-3 rounded-xl"
                        onPress={() => fetchMessages()}
                    >
                        <Text className="text-white font-montserrat-medium">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.message_id?.toString() || Math.random().toString()}
                    contentContainerStyle={{ paddingVertical: 10 }}
                    inverted // Display newest messages at the bottom
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore && (
                        <View className="py-4 items-center">
                            <ActivityIndicator size="small" color={isDark ? "#93C5FD" : "#3B82F6"} />
                            <Text className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs font-montserrat`}>
                                Loading more...
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 70}
            >
                <MotiView
                    from={{ translateY: 50, opacity: 0 }}
                    animate={{ translateY: 0, opacity: 1 }}
                    transition={{ type: 'timing', duration: 350 }}
                    className={`p-2 border-t flex-row items-center ${
                        isDark
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                    }`}
                >
                    <View className={`flex-1 flex-row items-center px-3 py-2 rounded-full mr-2 ${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                        <TextInput
                            className={`flex-1 ${
                                isDark ? 'text-white' : 'text-gray-900'
                            } font-montserrat`}
                            placeholder="Type a message..."
                            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                            value={inputText}
                            onChangeText={handleInputChange}
                            multiline
                            maxLength={1000}
                        />
                    </View>

                    <TouchableOpacity
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                            !inputText.trim()
                                ? isDark ? 'bg-gray-700' : 'bg-gray-200'
                                : 'bg-primary-500'
                        }`}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Send
                            size={20}
                            color={!inputText.trim() ? (isDark ? "#9CA3AF" : "#6B7280") : "#FFFFFF"}
                        />
                    </TouchableOpacity>
                </MotiView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}