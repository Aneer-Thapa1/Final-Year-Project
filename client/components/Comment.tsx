import {Alert, Image, Keyboard, Platform, Pressable, Text, TextInput, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {ChevronDown, ChevronUp, Edit, Heart, MoreHorizontal, Reply, Send, Trash} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {AnimatePresence, MotiView} from 'moti';
import {addComment, deleteComment, updateComment} from '../services/commentService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {router} from "expo-router"
import {useSelector} from 'react-redux';

const MAX_NESTING_DEPTH = 3;

const Comment = ({
                     comment, isDark, onReply, onLike, formatDate, refreshComments, blogId, closeCommentsModal
                 }) => {
    // Make sure comment is defined before using it
    if (!comment) {
        return null;
    }

    // Get current user from Redux
    const userDetails = useSelector((state) => state.user);
    const currentUser = userDetails?.user || {};

    const insets = useSafeAreaInsets();
    const inputRef = useRef(null);


    // Track keyboard visibility and height
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // States - with safe defaults to prevent undefined errors
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(true);
    const [isOptionsVisible, setIsOptionsVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content || comment.text || '');
    const [likesCount, setLikesCount] = useState(comment.likes || 0);

    // Add keyboard listeners with better height handling
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardVisible(true);
            setKeyboardHeight(event.endCoordinates.height);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Calculate depth based on whether this is a reply
    const depth = comment.parent_id ? 1 : 0;

    // Safely extract user data
    const userName = comment.user?.user_name || comment.user?.name || 'Anonymous';
    const userId = comment.user?.user_id || comment.user?.id;
    const userAvatar = comment.user?.avatar || 'https://via.placeholder.com/40';
    const commentText = comment.content || comment.text || '';
    const commentTime = formatDate ? formatDate(comment.createdAt || comment.time) : (comment.time || 'Recently');

    // Check if current user is the comment author (with null checking)
    const isCommentAuthor = currentUser && currentUser.user.user_id && (userId && currentUser?.user?.user_id === userId);

    // Get replies safely
    const replies = comment.replies || [];

    // Handle profile navigation
    const navigateToProfile = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Close the modal first
        if (closeCommentsModal) {
            closeCommentsModal();
        }

        // Small delay to ensure the modal closes properly before navigation
        setTimeout(() => {
            if (currentUser?.user?.user_id == userId) {
                router.push('/profile');
            } else {
                router.push({
                    pathname: `/(profile)/${userId}`,
                    params: {
                        name: userName || ''
                    }
                });
            }
        }, 50);
    };

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
            // Focus with a shorter delay to ensure keyboard appears
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    };

    // Submit a reply
    const submitReply = async () => {
        if (!replyText.trim()) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const commentData = {
                content: replyText, parent_id: comment.comment_id || comment.id
            };

            const response = await addComment(blogId, commentData);

            if (response && response.success) {
                setReplyText('');
                setShowReplyInput(false);
                refreshComments();
                Keyboard.dismiss();
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

        // Focus with short delay to ensure keyboard appears
        setTimeout(() => {
            inputRef.current?.focus();
        }, 50);
    };

    // Cancel editing
    const cancelEditing = () => {
        setIsEditing(false);
        setEditText(comment.content || comment.text || '');
        Keyboard.dismiss();
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
                Keyboard.dismiss();
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
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [{
            text: 'Cancel', style: 'cancel'
        }, {
            text: 'Delete', style: 'destructive', onPress: handleDeleteComment
        }]);
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

    // Calculate proper top padding for iOS Dynamic Island
    const topPadding = Platform.OS === 'ios' ? (depth === 0 ? Math.max(insets.top, 20) : 6) : (depth > 0 ? 6 : 12);


    return (<View
            style={{
                marginLeft: depth > 0 ? 30 : 0,
                borderLeftWidth: depth > 0 ? 1.5 : 0,
                borderLeftColor: isDark ? '#374151' : '#E5E7EB',
                paddingLeft: depth > 0 ? 12 : 0,
                marginBottom: 12,
                paddingTop: topPadding,
                paddingBottom: 2
            }}
        >
            {/* Main Comment */}
            <MotiView
                from={{opacity: 0, translateY: 10}}
                animate={{opacity: 1, translateY: 0}}
                transition={{type: 'timing', duration: 300}}
                style={{
                    marginBottom: 8, marginTop: 0
                }}
            >
                {/* User Info and Comment */}
                <View style={{flexDirection: 'row', gap: 10}}>
                    {/* Avatar with Touchable */}
                    <TouchableOpacity
                        onPress={navigateToProfile}
                        disabled={!userId}
                        activeOpacity={0.8}
                    >
                        <MotiView
                            from={{scale: 0.8, opacity: 0}}
                            animate={{scale: 1, opacity: 1}}
                            transition={{type: 'spring', delay: 150}}
                        >
                            <Image
                                source={{uri: userAvatar}}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: isDark ? '#374151' : '#F3F4F6'
                                }}
                            />
                        </MotiView>
                    </TouchableOpacity>

                    {/* Comment Content */}
                    <View style={{flex: 1}}>
                        {isEditing ? (<View style={{marginBottom: 8}}>
                                <TextInput
                                    ref={inputRef}
                                    value={editText}
                                    onChangeText={setEditText}
                                    style={{
                                        borderRadius: 12,
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                        color: isDark ? '#F9FAFB' : '#111827',
                                        borderWidth: 1,
                                        borderColor: isDark ? '#374151' : '#E5E7EB',
                                        minHeight: 72,
                                        fontSize: 14.5
                                    }}
                                    placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                    multiline
                                    maxLength={500}
                                    autoFocus={true}
                                />
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-end',
                                    marginTop: 10,
                                    gap: 8,
                                    paddingBottom: keyboardVisible ? 10 : 0
                                }}>
                                    <TouchableOpacity
                                        onPress={cancelEditing}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 6,
                                            backgroundColor: isDark ? '#374151' : '#E5E7EB'
                                        }}
                                    >
                                        <Text
                                            style={{color: isDark ? '#F9FAFB' : '#111827', fontSize: 13}}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={saveEditedComment}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 6,
                                            backgroundColor: '#7C3AED'
                                        }}
                                    >
                                        <Text style={{color: '#FFFFFF', fontSize: 13}}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>) : (<>
                                {/* Comment Bubble */}
                                <View style={{
                                    borderRadius: 14, padding: 12, backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                }}>
                                    {/* Username and Options */}
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 4
                                    }}>
                                        <TouchableOpacity
                                            onPress={navigateToProfile}
                                            disabled={!userId}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={{
                                                fontWeight: '600', fontSize: 14, color: isDark ? '#F9FAFB' : '#111827'
                                            }}>
                                                {userName}
                                            </Text>
                                        </TouchableOpacity>

                                        {isCommentAuthor && (<TouchableOpacity
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setIsOptionsVisible(!isOptionsVisible);
                                                }}
                                                style={{
                                                    padding: 4, marginRight: -2
                                                }}
                                            >
                                                <MoreHorizontal
                                                    size={16}
                                                    color={isDark ? '#94A3B8' : '#6B7280'}
                                                />
                                            </TouchableOpacity>)}
                                    </View>

                                    {/* Comment Text */}
                                    <Text style={{
                                        fontSize: 14.5, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 20
                                    }}>
                                        {commentText}
                                    </Text>
                                </View>

                                {/* Options Menu - Fixed positioning issue */}
                                <AnimatePresence>
                                    {isOptionsVisible && (<MotiView
                                            from={{opacity: 0, scale: 0.95}}
                                            animate={{opacity: 1, scale: 1}}
                                            exit={{opacity: 0, scale: 0.95}}
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: 38,
                                                zIndex: 50,
                                                borderRadius: 10,
                                                overflow: 'hidden',
                                                shadowColor: "#000",
                                                shadowOffset: {
                                                    width: 0, height: 2,
                                                },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 3.84,
                                                elevation: 5,
                                                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)'
                                            }}
                                        >
                                            <View style={{padding: 4}}>
                                                <Pressable
                                                    onPress={startEditing}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 6,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Edit
                                                        size={14}
                                                        color={isDark ? '#E2E8F0' : '#4B5563'}
                                                        style={{marginRight: 6}}
                                                    />
                                                    <Text style={{
                                                        color: isDark ? '#F9FAFB' : '#111827', fontSize: 13
                                                    }}>
                                                        Edit
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    onPress={confirmDeleteComment}
                                                    style={{
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 8,
                                                        borderRadius: 6,
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <Trash
                                                        size={14}
                                                        color="#EF4444"
                                                        style={{marginRight: 6}}
                                                    />
                                                    <Text style={{
                                                        color: '#EF4444', fontSize: 13
                                                    }}>
                                                        Delete
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </MotiView>)}
                                </AnimatePresence>

                                {/* Actions Row */}
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 2, gap: 16
                                }}>
                                    <Text style={{
                                        fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280'
                                    }}>
                                        {commentTime}
                                    </Text>

                                    {/* Like Button */}
                                    <MotiView
                                        animate={{scale: isLiked ? [1, 1.2, 1] : 1}}
                                        transition={{type: 'spring', damping: 10}}
                                    >
                                        <TouchableOpacity
                                            onPress={handleLike}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center', gap: 3, padding: 5
                                            }}
                                        >
                                            <Heart
                                                size={14}
                                                color={isLiked ? '#7C3AED' : (isDark ? '#94A3B8' : '#6B7280')}
                                                fill={isLiked ? '#7C3AED' : 'none'}
                                            />
                                            <Text style={{
                                                fontSize: 11,
                                                fontWeight: '500',
                                                color: isLiked ? '#7C3AED' : (isDark ? '#9CA3AF' : '#6B7280')
                                            }}>
                                                {likesCount}
                                            </Text>
                                        </TouchableOpacity>
                                    </MotiView>

                                    {/* Reply Button */}
                                    {depth < MAX_NESTING_DEPTH && (<TouchableOpacity
                                            onPress={handleReply}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center', gap: 3, padding: 5
                                            }}
                                        >
                                            <Reply
                                                size={14}
                                                color={isDark ? '#94A3B8' : '#6B7280'}
                                            />
                                            <Text style={{
                                                fontSize: 11, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280'
                                            }}>
                                                Reply
                                            </Text>
                                        </TouchableOpacity>)}
                                </View>
                            </>)}

                        {/* Reply Input */}
                        <AnimatePresence>
                            {showReplyInput && (<MotiView
                                    from={{opacity: 0, height: 0}}
                                    animate={{opacity: 1, height: 'auto'}}
                                    exit={{opacity: 0, height: 0}}
                                    style={{
                                        marginTop: 8, paddingBottom: keyboardVisible ? 12 : 0
                                    }}
                                >
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'flex-end', gap: 6
                                    }}>
                                        <TextInput
                                            ref={inputRef}
                                            value={replyText}
                                            onChangeText={setReplyText}
                                            placeholder="Write a reply..."
                                            style={{
                                                flex: 1,
                                                borderRadius: 12,
                                                paddingHorizontal: 12,
                                                paddingTop: 8,
                                                paddingBottom: Platform.OS === 'ios' ? 8 : 6,
                                                backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                                color: isDark ? '#F9FAFB' : '#111827',
                                                borderWidth: 1,
                                                borderColor: isDark ? '#374151' : '#E5E7EB',
                                                fontSize: 14
                                            }}
                                            placeholderTextColor={isDark ? '#94A3B8' : '#9CA3AF'}
                                            multiline
                                            maxLength={500}
                                            autoFocus={true}
                                        />
                                        <TouchableOpacity
                                            onPress={submitReply}
                                            disabled={!replyText.trim()}
                                            style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 18,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                backgroundColor: replyText.trim() ? '#7C3AED' : (isDark ? '#374151' : '#E5E7EB')
                                            }}
                                        >
                                            <Send
                                                size={16}
                                                color={replyText.trim() ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </MotiView>)}
                        </AnimatePresence>
                    </View>
                </View>
            </MotiView>

            {/* Nested Replies */}
            {replies.length > 0 && (<View>
                    {/* Show/Hide Replies Button */}
                    <TouchableOpacity
                        onPress={toggleReplies}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 4,
                            marginLeft: 46,
                            paddingLeft: 2
                        }}
                    >
                        {showReplies ? (<ChevronUp size={14} color="#7C3AED" style={{marginRight: 3}}/>) : (
                            <ChevronDown size={14} color="#7C3AED" style={{marginRight: 3}}/>)}
                        <Text style={{
                            color: '#7C3AED', fontSize: 12, fontWeight: '500'
                        }}>
                            {showReplies ? 'Hide replies' : `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                        </Text>
                    </TouchableOpacity>

                    {/* Nested Replies List */}
                    <AnimatePresence>
                        {showReplies && (<MotiView
                                from={{opacity: 0}}
                                animate={{opacity: 1}}
                                exit={{opacity: 0}}
                            >
                                {replies.map((reply) => (<Comment
                                        key={reply.comment_id || reply.id}
                                        comment={reply}
                                        isDark={isDark}
                                        onReply={onReply}
                                        onLike={onLike}
                                        formatDate={formatDate}
                                        refreshComments={refreshComments}
                                        blogId={blogId}
                                        closeCommentsModal={closeCommentsModal}
                                    />))}
                            </MotiView>)}
                    </AnimatePresence>
                </View>)}
        </View>);
};

export default Comment;