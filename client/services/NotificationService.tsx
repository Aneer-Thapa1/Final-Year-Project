import { fetchData, postData, updateData, deleteData } from './api';
import React from 'react';

// Notification interfaces
export interface Notification {
    notification_id: number;
    user_id: number;
    title: string;
    content: string;
    type: NotificationType;
    is_read: boolean;
    createdAt: string;
    readAt?: string;
    action_url?: string;
    related_id?: number;
    timeAgo?: string;
    display?: {
        icon: string;
        color: string;
        badge?: string;
    };
}

export type NotificationType =
    'STREAK_MILESTONE' |
    'ACHIEVEMENT_UNLOCKED' |
    'FRIEND_REQUEST' |
    'CHALLENGE_INVITE' |
    'REMINDER' |
    'SYSTEM_MESSAGE' |
    'BLOG_COMMENT' |
    'NEW_MESSAGE' |
    'GROUP_INVITATION' |
    'POINTS_AWARDED';

export interface NotificationStats {
    unreadCount: number;
    byType: {
        type: NotificationType;
        count: number;
        unread: number;
    }[];
    timePeriods?: {
        today: number;
        lastWeek: number;
        lastMonth: number;
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    count?: number;
}

export interface PaginatedNotifications {
    notifications: Notification[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
    };
    stats?: {
        unreadCount: number;
    };
}

// Function to get user notifications with filtering
export const getNotifications = async (
    page: number = 1,
    limit: number = 20,
    options?: {
        read?: boolean;
        type?: NotificationType | NotificationType[];
        sortBy?: 'createdAt' | 'type' | 'title';
        sortOrder?: 'asc' | 'desc';
        group?: boolean;
    }
) => {
    try {
        let url = `/api/notifications?page=${page}&limit=${limit}`;

        // Add optional filters
        if (options) {
            if (options.read !== undefined) {
                url += `&read=${options.read}`;
            }
            if (options.type) {
                if (Array.isArray(options.type)) {
                    options.type.forEach(type => {
                        url += `&type=${type}`;
                    });
                } else {
                    url += `&type=${options.type}`;
                }
            }
            if (options.sortBy) {
                url += `&sortBy=${options.sortBy}&sortOrder=${options.sortOrder || 'desc'}`;
            }
            if (options.group) {
                url += `&group=true`;
            }
        }

        const response = await fetchData<ApiResponse<PaginatedNotifications>>(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getNotifications:', response);
            return {
                notifications: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                }
            };
        }
    } catch (error: any) {
        console.error('Error in getNotifications:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch notifications';
    }
};

// Function to get unread notification count
export const getUnreadCount = async () => {
    try {
        const response = await fetchData<ApiResponse<{ unreadCount: number }>>('/api/notifications/unread-count');

        if (response && response.success && response.data) {
            return response.data.unreadCount;
        } else {
            console.warn('Unexpected API response format in getUnreadCount:', response);
            return 0;
        }
    } catch (error: any) {
        console.error('Error in getUnreadCount:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch unread count';
    }
};

// Function to mark a single notification as read
export const markAsRead = async (notificationId: number) => {
    try {
        return await updateData<ApiResponse<Notification>>(`/api/notifications/${notificationId}/read`, {});
    } catch (error: any) {
        console.error('Error in markAsRead:', error);
        throw error.response?.data?.error || error.message || 'Failed to mark notification as read';
    }
};

// Function to mark multiple notifications as read
export const markMultipleAsRead = async (
    options: {
        ids?: number[];
        all?: boolean;
        type?: NotificationType;
        olderThan?: string; // ISO date string
    }
) => {
    try {
        return await updateData<ApiResponse<{ count: number }>>('/api/notifications/read', options);
    } catch (error: any) {
        console.error('Error in markMultipleAsRead:', error);
        throw error.response?.data?.error || error.message || 'Failed to mark notifications as read';
    }
};

// Function to mark all notifications as read (legacy)
export const markAllAsRead = async () => {
    try {
        return await updateData<ApiResponse<{ count: number }>>('/api/notifications/mark-all-read', {});
    } catch (error: any) {
        console.error('Error in markAllAsRead:', error);
        throw error.response?.data?.error || error.message || 'Failed to mark all notifications as read';
    }
};

// Function to delete a notification
export const deleteNotification = async (notificationId: number) => {
    try {
        return await deleteData<ApiResponse<void>>(`/api/notifications/${notificationId}`);
    } catch (error: any) {
        console.error('Error in deleteNotification:', error);
        throw error.response?.data?.error || error.message || 'Failed to delete notification';
    }
};

// Function to delete multiple notifications
export const deleteMultipleNotifications = async (
    options: {
        ids?: number[];
        all?: boolean;
        readOnly?: boolean;
        olderThan?: string; // ISO date string
    }
) => {
    try {
        return await deleteData<ApiResponse<{ count: number }>>('/api/notifications', options);
    } catch (error: any) {
        console.error('Error in deleteMultipleNotifications:', error);
        throw error.response?.data?.error || error.message || 'Failed to delete notifications';
    }
};

// Function to get notification statistics
export const getNotificationStats = async () => {
    try {
        const response = await fetchData<ApiResponse<NotificationStats>>('/api/notifications/stats');

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getNotificationStats:', response);
            return {
                unreadCount: 0,
                byType: []
            };
        }
    } catch (error: any) {
        console.error('Error in getNotificationStats:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch notification stats';
    }
};

// Custom hook for notification management (for React components)
export const useNotifications = () => {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = React.useState<number>(0);
    const [stats, setStats] = React.useState<NotificationStats | null>(null);
    const [pagination, setPagination] = React.useState({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
    });
    const [loading, setLoading] = React.useState<{
        notifications: boolean;
        unread: boolean;
        action: boolean;
        stats: boolean;
    }>({
        notifications: false,
        unread: false,
        action: false,
        stats: false
    });
    const [error, setError] = React.useState<string | null>(null);

    // Fetch notifications with optional filtering
    const fetchNotifications = async (
        page: number = 1,
        limit: number = 20,
        options?: {
            read?: boolean;
            type?: NotificationType | NotificationType[];
            sortBy?: 'createdAt' | 'type' | 'title';
            sortOrder?: 'asc' | 'desc';
            group?: boolean;
        }
    ) => {
        try {
            setLoading(prev => ({ ...prev, notifications: true }));
            const data = await getNotifications(page, limit, options);

            setNotifications(data.notifications);
            setPagination(data.pagination);

            if (data.stats?.unreadCount !== undefined) {
                setUnreadCount(data.stats.unreadCount);
            }

            return data;
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
            console.error('Error fetching notifications:', err);
            return null;
        } finally {
            setLoading(prev => ({ ...prev, notifications: false }));
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            setLoading(prev => ({ ...prev, unread: true }));
            const count = await getUnreadCount();
            setUnreadCount(count);
            return count;
        } catch (err: any) {
            setError(err.message || 'Failed to fetch unread count');
            console.error('Error fetching unread count:', err);
            return 0;
        } finally {
            setLoading(prev => ({ ...prev, unread: false }));
        }
    };

    // Fetch notification statistics
    const fetchNotificationStats = async () => {
        try {
            setLoading(prev => ({ ...prev, stats: true }));
            const statsData = await getNotificationStats();
            setStats(statsData);
            setUnreadCount(statsData.unreadCount);
            return statsData;
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notification stats');
            console.error('Error fetching notification stats:', err);
            return null;
        } finally {
            setLoading(prev => ({ ...prev, stats: false }));
        }
    };

    // Mark a notification as read
    const handleMarkAsRead = async (notificationId: number) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await markAsRead(notificationId);

            if (response.success) {
                // Update local notification state
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.notification_id === notificationId
                            ? { ...notification, is_read: true, readAt: new Date().toISOString() }
                            : notification
                    )
                );

                // Update unread count
                setUnreadCount(prevCount => Math.max(0, prevCount - 1));
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to mark notification as read');
            console.error('Error marking notification as read:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Mark multiple notifications as read
    const handleMarkMultipleAsRead = async (
        options: {
            ids?: number[];
            all?: boolean;
            type?: NotificationType;
            olderThan?: string;
        }
    ) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await markMultipleAsRead(options);

            if (response.success) {
                if (options.ids) {
                    // Update specific notifications
                    setNotifications(prev =>
                        prev.map(notification =>
                            options.ids?.includes(notification.notification_id)
                                ? { ...notification, is_read: true, readAt: new Date().toISOString() }
                                : notification
                        )
                    );

                    // Update unread count
                    const markedCount = response.data?.count || 0;
                    setUnreadCount(prevCount => Math.max(0, prevCount - markedCount));
                } else {
                    // For all/type/date filters, refresh the notifications
                    await fetchNotifications(pagination.page, pagination.limit);
                    await fetchUnreadCount();
                }

                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to mark notifications as read');
            console.error('Error marking multiple notifications as read:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await markAllAsRead();

            if (response.success) {
                // Update all notifications as read
                setNotifications(prev =>
                    prev.map(notification => ({
                        ...notification,
                        is_read: true,
                        readAt: new Date().toISOString()
                    }))
                );

                // Reset unread count
                setUnreadCount(0);
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to mark all notifications as read');
            console.error('Error marking all notifications as read:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Delete a notification
    const handleDeleteNotification = async (notificationId: number) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await deleteNotification(notificationId);

            if (response.success) {
                // Remove from local state
                setNotifications(prev =>
                    prev.filter(notification => notification.notification_id !== notificationId)
                );

                // Update unread count if deleted notification was unread
                const deletedNotification = notifications.find(n => n.notification_id === notificationId);
                if (deletedNotification && !deletedNotification.is_read) {
                    setUnreadCount(prevCount => Math.max(0, prevCount - 1));
                }

                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to delete notification');
            console.error('Error deleting notification:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Delete multiple notifications
    const handleDeleteMultipleNotifications = async (
        options: {
            ids?: number[];
            all?: boolean;
            readOnly?: boolean;
            olderThan?: string;
        }
    ) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await deleteMultipleNotifications(options);

            if (response.success) {
                if (options.ids) {
                    // Remove specific notifications from local state
                    setNotifications(prev =>
                        prev.filter(notification => !options.ids?.includes(notification.notification_id))
                    );

                    // Update unread count if any deleted were unread
                    const deletedUnreadCount = notifications.filter(
                        n => options.ids?.includes(n.notification_id) && !n.is_read
                    ).length;

                    if (deletedUnreadCount > 0) {
                        setUnreadCount(prevCount => Math.max(0, prevCount - deletedUnreadCount));
                    }
                } else {
                    // For all/readOnly/date filters, refresh the notifications
                    await fetchNotifications(pagination.page, pagination.limit);
                    await fetchUnreadCount();
                }

                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to delete notifications');
            console.error('Error deleting multiple notifications:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Load notifications and unread count on initial mount
    React.useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    return {
        notifications,
        unreadCount,
        stats,
        pagination,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        fetchNotificationStats,
        markAsRead: handleMarkAsRead,
        markMultipleAsRead: handleMarkMultipleAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDeleteNotification,
        deleteMultipleNotifications: handleDeleteMultipleNotifications,
    };
};