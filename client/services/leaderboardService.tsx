import { fetchData } from './api';
import React from 'react';

// Leaderboard interfaces
export interface LeaderboardUser {
    rank: number;
    user_id: number;
    user_name: string;
    avatar?: string;
    completions?: number;
    points?: number;
    totalCompletions?: number;
    currentStreak: number;
    longestStreak: number;
    isActive?: boolean;
    lastActive?: string;
    isCurrentUser: boolean;
}

export interface DomainLeaderboardItem {
    rank: number;
    domain_id: number;
    name: string;
    color: string;
    icon?: string;
    completions: number;
    habitCount: number;
    userCount: number;
}

export interface UserDomainData {
    rank: number;
    domain_id: number;
    name: string;
    color: string;
    icon?: string;
    completions: number;
}

export interface LeaderboardResponse {
    success: boolean;
    timeframe?: string;
    startDate?: string;
    endDate?: string;
    lastUpdated?: string;
    data: LeaderboardUser[] | DomainLeaderboardItem[];
    currentUser?: LeaderboardUser | null;
    userTopDomain?: UserDomainData | null;
    message?: string;
    error?: string;
}

// Function to get points-based leaderboard
export const getPointsLeaderboard = async (timeframe: 'weekly' | 'monthly' = 'weekly', limit: number = 10) => {
    try {
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        params.append('limit', limit.toString());

        const response = await fetchData<LeaderboardResponse>(`/api/leaderboard/points?${params.toString()}`);

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getPointsLeaderboard:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getPointsLeaderboard:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch points leaderboard data';
    }
};

// Function to get real-time leaderboard updates
export const getRealTimeLeaderboard = async (limit: number = 10) => {
    try {
        const response = await fetchData<LeaderboardResponse>(`/api/leaderboard/realtime?limit=${limit}`);

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getRealTimeLeaderboard:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getRealTimeLeaderboard:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch real-time leaderboard';
    }
};

// Function to get habit completion leaderboard
export const getCompletionsLeaderboard = async (timeframe: 'weekly' | 'monthly' = 'weekly', domainId?: number, limit: number = 10) => {
    try {
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        if (domainId) params.append('domain_id', domainId.toString());
        params.append('limit', limit.toString());

        const response = await fetchData<LeaderboardResponse>(`/api/leaderboard/completions?${params.toString()}`);

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getCompletionsLeaderboard:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getCompletionsLeaderboard:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch completion leaderboard data';
    }
};

// Function to get streaks leaderboard
export const getStreaksLeaderboard = async (limit: number = 10) => {
    try {
        const response = await fetchData<LeaderboardResponse>(`/api/leaderboard/streaks?limit=${limit}`);

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getStreaksLeaderboard:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getStreaksLeaderboard:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch streaks leaderboard';
    }
};

// Function to get domain activity leaderboard
export const getDomainLeaderboard = async (timeframe: 'weekly' | 'monthly' = 'weekly', limit: number = 10) => {
    try {
        const params = new URLSearchParams();
        params.append('timeframe', timeframe);
        params.append('limit', limit.toString());

        const response = await fetchData<LeaderboardResponse>(`/api/leaderboard/domains?${params.toString()}`);

        if (response && response.success && response.data) {
            return response as LeaderboardResponse;
        } else {
            console.warn('Unexpected API response format in getDomainLeaderboard:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getDomainLeaderboard:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch domain leaderboard';
    }
};

// Create a custom hook for leaderboard management (for React components)
export const useLeaderboard = () => {
    const [leaderboardData, setLeaderboardData] = React.useState<LeaderboardUser[] | DomainLeaderboardItem[]>([]);
    const [currentUser, setCurrentUser] = React.useState<LeaderboardUser | null>(null);
    const [userTopDomain, setUserTopDomain] = React.useState<UserDomainData | null>(null);
    const [timeframe, setTimeframe] = React.useState<'weekly' | 'monthly'>('weekly');
    const [leaderboardType, setLeaderboardType] = React.useState<'points' | 'completions' | 'streaks' | 'domains' | 'realtime'>('points');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = React.useState<string | null>(null);

    const fetchLeaderboard = async (
        type: 'points' | 'completions' | 'streaks' | 'domains' | 'realtime' = 'points',
        newTimeframe?: 'weekly' | 'monthly',
        domainId?: number
    ) => {
        const timeframeToUse = newTimeframe || timeframe;
        if (newTimeframe) setTimeframe(newTimeframe);
        setLeaderboardType(type);

        try {
            setLoading(true);
            let response;

            switch (type) {
                case 'points':
                    response = await getPointsLeaderboard(timeframeToUse);
                    if (response.success && Array.isArray(response.data)) {
                        setLeaderboardData(response.data as LeaderboardUser[]);
                        setCurrentUser(response.currentUser || null);
                        setUserTopDomain(null);
                        setLastUpdated(response.lastUpdated || null);
                    }
                    break;

                case 'realtime':
                    response = await getRealTimeLeaderboard();
                    if (response.success && Array.isArray(response.data)) {
                        setLeaderboardData(response.data as LeaderboardUser[]);
                        setCurrentUser(response.currentUser || null);
                        setUserTopDomain(null);
                        setLastUpdated(response.lastUpdated || null);
                    }
                    break;

                case 'completions':
                    response = await getCompletionsLeaderboard(timeframeToUse, domainId);
                    if (response.success && Array.isArray(response.data)) {
                        setLeaderboardData(response.data as LeaderboardUser[]);
                        setCurrentUser(response.currentUser || null);
                        setUserTopDomain(null);
                    }
                    break;

                case 'streaks':
                    response = await getStreaksLeaderboard();
                    if (response.success && Array.isArray(response.data)) {
                        setLeaderboardData(response.data as LeaderboardUser[]);
                        setCurrentUser(response.currentUser || null);
                        setUserTopDomain(null);
                    }
                    break;

                case 'domains':
                    response = await getDomainLeaderboard(timeframeToUse);
                    if (response.success && Array.isArray(response.data)) {
                        setLeaderboardData(response.data as DomainLeaderboardItem[]);
                        setUserTopDomain(response.userTopDomain || null);
                        setCurrentUser(null);
                    }
                    break;
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || `Failed to fetch ${type} leaderboard`);
            console.error(`Error fetching ${type} leaderboard:`, err);
        } finally {
            setLoading(false);
        }
    };

    // Setup polling for real-time leaderboard if that type is selected
    React.useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;

        if (leaderboardType === 'realtime') {
            intervalId = setInterval(() => {
                fetchLeaderboard('realtime');
            }, 30000); // Poll every 30 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [leaderboardType]);

    // Load initial data when component mounts
    React.useEffect(() => {
        fetchLeaderboard('points');
    }, []);

    return {
        leaderboardData,
        currentUser,
        userTopDomain,
        timeframe,
        leaderboardType,
        loading,
        error,
        lastUpdated,
        fetchLeaderboard,
        setTimeframe
    };
};