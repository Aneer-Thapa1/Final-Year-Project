import { Image, Text, View, TouchableOpacity, Modal, ScrollView, useColorScheme, Pressable, ActivityIndicator, TextInput, Animated } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { Heart, MessageCircle, Share2, ArrowLeft, MoreHorizontal, Bookmark, Send, X } from 'lucide-react-native'
import { MotiView, AnimatePresence } from 'moti'
import * as Haptics from 'expo-haptics'
import { SafeAreaView } from 'react-native-safe-area-context'
import Comment from './Comment'
import icons from '../constants/images'

const Blog = ({
                  blog,
                  isDark,
                  onLike,
                  onComment,
                  onShare,
                  onBookmark,
                  onMenuPress,
                  authorProfile = icons.maleProfile
              }) => {
    // Animation values
    const likeScale = useRef(new Animated.Value(1)).current;
    const saveScale = useRef(new Animated.Value(1)).current;

    // State management
    const [showComments, setShowComments] = useState(false);
    const [isLiked, setIsLiked] = useState(blog.isLiked || false);
    const [isSaved, setIsSaved] = useState(blog.isSaved || false);
    const [likesCount, setLikesCount] = useState(blog.likesCount || 0);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

        return date.toLocaleDateString();
    };

    // Function to load comments
    const loadComments = async () => {
        try {
            setLoadingComments(true);
            // In a real app, you would fetch comments from an API
            // const response = await blogService.getBlogComments(blog.blog_id);

            // For now, we'll just use sample data
            setTimeout(() => {
                setComments([
                    {
                        id: '1',
                        user: {
                            name: 'Kamesh Chaudary',
                            avatar: 'https://your-avatar-url.com/1',
                        },
                        text: 'Thank you for this amazing post!',
                        time: '2h ago',
                        likes: 24,
                        replies: [
                            {
                                id: '1.1',
                                user: {
                                    name: 'Anjil Neupane',
                                    avatar: 'https://your-avatar-url.com/2',
                                },
                                text: 'Totally agree, it is amazing!',
                                time: '1h ago',
                                likes: 12,
                            }
                        ]
                    },
                    {
                        id: '2',
                        user: {
                            name: 'Rohit Sharma',
                            avatar: 'https://your-avatar-url.com/3',
                        },
                        text: 'This is exactly what I needed to read today.',
                        time: '5h ago',
                        likes: 16,
                        replies: []
                    }
                ]);
                setLoadingComments(false);
            }, 1000);
        } catch (error) {
            console.error('Error loading comments:', error);
            setLoadingComments(false);
        }
    };

    // Handle like with animation
    const handleLike = () => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Animated scale effect
        Animated.sequence([
            Animated.timing(likeScale, {
                toValue: 1.4,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(likeScale, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Toggle liked state locally
        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

        // Call the parent handler
        if (onLike) onLike(blog.blog_id, !isLiked);
    };

    // Handle bookmark with animation
    const handleBookmark = () => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Animated scale effect
        Animated.sequence([
            Animated.timing(saveScale, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(saveScale, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Toggle saved state locally
        setIsSaved(!isSaved);

        // Call the parent handler
        if (onBookmark) onBookmark(blog.blog_id, !isSaved);
    };

    // Handle share
    const handleShare = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onShare) onShare(blog.blog_id);
    };

    // Handle comment modal open
    const handleCommentPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowComments(true);
        loadComments();
    };

    // Submit a new comment
    const handleSubmitComment = () => {
        if (!newComment.trim()) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Add new comment to the list
        const newCommentObj = {
            id: Date.now().toString(),
            user: {
                name: 'Current User',
                avatar: 'https://your-avatar-url.com/current-user',
            },
            text: newComment,
            time: 'Just now',
            likes: 0,
            replies: []
        };

        setComments([newCommentObj, ...comments]);
        setNewComment('');

        // Call the parent handler
        if (onComment) onComment(blog.blog_id, newComment);
    };

    // Handle menu options
    const handleMenuPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowOptions(!showOptions);
        if (onMenuPress) onMenuPress(blog.blog_id);
    };

    // Format text for preview (if needed)
    const formatContentPreview = (content, maxLength = 150) => {
        if (!content) return '';
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength - 3) + '...';
    };

    // Comments Modal component
    const CommentsModal = () => (
        <Modal
            animationType="slide"
            transparent={false}
            visible={showComments}
            onRequestClose={() => setShowComments(false)}
        >
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Modal Header */}
                <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => setShowComments(false)}
                            className="p-2"
                        >
                            <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                        </TouchableOpacity>
                        <Text className={`text-lg font-bold ml-2 ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                            Comments
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => setShowComments(false)}
                        className="p-2"
                    >
                        <X size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                    </TouchableOpacity>
                </View>

                {/* Comments List */}
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                >
                    {loadingComments ? (
                        <View className="py-8 items-center justify-center">
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Loading comments...
                            </Text>
                        </View>
                    ) : comments.length > 0 ? (
                        comments.map((comment) => (
                            <Comment
                                key={comment.id}
                                comment={comment}
                                isDark={isDark}
                                onReply={(commentId, text) => {
                                    // Handle reply
                                    console.log(commentId, text);
                                }}
                                onLike={(commentId) => {
                                    // Handle like
                                    console.log(commentId);
                                }}
                            />
                        ))
                    ) : (
                        <View className="py-8 items-center justify-center">
                            <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                No comments yet. Be the first to comment!
                            </Text>
                        </View>
                    )}

                    {/* Add some bottom padding for better scrolling */}
                    <View className="h-20" />
                </ScrollView>

                {/* Comment Input */}
                <View className={`px-4 py-3 border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
                    <View className="flex-row items-center">
                        <TextInput
                            value={newComment}
                            onChangeText={setNewComment}
                            placeholder="Add a comment..."
                            placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                            className={`flex-1 py-2 px-4 rounded-full mr-2 ${
                                isDark
                                    ? 'bg-gray-800 text-white border-gray-700'
                                    : 'bg-gray-100 text-gray-900 border-gray-200'
                            } border`}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            onPress={handleSubmitComment}
                            disabled={!newComment.trim()}
                            className={`p-2 rounded-full ${
                                newComment.trim()
                                    ? 'bg-primary-500'
                                    : isDark ? 'bg-gray-800' : 'bg-gray-200'
                            }`}
                        >
                            <Send size={20} color={newComment.trim() ? '#FFFFFF' : isDark ? '#4B5563' : '#9CA3AF'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );

    return (
        <>
            {/* Options Menu Overlay */}
            <AnimatePresence>
                {showOptions && (
                    <Pressable
                        onPress={() => setShowOptions(false)}
                        className="absolute inset-0 z-50 bg-black/30"
                    >
                        <MotiView
                            from={{ opacity: 0, translateY: -10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            exit={{ opacity: 0, translateY: -10 }}
                            transition={{ type: 'timing', duration: 200 }}
                            className={`absolute right-6 top-16 rounded-xl p-2 shadow-xl ${
                                isDark ? 'bg-gray-800' : 'bg-white'
                            }`}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    setShowOptions(false);
                                    // Add your report function here
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                className={`px-4 py-3 rounded-lg ${
                                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                }`}
                            >
                                <Text className={`${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Report post
                                </Text>
                            </TouchableOpacity>
                        </MotiView>
                    </Pressable>
                )}
            </AnimatePresence>

            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500 }}
                className={`mb-4 rounded-3xl overflow-hidden shadow-sm ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                }`}
            >
                {/* Author Info */}
                <View className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center space-x-3 gap-2">
                        <Image
                            source={blog.user?.avatar ? { uri: blog.user.avatar } : authorProfile}
                            className="w-10 h-10 rounded-full bg-gray-300"
                        />
                        <View>
                            <Text className={`font-bold ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                {blog.user?.user_name || "Anonymous"}
                            </Text>
                            <Text className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                {formatDate(blog.createdAt || new Date())}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        className="p-2"
                        onPress={handleMenuPress}
                    >
                        <MoreHorizontal size={20} color={isDark ? '#94A3B8' : '#6B7280'} />
                    </TouchableOpacity>
                </View>

                {/* Blog Title - if available */}
                {blog.title && (
                    <View className="px-4 pb-2">
                        <Text className={`text-lg font-bold ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                            {blog.title}
                        </Text>
                    </View>
                )}

                {/* Blog Content */}
                <View className="px-4 pb-3">
                    <Text className={`text-base leading-6 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        {formatContentPreview(blog.content)}
                    </Text>
                </View>

                {/* Blog Image - if available */}
                {blog.image && (
                    <Image
                        source={{ uri: blog.image }}
                        className="w-full h-64"
                        resizeMode="cover"
                    />
                )}

                {/* Action Buttons */}
                <View className="px-4 py-3 flex-row items-center justify-between border-t border-gray-100 dark:border-gray-800">
                    <View className="flex-row items-center">
                        {/* Like Button */}
                        <TouchableOpacity
                            onPress={handleLike}
                            className="flex-row items-center mr-6"
                        >
                            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                <Heart
                                    size={22}
                                    color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                    fill={isLiked ? '#7C3AED' : 'none'}
                                />
                            </Animated.View>
                            <Text className={`ml-1.5 ${
                                isLiked
                                    ? 'text-primary-500'
                                    : (isDark ? 'text-gray-400' : 'text-gray-600')
                            }`}>
                                {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                            </Text>
                        </TouchableOpacity>

                        {/* Comment Button */}
                        <TouchableOpacity
                            onPress={handleCommentPress}
                            className="flex-row items-center mr-6"
                        >
                            <MessageCircle
                                size={22}
                                color={isDark ? '#94A3B8' : '#6B7280'}
                            />
                            <Text className={`ml-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {blog.commentsCount || 0}
                            </Text>
                        </TouchableOpacity>

                        {/* Bookmark Button */}
                        <TouchableOpacity onPress={handleBookmark}>
                            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                                <Bookmark
                                    size={22}
                                    color={isSaved ? '#3B82F6' : (isDark ? '#94A3B8' : '#6B7280')}
                                    fill={isSaved ? '#3B82F6' : 'none'}
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    {/* Share Button */}
                    <TouchableOpacity
                        onPress={handleShare}
                    >
                        <Share2
                            size={22}
                            color={isDark ? '#94A3B8' : '#6B7280'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Show "Read More" for truncated content */}
                {blog.content && blog.content.length > 150 && (
                    <TouchableOpacity
                        onPress={() => {/* Navigate to full post */}}
                        className={`mx-4 mb-4 py-2 rounded-xl ${
                            isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                    >
                        <Text className={`text-center font-medium ${
                            isDark ? 'text-primary-400' : 'text-primary-600'
                        }`}>
                            Read more
                        </Text>
                    </TouchableOpacity>
                )}
            </MotiView>

            {/* Comments Modal */}
            <CommentsModal />
        </>
    );
};

export default Blog;