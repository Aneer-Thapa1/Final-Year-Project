
import { fetchData, postData } from './api';
import { useSelector } from 'react-redux';

// Helper function to get current user ID
const getCurrentUserId = () => {
    const userDetails = useSelector((state) => state.user);
    return userDetails?.user?.user_id || userDetails?.user_id;
};

/**
 * Get all achievements for a user, including both achieved and in-progress
 * @returns {Promise<Object>} Achievement data with summary and details
 */
export const getUserAchievements = async () => {
    try {
        const response = await fetchData('/api/achievements/achievements');

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getUserAchievements:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getUserAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch user achievements';
    }
};

/**
 * Get detailed information about a specific achievement
 * @param {number} achievementId - The ID of the achievement
 * @returns {Promise<Object>} Detailed achievement data
 */
export const getAchievementDetails = async (achievementId) => {
    try {
        const response = await fetchData(`/api/achievements/${achievementId}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementDetails:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getAchievementDetails:', error);
        throw error.response?.data?.error || 'Failed to fetch achievement details';
    }
};

/**
 * Get all achievements by type
 * @param {string} type - The achievement type (e.g., 'STREAK_LENGTH', 'TOTAL_COMPLETIONS')
 * @returns {Promise<Array>} List of achievements of the specified type
 */
export const getAchievementsByType = async (type) => {
    try {
        const response = await fetchData(`/api/achievements/type/${type}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementsByType:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getAchievementsByType:', error);
        throw error.response?.data?.error || 'Failed to fetch achievements by type';
    }
};

/**
 * Get recently unlocked achievements
 * @param {number} limit - Maximum number of achievements to return
 * @returns {Promise<Array>} List of recently unlocked achievements
 */
export const getRecentAchievements = async (limit = 5) => {
    try {
        const response = await fetchData(`/api/achievements/recent?limit=${limit}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getRecentAchievements:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getRecentAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch recent achievements';
    }
};

/**
 * Get achievements that are close to being unlocked
 * @param {number} threshold - Percentage threshold for "close" (e.g., 80 for 80% complete)
 * @param {number} limit - Maximum number of achievements to return
 * @returns {Promise<Array>} List of achievements close to being unlocked
 */
export const getUpcomingAchievements = async (threshold = 70, limit = 5) => {
    try {
        const response = await fetchData(`/api/achievements/upcoming?threshold=${threshold}&limit=${limit}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getUpcomingAchievements:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getUpcomingAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch upcoming achievements';
    }
};

/**
 * Get leaderboard for achievements
 * @param {number} limit - Maximum number of users to return
 * @returns {Promise<Array>} Leaderboard data
 */
export const getAchievementLeaderboard = async (limit = 10) => {
    try {
        const response = await fetchData(`/api/achievements/leaderboard?limit=${limit}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementLeaderboard:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getAchievementLeaderboard:', error);
        throw error.response?.data?.error || 'Failed to fetch achievement leaderboard';
    }
};

/**
 * Get achievement progress history over time
 * @param {number} achievementId - The ID of the achievement
 * @param {string} timeframe - Timeframe for history (week, month, year, all)
 * @returns {Promise<Object>} Progress history data
 */
export const getAchievementProgressHistory = async (achievementId, timeframe = 'month') => {
    try {
        const response = await fetchData(`/api/achievements/${achievementId}/history?timeframe=${timeframe}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementProgressHistory:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getAchievementProgressHistory:', error);
        throw error.response?.data?.error || 'Failed to fetch achievement progress history';
    }
};

/**
 * Get points earned from achievements
 * @param {string} timeframe - Timeframe for points (week, month, year, all)
 * @returns {Promise<Object>} Points data
 */
export const getAchievementPoints = async (timeframe = 'all') => {
    try {
        const response = await fetchData(`/api/achievements/points?timeframe=${timeframe}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementPoints:', response);
            return { total: 0, breakdown: [] };
        }
    } catch (error) {
        console.error('Error in getAchievementPoints:', error);
        throw error.response?.data?.error || 'Failed to fetch achievement points';
    }
};

/**
 * Get achievements related to a specific habit
 * @param {number} habitId - The ID of the habit
 * @returns {Promise<Array>} List of related achievements
 */
export const getHabitRelatedAchievements = async (habitId) => {
    try {
        const response = await fetchData(`/api/achievements/habit/${habitId}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getHabitRelatedAchievements:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getHabitRelatedAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch habit-related achievements';
    }
};

/**
 * Share an achievement to social media or via app sharing
 * @param {number} achievementId - The ID of the achievement to share
 * @param {string} platform - The platform to share to (e.g., 'twitter', 'facebook', 'app')
 * @returns {Promise<Object>} Share result
 */
export const shareAchievement = async (achievementId, platform = 'app') => {
    try {
        const response = await postData(`/api/achievements/${achievementId}/share`, { platform });

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in shareAchievement:', response);
            return { success: false, message: 'Failed to share achievement' };
        }
    } catch (error) {
        console.error('Error in shareAchievement:', error);
        throw error.response?.data?.error || 'Failed to share achievement';
    }
};

/**
 * Generate a certificate for an achievement
 * @param {number} achievementId - The ID of the achievement
 * @param {string} format - The format of the certificate (pdf, image)
 * @returns {Promise<Object>} Certificate data
 */
export const generateAchievementCertificate = async (achievementId, format = 'pdf') => {
    try {
        const response = await postData(`/api/achievements/${achievementId}/certificate`, { format });

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in generateAchievementCertificate:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in generateAchievementCertificate:', error);
        throw error.response?.data?.error || 'Failed to generate achievement certificate';
    }
};

/**
 * Get achievement statistics
 * @returns {Promise<Object>} Achievement statistics
 */
export const getAchievementStats = async () => {
    try {
        const response = await fetchData('/api/achievements/stats');

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievementStats:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getAchievementStats:', error);
        throw error.response?.data?.error || 'Failed to fetch achievement statistics';
    }
};

export default {
    getUserAchievements,
    getAchievementDetails,
    getAchievementsByType,
    getRecentAchievements,
    getUpcomingAchievements,
    getAchievementLeaderboard,
    getAchievementProgressHistory,
    getAchievementPoints,
    getHabitRelatedAchievements,
    shareAchievement,
    generateAchievementCertificate,
    getAchievementStats
};