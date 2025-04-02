import { fetchData } from './api';
import React from 'react';

// Interfaces for Notification Service
export interface Notification {
    notification_id: number;
    user_id: number;
    title: string;
    content: string;
    type: NotificationType;
    is_read: boolean;
    createdAt: string;
    readAt?: string | null;
    action_url?: string | null;
    related_id?: number | null;
}

export type NotificationType =
    | 'STREAK_MILESTONE'
    | 'ACHIEVEMENT_UNLOCKED'
    | 'FRIEND_REQUEST'
    | 'CHALLENGE_INVITE'
    | 'REMINDER'
    | 'SYSTEM_MESSAGE'
    | 'BLOG_COMMENT'
    | 'NEW_MESSAGE'
    | 'GROUP_INVITATION';

export interface NotificationResponse {
    success: boolean;
    data: {
        notifications: Notification[];
        pagination?: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    };
    unreadCount?: number;
    message?: string;
    error?: string;
}

// Fetch notifications
export const getNotifications = async (
    page: number = 1,
    limit: number = 20,
    read?: boolean,
    type?: NotificationType
) => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        if (read !== undefined) {
            params.append('read', read.toString());
        }

        if (type) {
            params.append('type', type);
        }

        const response = await fetchData<NotificationResponse>(`/api/notifications?${params.toString()}`);

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in getNotifications:', response);
            return { success: true, data: { notifications: [] } };
        }
    } catch (error: any) {
        console.error('Error in getNotifications:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch notifications';
    }
};

// Get unread notification count
export const getUnreadNotificationCount = async () => {
    try {
        const response = await fetchData<NotificationResponse>('/api/notifications/unread-count');

        if (response && response.success) {
            return response.unreadCount || 0;
        } else {
            console.warn('Unexpected API response format in getUnreadNotificationCount:', response);
            return 0;
        }
    } catch (error: any) {
        console.error('Error in getUnreadNotificationCount:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch unread notification count';
    }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (notificationId: number) => {
    try {
        const response = await fetchData<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
            method: 'PUT'
        });

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in markNotificationAsRead:', response);
            return { success: false };
        }
    } catch (error: any) {
        console.error('Error in markNotificationAsRead:', error);
        throw error.response?.data?.error || error.message || 'Failed to mark notification as read';
    }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
    try {
        const response = await fetchData<NotificationResponse>('/api/notifications/mark-all-read', {
            method: 'PUT'
        });

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in markAllNotificationsAsRead:', response);
            return { success: false };
        }
    } catch (error: any) {
        console.error('Error in markAllNotificationsAsRead:', error);
        throw error.response?.data?.error || error.message || 'Failed to mark all notifications as read';
    }
};

// Delete a specific notification
export const deleteNotification = async (notificationId: number) => {
    try {
        const response = await fetchData<NotificationResponse>(`/api/notifications/${notificationId}`, {
            method: 'DELETE'
        });

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in deleteNotification:', response);
            return { success: false };
        }
    } catch (error: any) {
        console.error('Error in deleteNotification:', error);
        throw error.response?.data?.error || error.message || 'Failed to delete notification';
    }
};

// Custom hook for notification management
export const useNotifications = () => {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [pagination, setPagination] = React.useState({
        page: 1,
        limit: 20,
        totalPages: 1,
        total: 0
    });
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [filter, setFilter] = React.useState<{
        read?: boolean;
        type?: NotificationType;
    }>({});

    // Fetch notifications with optional filtering
    const fetchNotifications = async (
        page: number = 1,
        read?: boolean,
        type?: NotificationType
    ) => {
        try {
            setLoading(true);
            setError(null);

            // Update filter state
            const newFilter = { read, type };
            setFilter(prev => ({ ...prev, ...newFilter }));

            const response = await getNotifications(page, 20, read, type);

            if (response.success) {
                setNotifications(response.data.notifications || []);

                // Update pagination if available
                if (response.data.pagination) {
                    setPagination(response.data.pagination);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
        } catch (err: any) {
            console.error('Error fetching unread count:', err);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId: number) => {
        try {
            await markNotificationAsRead(notificationId);
            // Optimistically update the local state
            setNotifications(prev =>
                prev.map(notification =>
                    notification.notification_id === notificationId
                        ? { ...notification, is_read: true, readAt: new Date().toISOString() }
                        : notification
                )
            );
            // Refresh unread count
            await fetchUnreadCount();
        } catch (err: any) {
            setError(err.message || 'Failed to mark notification as read');
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            // Optimistically update the local state
            setNotifications(prev =>
                prev.map(notification =>
                    ({ ...notification, is_read: true, readAt: new Date().toISOString() })
                )
            );
            // Reset unread count
            setUnreadCount(0);
        } catch (err: any) {
            setError(err.message || 'Failed to mark all notifications as read');
        }
    };

    // Delete a notification
    const deleteNotificationById = async (notificationId: number) => {
        try {
            await deleteNotification(notificationId);
            // Optimistically remove from local state
            setNotifications(prev =>
                prev.filter(notification => notification.notification_id !== notificationId)
            );
            // Refresh unread count
            await fetchUnreadCount();
        } catch (err: any) {
            setError(err.message || 'Failed to delete notification');
        }
    };

    // Fetch initial data on mount
    React.useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    // Optional polling for unread count (every 5 minutes)
    React.useEffect(() => {
        const intervalId = setInterval(fetchUnreadCount, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, []);

    return {
        notifications,
        unreadCount,
        pagination,
        loading,
        error,
        filter,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification: deleteNotificationById,
        setFilter: (newFilter: { read?: boolean; type?: NotificationType }) => {
            setFilter(prev => ({ ...prev, ...newFilter }));
            fetchNotifications(1, newFilter.read, newFilter.type);
        }
    };
};