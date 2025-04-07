import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { BookOpen, Heart, MessageSquare, Share2, Clock, ChevronRight, Edit2, Trash2, Plus, X, Send } from 'lucide-react-native';
import { MotiView } from 'moti';
import { getUserBlogs, deleteBlog, editBlog, getBlogDetails } from '../services/blogService';
import { addComment, likeComment } from '../services/commentService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import BlogPostCreator from '../components/BlogPostCreator';
import Comment from '../components/Comment';
import { SafeAreaView } from 'react-native-safe-area-context';

// Comment Input Component
const CommentInput = ({ isDark, onSubmit, placeholder = "Write a comment..." }) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (!text.trim()) return;

        const success = onSubmit(text);
        if (success) {
            setText('');
        }
    };

    return (
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#374151' : '#E5E7EB'
        }}>
            <TextInput
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                style={{
                    flex: 1,
                    borderRadius: 20,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    marginRight: 8,
                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    color: isDark ? '#F9FAFB' : '#111827',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#E5E7EB'
                }}
                multiline
                maxLength={500}
            />

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={!text.trim()}
                style={{
                    borderRadius: 20,
                    padding: 10,
                    backgroundColor: text.trim()
                        ? '#7C3AED'
                        : isDark ? '#374151' : '#E5E7EB'
                }}
            >
                <Send
                    size={20}
                    color={text.trim() ? 'white' : isDark ? '#6B7280' : '#9CA3AF'}
                />
            </TouchableOpacity>
        </View>
    );
};

