// components/MessageBubble.tsx
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import { MotiView } from 'moti';

interface MessageProps {
    message_id: number;
    room_id: number;
    sender_id: number | string;
    content: string;
    message_type: string;
    createdAt: string;
    media_url?: string;
    sender?: {
        user_id: number | string;
        user_name: string;
        avatar?: string;
    };
}

interface MessageBubbleProps {
    message: MessageProps;
    isOwn: boolean;
    isDark: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, isDark }) => {
    // Format timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Check how long ago the message was sent
    const getMessageStatus = () => {
        const now = new Date();
        const messageTime = new Date(message.createdAt);
        const diffMs = now.getTime() - messageTime.getTime();
        const diffMins = Math.round(diffMs / 60000);

        // For demo purposes - in a real app, you'd use message status from your backend
        if (diffMins < 5) return 'sent';
        if (diffMins < 10) return 'delivered';
        return 'read';
    };

    const messageStatus = getMessageStatus();

    // Check if the message contains a URL
    const extractUrls = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    };

    const urls = extractUrls(message.content);
    const hasUrl = urls.length > 0;

    // Get animation properties based on message position
    const getAnimationProps = () => {
        if (isOwn) {
            return {
                from: { opacity: 0, scale: 0.9, translateX: 10 },
                animate: { opacity: 1, scale: 1, translateX: 0 },
                transition: { type: 'timing', duration: 250 }
            };
        } else {
            return {
                from: { opacity: 0, scale: 0.9, translateX: -10 },
                animate: { opacity: 1, scale: 1, translateX: 0 },
                transition: { type: 'timing', duration: 250 }
            };
        }
    };

    // Set styles based on message type and theme
    const getStyles = () => {
        // Base styles for own and other messages
        const baseStyles = {
            container: isOwn ? 'items-end' : 'items-start',
            bubble: isOwn
                ? `${isDark ? 'bg-primary-600' : 'bg-primary-500'} rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl shadow-sm`
                : `${isDark ? 'bg-gray-700' : 'bg-white'} rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-sm ${!isDark ? 'border border-gray-100' : ''}`,
            text: isOwn
                ? 'text-white'
                : isDark ? 'text-white' : 'text-gray-800',
            timestamp: isOwn
                ? 'text-white/70'
                : isDark ? 'text-gray-400' : 'text-gray-500'
        };

        // Enhanced styles for different message types
        if (message.message_type === 'IMAGE' || message.message_type === 'VIDEO') {
            return {
                ...baseStyles,
                bubble: `${baseStyles.bubble} overflow-hidden p-0.5`
            };
        }

        // Special styling for URL messages
        if (hasUrl) {
            return {
                ...baseStyles,
                bubble: `${baseStyles.bubble} border-l-4 ${isOwn ? 'border-l-white/30' : isDark ? 'border-l-primary-500' : 'border-l-primary-400'}`
            };
        }

        return baseStyles;
    };

    const styles = getStyles();
    const animProps = getAnimationProps();

    // Render status indicators for own messages
    const renderMessageStatus = () => {
        if (!isOwn) return null;

        return (
            <View className="ml-1 flex-row items-center">
                {messageStatus === 'sent' && <Clock size={11} color={isDark ? "#CBD5E1" : "#94A3B8"} />}
                {messageStatus === 'delivered' && <Check size={11} color={isDark ? "#CBD5E1" : "#94A3B8"} />}
                {messageStatus === 'read' && (
                    <View className="flex-row">
                        <Check size={11} color={isDark ? "#38BDF8" : "#0EA5E9"} style={{ marginRight: -4 }} />
                        <Check size={11} color={isDark ? "#38BDF8" : "#0EA5E9"} />
                    </View>
                )}
            </View>
        );
    };

    return (
        <MotiView
            className={`w-full mb-3 px-1 ${styles.container}`}
            {...animProps}
        >
            <Pressable>
                <View className="max-w-[85%] flex-row items-end">
                    {/* Avatar for received messages */}
                    {!isOwn && message.sender && (
                        <View className="mr-1 mb-1">
                            <Image
                                source={{ uri: message.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender.user_name)}&background=random` }}
                                className="h-7 w-7 rounded-full border border-gray-200"
                            />
                        </View>
                    )}

                    <View>
                        {/* Render message bubble based on content type */}
                        {message.message_type === 'IMAGE' ? (
                            <View className={styles.bubble}>
                                <Image
                                    source={{ uri: message.media_url }}
                                    className="h-52 w-52 rounded-xl"
                                    resizeMode="cover"
                                />
                                <View className="absolute bottom-2 right-2 flex-row items-center bg-black/60 px-2 py-0.5 rounded-full">
                                    <Text className="text-white text-xs font-montserrat mr-1">
                                        {formatTime(message.createdAt)}
                                    </Text>
                                    {isOwn && renderMessageStatus()}
                                </View>
                            </View>
                        ) : (
                            <View className={`${styles.bubble} p-3`}>
                                {/* Message content */}
                                <Text className={`font-montserrat text-[15px] ${styles.text}`}>
                                    {message.content}
                                </Text>

                                {/* URL preview (simplified) */}
                                {hasUrl && (
                                    <View className={`mt-2 rounded-lg overflow-hidden ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} p-2`}>
                                        <Text className={`font-montserrat-medium text-xs ${isDark ? 'text-blue-300' : 'text-blue-500'}`} numberOfLines={1}>
                                            {urls[0]}
                                        </Text>
                                    </View>
                                )}

                                {/* Timestamp and status */}
                                <View className="flex-row items-center justify-end mt-1.5">
                                    <Text className={`text-[10px] ${styles.timestamp} font-montserrat`}>
                                        {formatTime(message.createdAt)}
                                    </Text>
                                    {isOwn && renderMessageStatus()}
                                </View>
                            </View>
                        )}

                        {/* Sender name for group chats */}
                        {!isOwn && message.sender && message.sender.user_name && (
                            <Text className={`text-[10px] font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-1 mt-1`}>
                                {message.sender.user_name}
                            </Text>
                        )}
                    </View>
                </View>
            </Pressable>
        </MotiView>
    );
};

export default MessageBubble;