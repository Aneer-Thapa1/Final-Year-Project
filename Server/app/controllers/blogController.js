const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Function to add blog
const addBlog = async (req, res) => {
    // Getting data from front end
    const { title, content, category_id, is_featured = false } = req.body;

    // Getting user_id extracted from middleware
    const user_id = req.user;

    // Check if all necessary fields are filled
    if (!title || !content || !category_id) {
        return res.status(400).json({ error: 'Please enter all required details: title, content, and category.' });
    }

    try {
        // Get the image file path if an image was uploaded
        const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

console.log(imagePath)

        // Starting transaction query so that points_gained do not change in error
        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(user_id) }
            });

            // Checking if user with that user_id exists or not
            if (!user) {
                throw new Error('User not found');
            }

            // Logic to make sure if user have enough points to add a blog to prevent spam and unwanted blogs
            if (user.points_gained < 20) {
                throw new Error("You do not meet the requirement to add a blog!");
            }

            // Check if the category exists
            const category = await prisma.category.findUnique({
                where: { category_id: parseInt(category_id) }
            });

            if (!category) {
                throw new Error("Invalid category selected.");
            }

            // Update user points by deducting 20 points
            const updatedUser = await prisma.user.update({
                where: { user_id: parseInt(user_id) },
                data: { points_gained: user.points_gained - 20 }
            });

            // Add new blog entry with the image path
            const newBlog = await prisma.blog.create({
                data: {
                    title,
                    content,
                    image: imagePath, // Use the path from multer
                    is_featured,
                    user_id: parseInt(user_id),
                    category_id: parseInt(category_id),
                    view_count: 0
                }
            });

            return { updatedUser, newBlog };
        });

        // If transaction is successful
        return res.status(201).json({
            success: true,
            message: 'Blog added successfully',
            blog: result.newBlog
        });

    } catch (error) {
        console.error('Error adding blog:', error);
        // Transaction failed
        return res.status(403).json({ success: false, error: error.message });
    }
};


