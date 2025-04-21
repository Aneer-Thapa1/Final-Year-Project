import { fetchData, postData } from './api';

// Utility function to get current user ID from Redux store
const getCurrentUserId = () => {
    const userDetails = useSelector((state) => state.user);
    return userDetails?.user_id ||
        userDetails?.user?.user?.user_id ||
        userDetails?.userId ||
        null;
};

// Data Transformer Utility
const transformers = {
    // Dashboard Analytics Transformer
    dashboardAnalytics: (rawData) => {
        if (!rawData || !rawData.data) return null;

        const { data } = rawData;

        return {
            summary: {
                totalHabits: data.summary?.totalHabits || 0,
                activeHabits: data.habitsOverview?.totalActive || 0,
                todayProgress: data.summary?.todayProgress || 0,
                todayCompleted: data.summary?.todayCompleted || 0,
                todayRemaining: data.summary?.todayRemaining || 0,
                weekProgress: data.summary?.weekProgress || 0,
                weekCompleted: data.summary?.weekCompleted || 0,
                weekExpected: data.summary?.weekExpected || 0,
                monthPoints: data.summary?.monthPoints || 0,
                currentStreak: data.user?.currentStreak || 0,
                longestStreak: data.user?.longestStreak || 0,
                activeStreaks: data.summary?.activeStreaks || 0
            },
            weekStatus: [
                { day: 0, name: 'Sun', completed: 0, missed: 0, total: 0 },
                { day: 1, name: 'Mon', completed: 0, missed: 0, total: 0 },
                { day: 2, name: 'Tue', completed: 0, missed: 0, total: 0 },
                { day: 3, name: 'Wed', completed: 0, missed: 0, total: 0 },
                { day: 4, name: 'Thu', completed: 0, missed: 0, total: 0 },
                { day: 5, name: 'Fri', completed: 0, missed: 0, total: 0 },
                { day: 6, name: 'Sat', completed: 0, missed: 0, total: 0 }
            ],
            domainPerformance: (data.habitsOverview?.byDomain || []).map(domain => ({
                name: domain.name,
                color: domain.color || '#4285F4',
                habitsCount: domain.habitCount || 0,
                completedCount: domain.completionCount || 0,
                completionPercentage: domain.percentage || 0
            })),
            completionTrend: data.completionTrend || [],
            topStreaks: (data.habitsOverview?.topStreaks || []).map(streak => ({
                id: streak.id,
                name: streak.name,
                color: streak.color || '#4285F4',
                currentStreak: streak.current_streak || 0,
                longestStreak: streak.longest_streak || 0
            })),
            dateRanges: data.dateRanges || {
                today: new Date().toISOString(),
                weekStart: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString(),
                weekEnd: new Date(new Date().setDate(new Date().getDate() + (6 - new Date().getDay()))).toISOString(),
                monthStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
                monthEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
            }
        };
    },

    // Habit Heatmap Transformer
    habitHeatmap: (rawData) => {
        if (!rawData || !rawData.data) return null;

        const { data } = rawData;

        // Format the weeks data structure for rendering
        return {
            weeks: data.weeks || [],
            contributionDays: data.contributionDays || 0,
            totalDays: data.totalDays || 0,
            completionRate: data.completionRate || 0,
            longestStreak: data.longestStreak || 0,
            currentStreak: data.currentStreak || 0,
            maxCount: data.maxCount || 0,
            timeRange: data.timeRange || 'month'
        };
    },

    // Habit Analytics Transformer
    habitAnalytics: (rawData) => {
        if (!rawData || !rawData.data) return null;

        const { data } = rawData;
        return {
            habitDetails: data.habitDetails || {},
            streakData: {
                current: data.streakData?.current || 0,
                longest: data.streakData?.longest || 0,
                lastCompleted: data.streakData?.lastCompleted || null
            },
            completionStats: data.completionStats || {
                completionRate: 0,
                totalScheduled: 0,
                totalCompleted: 0,
                totalSkipped: 0,
                dayDistribution: [],
                timeDistribution: []
            },
            progressData: data.progressData || [],
            timeRange: data.timeRange || 'month',
            dateRange: data.dateRange || {
                start: new Date().toISOString(),
                end: new Date().toISOString()
            }
        };
    },

    // Personal Insights Transformer
    personalInsights: (rawData) => {
        if (!rawData || !rawData.data) return null;

        const { data } = rawData;
        return {
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            suggestions: data.suggestions || [],
            achievement_opportunities: data.achievement_opportunities || [],
            metrics: data.metrics || {}
        };
    }
};

