import { fetchData, postData } from './api';
import {useSelector} from 'react-redux'

// Helper function to get current user ID
const getCurrentUserId = () => {
    const userDetails = useSelector((state) => state.user)
    return userDetails?.user?.user_id || userDetails?.user?.user?.user_id

};

// Get user analytics based on timeframe
export const getUserAnalytics = async (timeframe = 'week') => {
    try {
        const userId = getCurrentUserId();
        const response = await fetchData(`/api/analytics/getUserAnalytics/${userId}?timeframe=${timeframe}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getUserAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getUserAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch analytics data';
    }
};

// Get weekly habit summary
export const getWeeklySummary = async (date) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/getWeeklySummary/${userId}`;
        if (date) {
            url += `?date=${date}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getWeeklySummary:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getWeeklySummary:', error);
        throw error.response?.data?.error || 'Failed to fetch weekly summary';
    }
};

// Get monthly performance stats
export const getMonthlyPerformance = async (month, year) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/getMonthlyPerformance/${userId}`;
        const params = [];

        if (month) params.push(`month=${month}`);
        if (year) params.push(`year=${year}`);

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getMonthlyPerformance:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getMonthlyPerformance:', error);
        throw error.response?.data?.error || 'Failed to fetch monthly performance';
    }
};

// Get yearly analytics
export const getYearlyAnalytics = async (year) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/getYearlyAnalytics/${userId}`;
        if (year) {
            url += `?year=${year}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getYearlyAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getYearlyAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch yearly analytics';
    }
};

// Get habit-specific analytics
export const getHabitAnalytics = async (habitId, timeframe = 'month', includeStreaks = true, limit = 10, compareToPrevious = false) => {
    try {
        let url = `/api/analytics/getHabitAnalytics/${habitId}?timeframe=${timeframe}`;

        if (includeStreaks) url += '&include_streaks=true';
        if (limit) url += `&limit=${limit}`;
        if (compareToPrevious) url += '&compare_to_previous=true';

        const response = await fetchData(url);

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in getHabitAnalytics:', response);
            return { success: false, message: 'Invalid response format' };
        }
    } catch (error) {
        console.error('Error in getHabitAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch habit analytics';
    }
};

// ENHANCED ANALYTICS ENDPOINTS

// Get GitHub-style contribution heatmap
export const getContributionHeatmap = async (timeRange = 'year', habitId = null) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/contribution-heatmap/${userId}?timeRange=${timeRange}`;

        if (habitId) {
            url += `&habitId=${habitId}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getContributionHeatmap:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getContributionHeatmap:', error);
        throw error.response?.data?.error || 'Failed to fetch contribution heatmap data';
    }
};

