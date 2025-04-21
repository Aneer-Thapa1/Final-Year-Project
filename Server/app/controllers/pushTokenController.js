// controllers/pushTokenController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Controller for managing user push tokens
 */
class PushTokenController {
    /**
     * Register a new push token for a user
     * @param {number} userId - User ID
     * @param {string} pushToken - Expo push token
     * @returns {Promise<Object>} - Operation result
     */
    async registerToken(userId, pushToken) {
        try {
            console.log(userId, pushToken);
            // Validate inputs
            if (!userId || !pushToken) {
                return {
                    success: false,
                    message: 'User ID and push token are required'
                };
            }

            // Get current user data
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId)},
                select: { pushTokens: true }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Add token if it doesn't already exist
            const existingTokens = user.pushTokens || [];

            if (!existingTokens.includes(pushToken)) {
                await prisma.user.update({
                    where: { user_id: parseInt(userId) },
                    data: {
                        pushTokens: {
                            set: [...existingTokens, pushToken]
                        }
                    }
                });
            }

            return {
                success: true,
                message: 'Push token registered successfully'
            };
        } catch (error) {
            console.error('Error registering push token:', error);
            return {
                success: false,
                message: 'Failed to register push token',
                error: error.message
            };
        }
    }

    /**
     * Remove a push token from a user
     * @param {number} userId - User ID
     * @param {string} pushToken - Token to remove
     * @returns {Promise<Object>} - Operation result
     */
    async removeToken(userId, pushToken) {
        try {
            // Validate inputs
            if (!userId || !pushToken) {
                return {
                    success: false,
                    message: 'User ID and push token are required'
                };
            }

            // Get current user data
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { pushTokens: true }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Remove the token
            const updatedTokens = (user.pushTokens || []).filter(token => token !== pushToken);

            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    pushTokens: {
                        set: updatedTokens
                    }
                }
            });

            return {
                success: true,
                message: 'Push token removed successfully'
            };
        } catch (error) {
            console.error('Error removing push token:', error);
            return {
                success: false,
                message: 'Failed to remove push token',
                error: error.message
            };
        }
    }

    /**
     * Remove all push tokens for a user (e.g., on logout from all devices)
     * @param {number} userId - User ID
     * @returns {Promise<Object>} - Operation result
     */
    async removeAllTokens(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    message: 'User ID is required'
                };
            }

            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    pushTokens: {
                        set: []
                    }
                }
            });

            return {
                success: true,
                message: 'All push tokens removed successfully'
            };
        } catch (error) {
            console.error('Error removing all push tokens:', error);
            return {
                success: false,
                message: 'Failed to remove all push tokens',
                error: error.message
            };
        }
    }

    /**
     * Get all push tokens for a user
     * @param {number} userId - User ID
     * @returns {Promise<Object>} - User's push tokens
     */
    async getUserTokens(userId) {
        try {
            if (!userId) {
                return {
                    success: false,
                    message: 'User ID is required'
                };
            }

            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { pushTokens: true }
            });

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            return {
                success: true,
                tokens: user.pushTokens || []
            };
        } catch (error) {
            console.error('Error getting user tokens:', error);
            return {
                success: false,
                message: 'Failed to get user push tokens',
                error: error.message
            };
        }
    }

    /**
     * Update notification preferences for a user
     * @param {number} userId - User ID
     * @param {boolean} enabled - Whether notifications should be enabled
     * @returns {Promise<Object>} - Operation result
     */
    async updateNotificationPreferences(userId, enabled) {
        try {
            if (!userId || typeof enabled !== 'boolean') {
                return {
                    success: false,
                    message: 'User ID and enabled status (boolean) are required'
                };
            }

            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    prefersNotifications: enabled
                }
            });

            return {
                success: true,
                message: `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`
            };
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return {
                success: false,
                message: 'Failed to update notification preferences',
                error: error.message
            };
        }
    }
}

module.exports = new PushTokenController();