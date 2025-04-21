import { postData, deleteData, updateData } from './api';

// Interface for push token response
export interface PushTokenResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Register a push token with the server
 * @param pushToken The Expo push token to register
 */
export const registerPushToken = async (pushToken: string): Promise<PushTokenResponse> => {
    try {
        const response = await postData<PushTokenResponse>('/api/pushToken/register', { pushToken });
        return response;
    } catch (error: any) {
        console.error('Error registering push token:', error);
        throw error.response?.data?.error || error.message || 'Failed to register push token';
    }
};

/**
 * Remove a push token from the server
 * @param pushToken The Expo push token to remove
 */
export const removePushToken = async (pushToken: string): Promise<PushTokenResponse> => {
    try {
        const response = await deleteData<PushTokenResponse>('/api/pushToken/remove', { pushToken });
        return response;
    } catch (error: any) {
        console.error('Error removing push token:', error);
        throw error.response?.data?.error || error.message || 'Failed to remove push token';
    }
};

/**
 * Update notification preferences
 * @param enabled Whether notifications should be enabled
 */
export const updateNotificationPreferences = async (enabled: boolean): Promise<PushTokenResponse> => {
    try {
        const response = await updateData<PushTokenResponse>('/api/pushToken/preferences', { enabled });
        return response;
    } catch (error: any) {
        console.error('Error updating notification preferences:', error);
        throw error.response?.data?.error || error.message || 'Failed to update notification preferences';
    }
};

/**
 * Send a test notification (for development)
 */
export const sendTestNotification = async (title?: string, body?: string): Promise<PushTokenResponse> => {
    try {
        const response = await postData<PushTokenResponse>('/api/pushToken/test', { title, body });
        return response;
    } catch (error: any) {
        console.error('Error sending test notification:', error);
        throw error.response?.data?.error || error.message || 'Failed to send test notification';
    }
};