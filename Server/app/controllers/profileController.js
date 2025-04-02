// src/controllers/profileController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Profile Controller
 * Handles fetching and managing user profiles (both personal and other users)
 */
const profileController = {
    /**
     * Get profile of a user
     * Differentiates between own profile (more data) and other user profiles (limited data)
     * @route GET /api/profile/:userId
     */
    getUserProfile: async (req, res) => {
        try {
            const userId  = req.params.userId;
            console.log(userId);
            const requesterId = req.user; // Current authenticated user
            console.log(requesterId);
            const targetUserId = parseInt(userId);

            // Check if user exists
            const userExists = await prisma.user.findUnique({
                where: { user_id: targetUserId },
                select: { user_id: true }
            });

            if (!userExists) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Viewing own profile - include full data
            if (targetUserId === requesterId) {
                const profile = await prisma.user.findUnique({
                    where: { user_id: targetUserId },
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true,
                        points_gained: true,
                        gender: true,
                        timezone: true,
                        theme_preference: true,
                        premium_status: true,
                        premium_until: true,
                        onVacation: true,
                        vacation_start: true,
                        vacation_end: true,
                        dailyGoal: true,
                        weeklyGoal: true,
                        monthlyGoal: true,
                        registeredAt: true,
                        lastActive: true,
                        totalHabitsCreated: true,
                        totalHabitsCompleted: true,
                        currentDailyStreak: true,
                        longestDailyStreak: true,

                        // Include counts of related records
                        _count: {
                            select: {
                                blogs: true,
                                habits: true,
                                habitLogs: true,
                                achievements: true,
                            }
                        }
                    }
                });

                // Get streak data for all habits
                const streakData = await prisma.habitStreak.findMany({
                    where: {
                        user_id: targetUserId,
                    },
                    select: {
                        current_streak: true,
                        longest_streak: true,
                        habit: {
                            select: {
                                name: true,
                                icon: true,
                                color: true,
                                domain: {
                                    select: {
                                        name: true,
                                        icon: true,
                                        color: true
                                    }
                                }
                            }
                        }
                    }
                });

                // Get habit data
                const habits = await prisma.habit.findMany({
                    where: {
                        user_id: targetUserId,
                        is_active: true
                    },
                    select: {
                        habit_id: true,
                        name: true,
                        icon: true,
                        color: true,
                        frequency_type: true,
                        start_date: true,
                        is_favorite: true,
                        domain: {
                            select: {
                                name: true,
                                icon: true
                            }
                        }
                    },
                    orderBy: {
                        is_favorite: 'desc'
                    },
                    take: 5 // Just return top 5 for profile
                });

                // Get achievements
                const achievements = await prisma.userAchievement.findMany({
                    where: {
                        user_id: targetUserId
                    },
                    select: {
                        achievement: {
                            select: {
                                name: true,
                                description: true,
                                icon: true,
                                badge_image: true
                            }
                        },
                        unlocked_at: true
                    },
                    orderBy: {
                        unlocked_at: 'desc'
                    }
                });

                // Get recent blog posts
                const posts = await prisma.blog.findMany({
                    where: {
                        user_id: targetUserId
                    },
                    select: {
                        blog_id: true,
                        title: true,
                        content: true,
                        image: true,
                        createdAt: true,
                        view_count: true,
                        category: {
                            select: {
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
                    },
                    take: 5 // Limit to most recent
                });

                // Get weekly progress data for habit tracker visualization
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
                startOfWeek.setHours(0, 0, 0, 0);

                const dailyStatuses = await prisma.habitDailyStatus.findMany({
                    where: {
                        user_id: targetUserId,
                        date: {
                            gte: startOfWeek
                        }
                    },
                    select: {
                        date: true,
                        is_completed: true,
                        habit: {
                            select: {
                                habit_id: true,
                                name: true,
                                icon: true
                            }
                        }
                    }
                });

                // Process daily status into weekly progress
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const weeklyProgress = dayNames.map((day, idx) => {
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + idx);

                    // Total habits scheduled for this day
                    const dayHabits = dailyStatuses.filter(status =>
                        new Date(status.date).getDate() === dayDate.getDate() &&
                        new Date(status.date).getMonth() === dayDate.getMonth()
                    );

                    const completed = dayHabits.filter(s => s.is_completed).length;
                    const total = dayHabits.length;

                    return {
                        day,
                        date: dayDate.toISOString().split('T')[0],
                        completed,
                        total,
                        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
                    };
                });

                // Get friend count and friends list
                const friendsCount = await prisma.friendRequest.count({
                    where: {
                        OR: [
                            { sender_id: targetUserId, status: 'ACCEPTED' },
                            { receiver_id: targetUserId, status: 'ACCEPTED' }
                        ]
                    }
                });

                // Get friends (first 5 for preview)
                const friendRequests = await prisma.friendRequest.findMany({
                    where: {
                        OR: [
                            { sender_id: targetUserId, status: 'ACCEPTED' },
                            { receiver_id: targetUserId, status: 'ACCEPTED' }
                        ]
                    },
                    take: 5,
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        },
                        receiver: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                });

                // Process friend requests to get actual friends
                const friends = friendRequests.map(request => {
                    // Return the user that's not the targetUser
                    const friend = request.sender_id === targetUserId
                        ? request.receiver
                        : request.sender;

                    return {
                        user_id: friend.user_id,
                        user_name: friend.user_name,
                        avatar: friend.avatar,
                        lastActive: friend.lastActive,
                        isOnline: isUserOnline(friend.lastActive)
                    };
                });

                // Format data to send back - Own profile with detailed information
                return res.status(200).json({
                    success: true,
                    data: {
                        user: {
                            ...profile,
                            posts_count: profile._count.blogs,
                            habits_count: profile._count.habits,
                            habits_completed_count: profile._count.habitLogs,
                            achievements_count: profile._count.achievements,
                            friends_count: friendsCount
                        },
                        habits,
                        achievements: achievements.map(a => ({
                            ...a.achievement,
                            unlocked_at: a.unlocked_at
                        })),
                        posts: posts.map(post => ({
                            id: post.blog_id,
                            title: post.title,
                            content: post.content,
                            image: post.image,
                            createdAt: post.createdAt,
                            views: post.view_count,
                            category: post.category.category_name,
                            categoryIcon: post.category.icon,
                            categoryColor: post.category.color,
                            likes: post._count.likes,
                            comments: post._count.comments
                        })),
                        streak_data: {
                            top_streaks: streakData.sort((a, b) => b.current_streak - a.current_streak).slice(0, 3),
                            weekly_progress: weeklyProgress,
                            monthly_active_days: new Set(dailyStatuses.filter(s => s.is_completed).map(s =>
                                new Date(s.date).toISOString().split('T')[0]
                            )).size // Count unique days with completed habits this month
                        },
                        friends
                    }
                });
            }

            // Viewing someone else's profile - show limited data
            else {
                // Check friendship status
                const friendshipStatus = await getFriendshipStatus(requesterId, targetUserId);

                // Get basic profile data
                const profile = await prisma.user.findUnique({
                    where: { user_id: targetUserId },
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true,
                        premium_status: true,
                        registeredAt: true,
                        lastActive: true,
                        totalHabitsCreated: true,
                        currentDailyStreak: true,
                        longestDailyStreak: true,

                        // Include counts of related records
                        _count: {
                            select: {
                                blogs: true,
                                habits: true,
                                achievements: true,
                            }
                        }
                    }
                });

                // For other users, what data we show depends on friendship status
                if (friendshipStatus === 'friends') {
                    // Get shared data for friends

                    // Get recent blog posts
                    const posts = await prisma.blog.findMany({
                        where: {
                            user_id: targetUserId
                        },
                        select: {
                            blog_id: true,
                            title: true,
                            content: true,
                            image: true,
                            createdAt: true,
                            view_count: true,
                            category: {
                                select: {
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
                            },
                            likes: {
                                where: {
                                    user_id: parseInt(requesterId)
                                },
                                select: {
                                    like_id: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 10
                    });

                    // Get achievements (public ones)
                    const achievements = await prisma.userAchievement.findMany({
                        where: {
                            user_id: targetUserId,
                            achievement: {
                                is_hidden: false
                            }
                        },
                        select: {
                            achievement: {
                                select: {
                                    name: true,
                                    description: true,
                                    icon: true,
                                    badge_image: true
                                }
                            },
                            unlocked_at: true
                        },
                        orderBy: {
                            unlocked_at: 'desc'
                        },
                        take: 10
                    });

                    // Get friends (first 5 for preview)
                    const friendRequests = await prisma.friendRequest.findMany({
                        where: {
                            OR: [
                                { sender_id: targetUserId, status: 'ACCEPTED' },
                                { receiver_id: targetUserId, status: 'ACCEPTED' }
                            ]
                        },
                        take: 5,
                        include: {
                            sender: {
                                select: {
                                    user_id: true,
                                    user_name: true,
                                    avatar: true,
                                    lastActive: true
                                }
                            },
                            receiver: {
                                select: {
                                    user_id: true,
                                    user_name: true,
                                    avatar: true,
                                    lastActive: true
                                }
                            }
                        }
                    });

                    // Process friend requests to get actual friends
                    const friends = friendRequests.map(request => {
                        // Return the user that's not the targetUser
                        const friend = request.sender_id === targetUserId
                            ? request.receiver
                            : request.sender;

                        return {
                            user_id: friend.user_id,
                            user_name: friend.user_name,
                            avatar: friend.avatar,
                            lastActive: friend.lastActive,
                            isOnline: isUserOnline(friend.lastActive)
                        };
                    });

                    // Weekly streak data (simplified for friends)
                    const today = new Date();
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    startOfWeek.setHours(0, 0, 0, 0);

                    const dailyStatuses = await prisma.habitDailyStatus.findMany({
                        where: {
                            user_id: targetUserId,
                            date: {
                                gte: startOfWeek
                            }
                        },
                        select: {
                            date: true,
                            is_completed: true
                        }
                    });

                    // Group by day and check if they completed all scheduled habits
                    const dayCompletionMap = new Map();
                    dailyStatuses.forEach(status => {
                        const day = new Date(status.date).getDay();
                        if (!dayCompletionMap.has(day)) {
                            dayCompletionMap.set(day, { total: 0, completed: 0 });
                        }

                        const dayData = dayCompletionMap.get(day);
                        dayData.total++;
                        if (status.is_completed) {
                            dayData.completed++;
                        }
                    });

                    // Create weekly progress as boolean array (did they complete all scheduled habits?)
                    const weekly_progress = Array(7).fill(false);
                    for (let i = 0; i < 7; i++) {
                        if (dayCompletionMap.has(i)) {
                            const dayData = dayCompletionMap.get(i);
                            weekly_progress[i] = dayData.completed === dayData.total && dayData.total > 0;
                        }
                    }

                    return res.status(200).json({
                        success: true,
                        data: {
                            user: {
                                ...profile,
                                posts_count: profile._count.blogs,
                                habits_count: profile._count.habits,
                                achievements_count: profile._count.achievements,
                                friendship_status: friendshipStatus,
                                isOnline: isUserOnline(profile.lastActive)
                            },
                            posts: posts.map(post => ({
                                id: post.blog_id,
                                title: post.title,
                                content: post.content,
                                image: post.image,
                                createdAt: post.createdAt,
                                views: post.view_count,
                                category: post.category.category_name,
                                categoryIcon: post.category.icon,
                                categoryColor: post.category.color,
                                likes: post._count.likes,
                                comments: post._count.comments,
                                liked_by_me: post.likes.length > 0
                            })),
                            achievements: achievements.map(a => ({
                                ...a.achievement,
                                unlocked_at: a.unlocked_at
                            })),
                            streak_data: {
                                weekly_progress,
                                monthly_active_days: new Set(dailyStatuses.filter(s => s.is_completed).map(s =>
                                    new Date(s.date).toISOString().split('T')[0]
                                )).size
                            },
                            friends
                        }
                    });
                }

                // Public profile (not friends)
                else {
                    // Get only public information

                    // Get recent public blog posts
                    const posts = await prisma.blog.findMany({
                        where: {
                            user_id: targetUserId
                        },
                        select: {
                            blog_id: true,
                            title: true,
                            content: true,
                            image: true,
                            createdAt: true,
                            view_count: true,
                            category: {
                                select: {
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
                            },
                            likes: {
                                where: {
                                    user_id: parseInt(requesterId)
                                },
                                select: {
                                    like_id: true
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        },
                        take: 5
                    });

                    // Get public achievements only
                    const achievements = await prisma.userAchievement.findMany({
                        where: {
                            user_id: targetUserId,
                            achievement: {
                                is_hidden: false
                            }
                        },
                        select: {
                            achievement: {
                                select: {
                                    name: true,
                                    description: true,
                                    icon: true,
                                    badge_image: true
                                }
                            },
                            unlocked_at: true
                        },
                        orderBy: {
                            unlocked_at: 'desc'
                        },
                        take: 5
                    });

                    // Create response for non-friend users (more limited data)
                    return res.status(200).json({
                        success: true,
                        data: {
                            user: {
                                ...profile,
                                posts_count: profile._count.blogs,
                                achievements_count: profile._count.achievements,
                                friendship_status: friendshipStatus,
                                isOnline: isUserOnline(profile.lastActive)
                            },
                            posts: posts.map(post => ({
                                id: post.blog_id,
                                title: post.title,
                                content: post.content,
                                image: post.image,
                                createdAt: post.createdAt,
                                views: post.view_count,
                                category: post.category.category_name,
                                categoryIcon: post.category.icon,
                                categoryColor: post.category.color,
                                likes: post._count.likes,
                                comments: post._count.comments,
                                liked_by_me: post.likes.length > 0
                            })),
                            achievements: achievements.map(a => ({
                                ...a.achievement,
                                unlocked_at: a.unlocked_at
                            }))
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error in getUserProfile:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user profile',
                error: error.message
            });
        }
    },

    /**
     * Get a list of user's friends
     * @route GET /api/profile/:userId/friends
     */
    getUserFriends: async (req, res) => {
        try {
            const { userId } = req.params;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);


            // Check if viewing other user's friends and if they're friends with requester
            if (targetUserId !== requesterId) {
                const friendshipStatus = await getFriendshipStatus(requesterId, targetUserId);
                if (friendshipStatus !== 'friends') {
                    return res.status(403).json({
                        success: false,
                        message: "You don't have permission to view this user's friends"
                    });
                }
            }

            // Get all friend requests where user is involved and status is ACCEPTED
            const friendRequests = await prisma.friendRequest.findMany({
                where: {
                    OR: [
                        { sender_id: targetUserId, status: 'ACCEPTED' },
                        { receiver_id: targetUserId, status: 'ACCEPTED' }
                    ]
                },
                include: {
                    sender: {
                        select: {
                            user_id: true,
                            user_name: true,
                            avatar: true,
                            lastActive: true,
                            premium_status: true,
                            currentDailyStreak: true
                        }
                    },
                    receiver: {
                        select: {
                            user_id: true,
                            user_name: true,
                            avatar: true,
                            lastActive: true,
                            premium_status: true,
                            currentDailyStreak: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            // Process friend requests to get actual friends
            const friends = friendRequests.map(request => {
                // Return the user that's not the targetUser
                const friend = request.sender_id === targetUserId
                    ? request.receiver
                    : request.sender;

                return {
                    user_id: friend.user_id,
                    user_name: friend.user_name,
                    avatar: friend.avatar,
                    lastActive: friend.lastActive,
                    isOnline: isUserOnline(friend.lastActive),
                    premium_status: friend.premium_status,
                    streak: friend.currentDailyStreak
                };
            });

            return res.status(200).json({
                success: true,
                data: friends
            });

        } catch (error) {
            console.error('Error in getUserFriends:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user friends',
                error: error.message
            });
        }
    },

    /**
     * Get a list of user's blog posts
     * @route GET /api/profile/:userId/blogs
     */
    getUserBlogs: async (req, res) => {
        try {
            const { userId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);

            // Calculate pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Get blog posts
            const posts = await prisma.blog.findMany({
                where: {
                    user_id: targetUserId
                },
                select: {
                    blog_id: true,
                    title: true,
                    content: true,
                    image: true,
                    createdAt: true,
                    view_count: true,
                    category: {
                        select: {
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
                    },
                    likes: {
                        where: {
                            user_id: requesterId
                        },
                        select: {
                            like_id: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: parseInt(limit)
            });

            // Get total count for pagination
            const totalCount = await prisma.blog.count({
                where: {
                    user_id: targetUserId
                }
            });

            return res.status(200).json({
                success: true,
                data: posts.map(post => ({
                    id: post.blog_id,
                    title: post.title,
                    content: post.content,
                    image: post.image,
                    createdAt: post.createdAt,
                    views: post.view_count,
                    category: post.category.category_name,
                    categoryIcon: post.category.icon,
                    categoryColor: post.category.color,
                    likes: post._count.likes,
                    comments: post._count.comments,
                    liked_by_me: post.likes.length > 0
                })),
                pagination: {
                    total: totalCount,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / parseInt(limit)),
                    hasMore: skip + posts.length < totalCount
                }
            });

        } catch (error) {
            console.error('Error in getUserBlogs:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user blogs',
                error: error.message
            });
        }
    },

    /**
     * Get a list of user's achievements
     * @route GET /api/profile/:userId/achievements
     */
    getUserAchievements: async (req, res) => {
        try {
            const { userId } = req.params;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);

            // If viewing someone else's profile, check friendship status
            // Non-friends can only see non-hidden achievements
            let whereClause = { user_id: targetUserId };

            if (targetUserId !== requesterId) {
                const friendshipStatus = await getFriendshipStatus(requesterId, targetUserId);
                if (friendshipStatus !== 'friends') {
                    whereClause = {
                        ...whereClause,
                        achievement: {
                            is_hidden: false
                        }
                    };
                }
            }

            // Get achievements
            const achievements = await prisma.userAchievement.findMany({
                where: whereClause,
                select: {
                    achievement: {
                        select: {
                            achievement_id: true,
                            name: true,
                            description: true,
                            icon: true,
                            badge_image: true,
                            criteria_type: true,
                            criteria_value: true,
                            xp_value: true
                        }
                    },
                    unlocked_at: true
                },
                orderBy: {
                    unlocked_at: 'desc'
                }
            });

            return res.status(200).json({
                success: true,
                data: achievements.map(a => ({
                    id: a.achievement.achievement_id,
                    name: a.achievement.name,
                    description: a.achievement.description,
                    icon: a.achievement.icon,
                    badge_image: a.achievement.badge_image,
                    criteria_type: a.achievement.criteria_type,
                    criteria_value: a.achievement.criteria_value,
                    xp_value: a.achievement.xp_value,
                    unlocked_at: a.unlocked_at
                }))
            });

        } catch (error) {
            console.error('Error in getUserAchievements:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user achievements',
                error: error.message
            });
        }
    },

    /**
     * Get a list of user's habits
     * Only available for the user themselves
     * @route GET /api/profile/:userId/habits
     */
    getUserHabits: async (req, res) => {
        try {
            const { userId } = req.params;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);

            // Users can only view their own habits
            if (targetUserId !== requesterId) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to view this user's habits"
                });
            }

            // Get active habits
            const habits = await prisma.habit.findMany({
                where: {
                    user_id: targetUserId,
                    is_active: true
                },
                select: {
                    habit_id: true,
                    name: true,
                    description: true,
                    icon: true,
                    color: true,
                    frequency_type: true,
                    frequency_value: true,
                    frequency_interval: true,
                    specific_days: true,
                    tracking_type: true,
                    duration_goal: true,
                    count_goal: true,
                    numeric_goal: true,
                    units: true,
                    is_favorite: true,
                    start_date: true,
                    streak: {
                        select: {
                            current_streak: true,
                            longest_streak: true,
                            last_completed: true
                        }
                    },
                    domain: {
                        select: {
                            name: true,
                            icon: true,
                            color: true
                        }
                    },
                    _count: {
                        select: {
                            habitLogs: true
                        }
                    }
                },
                orderBy: [
                    { is_favorite: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            // Get today's completed habits for each habit
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dailyStatuses = await prisma.habitDailyStatus.findMany({
                where: {
                    user_id: targetUserId,
                    date: {
                        gte: today
                    },
                    habit_id: {
                        in: habits.map(h => h.habit_id)
                    }
                },
                select: {
                    habit_id: true,
                    is_completed: true,
                    is_scheduled: true,
                    completion_time: true
                }
            });

            // Map daily statuses to habits
            const habitStatusMap = new Map();
            dailyStatuses.forEach(status => {
                habitStatusMap.set(status.habit_id, status);
            });

            return res.status(200).json({
                success: true,
                data: habits.map(habit => {
                    const todayStatus = habitStatusMap.get(habit.habit_id);

                    return {
                        id: habit.habit_id,
                        name: habit.name,
                        description: habit.description,
                        icon: habit.icon,
                        color: habit.color,
                        domain: habit.domain,
                        frequency_type: habit.frequency_type,
                        frequency_value: habit.frequency_value,
                        frequency_interval: habit.frequency_interval,
                        specific_days: habit.specific_days,
                        tracking_type: habit.tracking_type,
                        duration_goal: habit.duration_goal,
                        count_goal: habit.count_goal,
                        numeric_goal: habit.numeric_goal,
                        units: habit.units,
                        is_favorite: habit.is_favorite,
                        start_date: habit.start_date,
                        current_streak: habit.streak?.[0]?.current_streak || 0,
                        longest_streak: habit.streak?.[0]?.longest_streak || 0,
                        last_completed: habit.streak?.[0]?.last_completed,
                        total_completions: habit._count.habitLogs,
                        today_completed: todayStatus?.is_completed || false,
                        today_scheduled: todayStatus?.is_scheduled !== false // Default to true if not found
                    };
                })
            });

        } catch (error) {
            console.error('Error in getUserHabits:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user habits',
                error: error.message
            });
        }
    },

    /**
     * Update user profile
     * Only available for the user themselves
     * @route PUT /api/profile/:userId
     */
    updateUserProfile: async (req, res) => {
        try {
            const { userId } = req.params;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);

            // Users can only update their own profile
            if (targetUserId !== requesterId) {
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to update this user's profile"
                });
            }

            // Get fields to update from request body
            const {
                user_name,
                avatar,
                gender,
                timezone,
                theme_preference,
                prefersNotifications,
                dailyGoal,
                weeklyGoal,
                monthlyGoal,
                onVacation,
                vacation_start,
                vacation_end
            } = req.body;

            // Build update object with only provided fields
            const updateData = {};

            if (user_name !== undefined) updateData.user_name = user_name;
            if (avatar !== undefined) updateData.avatar = avatar;
            if (gender !== undefined) updateData.gender = gender;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (theme_preference !== undefined) updateData.theme_preference = theme_preference;
            if (prefersNotifications !== undefined) updateData.prefersNotifications = prefersNotifications;
            if (dailyGoal !== undefined) updateData.dailyGoal = parseInt(dailyGoal);
            if (weeklyGoal !== undefined) updateData.weeklyGoal = parseInt(weeklyGoal);
            if (monthlyGoal !== undefined) updateData.monthlyGoal = parseInt(monthlyGoal);

            // Handle vacation mode
            if (onVacation !== undefined) {
                updateData.onVacation = onVacation;

                if (onVacation) {
                    // When enabling vacation mode
                    if (vacation_start) updateData.vacation_start = new Date(vacation_start);
                    if (vacation_end) updateData.vacation_end = new Date(vacation_end);
                } else {
                    // When disabling vacation mode
                    updateData.vacation_start = null;
                    updateData.vacation_end = null;
                }
            }

            // Perform the update
            const updatedUser = await prisma.user.update({
                where: { user_id: targetUserId },
                data: updateData,
                select: {
                    user_id: true,
                    user_name: true,
                    avatar: true,
                    gender: true,
                    timezone: true,
                    theme_preference: true,
                    prefersNotifications: true,
                    dailyGoal: true,
                    weeklyGoal: true,
                    monthlyGoal: true,
                    onVacation: true,
                    vacation_start: true,
                    vacation_end: true,
                    updatedAt: true
                }
            });

            // Handle vacation mode habit updates if needed
            if (onVacation !== undefined && onVacation === true) {
                // If vacation mode is turned on, mark all habits as "skipped" during vacation period
                if (vacation_start && vacation_end) {
                    // This is a complex operation as it may require creating multiple daily statuses
                    // Implement logic to create HabitDailyStatus entries with is_skipped = true
                    // for each habit that has skip_on_vacation = true during the vacation period

                    // Note: This is a simplified example - in a real application, this might be
                    // better handled by a background job or scheduler
                    // For very long vacations, you'd want to batch this operation or handle it differently

                    // Get all habits that should be skipped on vacation
                    const habitsToSkip = await prisma.habit.findMany({
                        where: {
                            user_id: targetUserId,
                            is_active: true,
                            skip_on_vacation: true
                        },
                        select: {
                            habit_id: true
                        }
                    });

                    if (habitsToSkip.length > 0) {
                        const habitIds = habitsToSkip.map(h => h.habit_id);
                        const vacationStartDate = new Date(vacation_start);
                        const vacationEndDate = new Date(vacation_end);

                        // Create daily statuses for each day of vacation for each habit
                        // This is simplified - a real implementation would be more efficient
                        // and might use a background job for large date ranges
                        const datesToCreate = [];
                        let currentDate = new Date(vacationStartDate);

                        while (currentDate <= vacationEndDate) {
                            for (const habitId of habitIds) {
                                datesToCreate.push({
                                    habit_id: habitId,
                                    user_id: targetUserId,
                                    date: new Date(currentDate),
                                    is_scheduled: true,
                                    is_completed: false,
                                    is_skipped: true,
                                    skip_reason: 'Vacation'
                                });
                            }
                            currentDate.setDate(currentDate.getDate() + 1);
                        }

                        // Create the records in batches
                        if (datesToCreate.length > 0) {
                            await prisma.habitDailyStatus.createMany({
                                data: datesToCreate,
                                skipDuplicates: true, // Skip if entry already exists
                            });
                        }
                    }
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedUser
            });

        } catch (error) {
            console.error('Error in updateUserProfile:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update user profile',
                error: error.message
            });
        }
    },

    /**
     * Get user's profile stats/summary
     * @route GET /api/profile/:userId/stats
     */
    getUserStats: async (req, res) => {
        try {
            const { userId } = req.params;
            const requesterId = req.user;
            const targetUserId = parseInt(userId);

            // Determine whether to show full or limited stats based on relationship
            const isOwnProfile = targetUserId === requesterId;
            let friendshipStatus = 'none';

            if (!isOwnProfile) {
                friendshipStatus = await getFriendshipStatus(requesterId, targetUserId);
            }

            // Get base stats that are available to everyone
            const profile = await prisma.user.findUnique({
                where: { user_id: targetUserId },
                select: {
                    user_id: true,
                    user_name: true,
                    registeredAt: true,
                    currentDailyStreak: true,
                    longestDailyStreak: true,
                    totalHabitsCreated: true,
                    totalHabitsCompleted: true,
                    _count: {
                        select: {
                            blogs: true,
                            achievements: true
                        }
                    }
                }
            });

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Calculate days since registration (account age)
            const daysSinceRegistration = Math.floor(
                (new Date() - new Date(profile.registeredAt)) / (1000 * 60 * 60 * 24)
            );

            // Base stats available to everyone
            const stats = {
                user_id: profile.user_id,
                user_name: profile.user_name,
                account_age_days: daysSinceRegistration,
                current_streak: profile.currentDailyStreak,
                longest_streak: profile.longestDailyStreak,
                total_habits: profile.totalHabitsCreated,
                total_completions: profile.totalHabitsCompleted,
                total_posts: profile._count.blogs,
                total_achievements: profile._count.achievements
            };

            // Additional stats for own profile or friends
            if (isOwnProfile || friendshipStatus === 'friends') {
                // Get additional detailed stats

                // Monthly completion stats
                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

                const monthlyCompletions = await prisma.habitLog.count({
                    where: {
                        user_id: targetUserId,
                        completed: true,
                        completed_at: {
                            gte: firstDayOfMonth
                        }
                    }
                });

                // Previous month for comparison
                const firstDayOfPreviousMonth = new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1
                );
                const lastDayOfPreviousMonth = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0
                );

                const previousMonthCompletions = await prisma.habitLog.count({
                    where: {
                        user_id: targetUserId,
                        completed: true,
                        completed_at: {
                            gte: firstDayOfPreviousMonth,
                            lte: lastDayOfPreviousMonth
                        }
                    }
                });

                // Calculate completion rate trend (percentage change)
                const completionRateTrend = previousMonthCompletions > 0
                    ? ((monthlyCompletions - previousMonthCompletions) / previousMonthCompletions) * 100
                    : 0;

                // Most consistent habit
                const habitStreaks = await prisma.habitStreak.findMany({
                    where: { user_id: targetUserId },
                    select: {
                        habit_id: true,
                        current_streak: true,
                        longest_streak: true,
                        habit: {
                            select: {
                                name: true,
                                icon: true,
                                color: true
                            }
                        }
                    },
                    orderBy: {
                        current_streak: 'desc'
                    },
                    take: 1
                });

                const mostConsistentHabit = habitStreaks.length > 0 ? {
                    habit_id: habitStreaks[0].habit_id,
                    name: habitStreaks[0].habit.name,
                    icon: habitStreaks[0].habit.icon,
                    color: habitStreaks[0].habit.color,
                    current_streak: habitStreaks[0].current_streak,
                    longest_streak: habitStreaks[0].longest_streak
                } : null;

                // Domain distribution
                const habitDomainCounts = await prisma.habit.groupBy({
                    by: ['domain_id'],
                    where: {
                        user_id: targetUserId,
                        is_active: true
                    },
                    _count: {
                        habit_id: true
                    }
                });

                const domainDetails = await prisma.habitDomain.findMany({
                    where: {
                        domain_id: {
                            in: habitDomainCounts.map(d => d.domain_id)
                        }
                    },
                    select: {
                        domain_id: true,
                        name: true,
                        icon: true,
                        color: true
                    }
                });

                // Map domain counts to domain details
                const domainMap = {};
                domainDetails.forEach(domain => {
                    domainMap[domain.domain_id] = domain;
                });

                const domainDistribution = habitDomainCounts.map(count => ({
                    domain_id: count.domain_id,
                    name: domainMap[count.domain_id]?.name || 'Unknown',
                    icon: domainMap[count.domain_id]?.icon,
                    color: domainMap[count.domain_id]?.color,
                    habit_count: count._count.habit_id
                }));

                // Progress towards goals
                const dailyCompletionsToday = await prisma.habitLog.count({
                    where: {
                        user_id: targetUserId,
                        completed: true,
                        completed_at: {
                            gte: new Date(today.setHours(0, 0, 0, 0))
                        }
                    }
                });

                // Start of week (Sunday)
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const weeklyCompletions = await prisma.habitLog.count({
                    where: {
                        user_id: targetUserId,
                        completed: true,
                        completed_at: {
                            gte: startOfWeek
                        }
                    }
                });

                // Enhanced stats for own profile or friends
                stats.monthly_completions = monthlyCompletions;
                stats.completion_rate_trend = completionRateTrend;
                stats.most_consistent_habit = mostConsistentHabit;
                stats.domain_distribution = domainDistribution;
                stats.progress = {
                    daily: {
                        completed: dailyCompletionsToday,
                        goal: profile.dailyGoal,
                        percentage: Math.round((dailyCompletionsToday / profile.dailyGoal) * 100)
                    },
                    weekly: {
                        completed: weeklyCompletions,
                        goal: profile.weeklyGoal,
                        percentage: Math.round((weeklyCompletions / profile.weeklyGoal) * 100)
                    },
                    monthly: {
                        completed: monthlyCompletions,
                        goal: profile.monthlyGoal,
                        percentage: Math.round((monthlyCompletions / profile.monthlyGoal) * 100)
                    }
                };
            }

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error in getUserStats:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user statistics',
                error: error.message
            });
        }
    }
};

/**
 * Helper Functions
 */

// Check if a user is considered online (active in last 15 minutes)
const isUserOnline = (lastActive) => {
    if (!lastActive) return false;

    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    return new Date(lastActive) > fifteenMinutesAgo;
};

// Get friendship status between two users
const getFriendshipStatus = async (userId1, userId2) => {
    // Check for an existing friend request in either direction
    const request = await prisma.friendRequest.findFirst({
        where: {
            OR: [
                { sender_id: parseInt(userId1), receiver_id: userId2 },
                { sender_id: userId2, receiver_id: parseInt(userId1) }
            ]
        }
    });

    if (!request) {
        return 'none'; // No relationship
    }

    if (request.status === 'ACCEPTED') {
        return 'friends';
    }

    // Determine pending direction
    if (request.status === 'PENDING') {
        if (request.sender_id === userId1) {
            return 'pending_sent'; // Current user sent request
        } else {
            return 'pending_received'; // Current user received request
        }
    }

    return 'rejected'; // Request was rejected
};

module.exports = profileController;