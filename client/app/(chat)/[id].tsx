// app/(chat)/[id].tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchChatMessages, sendMessage, setActiveRoom, markMessagesAsRead, emitTyping, emitStopTyping } from '../../store/slices/chatSlice';
import { MotiView } from 'moti';
import { Send, ArrowLeft, MoreVertical, Image as ImageIcon, Mic } from 'lucide-react-native';
import { debounce } from 'lodash';
import { useColorScheme } from 'nativewind';
import MessageBubble from '../../components/MessageBubble';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatRoomScreen() {
    const params = useLocalSearchParams();
    const roomId = parseInt(params.id);
    const roomName = params.name as string;
    const isDirect = params.isDirect === 'true';

    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { messages, typingUsers, loading, sending } = useSelector((state: RootState) => state.chat);
    const { user } = useSelector((state: RootState) => state.user);

    const [message, setMessage] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const roomMessages = messages[roomId] || [];
    const roomTypingUsers = typingUsers[roomId] || [];

    console.log(roomId);

    useEffect(() => {
        // Set active room, fetch messages, and mark as read when screen loads
        dispatch(setActiveRoom(roomId));
        dispatch(fetchChatMessages({ roomId }));
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
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [roomMessages]);

    // Handle typing indicator with debounce
    const debouncedStopTyping = debounce(() => {
        dispatch(emitStopTyping(roomId));
    }, 2000);

    const handleMessageChange = (text: string) => {
        setMessage(text);
        if (text.trim()) {
            dispatch(emitTyping(roomId));
            debouncedStopTyping();
        }
    };

    const handleSendMessage = () => {
        if (!message.trim()) return;

        dispatch(sendMessage({
            roomId,
            content: message.trim(),
        }));

        setMessage('');
        debouncedStopTyping.cancel();
        dispatch(emitStopTyping(roomId));
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

    return (
        <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {/* Header */}
            <View className={`px-4 py-4 flex-row items-center justify-between border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  style={{ paddingTop: insets.top > 0 ? insets.top : 16 }}>
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <ArrowLeft size={24} color={isDark ? "#FFF" : "#000"} />
                    </TouchableOpacity>

                    <View>
                        <Text className={`text-xl font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {roomName}
                        </Text>
                        {isDirect && (
                            <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Online
                            </Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity>
                    <MoreVertical size={22} color={isDark ? "#FFF" : "#000"} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top > 20 ? 90 : 60) : 0}
            >
                {loading && roomMessages.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text className={`font-montserrat mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Loading messages...
                        </Text>
                    </View>
                ) : (
                    <MotiView className="flex-1" from={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={roomMessages}
                            keyExtractor={item => item.message_id.toString()}
                            renderItem={({ item }) => (
                                <MessageBubble
                                    message={item}
                                    isOwn={item.sender_id === user?.user_id}
                                    isDark={isDark}
                                />
                            )}
                            contentContainerStyle={{ paddingVertical: 16 }}
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

                <View
                    className={`flex-row items-center px-3 py-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}
                    style={{ paddingBottom: Math.max(insets.bottom, 8) }}
                >
                    <TouchableOpacity className="p-2 mx-1">
                        <ImageIcon size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    </TouchableOpacity>

                    <View className={`flex-1 flex-row items-center rounded-full px-4 py-2 mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <TextInput
                            className={`flex-1 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}
                            value={message}
                            onChangeText={handleMessageChange}
                            placeholder="Type a message..."
                            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                            multiline
                            maxLength={1000}
                        />
                    </View>

                    {message.trim() ? (
                        <TouchableOpacity
                            className={`p-3 mx-1 rounded-full ${sending ? 'bg-primary-400' : 'bg-primary-500'}`}
                            onPress={handleSendMessage}
                            disabled={sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Send size={20} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity className="p-3 mx-1">
                            <Mic size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}