// Get detailed habit progress analytics
export const getHabitProgressAnalytics = async (habitId, timeRange = 'all') => {
    try {
        const url = `/api/analytics/habit-progress/${habitId}?timeRange=${timeRange}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getHabitProgressAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getHabitProgressAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch habit progress analytics';
    }
};

// Get mood analysis data
export const getMoodAnalytics = async (timeRange = 'month', habitId = null) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/mood-analytics/${userId}?timeRange=${timeRange}`;

        if (habitId) {
            url += `&habitId=${habitId}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getMoodAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getMoodAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch mood analytics data';
    }
};

// Get comprehensive dashboard analytics
export const getDashboardAnalytics = async () => {
    try {
        const userId = getCurrentUserId();
        const url = `/api/analytics/dashboard-analytics/${userId}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getDashboardAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getDashboardAnalytics:', error);
        throw error.response?.data?.error || 'Failed to fetch dashboard analytics data';
    }
};

// Get streak milestones
export const getStreakMilestones = async (timeframe = 'all') => {
    try {
        const userId = getCurrentUserId();
        const response = await fetchData(`/api/analytics/getStreakMilestones/${userId}?timeframe=${timeframe}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getStreakMilestones:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getStreakMilestones:', error);
        throw error.response?.data?.error || 'Failed to fetch streak milestones';
    }
};

// Get points breakdown
export const getPointsBreakdown = async (timeframe = 'month') => {
    try {
        const userId = getCurrentUserId();
        const response = await fetchData(`/api/analytics/getPointsBreakdown/${userId}?timeframe=${timeframe}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getPointsBreakdown:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getPointsBreakdown:', error);
        throw error.response?.data?.error || 'Failed to fetch points breakdown';
    }
};

// Get completion heatmap data
export const getCompletionHeatmap = async (year) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/getCompletionHeatmap/${userId}`;
        if (year) {
            url += `?year=${year}`;
        }

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getCompletionHeatmap:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getCompletionHeatmap:', error);
        throw error.response?.data?.error || 'Failed to fetch completion heatmap';
    }
};

// Get user achievements
export const getAchievements = async () => {
    try {
        const userId = getCurrentUserId();
        const response = await fetchData(`/api/analytics/getUserAchievements/${userId}`);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAchievements:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch user achievements';
    }
};

// Get streak history for a specific habit
export const getStreakHistory = async (habitId, limit = 10) => {
    try {
        const response = await fetchData(`/api/habits/${habitId}/streakHistory?limit=${limit}`);

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in getStreakHistory:', response);
            return { success: false, message: 'Invalid response format' };
        }
    } catch (error) {
        console.error('Error in getStreakHistory:', error);
        throw error.response?.data?.error || 'Failed to fetch streak history';
    }
};

// Get time patterns for analytics
export const getTimePatterns = async (habitId = null, timeframe = 'month') => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/timePatterns/${userId}?timeframe=${timeframe}`;

        if (habitId) url += `&habit_id=${habitId}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getTimePatterns:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getTimePatterns:', error);
        throw error.response?.data?.error || 'Failed to fetch time patterns';
    }
};

// Get habit domains with analytics data
export const getHabitDomains = async () => {
    try {
        const userId = getCurrentUserId();
        const response = await fetchData(`/api/habits/domains/${userId}?with_stats=true`);

        if (response && response.success) {
            return response;
        } else {
            console.warn('Unexpected API response format in getHabitDomains:', response);
            return { success: false, data: [] };
        }
    } catch (error) {
        console.error('Error in getHabitDomains:', error);
        throw error.response?.data?.error || 'Failed to fetch habit domains';
    }
};

// Get AI insights based on habit data
export const getAIInsights = async (habitId = null) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/insights/${userId}`;

        if (habitId) url += `?habit_id=${habitId}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getAIInsights:', response);
            return [];
        }
    } catch (error) {
        console.error('Error in getAIInsights:', error);
        throw error.response?.data?.error || 'Failed to fetch AI insights';
    }
};

// Generate detailed habit report for export/share
export const generateHabitReport = async (habitId = null, timeframe = 'month', format = 'json') => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/generateReport/${userId}?timeframe=${timeframe}&format=${format}`;

        if (habitId) url += `&habit_id=${habitId}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in generateHabitReport:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in generateHabitReport:', error);
        throw error.response?.data?.error || 'Failed to generate habit report';
    }
};

// Get comparisons between habits
export const getHabitComparisons = async (habitIds, timeframe = 'month') => {
    try {
        if (!habitIds || !habitIds.length || habitIds.length < 2) {
            throw new Error('At least two habits are required for comparison');
        }

        const userId = getCurrentUserId();
        const habitsParam = habitIds.join(',');
        const url = `/api/analytics/compareHabits/${userId}?habits=${habitsParam}&timeframe=${timeframe}`;

        const response = await fetchData(url);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in getHabitComparisons:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in getHabitComparisons:', error);
        throw error.response?.data?.error || 'Failed to compare habits';
    }
};

// Export analytics data to file (CSV, PDF)
export const exportAnalytics = async (format = 'csv', timeframe = 'month', habitId = null) => {
    try {
        const userId = getCurrentUserId();
        let url = `/api/analytics/export/${userId}?format=${format}&timeframe=${timeframe}`;

        if (habitId) url += `&habit_id=${habitId}`;

        const response = await fetchData(url, { responseType: 'blob' });

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.warn('Unexpected API response format in exportAnalytics:', response);
            return null;
        }
    } catch (error) {
        console.error('Error in exportAnalytics:', error);
        throw error.response?.data?.error || 'Failed to export analytics data';
    }
};