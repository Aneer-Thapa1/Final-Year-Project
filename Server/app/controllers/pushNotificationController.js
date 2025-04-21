// services/notificationService.js
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Service to handle sending push notifications to user devices
 */
class NotificationService {
    /**
     * Send a push notification to a specific device
     * @param {string} token - The Expo push token
     * @param {string} title - Notification title
     * @param {string} body - Notification message
     * @param {Object} data - Additional data
     * @returns {Promise} - Result of sending
     */
    async sendPushNotification(token, title, body, data = {}) {
        // Basic validation
        if (!token) {
            return { error: 'Missing token' };
        }

        // Construct message payload
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high',
            channelId: 'default',
        };

        try {
            // Send to Expo push service
            const response = await axios.post(
                'https://exp.host/--/api/v2/push/send',
                message,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Push notification error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Send notification to a user's devices
     * @param {number} userId - User ID
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} data - Additional data
     * @returns {Promise} - Result
     */
    async sendToUser(userId, title, body, data = {}) {
        try {
            // Get user and their push tokens
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: {
                    pushTokens: true,
                    prefersNotifications: true,
                    onVacation: true,
                },
            });

            // Skip if user doesn't exist or has notifications disabled
            if (!user || !user.prefersNotifications || user.onVacation) {
                return { skipped: true, reason: 'User preferences' };
            }

            // Skip if no push tokens registered
            if (!user.pushTokens || user.pushTokens.length === 0) {
                return { skipped: true, reason: 'No push tokens' };
            }

            // Send to all user devices
            const results = [];
            for (const token of user.pushTokens) {
                const result = await this.sendPushNotification(token, title, body, data);
                results.push(result);
            }

            // Check for any successes
            const anySuccess = results.some(r => !r.error);

            return {
                success: anySuccess,
                results,
                deviceCount: user.pushTokens.length,
            };
        } catch (error) {
            console.error(`Error sending to user ${userId}:`, error);
            return { error: error.message };
        }
    }
}

module.exports = new NotificationService();