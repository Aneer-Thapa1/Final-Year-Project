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
    Keyboard
} from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ArrowLeft, MoreHorizontal, Bookmark, Send, X } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Comment from './Comment';
import icons from '../constants/images';
import { API_BASE_URL } from '../services/api';
import { toggleLikeBlog } from '../services/blogService';
import { getComments, addComment } from '../services/commentService';
import {useSelector} from "react-redux";
import {router} from "expo-router";

const Blog = ({
                  blog,
                  isDark,
                  onShare,
                  onBookmark,
                  onMenuPress,
                  onReadMore,
                  authorProfile = icons.maleProfile,

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

    const scrollViewRef = useRef(null);
    const commentInputRef = useRef(null);

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

    // Get current user from Redux
    const userDetails = useSelector((state) => state.user);
    const currentUser = userDetails?.user || {};

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
            if (currentUser?.user?.user_id === userId) {
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

    // Main Blog component with styling using standard React Native styles instead of Tailwind classes
    return (
        <>
            {/* Options Menu Overlay */}
            <AnimatePresence>
                {showOptions && (
                    <Pressable
                        onPress={() => setShowOptions(false)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        <MotiView
                            from={{ opacity: 0, translateY: -10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            exit={{ opacity: 0, translateY: -10 }}
                            transition={{ type: 'timing', duration: 200 }}
                            style={{
                                position: 'absolute',
                                right: 24,
                                top: 64,
                                borderRadius: 12,
                                padding: 8,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    setShowOptions(false);
                                    // Add your report function here
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 12,
                                    borderRadius: 8
                                }}
                            >
                                <Text style={{ color: isDark ? '#FFFFFF' : '#1F2937' }}>
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
                style={{
                    marginBottom: 16,
                    borderRadius: 24,
                    overflow: 'hidden',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
                }}
            >
                {/* Author Info */}
                <View style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <Image
                            source={blog.user?.avatar ? { uri: blog.user.avatar } : authorProfile}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#D1D5DB'
                            }}
                        />
                        <View>

                            <TouchableOpacity onPress={() => navigateToProfile(blog.user.user_id, blog.user.user_name)}>
                                <Text style={{
                                    fontWeight: 'bold',
                                    color: isDark ? '#FFFFFF' : '#1F2937'
                                }}>
                                    {blog.user?.user_name || "Anonymous"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={{
                                fontSize: 12,
                                color: isDark ? '#9CA3AF' : '#6B7280'
                            }}>
                                {formatDate(blog.createdAt || new Date())}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={{ padding: 8 }}
                        onPress={handleMenuPress}
                    >
                        <MoreHorizontal size={20} color={isDark ? '#94A3B8' : '#6B7280'} />
                    </TouchableOpacity>
                </View>

                {/* Category Tag */}
                {blog.category && (
                    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                        <View
                            style={{
                                alignSelf: 'flex-start',
                                borderRadius: 9999,
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                backgroundColor: blog.category.color || '#6366F1'
                            }}
                        >
                            <Text style={{
                                color: '#FFFFFF',
                                fontSize: 12,
                                fontWeight: '500'
                            }}>
                                {blog.category.icon ? `${blog.category.icon} ` : ''}{blog.category.category_name || 'General'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Blog Title - if available */}
                {blog.title && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: isDark ? '#FFFFFF' : '#1F2937'
                        }}>
                            {blog.title}
                        </Text>
                    </View>
                )}

                {/* Blog Content */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <Text style={{
                        fontSize: 16,
                        lineHeight: 24,
                        color: isDark ? '#D1D5DB' : '#4B5563'
                    }}>
                        {formatContentPreview(blog.content)}
                    </Text>
                </View>

                {/* Blog Image - if available */}
                {blog.image && !imageError && (
                    <View style={{ width: '100%', height: 256 }}>
                        <Image
                            source={{
                                uri: getFullImageUrl(blog.image)
                            }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                            onError={handleImageError}
                        />
                    </View>
                )}

                {/* Action Buttons */}
                <View style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#374151' : '#F3F4F6'
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Like Button */}
                        <TouchableOpacity
                            onPress={handleLike}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 24
                            }}
                        >
                            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                                <Heart
                                    size={22}
                                    color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                    fill={isLiked ? '#7C3AED' : 'none'}
                                />
                            </Animated.View>
                            <Text style={{
                                marginLeft: 6,
                                color: isLiked
                                    ? '#7C3AED'
                                    : (isDark ? '#9CA3AF' : '#4B5563')
                            }}>
                                {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                            </Text>
                        </TouchableOpacity>

                        {/* Comment Button */}
                        <TouchableOpacity
                            onPress={handleCommentPress}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 24
                            }}
                        >
                            <MessageCircle
                                size={22}
                                color={isDark ? '#94A3B8' : '#6B7280'}
                            />
                            <Text style={{
                                marginLeft: 6,
                                color: isDark ? '#9CA3AF' : '#4B5563'
                            }}>
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
                        style={{
                            marginHorizontal: 16,
                            marginBottom: 16,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: isDark ? '#374151' : '#F3F4F6'
                        }}
                    >
                        <Text style={{
                            textAlign: 'center',
                            fontWeight: '500',
                            color: isDark ? '#A5B4FC' : '#6366F1'
                        }}>
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
                        style={{
                            flex: 1,
                            backgroundColor: isDark ? '#111827' : '#FFFFFF'
                        }}
                    >
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                        >
                            {/* Header with proper padding for Dynamic Island */}
                            <View
                                style={{
                                    paddingTop: iosTopPadding,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 16,
                                    paddingBottom: 8,
                                    borderBottomWidth: 1,
                                    borderBottomColor: isDark ? '#374151' : '#E5E7EB'
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity
                                        onPress={() => setShowComments(false)}
                                        style={{ padding: 8 }}
                                    >
                                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                                    </TouchableOpacity>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        marginLeft: 8,
                                        color: isDark ? '#FFFFFF' : '#1F2937'
                                    }}>
                                        Comments
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    onPress={() => setShowComments(false)}
                                    style={{ padding: 8 }}
                                >
                                    <X size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                                </TouchableOpacity>
                            </View>

                            {/* Comments List */}
                            <ScrollView
                                ref={scrollViewRef}
                                style={{ flex: 1 }}
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
                                    <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="large" color="#6366F1" />
                                        <Text style={{
                                            marginTop: 8,
                                            color: isDark ? '#9CA3AF' : '#6B7280'
                                        }}>
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
                                    <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{
                                            textAlign: 'center',
                                            color: isDark ? '#9CA3AF' : '#6B7280'
                                        }}>
                                            No comments yet. Be the first to comment!
                                        </Text>
                                    </View>
                                )}

                                {/* Add some bottom padding for better scrolling */}
                                <View style={{ height: keyboardVisible ? 120 : 80 }} />
                            </ScrollView>

                            {/* Reply indicator */}
                            {replyingTo && (
                                <View style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderTopWidth: 1,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                    borderTopColor: isDark ? '#374151' : '#E5E7EB'
                                }}>
                                    <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>
                                        Replying to <Text style={{ fontWeight: 'bold' }}>{replyingTo.user.user_name || replyingTo.user.name}</Text>
                                    </Text>
                                    <TouchableOpacity onPress={cancelReply}>
                                        <X size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Comment Input - Fixed at bottom */}
                            <View style={{
                                paddingHorizontal: 16,
                                paddingTop: 12,
                                paddingBottom: Platform.OS === 'ios' ? Math.max(iosBottomPadding, 0) : 5,
                                borderTopWidth: 1,
                                borderTopColor: isDark ? '#374151' : '#E5E7EB',
                                backgroundColor: isDark ? '#111827' : '#FFFFFF'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                                    <TextInput
                                        ref={commentInputRef}
                                        value={newComment}
                                        onChangeText={setNewComment}
                                        placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                                        placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                        style={{
                                            flex: 1,
                                            maxHeight: 100,
                                            minHeight: Platform.OS === 'ios' ? 40 : 56,
                                            paddingVertical: Platform.OS === 'ios' ? 10 : 8,
                                            paddingHorizontal: 16,
                                            borderRadius: 24,
                                            marginRight: 8,
                                            backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                                            color: isDark ? '#FFFFFF' : '#1F2937',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#374151' : '#E5E7EB'
                                        }}
                                        multiline
                                        maxLength={500}
                                    />
                                    <TouchableOpacity
                                        onPress={handleSubmitComment}
                                        disabled={!newComment.trim()}
                                        style={{
                                            padding: 12,
                                            borderRadius: 24,
                                            backgroundColor: newComment.trim()
                                                ? '#7C3AED'
                                                : isDark ? '#1F2937' : '#E5E7EB'}}
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
        </>
    );
};

export default Blog;