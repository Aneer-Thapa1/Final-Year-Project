// app/(chat)/[id].tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchChatMessages, sendMessage, setActiveRoom, markMessagesAsRead } from '../../store/slices/chatSlice';
import { MotiView } from 'moti';
import { Send, ArrowLeft, MoreVertical, Image as ImageIcon, Mic, PlusCircle, Camera, Smile } from 'lucide-react-native';
import { debounce } from 'lodash';
import { useColorScheme } from 'nativewind';
import MessageBubble from '../../components/MessageBubble';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import socketService from '../../store/slices/socketService';

export default function ChatRoomScreen() {
    const params = useLocalSearchParams();
    const roomId = parseInt(params.id as string);
    const roomName = params.name as string;
    const isDirect = params.isDirect === 'true';
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { messages, typingUsers, loading, sending } = useSelector((state: RootState) => state.chat);
    const { user } = useSelector((state: RootState) => state.user);

    // Get current user ID - this is crucial for message alignment
    const currentUserId = user?.user?.user_id;

    // Debug log to verify currentUserId
    useEffect(() => {
        console.log('Current user ID:', currentUserId);
    }, [currentUserId]);

    const [message, setMessage] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const bottomSheetAnim = useRef(new Animated.Value(0)).current;

    const roomMessages = messages[roomId] || [];
    const roomTypingUsers = typingUsers[roomId] || [];

    // Initialize and connect socket
    useEffect(() => {
        const initSocket = async () => {
            const socket = await socketService.initializeSocket();
            setSocketConnected(!!socket?.connected);

            if (socket?.connected) {
                // Join the chat room via socket
                socketService.joinRoom(roomId);
                console.log('Joining room:', roomId);
            }
        };

        initSocket();

        // Check socket status periodically
        const socketCheckInterval = setInterval(() => {
            const socket = socketService.getSocket();
            setSocketConnected(!!socket?.connected);
        }, 5000);

        // Clean up on unmount
        return () => {
            clearInterval(socketCheckInterval);
            socketService.leaveRoom(roomId);
        };
    }, [roomId]);

    // Animation for attachment options
    const toggleAttachmentOptions = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowAttachmentOptions(!showAttachmentOptions);
        Animated.timing(bottomSheetAnim, {
            toValue: showAttachmentOptions ? 0 : 1,
            duration: 200,
            useNativeDriver: true
        }).start();
    };

    const attachmentOptionsTranslateY = bottomSheetAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0]
    });

    // Monitor keyboard visibility
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
                setShowAttachmentOptions(false);
                if (roomMessages.length > 0) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, [roomMessages.length]);

    useEffect(() => {
        // Set active room, fetch messages, and mark as read when screen loads
        dispatch(setActiveRoom(roomId));
        dispatch(fetchChatMessages(roomId));
        dispatch(markMessagesAsRead(roomId));

        // Clean up when screen unloads
        return () => {
            dispatch(setActiveRoom(null));
        };
    }, [dispatch, roomId]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (roomMessages.length > 0 && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
        }
    }, [roomMessages]);

    // Handle typing indicator with debounce
    const debouncedStopTyping = useCallback(
        debounce(() => {
            socketService.emitStopTyping(roomId);
        }, 2000),
        [roomId]
    );

    const handleMessageChange = (text: string) => {
        setMessage(text);
        if (text.trim()) {
            socketService.emitTyping(roomId);
            debouncedStopTyping();
        }
    };

    const handleSendMessage = () => {
        if (!message.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        dispatch(sendMessage({
            roomId,
            content: message.trim(),
        }));

        setMessage('');
        debouncedStopTyping.cancel();
        socketService.emitStopTyping(roomId);

        // Make sure we scroll to the bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleScrollToEnd = () => {
        if (roomMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    };

    const handleBackPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    // Render typing indicators
    const renderTypingIndicator = () => {
        if (roomTypingUsers.length === 0) return null;

        const names = roomTypingUsers.map(user => user.userName);
        let typingText = '';

        if (names.length === 1) {
            typingText = `${names[0]} is typing...`;
        } else if (names.length === 2) {
            typingText = `${names[0]} and ${names[1]} are typing...`;
        } else {
            typingText = `${names.length} people are typing...`;
        }

        return (
            <View className="px-4 py-1">
                <Text className={`text-xs italic ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat`}>
                    {typingText}
                </Text>
            </View>
        );
    };

    // Custom timestamp display for the chat
    const renderDateSeparator = (date: string) => {
        return (
            <View className="items-center my-3">
                <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <Text className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {date}
                    </Text>
                </View>
            </View>
        );
    };

    // Process messages to add date separators
    const processedMessages = useMemo(() => {
        const result = [];
        let currentDate = '';

        roomMessages.forEach((msg) => {
            // Extract date from message timestamp
            const messageDate = new Date(msg.createdAt).toLocaleDateString();

            // Add date separator if this is a new date
            if (messageDate !== currentDate) {
                result.push({
                    type: 'date',
                    content: messageDate,
                    id: `date-${messageDate}`
                });
                currentDate = messageDate;
            }

            // Add the actual message
            result.push({
                type: 'message',
                content: msg,
                id: msg.message_id.toString()
            });
        });

        return result;
    }, [roomMessages]);

    // Function to check if a message is from the current user
    const isOwnMessage = (senderId) => {
        if (!currentUserId)
        {
            console.log(currentUserId)
            return false;
        }

        // Convert both to strings for comparison to handle both number and string types
        return String(senderId) === String(currentUserId);
    };

    return (
        <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {/* Header */}
            <View className={`px-4 py-4 flex-row items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}
                  style={{ paddingTop: insets.top > 0 ? insets.top : 16 }}>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={handleBackPress}
                        className={`mr-3 p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                        <ArrowLeft size={20} color={isDark ? "#E2E8F0" : "#1F2937"} />
                    </TouchableOpacity>

                    <View>
                        <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {roomName}
                        </Text>
                        {isDirect && (
                            <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {socketConnected ? 'Connected' : 'Reconnecting...'}
                            </Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                    <MoreVertical size={20} color={isDark ? "#E2E8F0" : "#1F2937"} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 0}
            >
                {/* Messages List */}
                {loading && roomMessages.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text className={`font-montserrat mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Loading messages...
                        </Text>
                    </View>
                ) : (
                    <MotiView className="flex-1" from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={processedMessages}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => {
                                if (item.type === 'date') {
                                    return renderDateSeparator(item.content);
                                } else {
                                    const msg = item.content;

                                    // Check if the message is from the current user
                                    const own = isOwnMessage(msg.sender_id);

                                    return (
                                        <MessageBubble
                                            message={msg}
                                            isOwn={own}
                                            isDark={isDark}
                                        />
                                    );
                                }
                            }}
                            onContentSizeChange={handleScrollToEnd}
                            onLayout={handleScrollToEnd}
                            contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12 }}
                            ListEmptyComponent={
                                <View className="flex-1 justify-center items-center p-6">
                                    <Text className={`text-lg font-montserrat-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        No messages yet
                                    </Text>
                                    <Text className={`text-sm text-center font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Send a message to start the conversation
                                    </Text>
                                </View>
                            }
                        />
                    </MotiView>
                )}

                {renderTypingIndicator()}

                {/* Message Input */}
                <View
                    className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}
                >
                    <View className="flex-row items-center px-3 py-2">
                        <TouchableOpacity
                            className={`p-2 mr-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                            onPress={toggleAttachmentOptions}
                        >
                            <PlusCircle size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        </TouchableOpacity>

                        <View className={`flex-1 flex-row items-center rounded-full px-3 py-1.5 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <TextInput
                                className={`flex-1 font-montserrat py-1 ${isDark ? 'text-white' : 'text-gray-900'}`}
                                value={message}
                                onChangeText={handleMessageChange}
                                placeholder="Message"
                                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                                multiline
                                maxLength={1000}
                                style={{ maxHeight: 100 }} // Limit height growth
                            />

                            <TouchableOpacity className="ml-1 mr-2">
                                <Smile size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>
                        </View>

                        {message.trim() ? (
                            <TouchableOpacity
                                className={`p-3 ml-1 rounded-full ${sending ? 'bg-primary-400' : 'bg-primary-500'}`}
                                onPress={handleSendMessage}
                                disabled={sending}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Send size={18} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity className={`p-3 ml-1 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                <Mic size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Attachment Options */}
                    <Animated.View
                        style={{
                            transform: [{ translateY: attachmentOptionsTranslateY }],
                            display: showAttachmentOptions ? 'flex' : 'none'
                        }}
                        className={`py-4 px-6 ${isDark ? 'bg-gray-800' : 'bg-white'} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                        <View className="flex-row justify-around">
                            <TouchableOpacity className="items-center">
                                <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'} items-center justify-center mb-1`}>
                                    <ImageIcon size={22} color="#3B82F6" />
                                </View>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center">
                                <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'} items-center justify-center mb-1`}>
                                    <Camera size={22} color="#8B5CF6" />
                                </View>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="items-center">
                                <View className={`w-12 h-12 rounded-full ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'} items-center justify-center mb-1`}>
                                    <Mic size={22} color="#F59E0B" />
                                </View>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Audio</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Bottom padding for iPhone */}
                    <View style={{ height: insets.bottom }} />
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}