const BlogsComponent = ({ isDark }) => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [currentBlogToEdit, setCurrentBlogToEdit] = useState(null);
    const [editLoading, setEditLoading] = useState(false);

    // Comments state
    const [commentsModalVisible, setCommentsModalVisible] = useState(false);
    const [currentBlogComments, setCurrentBlogComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [selectedBlogId, setSelectedBlogId] = useState(null);
    const [replyingToComment, setReplyingToComment] = useState(null);

    // Function to fetch blogs
    const fetchUserBlogs = async () => {
        try {
            setLoading(true);
            const response = await getUserBlogs();
            if (response.success && response.data) {
                setBlogs(response.data);
            } else {
                setError('Failed to fetch blogs');
            }
        } catch (err) {
            setError(err.toString());
            console.error('Error fetching blogs:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load blogs on component mount
    useEffect(() => {
        fetchUserBlogs();
    }, []);

    // Handle refresh
    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserBlogs();
    };

    // Calculate read time based on content length
    const calculateReadTime = (content) => {
        if (!content) return '1 min read';
        // Average reading speed: 200 words per minute
        const wordCount = content.split(/\s+/).length;
        const minutes = Math.ceil(wordCount / 200);
        return `${minutes} min read`;
    };

    // Format date to relative time
    const formatDate = (dateString) => {
        if (!dateString) return 'Recently';
        try {
            const date = parseISO(dateString);
            const now = new Date();

            const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

            if (diffInDays === 0) return 'Today';
            if (diffInDays === 1) return 'Yesterday';
            if (diffInDays < 7) return `${diffInDays} days ago`;
            if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;

            return format(date, 'MMM d, yyyy');
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'Recently';
        }
    };

    // Format comment date (for comments)
    const formatCommentDate = (dateString) => {
        if (!dateString) return 'Recently';
        try {
            return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
        } catch (e) {
            return 'Recently';
        }
    };

    // Open comments modal for a blog
    const handleViewComments = async (blogId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedBlogId(blogId);
        setCommentsLoading(true);
        setCommentsModalVisible(true);
        setReplyingToComment(null);

        try {
            const response = await getBlogDetails(blogId);
            if (response && response.success && response.data) {
                setCurrentBlogComments(response.data.comments || []);
            } else {
                Alert.alert("Error", "Failed to load comments");
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            Alert.alert("Error", "Failed to load comments");
        } finally {
            setCommentsLoading(false);
        }
    };

    // Close comments modal
    const closeCommentsModal = () => {
        setCommentsModalVisible(false);
        setCurrentBlogComments([]);
        setSelectedBlogId(null);
        setReplyingToComment(null);
    };

    // Handle reply to comment
    const handleReplyToComment = (comment) => {
        setReplyingToComment(comment);
    };

    // Submit a new comment
    const handleSubmitComment = async (commentText) => {
        if (!commentText.trim() || !selectedBlogId) return false;

        try {
            const commentData = {
                content: commentText,
                parent_id: replyingToComment ? replyingToComment.comment_id : null
            };

            const response = await addComment(selectedBlogId, commentData);

            if (response && response.success) {
                // Reset replying state
                setReplyingToComment(null);

                // Reload comments after adding a new one
                const blogDetailsResponse = await getBlogDetails(selectedBlogId);
                if (blogDetailsResponse && blogDetailsResponse.success) {
                    setCurrentBlogComments(blogDetailsResponse.data.comments || []);

                    // Also update the comment count in the blogs list
                    setBlogs(prevBlogs =>
                        prevBlogs.map(blog =>
                            blog.blog_id === selectedBlogId
                                ? { ...blog, commentsCount: (blog.commentsCount || 0) + 1 }
                                : blog
                        )
                    );
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return true;
            } else {
                Alert.alert("Error", "Failed to add comment");
                return false;
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            Alert.alert("Error", "Failed to add comment");
            return false;
        }
    };

    // Handle like comment
    const handleLikeComment = async (commentId, isLiked) => {
        if (!commentId || !selectedBlogId) return;

        try {
            const response = await likeComment(commentId, isLiked);
            // No need to reload all comments for a like action
            return response && response.success;
        } catch (error) {
            console.error('Error liking comment:', error);
            return false;
        }
    };

    // Refresh comments
    const refreshComments = async () => {
        if (!selectedBlogId) return;

        setCommentsLoading(true);
        try {
            const response = await getBlogDetails(selectedBlogId);
            if (response && response.success && response.data) {
                setCurrentBlogComments(response.data.comments || []);
            }
        } catch (error) {
            console.error('Error refreshing comments:', error);
        } finally {
            setCommentsLoading(false);
        }
    };

    // Open edit modal for a blog
    const handleEditBlog = (blog) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentBlogToEdit(blog);
        setEditModalVisible(true);
    };

    // Handle blog update through the modal
    const handleUpdateBlog = async (updatedData) => {
        if (!currentBlogToEdit || !currentBlogToEdit.blog_id) {
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

            const response = await editBlog(currentBlogToEdit.blog_id, postData);

            if (response && response.success) {
                // Update the blog in the state
                setBlogs(blogs.map(blog =>
                    blog.blog_id === currentBlogToEdit.blog_id
                        ? { ...blog, ...postData, image: postData.image }
                        : blog
                ));

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setEditModalVisible(false);
                setCurrentBlogToEdit(null);
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

    // Handle blog deletion with confirmation
    const handleDeleteBlog = (blogId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Alert.alert(
            "Delete Blog",
            "Are you sure you want to delete this blog? This action cannot be undone.",
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
                            setLoading(true);
                            const response = await deleteBlog(blogId);
                            if (response.success) {
                                // Remove the blog from the state
                                setBlogs(blogs.filter(blog => blog.blog_id !== blogId));
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } else {
                                Alert.alert("Error", response.message || "Failed to delete blog");
                            }
                        } catch (err) {
                            console.error('Error deleting blog:', err);
                            Alert.alert("Error", "Failed to delete blog. Please try again.");
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Navigate to create new blog
    const handleCreateNewBlog = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/createBlog');
    };

    // Render a blog card
    const renderBlogCard = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 100 * index, type: 'timing', duration: 500 }}
            className={`mb-4 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    className="w-full h-48"
                    resizeMode="cover"
                />
            ) : (
                <View className={`w-full h-48 items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <BookOpen size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No image available</Text>
                </View>
            )}

            <View className="p-4">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                        <Text className="bg-primary-100 text-primary-700 text-xs font-montserrat-medium px-2 py-1 rounded-full">
                            {item.category?.category_name || 'General'}
                        </Text>

                        <View className="flex-row items-center ml-3">
                            <Clock size={12} color="#9CA3AF" />
                            <Text className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {calculateReadTime(item.content)}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={() => handleEditBlog(item)}
                            className="p-2 mr-2"
                        >
                            <Edit2 size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleDeleteBlog(item.blog_id)}
                            className="p-2"
                        >
                            <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text className={`text-lg font-montserrat-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {item.title}
                </Text>

                <Text className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} numberOfLines={2}>
                    {item.content?.substring(0, 120)}...
                </Text>

                <View className="flex-row justify-between items-center mt-2">
                    <View className="flex-row items-center">
                        <View className="flex-row items-center mr-4">
                            <Heart size={14} color="#EF4444" />
                            <Text className={`ml-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.likesCount || 0}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => handleViewComments(item.blog_id)}
                            className="flex-row items-center"
                        >
                            <MessageSquare size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text className={`ml-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.commentsCount || 0}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(item.createdAt)}
                    </Text>
                </View>
            </View>
        </MotiView>
    );

    // Render add new blog button
    const renderAddBlogButton = () => (
        <TouchableOpacity
            onPress={handleCreateNewBlog}
            className={`mb-4 rounded-xl p-4 flex-row items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-primary-50'}`}
        >
            <Plus size={18} color="#6366F1" />
            <Text className="ml-2 font-montserrat-medium text-primary-600">
                Create New Blog
            </Text>
        </TouchableOpacity>
    );

    // Convert the current blog for editor format
    const prepareCurrentBlogForEditor = () => {
        if (!currentBlogToEdit) return null;

        return {
            title: currentBlogToEdit.title || '',
            content: currentBlogToEdit.content || '',
            images: currentBlogToEdit.image ? [currentBlogToEdit.image] : [],
            category_id: currentBlogToEdit.category_id,
            is_public: currentBlogToEdit.is_public !== false // Default to true if not specified
        };
    };

    if (loading && !refreshing && blogs.length === 0) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
                <Text className={`mt-4 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Loading your blogs...
                </Text>
            </View>
        );
    }

    if (error && blogs.length === 0) {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className={`text-lg font-montserrat-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Couldn't load your blogs
                </Text>
                <Text className={`text-center mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {error}
                </Text>
                <TouchableOpacity
                    onPress={fetchUserBlogs}
                    className="bg-primary-500 px-4 py-2 rounded-lg"
                >
                    <Text className="text-white font-montserrat-medium">Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1">
            <FlatList
                data={blogs}
                renderItem={renderBlogCard}
                keyExtractor={(item) => item.blog_id?.toString() || Math.random().toString()}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderAddBlogButton}
                ListEmptyComponent={
                    <View className="items-center justify-center py-8">
                        <BookOpen size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text className={`mt-4 text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            No blogs yet
                        </Text>
                        <Text className={`text-center mt-2 mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Share your habit journey by creating your first blog
                        </Text>
                    </View>
                }
                refreshing={refreshing}
                onRefresh={handleRefresh}
                contentContainerStyle={{ paddingBottom: 20 }}
            />

            {/* Edit Blog Modal */}
            {currentBlogToEdit && (
                <BlogPostCreator
                    visible={editModalVisible}
                    onClose={() => {
                        setEditModalVisible(false);
                        setCurrentBlogToEdit(null);
                    }}
                    onPost={handleUpdateBlog}
                    loading={editLoading}
                    initialData={prepareCurrentBlogForEditor()}
                    isEditMode={true}
                />
            )}

            {/* Comments Modal */}
            <Modal
                visible={commentsModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={closeCommentsModal}
            >
                <SafeAreaView style={{
                    flex: 1,
                    backgroundColor: isDark ? '#111827' : '#F9FAFB'
                }}>
                    {/* Comments Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
                    }}>
                        <TouchableOpacity
                            onPress={closeCommentsModal}
                            style={{
                                padding: 8,
                                borderRadius: 20,
                                backgroundColor: isDark ? '#374151' : '#F3F4F6'
                            }}
                        >
                            <X size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
                        </TouchableOpacity>

                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: isDark ? '#F9FAFB' : '#111827',
                            fontFamily: 'montserrat-bold'
                        }}>
                            Comments
                        </Text>

                        <View style={{ width: 36 }} />
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        {/* Comments List */}
                        <View style={{ padding: 16 }}>
                            {commentsLoading ? (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 32
                                }}>
                                    <ActivityIndicator size="large" color="#7C3AED" />
                                    <Text style={{
                                        marginTop: 16,
                                        color: isDark ? '#D1D5DB' : '#4B5563',
                                        fontFamily: 'montserrat'
                                    }}>
                                        Loading comments...
                                    </Text>
                                </View>
                            ) : currentBlogComments.length === 0 ? (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 32
                                }}>
                                    <MessageSquare size={48} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Text style={{
                                        marginTop: 16,
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        color: isDark ? '#F9FAFB' : '#111827',
                                        fontFamily: 'montserrat-bold'
                                    }}>
                                        No comments yet
                                    </Text>
                                    <Text style={{
                                        textAlign: 'center',
                                        marginTop: 8,
                                        color: isDark ? '#9CA3AF' : '#6B7280',
                                        fontFamily: 'montserrat'
                                    }}>
                                        Be the first to share your thoughts!
                                    </Text>
                                </View>
                            ) : (
                                currentBlogComments.map(comment => (
                                    <Comment
                                        key={comment.comment_id}
                                        comment={comment}
                                        isDark={isDark}
                                        onReply={handleReplyToComment}
                                        onLike={handleLikeComment}
                                        formatDate={formatCommentDate}
                                        refreshComments={refreshComments}
                                        blogId={selectedBlogId}
                                        closeCommentsModal={closeCommentsModal}
                                        highlightCurrentUser={true}
                                    />
                                ))
                            )}
                        </View>
                    </ScrollView>

                    {/* Add Comment Input */}
                    <View style={{
                        padding: 8,
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#374151' : '#E5E7EB',
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
                    }}>
                        {replyingToComment ? (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                marginBottom: 8,
                                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                borderRadius: 8
                            }}>
                                <Text style={{
                                    fontSize: 13,
                                    color: isDark ? '#D1D5DB' : '#4B5563'
                                }}>
                                    Replying to {replyingToComment.user?.user_name || 'comment'}
                                </Text>
                                <TouchableOpacity onPress={() => setReplyingToComment(null)}>
                                    <X size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <CommentInput
                            isDark={isDark}
                            onSubmit={handleSubmitComment}
                            placeholder={replyingToComment ? "Write a reply..." : "Add a comment..."}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </View>
    );
};

export default BlogsComponent;