// Function to retrieve blogs for a user (feed) with improved pagination
const getBlogs = async (req, res) => {
    const user_id = req.user;
    const lastLoadedBlogId = req.query.lastLoadedBlogId ? parseInt(req.query.lastLoadedBlogId) : 0;
    const limit = parseInt(req.query.limit) || 10;

    try {
        // Find the blogs with proper pagination
        const blogs = await prisma.blog.findMany({
            where: lastLoadedBlogId > 0
                ? {
                    blog_id: { gt: lastLoadedBlogId }
                }
                : {},
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                category: {
                    select: {
                        category_id: true,
                        category_name: true,
                        icon: true,
                        color: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            take: limit,
            orderBy: [
                { is_featured: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        // Check if user has liked each blog
        const blogsWithLikeStatus = await Promise.all(blogs.map(async (blog) => {
            const userLike = await prisma.like.findUnique({
                where: {
                    user_id_blog_id: {
                        user_id: parseInt(user_id),
                        blog_id: blog.blog_id
                    }
                }
            });

            return {
                ...blog,
                likesCount: blog._count.likes,
                commentsCount: blog._count.comments,
                isLiked: !!userLike,
                _count: undefined // Remove _count from response
            };
        }));

        if (blogs.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No more blogs found",
                data: []
            });
        }

        res.status(200).json({
            success: true,
            data: blogsWithLikeStatus
        });
    } catch (error) {
        console.error('Error getting blogs:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while retrieving blogs'
        });
    }
};

// Function to edit an existing blog
const editBlog = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const { title, content, category_id, is_featured } = req.body;
        const user_id = parseInt(req.user);

        // Input validation
        if (!title || !content || !category_id) {
            return res.status(400).json({
                success: false,
                error: 'Blog title, content and category are required!'
            });
        }

        // Check if blog exists and belongs to the user
        const existingBlog = await prisma.blog.findUnique({
            where: {
                blog_id: blog_id
            }
        });

        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found!'
            });
        }

        // Check if the blog belongs to the authenticated user
        if (existingBlog.user_id !== parseInt(user_id)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to edit this blog!'
            });
        }

        // Check if the category exists
        const category = await prisma.category.findUnique({
            where: { category_id: parseInt(category_id) }
        });

        if (!category) {
            return res.status(400).json({
                success: false,
                error: "Invalid category selected."
            });
        }

        // Handle the image file - if a new one is uploaded, use that, otherwise keep the existing one
        const imagePath = req.file
            ? `/uploads/${req.file.filename}`
            : existingBlog.image;

        // Update blog
        const updatedBlog = await prisma.blog.update({
            where: {
                blog_id: blog_id
            },
            data: {
                title,
                content,
                image: imagePath,
                category_id: parseInt(category_id),
                is_featured: is_featured !== undefined ? is_featured : existingBlog.is_featured,
                updatedAt: new Date()
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            data: updatedBlog
        });

    } catch (error) {
        console.error('Error updating blog:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update blog',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Function to delete a blog
const deleteBlog = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const user_id = req.user;

        // Check if blog exists and belongs to the user
        const existingBlog = await prisma.blog.findUnique({
            where: {
                blog_id: blog_id
            }
        });

        if (!existingBlog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found!'
            });
        }

        // Check if the blog belongs to the authenticated user
        if (existingBlog.user_id !== parseInt(user_id)) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to delete this blog!'
            });
        }

        // Delete all likes and comments related to the blog
        await prisma.$transaction([
            prisma.like.deleteMany({
                where: { blog_id: blog_id }
            }),
            prisma.comment.deleteMany({
                where: { blog_id: blog_id }
            }),
            prisma.blog.delete({
                where: {
                    blog_id: blog_id
                }
            })
        ]);

        // Refund points to the user
        await prisma.user.update({
            where: { user_id: parseInt(user_id) },
            data: {
                points_gained: {
                    increment: 20 // Refunding the points that were deducted when blog was created
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Blog deleted successfully and points refunded'
        });

    } catch (error) {
        console.error('Error deleting blog:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete blog',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Function to get blogs created by the authenticated user
const getUserBlogs = async (req, res) => {
    const user_id = req.user;

    try {
        const blogs = await prisma.blog.findMany({
            where: {
                user_id: parseInt(user_id)
            },
            include: {
                category: {
                    select: {
                        category_id: true,
                        category_name: true,
                        icon: true,
                        color: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const blogsWithCounts = blogs.map(blog => ({
            ...blog,
            likesCount: blog._count.likes,
            commentsCount: blog._count.comments,
            _count: undefined
        }));

        res.status(200).json({
            success: true,
            data: blogsWithCounts
        });
    } catch (error) {
        console.error('Error getting user blogs:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while retrieving your blogs'
        });
    }
};

// Function to like/unlike a blog
const toggleLikeBlog = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const user_id = req.user;

        // Check if blog exists
        const blog = await prisma.blog.findUnique({
            where: { blog_id }
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found!'
            });
        }

        // Check if user has already liked this blog
        const existingLike = await prisma.like.findUnique({
            where: {
                user_id_blog_id: {
                    user_id: parseInt(user_id),
                    blog_id
                }
            }
        });

        if (existingLike) {
            // Unlike the blog
            await prisma.like.delete({
                where: {
                    user_id_blog_id: {
                        user_id: parseInt(user_id),
                        blog_id
                    }
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Blog unliked successfully',
                liked: false
            });
        } else {
            // Like the blog
            await prisma.like.create({
                data: {
                    user_id: parseInt(user_id),
                    blog_id
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Blog liked successfully',
                liked: true
            });
        }
    } catch (error) {
        console.error('Error toggling blog like:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to process like action',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Function to get blog details with comments
const getBlogDetails = async (req, res) => {
    try {
        const blog_id = parseInt(req.params.blog_id);
        const user_id = req.user;

        // Increment view count
        await prisma.blog.update({
            where: { blog_id },
            data: {
                view_count: {
                    increment: 1
                }
            }
        });

        // Get blog with all related data
        const blog = await prisma.blog.findUnique({
            where: { blog_id },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                category: true,
                likes: {
                    select: {
                        user_id: true
                    }
                },
                comments: {
                    where: {
                        parent_id: null // Only get top-level comments
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
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!blog) {
            return res.status(404).json({
                success: false,
                error: 'Blog not found'
            });
        }

        // Check if the current user has liked the blog
        const isLiked = blog.likes.some(like => like.user_id === parseInt(user_id));

        // Format the response
        const formattedBlog = {
            ...blog,
            likesCount: blog.likes.length,
            commentsCount: blog.comments.length,
            isLiked,
            likes: undefined // Remove the likes array
        };

        return res.status(200).json({
            success: true,
            data: formattedBlog
        });
    } catch (error) {
        console.error('Error getting blog details:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve blog details',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Function to add a comment to a blog
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

// Function to get trending blogs
const getTrendingBlogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const trendingBlogs = await prisma.blog.findMany({
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                category: {
                    select: {
                        category_id: true,
                        category_name: true,
                        icon: true,
                        color: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: [
                { view_count: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        });

        const formattedBlogs = trendingBlogs.map(blog => ({
            ...blog,
            likesCount: blog._count.likes,
            commentsCount: blog._count.comments,
            _count: undefined
        }));

        return res.status(200).json({
            success: true,
            data: formattedBlogs
        });
    } catch (error) {
        console.error('Error getting trending blogs:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve trending blogs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                sortOrder: 'asc' // Sort by the sortOrder field
            }
        });

        if (categories.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No categories found",
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve categories',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


module.exports = {
    addBlog,
    getBlogs,
    editBlog,
    deleteBlog,
    getUserBlogs,
    toggleLikeBlog,
    getBlogDetails,
    addComment,
    getTrendingBlogs,
    getCategories
};