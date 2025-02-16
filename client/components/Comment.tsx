import { View, Text, Image, TouchableOpacity, TextInput, useColorScheme, Pressable } from 'react-native';
import React, { useState, useRef } from 'react';
import { Heart, Reply, MoreHorizontal, Send, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

interface Reply {
    id: string;
    user: {
        name: string;
        avatar: string;
    };
    text: string;
    time: string;
    likes: number;
    isLiked?: boolean;
}

interface CommentProps {
    comment: {
        id: string;
        user: {
            name: string;
            avatar: string;
        };
        text: string;
        time: string;
        likes: number;
        isLiked?: boolean;
        replies?: Reply[];
    };
    depth?: number;
    onReply?: (commentId: string, text: string) => void;
    onLike?: (commentId: string) => void;
}

const MAX_NESTING_DEPTH = 3;

const Comment = ({ comment, depth = 0, onReply, onLike }: CommentProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const inputRef = useRef<TextInput>(null);

    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(false);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLiked(!isLiked);
        onLike?.(comment.id);

        // Like animation will be handled by MotiView
    };

    const handleReply = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowReplyInput(!showReplyInput);
        if (!showReplyInput) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const submitReply = () => {
        if (replyText.trim()) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onReply?.(comment.id, replyText);
            setReplyText('');
            setShowReplyInput(false);
        }
    };

    const toggleReplies = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowReplies(!showReplies);
    };

    return (
        <View className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 dark:border-gray-800 pl-4' : ''}`}>
            {/* Main Comment */}
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                className={`mb-3 ${depth > 0 ? 'mt-3' : ''}`}
            >
                {/* User Info and Comment */}
                <View className="flex-row space-x-3">
                    {/* Avatar */}
                    <MotiView
                        from={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', delay: 150 }}
                    >
                        <Image
                            source={{ uri: comment.user.avatar }}
                            className="w-10 h-10 rounded-full"
                        />
                    </MotiView>

                    {/* Comment Content */}
                    <View className="flex-1">
                        {/* Comment Bubble */}
                        <View className={`rounded-2xl p-3 ${
                            isDark ? 'bg-theme-card-dark' : 'bg-theme-input'
                        }`}>
                            {/* Username and Options */}
                            <View className="flex-row items-center justify-between mb-1">
                                <Text className={`font-semibold ${
                                    isDark ? 'text-theme-text-primary-dark' : 'text-gray-900'
                                }`}>
                                    {comment.user.name}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIsOptionsVisible(!isOptionsVisible);
                                    }}
                                    className="p-1"
                                >
                                    <MoreHorizontal
                                        size={16}
                                        color={isDark ? '#94A3B8' : '#6B7280'}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Comment Text */}
                            <Text className={`text-[15px] ${
                                isDark ? 'text-theme-text-secondary-dark' : 'text-gray-700'
                            }`}>
                                {comment.text}
                            </Text>
                        </View>

                        {/* Options Menu */}
                        <AnimatePresence>
                            {isOptionsVisible && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute right-0 top-12 z-50"
                                >
                                    <BlurView
                                        intensity={isDark ? 30 : 70}
                                        className={`rounded-xl overflow-hidden ${
                                            isDark ? 'bg-gray-800/90' : 'bg-white/90'
                                        }`}
                                    >
                                        <View className="p-2">
                                            <Pressable className="px-4 py-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-700">
                                                <Text className={isDark ? 'text-white' : 'text-gray-800'}>
                                                    Copy text
                                                </Text>
                                            </Pressable>
                                            <Pressable className="px-4 py-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-700">
                                                <Text className="text-red-500">
                                                    Report
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </BlurView>
                                </MotiView>
                            )}
                        </AnimatePresence>

                        {/* Actions Row */}
                        <View className="flex-row items-center mt-2 space-x-5">
                            <Text className={`text-sm ${
                                isDark ? 'text-theme-text-muted-dark' : 'text-gray-500'
                            }`}>
                                {comment.time}
                            </Text>

                            {/* Like Button */}
                            <MotiView
                                animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                            >
                                <TouchableOpacity
                                    onPress={handleLike}
                                    className="flex-row items-center space-x-1"
                                >
                                    <Heart
                                        size={16}
                                        color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                        fill={isLiked ? '#7C3AED' : 'none'}
                                    />
                                    <Text className={`text-sm font-medium ${
                                        isLiked
                                            ? 'text-primary-500'
                                            : (isDark ? 'text-theme-text-muted-dark' : 'text-gray-500')
                                    }`}>
                                        {comment.likes + (isLiked ? 1 : 0)}
                                    </Text>
                                </TouchableOpacity>
                            </MotiView>

                            {/* Reply Button */}
                            {depth < MAX_NESTING_DEPTH && (
                                <TouchableOpacity
                                    onPress={handleReply}
                                    className="flex-row items-center space-x-1"
                                >
                                    <Reply
                                        size={16}
                                        color={isDark ? '#94A3B8' : '#6B7280'}
                                    />
                                    <Text className={`text-sm font-medium ${
                                        isDark ? 'text-theme-text-muted-dark' : 'text-gray-500'
                                    }`}>
                                        Reply
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Reply Input */}
                        <AnimatePresence>
                            {showReplyInput && (
                                <MotiView
                                    from={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3"
                                >
                                    <View className="flex-row items-end space-x-2">
                                        <TextInput
                                            ref={inputRef}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            placeholder="Write a reply..."
                                            className={`flex-1 rounded-2xl px-4 py-3 ${
                                                isDark
                                                    ? 'bg-theme-input-dark text-theme-text-primary-dark'
                                                    : 'bg-gray-50 text-gray-700'
                                            }`}
                                            placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                            multiline
                                            maxLength={500}
                                        />
                                        <TouchableOpacity
                                            onPress={submitReply}
                                            disabled={!replyText.trim()}
                                            className={`p-3 rounded-xl ${
                                                replyText.trim()
                                                    ? 'bg-primary-500'
                                                    : (isDark ? 'bg-gray-700' : 'bg-gray-200')
                                            }`}
                                        >
                                            <Send
                                                size={20}
                                                color={replyText.trim() ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </MotiView>
                            )}
                        </AnimatePresence>
                    </View>
                </View>
            </MotiView>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <View>
                    {/* Show/Hide Replies Button */}
                    <TouchableOpacity
                        onPress={toggleReplies}
                        className={`flex-row items-center py-2 ${depth > 0 ? 'ml-13' : 'ml-13'}`}
                    >
                        {showReplies ? (
                            <ChevronUp size={16} className="text-primary-500 mr-1" />
                        ) : (
                            <ChevronDown size={16} className="text-primary-500 mr-1" />
                        )}
                        <Text className="text-primary-500 text-sm font-medium">
                            {showReplies ? 'Hide replies' : `Show ${comment.replies.length} replies`}
                        </Text>
                    </TouchableOpacity>

                    {/* Nested Replies List */}
                    <AnimatePresence>
                        {showReplies && (
                            <MotiView
                                from={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {comment.replies.map((reply) => (
                                    <Comment
                                        key={reply.id}
                                        comment={reply}
                                        depth={depth + 1}
                                        onReply={onReply}
                                        onLike={onLike}
                                    />
                                ))}
                            </MotiView>
                        )}
                    </AnimatePresence>
                </View>
            )}
        </View>
    );
};

export default Comment;