import { View, Text, Image, TouchableOpacity, TextInput, Pressable, Alert, Platform } from 'react-native';
import React, { useState, useRef } from 'react';
import { Heart, Reply, MoreHorizontal, Send, ChevronDown, ChevronUp, Edit, Trash } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { updateComment, deleteComment, addComment } from '../services/commentService';

const MAX_NESTING_DEPTH = 3;

const Comment = ({
                     comment,
                     isDark,
                     onReply,
                     onLike,
                     currentUser,
                     formatDate,
                     refreshComments,
                     blogId
                 }) => {
    // Make sure comment is defined before using it
    if (!comment) {
        return null;
    }

    const inputRef = useRef(null);

    // States - with safe defaults to prevent undefined errors
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(true);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content || comment.text || '');
    const [likesCount, setLikesCount] = useState(comment.likes || 0);

    // Calculate depth based on whether this is a reply
    const depth = comment.parent_id ? 1 : 0;

    // Safely extract user data
    const userName = comment.user?.user_name || comment.user?.name || 'Anonymous';
    const userAvatar = comment.user?.avatar || 'https://via.placeholder.com/40';
    const commentText = comment.content || comment.text || '';
    const commentTime = formatDate ? formatDate(comment.createdAt || comment.time) : (comment.time || 'Recently');

    // Check if current user is the comment author (with null checking)
    const isCommentAuthor = currentUser &&
        ((comment.user_id && currentUser.user_id === comment.user_id) ||
            (comment.user && comment.user.user_id && currentUser.user_id === comment.user.user_id));

    // Get replies safely
    const replies = comment.replies || [];

    // Handle like - Updated to work properly with backend
    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Update local state for immediate feedback
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikesCount(newIsLiked ? likesCount + 1 : likesCount - 1);

        // Call parent onLike handler with the comment ID for the API call
        if (onLike && typeof onLike === 'function') {
            // Pass both the ID and the new liked state for proper backend handling
            onLike(comment.comment_id || comment.id, newIsLiked);
        }
    };

    // Handle reply button click
    const handleReply = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // If the parent component provides an onReply function, use it
        if (onReply && typeof onReply === 'function') {
            onReply(comment);
            return;
        }

        // Otherwise use the built-in reply functionality
        setShowReplyInput(!showReplyInput);
        if (!showReplyInput) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Submit a reply
    const submitReply = async () => {
        if (!replyText.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const commentData = {
                content: replyText,
                parent_id: comment.comment_id || comment.id
            };

            const response = await addComment(blogId, commentData);

            if (response && response.success) {
                setReplyText('');
                setShowReplyInput(false);
                refreshComments();
            } else {
                Alert.alert('Error', 'Failed to add reply');
            }
        } catch (error) {
            console.error('Error adding reply:', error);
            Alert.alert('Error', 'Failed to add reply');
        }
    };

    // Toggle showing replies
    const toggleReplies = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowReplies(!showReplies);
    };

    // Start editing comment
    const startEditing = () => {
        setIsEditing(true);
        setIsOptionsVisible(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Cancel editing
    const cancelEditing = () => {
        setIsEditing(false);
        setEditText(comment.content || comment.text || '');
    };

    // Save edited comment
    const saveEditedComment = async () => {
        if (!editText.trim()) return;

        try {
            const response = await updateComment(comment.comment_id || comment.id, {
                content: editText
            });

            if (response && response.success) {
                setIsEditing(false);
                refreshComments();
            } else {
                Alert.alert('Error', 'Failed to update comment');
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            Alert.alert('Error', 'Failed to update comment');
        }
    };

    // Confirm deletion
    const confirmDeleteComment = () => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: handleDeleteComment
                }
            ]
        );
    };

    // Delete comment
    const handleDeleteComment = async () => {
        try {
            const response = await deleteComment(comment.comment_id || comment.id);

            if (response && response.success) {
                setIsOptionsVisible(false);
                refreshComments();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('Error', 'Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Failed to delete comment');
        }
    };

    return (
        <View style={{
            marginLeft: depth > 0 ? 32 : 0,
            borderLeftWidth: depth > 0 ? 2 : 0,
            borderLeftColor: isDark ? '#374151' : '#E5E7EB',
            paddingLeft: depth > 0 ? 16 : 0,
            marginBottom: 16, // Increased bottom margin for better spacing
            paddingTop: depth > 0 ? 8 : 16, // Add top padding, more for top-level comments
            paddingBottom: 4 // Add bottom padding
        }}>
            {/* Main Comment */}
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300 }}
                style={{
                    marginBottom: 12,
                    marginTop: depth > 0 ? 4 : 0 // Adjusted top margin
                }}
            >
                {/* User Info and Comment */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Avatar */}
                    <MotiView
                        from={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', delay: 150 }}
                    >
                        <Image
                            source={{ uri: userAvatar }}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: isDark ? '#374151' : '#F3F4F6'
                            }}
                        />
                    </MotiView>

                    {/* Comment Content */}
                    <View style={{ flex: 1 }}>
                        {isEditing ? (
                            <View style={{ marginBottom: 12 }}>
                                <TextInput
                                    ref={inputRef}
                                    value={editText}
                                    onChangeText={setEditText}
                                    style={{
                                        borderRadius: 16,
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                        color: isDark ? '#F9FAFB' : '#111827',
                                        borderWidth: 1,
                                        borderColor: isDark ? '#374151' : '#E5E7EB',
                                        minHeight: 80 // Minimum height for better editing experience
                                    }}
                                    placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                    multiline
                                    maxLength={500}
                                />
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end',
                                    marginTop: 12, // Increased margin
                                    gap: 12 // Increased gap
                                }}>
                                    <TouchableOpacity
                                        onPress={cancelEditing}
                                        style={{
                                            paddingHorizontal: 16, // Wider button
                                            paddingVertical: 8, // Taller button
                                            borderRadius: 8,
                                            backgroundColor: isDark ? '#374151' : '#E5E7EB'
                                        }}
                                    >
                                        <Text style={{ color: isDark ? '#F9FAFB' : '#111827' }}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={saveEditedComment}
                                        style={{
                                            paddingHorizontal: 16, // Wider button
                                            paddingVertical: 8, // Taller button
                                            borderRadius: 8,
                                            backgroundColor: '#7C3AED'
                                        }}
                                    >
                                        <Text style={{ color: '#FFFFFF' }}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <>
                                {/* Comment Bubble */}
                                <View style={{
                                    borderRadius: 16,
                                    padding: 16, // Increased padding
                                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                }}>
                                    {/* Username and Options */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 6 // Increased margin
                                    }}>
                                        <Text style={{
                                            fontWeight: '600',
                                            fontSize: 15, // Slightly larger username
                                            color: isDark ? '#F9FAFB' : '#111827'
                                        }}>
                                            {userName}
                                        </Text>
                                        {isCommentAuthor && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setIsOptionsVisible(!isOptionsVisible);
                                                }}
                                                style={{
                                                    padding: 6, // Larger touch target
                                                    marginRight: -4 // Adjust positioning
                                                }}
                                            >
                                                <MoreHorizontal
                                                    size={16}
                                                    color={isDark ? '#94A3B8' : '#6B7280'}
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Comment Text */}
                                    <Text style={{
                                        fontSize: 15,
                                        color: isDark ? '#D1D5DB' : '#374151',
                                        lineHeight: 22 // Increased line height for better readability
                                    }}>
                                        {commentText}
                                    </Text>
                                </View>

                                {/* Options Menu */}
                                <AnimatePresence>
                                    {isOptionsVisible && (
                                        <MotiView
                                            from={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: 50, // Adjusted position
                                                zIndex: 50,
                                                borderRadius: 12,
                                                overflow: 'hidden',
                                                shadowColor: "#000",
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 2,
                                                },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 3.84,
                                                elevation: 5,
                                                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)'
                                            }}
                                        >
                                            <View style={{ padding: 8 }}>
                                                <Pressable
                                                    onPress={startEditing}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 10, // Taller buttons
                                                        borderRadius: 8,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Edit
                                                        size={16}
                                                        color={isDark ? '#E2E8F0' : '#4B5563'}
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <Text style={{
                                                        color: isDark ? '#F9FAFB' : '#111827',
                                                        fontSize: 14 // Slightly larger text
                                                    }}>
                                                        Edit
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={confirmDeleteComment}
                                                    style={{
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 10, // Taller buttons
                                                        borderRadius: 8,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Trash
                                                        size={16}
                                                        color="#EF4444"
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <Text style={{
                                                        color: '#EF4444',
                                                        fontSize: 14 // Slightly larger text
                                                    }}>
                                                        Delete
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </MotiView>
                                    )}
                                </AnimatePresence>

                                {/* Actions Row */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: 10, // Slightly more margin
                                    paddingLeft: 4, // Add left padding
                                    gap: 24 // More space between items
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        color: isDark ? '#9CA3AF' : '#6B7280'
                                    }}>
                                        {commentTime}
                                    </Text>

                                    {/* Like Button */}
                                    <MotiView
                                        animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                    >
                                        <TouchableOpacity
                                            onPress={handleLike}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: 4 // Added padding for larger touch target
                                            }}
                                        >
                                            <Heart
                                                size={16}
                                                color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                                fill={isLiked ? '#7C3AED' : 'none'}
                                            />
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '500',
                                                color: isLiked
                                                    ? '#7C3AED'
                                                    : (isDark ? '#9CA3AF' : '#6B7280')
                                            }}>
                                                {likesCount}
                                            </Text>
                                        </TouchableOpacity>
                                    </MotiView>

                                    {/* Reply Button */}
                                    {depth < MAX_NESTING_DEPTH && (
                                        <TouchableOpacity
                                            onPress={handleReply}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: 4 // Added padding for larger touch target
                                            }}
                                        >
                                            <Reply
                                                size={16}
                                                color={isDark ? '#94A3B8' : '#6B7280'}
                                            />
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '500',
                                                color: isDark ? '#9CA3AF' : '#6B7280'
                                            }}>
                                                Reply
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Reply Input */}
                        <AnimatePresence>
                            {showReplyInput && (
                                <MotiView
                                    from={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ marginTop: 16 }} // More space above reply input
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-end',
                                        gap: 8
                                    }}>
                                        <TextInput
                                            ref={inputRef}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            placeholder="Write a reply..."
                                            style={{
                                                flex: 1,
                                                borderRadius: 16,
                                                paddingHorizontal: 16,
                                                paddingVertical: 12,
                                                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                                color: isDark ? '#F9FAFB' : '#111827',
                                                borderWidth: 1,
                                                borderColor: isDark ? '#374151' : '#E5E7EB'
                                            }}
                                            placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                            multiline
                                            maxLength={500}
                                        />
                                        <TouchableOpacity
                                            onPress={submitReply}
                                            disabled={!replyText.trim()}
                                            style={{
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: replyText.trim()
                                                    ? '#7C3AED'
                                                    : (isDark ? '#374151' : '#E5E7EB')
                                            }}
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
            {replies.length > 0 && (
                <View>
                    {/* Show/Hide Replies Button */}
                    <TouchableOpacity
                        onPress={toggleReplies}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 8,
                            marginLeft: 52, // Align with comment content
                            paddingLeft: 4 // Small left padding
                        }}
                    >
                        {showReplies ? (
                            <ChevronUp size={16} color="#7C3AED" style={{ marginRight: 4 }} />
                        ) : (
                            <ChevronDown size={16} color="#7C3AED" style={{ marginRight: 4 }} />
                        )}
                        <Text style={{
                            color: '#7C3AED',
                            fontSize: 13,
                            fontWeight: '500'
                        }}>
                            {showReplies ? 'Hide replies' : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
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
                                {replies.map((reply) => (
                                    <Comment
                                        key={reply.comment_id || reply.id}
                                        comment={reply}
                                        isDark={isDark}
                                        onReply={onReply}
                                        onLike={onLike}
                                        currentUser={currentUser}
                                        formatDate={formatDate}
                                        refreshComments={refreshComments}
                                        blogId={blogId}
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