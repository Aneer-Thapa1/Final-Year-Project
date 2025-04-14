import {
    Image,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ScrollView,
    RefreshControl,
    Pressable,
    ActivityIndicator,
    TextInput,
    Animated,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Alert
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ArrowLeft, MoreHorizontal, Bookmark, Send, X, Edit, Trash2 } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Comment from './Comment';
import icons from '../constants/images';
import { API_BASE_URL } from '../services/api';
import { toggleLikeBlog, deleteBlog, editBlog } from '../services/blogService';
import { getComments, addComment } from '../services/commentService';
import { useSelector } from "react-redux";
import { router } from "expo-router";
import BlogPostCreator from './BlogPostCreator';

const Blog = ({
                  blog,
                  isDark,
                  onShare,
                  onBookmark,
                  onMenuPress,
                  onReadMore,
                  authorProfile = icons.maleProfile,
                  onEditBlog,
                  onDeleteBlog,
                  onBlogUpdated
              }) => {
    // Safe area insets for proper Dynamic Island padding
    const insets = useSafeAreaInsets();
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
    const [replyingTo, setReplyingTo] = useState(null);
    const [loadingComments, setLoadingComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit mode state
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editLoading, setEditLoading] = useState(false);

    const scrollViewRef = useRef(null);
    const commentInputRef = useRef(null);

    // Get current user from Redux
    const userDetails = useSelector((state) => state.user);
    const currentUser = userDetails || {};

    // Check if current user is the blog owner
    const isOwner = currentUser?.user_id === blog.user?.user_id;

    // Keyboard event listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (event) => {
                setKeyboardVisible(true);
                setKeyboardHeight(event.endCoordinates.height);

                // Scroll to the bottom when keyboard appears
                if (scrollViewRef.current) {
                    setTimeout(() => {
                        scrollViewRef.current.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
                setKeyboardHeight(0);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Load comments when modal opens
    useEffect(() => {
        if (showComments) {
            loadComments();
        }
    }, [showComments]);

    // Helper function to get full image URL
    const getFullImageUrl = (imagePath) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_BASE_URL}${imagePath}`;
    };

    // Format date for display
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);

            if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
            if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

            return date.toLocaleDateString();
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Recently';
        }
    };

    // Function to load comments
    const loadComments = async () => {
        try {
            setLoadingComments(true);
            const response = await getComments(blog.blog_id);

            if (response && response.success && response.data) {
                setComments(response.data);
            } else {
                console.warn('Unexpected response format:', response);
                setComments([]);
            }
            setLoadingComments(false);
        } catch (error) {
            console.error('Error loading comments:', error);
            setLoadingComments(false);
        }
    };

    // Refresh comments
    const refreshComments = async () => {
        setRefreshing(true);
        await loadComments();
        setRefreshing(false);
    };

    // Handle like with animation
    const handleLike = async () => {
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

        // Optimistic UI update
        const previousIsLiked = isLiked;
        const previousLikesCount = likesCount;

        setIsLiked(!isLiked);
        setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

        // Call API
        try {
            const response = await toggleLikeBlog(blog.blog_id);

            if (response && response.success) {
                // Update with actual server values if available
                if (response.data && response.data.liked !== undefined) {
                    setIsLiked(response.data.liked);
                }
                if (response.data && response.data.likesCount !== undefined) {
                    setLikesCount(response.data.likesCount);
                }
            } else {
                // Revert on error
                setIsLiked(previousIsLiked);
                setLikesCount(previousLikesCount);
                console.error('Error toggling like:', response?.error || 'Unknown error');
            }
        } catch (error) {
            // Revert on error
            setIsLiked(previousIsLiked);
            setLikesCount(previousLikesCount);
            console.error('Error toggling like:', error);
        }
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
        if (onBookmark) onBookmark(blog.blog_id, isSaved);
    };

    // Prepare blog data for editor
    const prepareCurrentBlogForEditor = () => {
        return {
            title: blog.title || '',
            content: blog.content || '',
            images: blog.image ? [blog.image] : [],
            category_id: blog.category?.category_id,
            is_public: blog.is_public !== false // Default to true if not specified
        };
    };

    // Handle edit blog
    const handleEditBlog = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowOptions(false);

        if (onEditBlog) {
            onEditBlog(blog);
        } else {
            // Open edit modal
            setEditModalVisible(true);
        }
    };

    // Handle blog update through the modal
    const handleUpdateBlog = async (updatedData) => {
        if (!blog || !blog.blog_id) {
            Alert.alert("Error", "Blog ID is missing. Please try again.");
            return;
        }

        try {
            setEditLoading(true);

            // If the post has a single image string, convert it to an array for the editor
            const postData = {
                ...updatedData,
                // If the blog already has an image but it's not included in the updated images,
                // we need to keep track of whether the image should be removed
                image: updatedData.images && updatedData.images.length > 0 ? updatedData.images[0] : null
            };

            const response = await editBlog(blog.blog_id, postData);

            if (response && response.success) {
                // Update the blog data locally
                const updatedBlog = {
                    ...blog,
                    title: postData.title,
                    content: postData.content,
                    image: postData.image,
                    category_id: postData.category_id,
                    is_public: postData.is_public
                };

                // Notify parent component about the update
                if (onBlogUpdated) {
                    onBlogUpdated(updatedBlog);
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setEditModalVisible(false);

                // Show success message
                Alert.alert("Success", "Your blog has been updated successfully.");
            } else {
                Alert.alert("Error", response?.message || "Failed to update blog.");
            }
        } catch (err) {
            console.error('Error updating blog:', err);
            Alert.alert("Error", "Failed to update blog. Please try again.");
        } finally {
            setEditLoading(false);
        }
    };

    // Handle delete blog
    const handleDeleteBlog = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Confirm deletion first
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            const response = await deleteBlog(blog.blog_id);

                            if (response && response.success) {
                                // Close options and notify parent component
                                setShowOptions(false);

                                if (onDeleteBlog) {
                                    onDeleteBlog(blog.blog_id);
                                }

                                // Provide feedback
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } else {
                                console.error('Error deleting blog:', response?.error || 'Unknown error');
                                Alert.alert("Error", "Failed to delete post. Please try again later.");
                            }
                        } catch (error) {
                            console.error('Error deleting blog:', error);
                            Alert.alert("Error", "Failed to delete post. Please try again later.");
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    // Handle share
    const handleShare = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onShare) onShare(blog.blog_id);
    };

    // Handle comment modal open
    const handleCommentPress = () => {
        console.log("Opening comments modal");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowComments(true);
    };

    // Set replying state
    const handleReply = (comment) => {
        setReplyingTo(comment);
        setNewComment(`@${comment.user.user_name || comment.user.name} `);

        // Focus the input with a delay to ensure the UI has updated
        setTimeout(() => {
            if (commentInputRef.current) {
                commentInputRef.current.focus();
            }
        }, 50);
    };

    // Cancel reply
    const cancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
    };

    const closeCommentsModal = () => {
        setShowComments(false);
    };

    // Submit a new comment
    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const commentData = {
                content: newComment,
                parent_id: replyingTo ? (replyingTo.comment_id || replyingTo.id) : undefined
            };

            const response = await addComment(blog.blog_id, commentData);

            if (response && response.success && response.data) {
                // If it's a reply, add it to the replies array of the parent comment
                if (replyingTo) {
                    const updatedComments = comments.map(comment => {
                        if ((comment.comment_id || comment.id) === (replyingTo.comment_id || replyingTo.id)) {
                            return {
                                ...comment,
                                replies: comment.replies ? [...comment.replies, response.data] : [response.data]
                            };
                        }
                        return comment;
                    });
                    setComments(updatedComments);
                } else {
                    // If it's a top-level comment, add it to the beginning of the list
                    setComments([response.data, ...comments]);
                }

                // Reset input and reply state
                setNewComment('');
                setReplyingTo(null);
                Keyboard.dismiss();
            } else {
                console.error('Error adding comment:', response?.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    // Handle comment like
    const handleCommentLike = (commentId, isLiked) => {
        // This function would call the API to like/unlike a comment
        console.log('Like comment:', commentId, isLiked);
        // In a real implementation, make the API call here
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

    // Handle Read More
    const handleReadMore = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onReadMore) {
            onReadMore(blog);
        }
    };

    // Handle image load error
    const handleImageError = () => {
        console.log('Image failed to load:', blog.image);
        setImageError(true);
    };

    // Handle profile navigation
    const navigateToProfile = (userId, userName) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Small delay to ensure the modal closes properly before navigation
        setTimeout(() => {
            if (currentUser?.user_id === userId) {
                router.push('/profile');
            } else {
                router.push({
                    pathname: `/(profile)/${userId}`,
                    params: {
                        name: userName || ''
                    }
                });
            }
        }, 10);
    };

    // Calculate proper padding for Dynamic Island on iOS
    const iosTopPadding = Platform.OS === 'ios' ? Math.max(insets.top, 34) : 0;
    const iosBottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 5) : 0;

    // Main Blog component with NativeWind styling
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
                            className={`absolute right-6 top-16 rounded-xl p-2 shadow-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                        >
                            {/* Edit option - only visible for blog owner */}
                            {isOwner && (
                                <TouchableOpacity
                                    onPress={handleEditBlog}
                                    className="flex-row items-center px-4 py-3 rounded-lg"
                                >
                                    <Edit size={18} color={isDark ? '#FFFFFF' : '#1F2937'} className="mr-2" />
                                    <Text className={isDark ? 'text-white' : 'text-gray-800'}>
                                        Edit post
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Delete option - only visible for blog owner */}
                            {isOwner && (
                                <TouchableOpacity
                                    onPress={handleDeleteBlog}
                                    disabled={isDeleting}
                                    className="flex-row items-center px-4 py-3 rounded-lg"
                                >
                                    {isDeleting ? (
                                        <ActivityIndicator size="small" color="#EF4444" className="mr-2" />
                                    ) : (
                                        <Trash2 size={18} color="#EF4444" className="mr-2" />
                                    )}
                                    <Text className="text-red-500">
                                        {isDeleting ? 'Deleting...' : 'Delete post'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Report option - visible for everyone */}
                            <TouchableOpacity
                                onPress={() => {
                                    setShowOptions(false);
                                    // Add your report function here
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                className="flex-row items-center px-4 py-3 rounded-lg"
                            >
                                <Text className={isDark ? 'text-white' : 'text-gray-800'}>
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
                className={`mb-4 rounded-3xl overflow-hidden shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
                {/* Author Info */}
                <View className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                        <Image
                            source={blog.user?.avatar ? { uri: blog.user.avatar } : authorProfile}
                            className="w-10 h-10 rounded-full bg-gray-300"
                        />
                        <View>
                            <TouchableOpacity onPress={() => navigateToProfile(blog.user.user_id, blog.user.user_name)}>
                                <Text className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {blog.user?.user_name || "Anonymous"}
                                </Text>
                            </TouchableOpacity>
                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

                {/* Category Tag */}
                {blog.category && (
                    <View className="px-4 mb-2">
                        <View
                            className="self-start rounded-full px-3 py-1"
                            style={{ backgroundColor: blog.category.color || '#6366F1' }}
                        >
                            <Text className="text-white text-xs font-medium">
                                {blog.category.icon ? `${blog.category.icon} ` : ''}{blog.category.category_name || 'General'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Blog Title - if available */}
                {blog.title && (
                    <View className="px-4 pb-2">
                        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {blog.title}
                        </Text>
                    </View>
                )}

                {/* Blog Content */}
                <View className="px-4 pb-3">
                    <Text className={`text-base leading-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatContentPreview(blog.content)}
                    </Text>
                </View>

                {/* Blog Image - if available */}
                {blog.image && !imageError && (
                    <View className="w-full h-64">
                        <Image
                            source={{
                                uri: getFullImageUrl(blog.image)
                            }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onError={handleImageError}
                        />
                    </View>
                )}

                {/* Action Buttons */}
                <View className={`px-4 py-3 flex-row items-center justify-between border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
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
                            <Text
                                className={`ml-1.5 ${isLiked
                                    ? 'text-purple-600'
                                    : (isDark ? 'text-gray-400' : 'text-gray-600')}`}
                            >
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
                        onPress={handleReadMore}
                        className={`mx-4 mb-4 py-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                        <Text className={`text-center font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                            Read more
                        </Text>
                    </TouchableOpacity>
                )}
            </MotiView>

            {/* Comments Modal */}
            {showComments && (
                <Modal
                    animationType="slide"
                    transparent={false}
                    visible={showComments}
                    onRequestClose={() => setShowComments(false)}
                >
                    <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                    <SafeAreaView
                        edges={['left', 'right']} // Don't use top/bottom edges - we'll handle manually
                        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
                    >
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            className="flex-1"
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                        >
                            {/* Header with proper padding for Dynamic Island */}
                            <View
                                style={{ paddingTop: iosTopPadding }}
                                className={`flex-row items-center justify-between px-4 pb-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                            >
                                <View className="flex-row items-center">
                                    <TouchableOpacity
                                        onPress={() => setShowComments(false)}
                                        className="p-2"
                                    >
                                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                                    </TouchableOpacity>
                                    <Text className={`text-lg font-bold ml-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
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
                                ref={scrollViewRef}
                                className="flex-1"
                                contentContainerStyle={{
                                    paddingHorizontal: 16,
                                    paddingBottom: keyboardVisible ? 100 : 20 // Extra padding when keyboard is visible
                                }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={refreshComments}
                                        colors={['#6366F1']}
                                        tintColor={isDark ? '#6366F1' : '#6366F1'}
                                    />
                                }
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
                                            key={comment.comment_id || comment.id}
                                            comment={comment}
                                            isDark={isDark}
                                            onReply={handleReply}
                                            onLike={handleCommentLike}
                                            currentUser={currentUser}
                                            formatDate={formatDate}
                                            refreshComments={refreshComments}
                                            blogId={blog.blog_id}
                                            closeCommentsModal={closeCommentsModal}
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
                                <View className={`h-${keyboardVisible ? '30' : '20'}`} />
                            </ScrollView>

                            {/* Reply indicator */}
                            {replyingTo && (
                                <View className={`px-4 py-2 border-t flex-row justify-between items-center ${
                                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <Text className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                                        Replying to <Text className="font-bold">{replyingTo.user.user_name || replyingTo.user.name}</Text>
                                    </Text>
                                    <TouchableOpacity onPress={cancelReply}>
                                        <X size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Comment Input - Fixed at bottom */}
                            <View
                                style={{ paddingBottom: Platform.OS === 'ios' ? Math.max(iosBottomPadding, 0) : 5 }}
                                className={`px-4 pt-3 border-t ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}
                            >
                                <View className="flex-row items-end">
                                    <TextInput
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChangeText={setNewComment}
                                        placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                                        placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                        className={`flex-1 max-h-24 min-h-[40px] px-4 py-2 mr-2 rounded-3xl border ${
                                            isDark
                                                ? 'bg-gray-800 text-white border-gray-700'
                                                : 'bg-gray-100 text-gray-800 border-gray-200'
                                        }`}
                                        multiline
                                        maxLength={500}
                                    />
                                    <TouchableOpacity
                                        onPress={handleSubmitComment}
                                        disabled={!newComment.trim()}
                                        className={`p-3 rounded-full ${
                                            newComment.trim()
                                                ? 'bg-purple-700'
                                                : isDark ? 'bg-gray-800' : 'bg-gray-200'
                                        }`}
                                    >
                                        <Send
                                            size={20}
                                            color={newComment.trim() ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </SafeAreaView>
                </Modal>
            )}

            {/* Edit Blog Modal */}
            {editModalVisible && (
                <BlogPostCreator
                    visible={editModalVisible}
                    onClose={() => setEditModalVisible(false)}
                    onPost={handleUpdateBlog}
                    loading={editLoading}
                    initialData={prepareCurrentBlogForEditor()}
                    isEditMode={true}
                    isDark={isDark}
                />
            )}
        </>
    );
};

export default Blog;