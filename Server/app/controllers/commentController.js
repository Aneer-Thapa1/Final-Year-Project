const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all comments for a blog
const getComments = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);

        // Check if blog exists
        const blog = await prisma.blog.findUnique({
            where: { blog_id }
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        // Get top-level comments with their replies
        const comments = await prisma.comment.findMany({
            where: {
                blog_id,
                parent_id: null // Only get top-level comments
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: comments
        });
    } catch (error) {
        console.error('Error getting comments:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get comments',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Add a comment to a blog
const addComment = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const user_id = parseInt(req.user);
        const { content, parent_id } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Comment content is required'
            });
        }

        // Check if blog exists
        const blog = await prisma.blog.findUnique({
            where: { blog_id },
            select: {
                blog_id: true,
                title: true,
                user_id: true
            }
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        // If parent_id is provided, check if parent comment exists and get parent author info
        let parentComment = null;
        let isReplyToOtherUser = false;
        let parentAuthorId = null;

        if (parent_id) {
            parentComment = await prisma.comment.findUnique({
                where: { comment_id: parseInt(parent_id) },
                include: {
                    user: {
                        select: {
                            user_id: true,
                            user_name: true
                        }
                    }
                }
            });

            if (!parentComment) {
                return res.status(404).json({
                    success: false,
                    error: 'Parent comment not found'
                });
            }

            // Check if replying to someone else's comment
            parentAuthorId = parentComment.user_id;
            isReplyToOtherUser = parentAuthorId !== user_id;
        }

        // Create the comment
        const newComment = await prisma.comment.create({
            data: {
                content,
                user_id,
                blog_id,
                parent_id: parent_id ? parseInt(parent_id) : null
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                blog: {
                    select: {
                        title: true,
                    }
                }
            }
        });

        // Get notification service
        const notificationService = require('../controllers/pushNotificationController');

        // Create a shortened version of the comment if it's too long
        const commentPreview = content.length > 50
            ? content.substring(0, 47) + '...'
            : content;

        // CASE 1: Notify blog owner if the comment is not by the owner
        if (blog.user_id !== user_id) {
            // Create in-app notification for blog owner
            await prisma.notification.create({
                data: {
                    user_id: blog.user_id,
                    title: 'New Comment',
                    content: `${newComment.user.user_name} commented on your post: "${blog.title}"\n"${commentPreview}"`,
                    type: 'BLOG_COMMENT',
                    related_id: newComment.comment_id,
                    action_url: `/blog/${blog_id}#comment-${newComment.comment_id}`
                }
            });

            // Send push notification to blog owner
            await notificationService.sendToUser(
                blog.user_id,
                'New Comment',
                `${newComment.user.user_name} commented on your post: "${commentPreview}"`,
                {
                    type: 'BLOG_COMMENT',
                    blogId: blog_id,
                    commentId: newComment.comment_id,
                    commenterId: user_id,
                    commenterName: newComment.user.user_name,
                    blogTitle: blog.title
                }
            );
        }

        // CASE 2: Notify parent comment author if this is a reply to someone else's comment
        // and that person is not the blog owner (to avoid duplicate notifications)
        if (isReplyToOtherUser && parentAuthorId !== blog.user_id) {
            // Create in-app notification for parent comment author
            await prisma.notification.create({
                data: {
                    user_id: parentAuthorId,
                    title: 'New Reply',
                    content: `${newComment.user.user_name} replied to your comment on "${blog.title}"\n"${commentPreview}"`,
                    type: 'COMMENT_REPLY',
                    related_id: newComment.comment_id,
                    action_url: `/blog/${blog_id}#comment-${newComment.comment_id}`
                }
            });

            // Send push notification to parent comment author
            await notificationService.sendToUser(
                parentAuthorId,
                'New Reply',
                `${newComment.user.user_name} replied to your comment: "${commentPreview}"`,
                {
                    type: 'COMMENT_REPLY',
                    blogId: blog_id,
                    commentId: newComment.comment_id,
                    parentCommentId: parseInt(parent_id),
                    replierId: user_id,
                    replierName: newComment.user.user_name,
                    blogTitle: blog.title
                }
            );
        }

        return res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to add comment',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Edit a comment
const updateComment = async (req, res) => {
    try {
        const comment_id = parseInt(req.params.comment_id);
        const user_id = req.user;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Comment content is required'
            });
        }

        // Check if comment exists and belongs to the user
        const comment = await prisma.comment.findUnique({
            where: { comment_id }
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        if (comment.user_id !== parseInt(user_id)) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own comments'
            });
        }

        // Update the comment
        const updatedComment = await prisma.comment.update({
            where: { comment_id },
            data: { content },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Comment updated successfully',
            data: updatedComment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update comment',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Delete a comment
const deleteComment = async (req, res) => {
    try {
        const comment_id = parseInt(req.params.comment_id);
        const user_id = req.user;

        // Check if comment exists and belongs to the user
        const comment = await prisma.comment.findUnique({
            where: { comment_id },
            include: {
                blog: {
                    select: {
                        user_id: true
                    }
                }
            }
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        // Allow deletion if user is the comment author or the blog owner
        if (comment.user_id !== parseInt(user_id) && comment.blog.user_id !== parseInt(user_id)) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own comments or comments on your blog'
            });
        }

        // Delete the comment (this will cascade to replies in the DB)
        await prisma.comment.delete({
            where: { comment_id }
        });

        return res.status(200).json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete comment',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Toggle like on a blog
const toggleLike = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const user_id = parseInt(req.user);

        // Check if blog exists
        const blog = await prisma.blog.findUnique({
            where: { blog_id },
            select: {
                blog_id: true,
                title: true,
                user_id: true,
                slug: true
            }
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        // Check if user already liked this blog
        const existingLike = await prisma.like.findUnique({
            where: {
                user_id_blog_id: {
                    user_id,
                    blog_id
                }
            }
        });

        // If already liked, unlike it
        if (existingLike) {
            await prisma.like.delete({
                where: {
                    user_id_blog_id: {
                        user_id,
                        blog_id
                    }
                }
            });

            // Get updated likes count
            const likesCount = await prisma.like.count({
                where: { blog_id }
            });

            return res.status(200).json({
                success: true,
                message: 'Blog unliked successfully',
                liked: false,
                likesCount
            });
        }
        // Otherwise, like it
        else {
            await prisma.like.create({
                data: {
                    user_id,
                    blog_id
                }
            });

            // Get updated likes count
            const likesCount = await prisma.like.count({
                where: { blog_id }
            });

            // Create notification for blog owner if the like is not by the owner
            if (blog.user_id !== user_id) {
                // Get user data for the person who liked the post
                const liker = await prisma.user.findUnique({
                    where: { user_id },
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                });

                // Get notification service
                const notificationService = require('../controllers/pushNotificationController');

                // Create in-app notification with the liker's name
                await prisma.notification.create({
                    data: {
                        user_id: blog.user_id,
                        title: 'New Like',
                        content: `${liker.user_name} liked your post "${blog.title}"`,
                        type: 'BLOG_LIKE',
                        related_id: blog_id,
                        action_url: `/blog/${blog.slug || blog_id}`
                    }
                });

                // Send push notification with liker's name
                await notificationService.sendToUser(
                    blog.user_id,
                    'New Like',
                    `${liker.user_name} liked your post "${blog.title}"`,
                    {
                        type: 'BLOG_LIKE',
                        blogId: blog_id,
                        likerId: user_id,
                        likerName: liker.user_name,
                        likerAvatar: liker.avatar,
                        blogTitle: blog.title,
                        blogSlug: blog.slug
                    }
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Blog liked successfully',
                liked: true,
                likesCount
            });
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to toggle like',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Toggle like on a comment
const toggleCommentLike = async (req, res) => {
    try {
        const comment_id = parseInt(req.params.comment_id);
        const user_id = parseInt(req.user);

        // Check if comment exists
        const comment = await prisma.comment.findUnique({
            where: { comment_id },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true
                    }
                },
                blog: {
                    select: {
                        blog_id: true,
                        title: true,
                        slug: true
                    }
                }
            }
        });

        if (!comment) {
            return res.status(404).json({
                success: false,
                error: 'Comment not found'
            });
        }

        // Check if user already liked this comment
        const existingLike = await prisma.commentLike.findUnique({
            where: {
                user_id_comment_id: {
                    user_id,
                    comment_id
                }
            }
        });

        // If already liked, unlike it
        if (existingLike) {
            await prisma.commentLike.delete({
                where: {
                    user_id_comment_id: {
                        user_id,
                        comment_id
                    }
                }
            });

            // Get updated likes count
            const likesCount = await prisma.commentLike.count({
                where: { comment_id }
            });

            return res.status(200).json({
                success: true,
                message: 'Comment unliked successfully',
                liked: false,
                likesCount
            });
        }
        // Otherwise, like it
        else {
            await prisma.commentLike.create({
                data: {
                    user_id,
                    comment_id
                }
            });

            // Get updated likes count
            const likesCount = await prisma.commentLike.count({
                where: { comment_id }
            });

            // Create notification for comment author if the like is not by the author
            if (comment.user_id !== user_id) {
                // Get user data for the person who liked the comment
                const liker = await prisma.user.findUnique({
                    where: { user_id },
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                });

                // Create a shortened version of the comment if it's too long
                const commentPreview = comment.content.length > 50
                    ? comment.content.substring(0, 47) + '...'
                    : comment.content;

                // Get notification service
                const notificationService = require('../controllers/pushNotificationController');

                // Create in-app notification with the liker's name
                await prisma.notification.create({
                    data: {
                        user_id: comment.user_id,
                        title: 'Comment Liked',
                        content: `${liker.user_name} liked your comment "${commentPreview}" on "${comment.blog.title}"`,
                        type: 'COMMENT_LIKE',
                        related_id: comment_id,
                        action_url: `/blog/${comment.blog.slug || comment.blog.blog_id}#comment-${comment_id}`
                    }
                });

                // Send push notification with liker's name
                await notificationService.sendToUser(
                    comment.user_id,
                    'Comment Liked',
                    `${liker.user_name} liked your comment on "${comment.blog.title}"`,
                    {
                        type: 'COMMENT_LIKE',
                        blogId: comment.blog.blog_id,
                        commentId: comment_id,
                        likerId: user_id,
                        likerName: liker.user_name,
                        likerAvatar: liker.avatar,
                        commentPreview: commentPreview,
                        blogTitle: comment.blog.title
                    }
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Comment liked successfully',
                liked: true,
                likesCount
            });
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to toggle comment like',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleLike
};