// Analytics Service with Error Handling
const analyticsService = {
    // Dashboard Analytics
    getDashboardAnalytics: async () => {
        try {
            const response = await fetchData('/api/analytics/dashboard');

            if (response?.success && response?.data) {
                return transformers.dashboardAnalytics(response);
            }

            console.warn('Unexpected dashboard analytics response:', response);
            return null;
        } catch (error) {
            console.error('Dashboard Analytics Error:', error);
            throw error.response?.data?.error || 'Failed to fetch dashboard analytics';
        }
    },

    // Habit Heatmap
    getHabitHeatmap: async (timeRange = 'month', habitId = null) => {
        try {
            let url = '/api/analytics/heatmap';
            const params = [];

            if (timeRange) params.push(`timeRange=${timeRange}`);
            if (habitId) params.push(`habitId=${habitId}`);

            if (params.length > 0) {
                url += `?${params.join('&')}`;
            }

            const response = await fetchData(url);

            if (response?.success && response?.data) {
                return transformers.habitHeatmap(response);
            }

            console.warn('Unexpected habit heatmap response:', response);
            return null;
        } catch (error) {
            console.error('Habit Heatmap Error:', error);
            throw error.response?.data?.error || 'Failed to fetch habit heatmap';
        }
    },

    // Habit Analytics
    getHabitAnalytics: async (habitId, timeRange = 'month') => {
        try {
            const url = `/api/analytics/habit/${habitId}?timeRange=${timeRange}`;
            const response = await fetchData(url);

            if (response?.success && response?.data) {
                return transformers.habitAnalytics(response);
            }

            console.warn('Unexpected habit analytics response:', response);
            return null;
        } catch (error) {
            console.error('Habit Analytics Error:', error);
            throw error.response?.data?.error || 'Failed to fetch habit analytics';
        }
    },

    // Personal Insights
    getPersonalInsights: async () => {
        try {
            const response = await fetchData('/api/analytics/insights');

            if (response?.success && response?.data) {
                return transformers.personalInsights(response);
            }

            console.warn('Unexpected personal insights response:', response);
            return null;
        } catch (error) {
            console.error('Personal Insights Error:', error);
            throw error.response?.data?.error || 'Failed to fetch personal insights';
        }
    },

    // Legacy Support - These methods maintain backward compatibility

    // Contribution Heatmap (now maps to Habit Heatmap)
    getContributionHeatmap: async (timeRange = 'year', habitId = null) => {
        try {
            return await analyticsService.getHabitHeatmap(timeRange, habitId);
        } catch (error) {
            console.error('Contribution Heatmap Error:', error);
            throw error.response?.data?.error || 'Failed to fetch contribution heatmap';
        }
    },

    // Habit Progress Analytics (now maps to Habit Analytics)
    getHabitProgressAnalytics: async (habitId, timeRange = 'all') => {
        try {
            return await analyticsService.getHabitAnalytics(habitId, timeRange);
        } catch (error) {
            console.error('Habit Progress Analytics Error:', error);
            throw error.response?.data?.error || 'Failed to fetch habit progress analytics';
        }
    },

    // Methods that use endpoints not yet implemented in the new controller

    // Progress Milestones
    getProgressMilestones: async () => {
        try {
            const response = await fetchData('/api/analytics/milestones');

            if (response?.success && response?.data) {
                return response.data;
            }

            console.warn('Unexpected progress milestones response:', response);
            return null;
        } catch (error) {
            console.error('Progress Milestones Error:', error);
            throw error.response?.data?.error || 'Failed to fetch progress milestones';
        }
    },

    // Mood Analytics
    getMoodAnalytics: async (timeRange = 'month', habitId = null) => {
        try {
            let url = `/api/analytics/mood?timeRange=${timeRange}`;
            if (habitId) url += `&habitId=${habitId}`;

            const response = await fetchData(url);

            if (response?.success && response?.data) {
                return response.data;
            }

            console.warn('Unexpected mood analytics response:', response);
            return null;
        } catch (error) {
            console.error('Mood Analytics Error:', error);
            throw error.response?.data?.error || 'Failed to fetch mood analytics';
        }
    },

    // Habit Domains
    getHabitDomains: async () => {
        try {
            const response = await fetchData('/api/habit/allDomains');

            if (response?.success && response?.data) {
                return response.data;
            }

            console.warn('Unexpected habit domains response:', response);
            return [];
        } catch (error) {
            console.error('Habit Domains Error:', error);
            throw error.response?.data?.error || 'Failed to fetch habit domains';
        }
    },

    // Export Analytics
    exportAnalytics: async (format = 'csv', timeRange = 'month', habitId = null) => {
        try {
            let url = `/api/analytics/export?format=${format}&timeRange=${timeRange}`;
            if (habitId) url += `&habitId=${habitId}`;

            const response = await fetchData(url, { responseType: 'blob' });

            if (response?.success && response?.data) {
                return response.data;
            }

            console.warn('Unexpected export analytics response:', response);
            return null;
        } catch (error) {
            console.error('Export Analytics Error:', error);
            throw error.response?.data?.error || 'Failed to export analytics';
        }
    }
};

