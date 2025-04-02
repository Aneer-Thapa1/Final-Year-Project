const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Notification Controller
const notificationController = {
    /**
     * Get user's notifications with pagination and filtering
     */
    getUserNotifications: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const {
                page = 1,
                limit = 20,
                read = null,
                type = null
            } = req.query;

            // Prepare filter conditions
            const whereCondition = {
                user_id: userId
            };

            // Add optional filters
            if (read !== null) {
                whereCondition.is_read = read === 'true';
            }

            if (type) {
                whereCondition.type = type;
            }

            // Fetch notifications with pagination
            const [totalNotifications, notifications] = await Promise.all([
                prisma.notification.count({ where: whereCondition }),
                prisma.notification.findMany({
                    where: whereCondition,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: parseInt(limit)
                })
            ]);

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalNotifications / limit);

            return res.status(200).json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        total: totalNotifications,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Mark a single notification as read
     */
    markNotificationAsRead: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { notification_id } = req.params;

            // Verify notification belongs to user
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

            // Update notification as read
            const updatedNotification = await prisma.notification.update({
                where: { notification_id: parseInt(notification_id) },
                data: {
                    is_read: true,
                    readAt: new Date()
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Notification marked as read',
                data: updatedNotification
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllNotificationsAsRead: async (req, res) => {
        try {
            const userId = parseInt(req.user);

            // Update all unread notifications for the user
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
                message: 'All notifications marked as read',
                data: {
                    count: count
                }
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark all notifications as read',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Delete a single notification
     */
    deleteNotification: async (req, res) => {
        try {
            const userId = parseInt(req.user);
            const { notification_id } = req.params;

            // Verify notification belongs to user
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
                message: 'Failed to delete notification',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Get notification count (unread)
     */
    getUnreadNotificationCount: async (req, res) => {
        try {
            const userId = parseInt(req.user);

            // Count unread notifications
            const unreadCount = await prisma.notification.count({
                where: {
                    user_id: userId,
                    is_read: false
                }
            });

            return res.status(200).json({
                success: true,
                data: {
                    unreadCount
                }
            });
        } catch (error) {
            console.error('Error getting unread notification count:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get unread notification count',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    /**
     * Create a notification (internal use)
     */
    createNotification: async (notificationData) => {
        try {
            // Validate required fields
            if (!notificationData.user_id || !notificationData.title || !notificationData.content || !notificationData.type) {
                throw new Error('Missing required notification fields');
            }

            // Create notification
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

module.exports = notificationController;