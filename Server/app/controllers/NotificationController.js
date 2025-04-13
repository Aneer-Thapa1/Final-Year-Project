const { PrismaClient, NotificationType } = require('@prisma/client');
const prisma = new PrismaClient();

const notificationController = {
    // Get user's notifications with filtering
    getUserNotifications: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const {
                page = 1,
                limit = 20,
                read = null,
                type = null,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                group = false
            } = req.query;

            // Build where conditions
            const whereCondition = {
                user_id: userId
            };

            if (read !== null) {
                whereCondition.is_read = read === 'true';
            }

            if (type) {
                whereCondition.type = type;
            }

            // Get count and notifications
            const [totalNotifications, notifications] = await Promise.all([
                prisma.notification.count({ where: whereCondition }),
                prisma.notification.findMany({
                    where: whereCondition,
                    orderBy: { [sortBy]: sortOrder },
                    skip: (parseInt(page) - 1) * parseInt(limit),
                    take: parseInt(limit)
                })
            ]);

            // Process notifications with extra info
            const processedNotifications = notifications.map(notification => ({
                ...notification,
                timeAgo: getTimeAgo(notification.createdAt),
                display: getDisplayProperties(notification)
            }));

            return res.status(200).json({
                success: true,
                data: {
                    notifications: processedNotifications,
                    pagination: {
                        total: totalNotifications,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalNotifications / parseInt(limit))
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    },

    // Mark multiple notifications as read
    markNotificationsAsRead: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { ids, all = false, type = null } = req.body;

            if (all === true) {
                // Mark all as read
                const { count } = await prisma.notification.updateMany({
                    where: {
                        user_id: userId,
                        is_read: false
                    },
                    data: {
                        is_read: true,
                        readAt: new Date()
                    }
                });

                return res.status(200).json({
                    success: true,
                    message: `All notifications marked as read (${count})`
                });
            }
            else if (type) {
                // Mark all of a type as read
                const { count } = await prisma.notification.updateMany({
                    where: {
                        user_id: userId,
                        is_read: false,
                        type
                    },
                    data: {
                        is_read: true,
                        readAt: new Date()
                    }
                });

                return res.status(200).json({
                    success: true,
                    message: `All ${type} notifications marked as read (${count})`
                });
            }
            else if (ids && Array.isArray(ids) && ids.length > 0) {
                // Mark specific notifications as read
                const notificationIds = ids.map(id => parseInt(id));

                const { count } = await prisma.notification.updateMany({
                    where: {
                        notification_id: { in: notificationIds },
                        user_id: userId,
                        is_read: false
                    },
                    data: {
                        is_read: true,
                        readAt: new Date()
                    }
                });

                return res.status(200).json({
                    success: true,
                    message: `${count} notifications marked as read`
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide notification ids or set all=true'
                });
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notifications as read'
            });
        }
    },

    // Mark a single notification as read
    markNotificationAsRead: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { notification_id } = req.params;

            // Update if exists and not read
            const result = await prisma.notification.updateMany({
                where: {
                    notification_id: parseInt(notification_id),
                    user_id: userId,
                    is_read: false
                },
                data: {
                    is_read: true,
                    readAt: new Date()
                }
            });

            if (result.count === 0) {
                // Check if it exists but is already read
                const notification = await prisma.notification.findFirst({
                    where: {
                        notification_id: parseInt(notification_id),
                        user_id: userId
                    }
                });

                if (!notification) {
                    return res.status(404).json({
                        success: false,
                        message: 'Notification not found'
                    });
                }

                if (notification.is_read) {
                    return res.status(200).json({
                        success: true,
                        message: 'Notification was already marked as read'
                    });
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read'
            });
        }
    },

    // Delete multiple notifications
    deleteNotifications: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { ids, all = false, readOnly = true } = req.body;

            // Build where conditions
            let whereCondition = {
                user_id: userId
            };

            // Only delete read notifications by default
            if (readOnly === true) {
                whereCondition.is_read = true;
            }

            if (all === true) {
                // Delete based on conditions
                const { count } = await prisma.notification.deleteMany({
                    where: whereCondition
                });

                return res.status(200).json({
                    success: true,
                    message: `Deleted ${count} notifications`
                });
            }
            else if (ids && Array.isArray(ids) && ids.length > 0) {
                // Delete specific notifications
                const notificationIds = ids.map(id => parseInt(id));

                const { count } = await prisma.notification.deleteMany({
                    where: {
                        notification_id: { in: notificationIds },
                        user_id: userId,
                        ...readOnly ? { is_read: true } : {}
                    }
                });

                return res.status(200).json({
                    success: true,
                    message: `Deleted ${count} notifications`
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide notification ids or set all=true'
                });
            }
        } catch (error) {
            console.error('Error deleting notifications:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notifications'
            });
        }
    },

    // Delete a single notification
    deleteNotification: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { notification_id } = req.params;

            // Check if notification exists
            const notification = await prisma.notification.findFirst({
                where: {
                    notification_id: parseInt(notification_id),
                    user_id: userId
                }
            });

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message: 'Notification not found'
                });
            }

            // Delete the notification
            await prisma.notification.delete({
                where: { notification_id: parseInt(notification_id) }
            });

            return res.status(200).json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete notification'
            });
        }
    },

    // Get notification stats
    getNotificationStats: async (req, res) => {
        try {
            const userId = parseInt(req.user);

            // Get unread count
            const unreadCount = await prisma.notification.count({
                where: {
                    user_id: userId,
                    is_read: false
                }
            });

            // Get counts by type
            const typeCounts = await prisma.$queryRaw`
                SELECT type, COUNT(*) as count, 
                       SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread
                FROM "Notification"
                WHERE user_id = ${userId}
                GROUP BY type
            `;

            return res.status(200).json({
                success: true,
                data: {
                    unreadCount,
                    byType: typeCounts
                }
            });
        } catch (error) {
            console.error('Error getting notification stats:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get notification statistics'
            });
        }
    },

    // Get unread notification count
    getUnreadNotificationCount: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const unreadCount = await prisma.notification.count({
                where: {
                    user_id: userId,
                    is_read: false
                }
            });

            return res.status(200).json({
                success: true,
                data: { unreadCount }
            });
        } catch (error) {
            console.error('Error getting unread notification count:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get unread notification count'
            });
        }
    },

    // Create a notification
    createNotification: async (req, res) => {
        try {
            const { user_id, title, content, type, related_id, action_url } = req.body;

            if (!user_id || !title || !content || !type) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required notification fields'
                });
            }

            // Create notification
            const notification = await prisma.notification.create({
                data: {
                    user_id: parseInt(user_id),
                    title,
                    content,
                    type,
                    related_id: related_id ? parseInt(related_id) : null,
                    action_url: action_url || null,
                    is_read: false
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Notification created successfully',
                data: notification
            });
        } catch (error) {
            console.error('Error creating notification:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create notification'
            });
        }
    },

    // Create notification (internal service method)
    createNotificationInternal: async (notificationData) => {
        try {
            if (!notificationData.user_id || !notificationData.title || !notificationData.content || !notificationData.type) {
                throw new Error('Missing required notification fields');
            }

            const notification = await prisma.notification.create({
                data: {
                    user_id: notificationData.user_id,
                    title: notificationData.title,
                    content: notificationData.content,
                    type: notificationData.type,
                    related_id: notificationData.related_id || null,
                    action_url: notificationData.action_url || null,
                    is_read: false
                }
            });

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
};

// Helper functions
function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hrs ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} months ago`;

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} years ago`;
}

function getDisplayProperties(notification) {
    const display = {
        icon: 'bell',
        color: '#4285F4'
    };

    switch (notification.type) {
        case 'FRIEND_REQUEST':
            display.icon = 'user-plus';
            display.color = '#34A853';
            break;
        case 'SYSTEM_MESSAGE':
            if (notification.title.includes('Streak Reset')) {
                display.icon = 'alert-triangle';
                display.color = '#EA4335';
            } else if (notification.title.includes('Grace Period')) {
                display.icon = 'alert-circle';
                display.color = '#FBBC05';
            }
            break;
        case 'NEW_MESSAGE':
            display.icon = 'message-square';
            break;
    }

    return display;
}

module.exports = notificationController;