export default analyticsService;

// Type definitions for TypeScript
export interface DashboardAnalytics {
    summary: {
        totalHabits: number;
        activeHabits: number;
        todayProgress: number;
        todayCompleted: number;
        todayRemaining: number;
        weekProgress: number;
        weekCompleted: number;
        weekExpected: number;
        monthPoints: number;
        currentStreak: number;
        longestStreak: number;
        activeStreaks: number;
    };
    weekStatus: Array<{
        day: number;
        name: string;
        completed: number;
        missed: number;
        total: number;
    }>;
    domainPerformance: Array<{
        name: string;
        color: string;
        habitsCount: number;
        completedCount: number;
        completionPercentage: number;
    }>;
    completionTrend: Array<{
        date: string;
        count: number;
    }>;
    topStreaks: Array<{
        id: number;
        name: string;
        color: string;
        currentStreak: number;
        longestStreak: number;
    }>;
    dateRanges: {
        today: string;
        weekStart: string;
        weekEnd: string;
        monthStart: string;
        monthEnd: string;
    };
}

export interface HabitHeatmap {
    weeks: Array<Array<{
        date: string;
        count: number;
        level: number;
        isToday?: boolean;
        habits?: Array<{
            id: number;
            name: string;
            color: string;
        }>;
    } | null>>;
    contributionDays: number;
    totalDays: number;
    completionRate: number;
    longestStreak: number;
    currentStreak: number;
    maxCount: number;
    timeRange: string;
}

export interface HabitAnalytics {
    habitDetails: {
        id: number;
        name: string;
        description: string;
        color: string;
        icon: string;
        domain: string;
        frequency: string;
        trackingType: string;
        startDate: string;
    };
    streakData: {
        current: number;
        longest: number;
        lastCompleted: string | null;
    };
    completionStats: {
        completionRate: number;
        totalScheduled: number;
        totalCompleted: number;
        totalSkipped: number;
        dayDistribution: Array<{
            day: number;
            name: string;
            count: number;
            percentage: number;
        }>;
        timeDistribution: Array<{
            name: string;
            start: number;
            end: number;
            count: number;
            percentage: number;
        }>;
    };
    progressData: Array<any>; // Shape depends on timeRange
    timeRange: string;
    dateRange: {
        start: string;
        end: string;
    };
}

export interface PersonalInsights {
    strengths: Array<{
        type: string;
        name: string;
        metric: number;
        message: string;
    }>;
    improvements: Array<{
        type: string;
        name: string;
        metric: number;
        message: string;
    }>;
    suggestions: Array<{
        type: string;
        habitId?: number;
        habitName?: string;
        current?: number;
        next?: number;
        message: string;
        hour?: number;
        count?: number;
    }>;
    achievement_opportunities: Array<{
        id: number;
        name: string;
        percentComplete: number;
        description: string;
        message: string;
    }>;
    metrics: {
        overallCompletionRate: number;
        totalStreakDays: number;
        mostConsistentHabit: string | null;
        achievementsEarned: number;
        recentAchievement: string | null;
    };
}