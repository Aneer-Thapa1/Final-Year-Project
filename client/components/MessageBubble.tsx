// components/chat/MessageBubble.tsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react-native';

interface MessageProps {
    message: {
        message_id: number;
        content: string;
        message_type: string;
        media_url?: string;
        createdAt: string;
        delivered_at?: string;
        read_at?: string;
        sender?: {
            user_name: string;
            avatar?: string;
        };
    };
    isOwn: boolean;
    isDark: boolean;
}

export default function MessageBubble({ message, isOwn, isDark }: MessageProps) {
    const formatTime = (timestamp: string) => {
        return format(new Date(timestamp), 'h:mm a');
    };

    // Render different types of messages
    const renderMessageContent = () => {
        switch (message.message_type) {
            case 'IMAGE':
                return (
                    <Image
                        source={{ uri: message.media_url }}
                        className="w-52 h-52 rounded-xl"
                        resizeMode="cover"
                    />
                );
            case 'SYSTEM':
                return (
                    <Text className={`text-sm italic ${isDark ? 'text-gray-400' : 'text-gray-500'} font-montserrat`}>
                        {message.content}
                    </Text>
                );
            default:
                return (
                    <Text className={`text-base font-montserrat ${isOwn
                        ? 'text-white'
                        : isDark ? 'text-white' : 'text-gray-900'}`}>
                        {message.content}
                    </Text>
                );
        }
    };

    // System messages have a different layout
    if (message.message_type === 'SYSTEM') {
        return (
            <View className="items-center my-2 px-4">
                {renderMessageContent()}
            </View>
        );
    }

    return (
        <View className={`max-w-[80%] mx-4 my-1 ${isOwn ? 'self-end' : 'self-start'}`}>
            {!isOwn && message.sender && (
                <Text className={`text-xs mb-1 font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {message.sender.user_name}
                </Text>
            )}

            <View className={`rounded-2xl p-3 ${isOwn
                ? 'bg-primary-500 rounded-tr-sm'
                : isDark
                    ? 'bg-gray-700 rounded-tl-sm'
                    : 'bg-white rounded-tl-sm border border-gray-200'}`}>
                {renderMessageContent()}
            </View>

            <View className={`flex-row items-center ${isOwn ? 'justify-end' : 'justify-start'} mt-1`}>
                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatTime(message.createdAt)}
                </Text>
                {isOwn && (
                    <View className="ml-1 flex-row items-center">
                        {message.read_at ? (
                            <CheckCheck size={12} color={isDark ? "#4F46E5" : "#4F46E5"} />
                        ) : message.delivered_at ? (
                            <CheckCheck size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        ) : (
                            <Check size={12} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}