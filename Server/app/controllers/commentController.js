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
        const user_id = req.user;
        const { content, parent_id } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Comment content is required'
            });
        }

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

        // If parent_id is provided, check if parent comment exists
        if (parent_id) {
            const parentComment = await prisma.comment.findUnique({
                where: { comment_id: parseInt(parent_id) }
            });

            if (!parentComment) {
                return res.status(404).json({
                    success: false,
                    error: 'Parent comment not found'
                });
            }
        }

        // Create the comment
        const newComment = await prisma.comment.create({
            data: {
                content,
                user_id: parseInt(user_id),
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
                }
            }
        });

        // Create a notification for the blog owner if the comment is not by the owner
        if (blog.user_id !== parseInt(user_id)) {
            await prisma.notification.create({
                data: {
                    user_id: blog.user_id,
                    title: 'New Comment',
                    content: `Someone commented on your post: "${blog.title}"`,
                    type: 'BLOG_COMMENT',
                    related_id: newComment.comment_id
                }
            });
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
            where: { blog_id }
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
                await prisma.notification.create({
                    data: {
                        user_id: blog.user_id,
                        title: 'New Like',
                        content: `Someone liked your post: "${blog.title}"`,
                        type: 'BLOG_LIKE',
                        related_id: blog_id
                    }
                });
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

module.exports = {
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleLike
};