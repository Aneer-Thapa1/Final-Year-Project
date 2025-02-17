import { Image, Text, View, TouchableOpacity, Modal, ScrollView, useColorScheme } from 'react-native'
import React, { useState } from 'react'
import { Heart, MessageCircle, Share2, ArrowLeft, MoreHorizontal } from 'lucide-react-native'
import { MotiView, AnimatePresence } from 'moti'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import Comment from './Comment'
import {images} from '../constants/images'

const Blog = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([
        {
            id: '1',
            user: {
                name: 'John Doe',
                avatar: 'https://your-avatar-url.com/1',
            },
            text: 'This is such a great insight! Ive been using these techniques and they really work.',
            time: '2h ago',
            likes: 24,
            replies: [
                {
                    id: '1.1',
                    user: {
                        name: 'Jane Smith',
                        avatar: 'https://your-avatar-url.com/2',
                    },
                    text: 'Totally agree! The daily tracking feature is amazing.',
                    time: '1h ago',
                    likes: 12,
                }
            ]
        },
        // Add more sample comments as needed
    ]);

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLiked(!isLiked);
    };

    const handleShare = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Implement share functionality
    };

    const handleCommentPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowComments(true);
    };

    const handleAddComment = (text: string) => {
        const newComment = {
            id: Date.now().toString(),
            user: {
                name: 'Current User',
                avatar: 'https://your-avatar-url.com/current-user',
            },
            text,
            time: 'Just now',
            likes: 0,
        };
        setComments([newComment, ...comments]);
    };

    const CommentsModal = () => (
        <Modal
            animationType="slide"
            visible={showComments}
            onRequestClose={() => setShowComments(false)}
        >
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-white'}`}>
                {/* Modal Header */}
                <View className="flex-row items-center px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                    <TouchableOpacity
                        onPress={() => setShowComments(false)}
                        className="p-2 -ml-2"
                    >
                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                    </TouchableOpacity>
                    <Text className={`text-lg font-semibold ml-2 ${
                        isDark ? 'text-theme-text-primary-dark' : 'text-gray-900'
                    }`}>
                        Comments
                    </Text>
                </View>

                {/* Comments List */}
                <ScrollView className="flex-1">
                    {comments.map((comment) => (
                        <Comment
                            key={comment.id}
                            comment={comment}
                            onReply={(commentId, text) => {
                                // Handle reply
                                console.log(commentId, text);
                            }}
                            onLike={(commentId) => {
                                // Handle like
                                console.log(commentId);
                            }}
                        />
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500 }}
            className={`mx-4 mb-6 rounded-3xl overflow-hidden shadow-lg ${
                isDark ? 'bg-theme-card-dark' : 'bg-white'
            }`}
        >
            {/* Author Info */}
            <View className="p-4 flex-row items-center justify-between">
                <View className="flex-row items-center space-x-3">
                    <Image
                        source={{ uri: 'https://your-image-url.com/blog-image' }}
                        className="w-10 h-10 rounded-full"
                    />
                    <View>
                        <Text className={`font-semibold ${
                            isDark ? 'text-theme-text-primary-dark' : 'text-gray-900'
                        }`}>
                            Anir Jung Thapaz
                        </Text>
                        <Text className={`text-sm ${
                            isDark ? 'text-theme-text-muted-dark' : 'text-gray-500'
                        }`}>
                            2 hours ago
                        </Text>
                    </View>
                </View>

                <TouchableOpacity className="p-2">
                    <MoreHorizontal size={20} color={isDark ? '#94A3B8' : '#6B7280'} />
                </TouchableOpacity>
            </View>

            {/* Blog Content */}
            <View className="px-4 pb-3">
                <Text className={`text-base leading-6 mb-4 ${
                    isDark ? 'text-theme-text-secondary-dark' : 'text-gray-700'
                }`}>
                    Embark on your personal growth journey with Habit Pulse. Track habits, celebrate achievements, and transform your life one day at a time. Our innovative platform combines proven psychological principles with modern technology.
                </Text>
            </View>

            {/* Blog Image */}
            <Image
                source={{ uri: 'https://your-image-url.com/blog-image' }}
                className="w-full h-64"
                resizeMode="cover"
            />

            {/* Action Buttons */}
            <View className="p-4 flex-row items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center space-x-6">
                    <TouchableOpacity
                        onPress={handleLike}
                        className="flex-row items-center space-x-2"
                    >
                        <MotiView
                            animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                        >
                            <Heart
                                size={24}
                                color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                fill={isLiked ? '#7C3AED' : 'none'}
                            />
                        </MotiView>
                        <Text className={`font-medium ${
                            isLiked
                                ? 'text-primary-500'
                                : (isDark ? 'text-theme-text-muted-dark' : 'text-gray-600')
                        }`}>
                            2.3k
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleCommentPress}
                        className="flex-row items-center space-x-2"
                    >
                        <MessageCircle
                            size={24}
                            color={isDark ? '#94A3B8' : '#6B7280'}
                        />
                        <Text className={isDark ? 'text-theme-text-muted-dark' : 'text-gray-600'}>
                            482
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleShare}
                    className="p-2 -mr-2"
                >
                    <Share2
                        size={24}
                        color={isDark ? '#94A3B8' : '#6B7280'}
                    />
                </TouchableOpacity>
            </View>

            {/* Comments Modal */}
            <CommentsModal />
        </MotiView>
    );
};

export default Blog;