import { fetchData, postData, updateData, deleteData, uploadImage } from './api';
import React from 'react';

// Profile interfaces
export interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    points_gained?: number;
    gender?: string;
    timezone?: string;
    theme_preference?: string;
    premium_status?: boolean;
    premium_until?: string;
    onVacation?: boolean;
    vacation_start?: string;
    vacation_end?: string;
    dailyGoal?: number;
    weeklyGoal?: number;
    monthlyGoal?: number;
    registeredAt?: string;
    lastActive?: string;
    totalHabitsCreated?: number;
    totalHabitsCompleted?: number;
    currentDailyStreak?: number;
    longestDailyStreak?: number;
    isOnline?: boolean;
}

export interface Habit {
    habit_id: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency_type: string;
    frequency_value?: number;
    frequency_interval?: number;
    specific_days?: number[];
    tracking_type: string;
    duration_goal?: number;
    count_goal?: number;
    numeric_goal?: number;
    units?: string;
    is_favorite: boolean;
    start_date: string;
    current_streak?: number;
    longest_streak?: number;
    last_completed?: string;
    domain?: HabitDomain;
    total_completions?: number;
    today_completed?: boolean;
    today_scheduled?: boolean;
}

export interface HabitDomain {
    domain_id: number;
    name: string;
    icon?: string;
    color?: string;
}

export interface Achievement {
    id: number;
    name: string;
    description: string;
    icon: string;
    badge_image?: string;
    criteria_type: string;
    criteria_value: number;
    xp_value: number;
    unlocked_at: string;
}

export interface Blog {
    id: number;
    title: string;
    content: string;
    image?: string;
    createdAt: string;
    views: number;
    category: string;
    categoryIcon?: string;
    categoryColor?: string;
    likes: number;
    comments: number;
    liked_by_me?: boolean;
}

export interface Friend {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    isOnline?: boolean;
    premium_status?: boolean;
    streak?: number;
}

export interface WeeklyProgress {
    day: string;
    date: string;
    completed: number;
    total: number;
    percentage: number;
}

export interface Profile {
    user: User;
    habits?: Habit[];
    achievements?: Achievement[];
    posts?: Blog[];
    streak_data?: {
        top_streaks?: any[];
        weekly_progress?: WeeklyProgress[];
        monthly_active_days?: number;
    };
    friends?: Friend[];
}

export interface Stats {
    user_id: number;
    user_name: string;
    account_age_days: number;
    current_streak: number;
    longest_streak: number;
    total_habits: number;
    total_completions: number;
    total_posts: number;
    total_achievements: number;
    monthly_completions?: number;
    completion_rate_trend?: number;
    most_consistent_habit?: {
        habit_id: number;
        name: string;
        icon?: string;
        color?: string;
        current_streak: number;
        longest_streak: number;
    };
    domain_distribution?: {
        domain_id: number;
        name: string;
        icon?: string;
        color?: string;
        habit_count: number;
    }[];
    progress?: {
        daily: {
            completed: number;
            goal: number;
            percentage: number;
        };
        weekly: {
            completed: number;
            goal: number;
            percentage: number;
        };
        monthly: {
            completed: number;
            goal: number;
            percentage: number;
        };
    };
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: {
        total: number;
        currentPage: number;
        totalPages: number;
        hasMore: boolean;
    };
}

// Function to get user profile (own or others)
export const getUserProfile = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Profile>>(`/api/profile/${userId}`);
    } catch (error: any) {
        console.error('Error in getUserProfile:', error);
        throw error.response?.data?.error || 'Failed to fetch user profile';
    }
};

// Function to update user profile
export const updateUserProfile = async (userId: number, profileData: Partial<User>) => {
    try {
        // Create a new FormData instance for image upload support
        const formData = new FormData();

        // Add fields to FormData
        Object.keys(profileData).forEach(key => {
            if (key !== 'avatar' && profileData[key] !== undefined) {
                formData.append(key, profileData[key]?.toString() || '');
            }
        });

        // Add avatar if it's a new file upload
        if (profileData.avatar && profileData.avatar.startsWith('file://')) {
            // Get the file extension
            const uriParts = profileData.avatar.split('.');
            const fileType = uriParts[uriParts.length - 1];

            // Create file object with the correct format for React Native
            const imageFile = {
                uri: profileData.avatar,
                name: `avatar.${fileType}`,
                type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
            };

            console.log('Appending avatar image:', imageFile);
            formData.append('avatar', imageFile);
        } else if (profileData.avatar) {
            // If avatar is a URL string (not a new upload)
            formData.append('avatar', profileData.avatar);
        }

        return await postData(`/api/profile/${userId}`, formData);
    } catch (error: any) {
        console.error('Error in updateUserProfile:', error);
        throw error.response?.data?.error || 'Failed to update profile';
    }
};

// Function to get user's friends
export const getUserFriends = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Friend[]>>(`/api/profile/${userId}/friends`);
    } catch (error: any) {
        console.error('Error in getUserFriends:', error);
        throw error.response?.data?.error || 'Failed to fetch user friends';
    }
};

// Function to get user's blogs/posts with pagination
export const getUserBlogs = async (userId: number, page: number = 1, limit: number = 10) => {
    try {
        return await fetchData<ApiResponse<Blog[]>>(`/api/profile/${userId}/blogs?page=${page}&limit=${limit}`);
    } catch (error: any) {
        console.error('Error in getUserBlogs:', error);
        throw error.response?.data?.error || 'Failed to fetch user blogs';
    }
};

// Function to get user's achievements
export const getUserAchievements = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Achievement[]>>(`/api/profile/${userId}/achievements`);
    } catch (error: any) {
        console.error('Error in getUserAchievements:', error);
        throw error.response?.data?.error || 'Failed to fetch user achievements';
    }
};

// Function to get user's habits (only for current user)
export const getUserHabits = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Habit[]>>(`/api/profile/${userId}/habits`);
    } catch (error: any) {
        console.error('Error in getUserHabits:', error);
        throw error.response?.data?.error || 'Failed to fetch user habits';
    }
};

// Function to get user's statistics
export const getUserStats = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Stats>>(`/api/profile/${userId}/stats`);
    } catch (error: any) {
        console.error('Error in getUserStats:', error);
        throw error.response?.data?.error || 'Failed to fetch user statistics';
    }
};

// Function to send friend request
export const sendFriendRequest = async (userId: number) => {
    try {
        return await postData<ApiResponse<{ status: string }>>(`/api/friends/sendRequest`, { recipientId: userId });
    } catch (error: any) {
        console.error('Error in sendFriendRequest:', error);
        throw error.response?.data?.error || 'Failed to send friend request';
    }
};

// Function to respond to friend request
export const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
        return await postData<ApiResponse<{ status: string }>>(`/api/friends/respond`, { requestId, accept });
    } catch (error: any) {
        console.error('Error in respondToFriendRequest:', error);
        throw error.response?.data?.error || 'Failed to respond to friend request';
    }
};

// Function to remove a friend
export const removeFriend = async (friendId: number) => {
    try {
        return await deleteData<ApiResponse<{ status: string }>>(`/api/friends/${friendId}`);
    } catch (error: any) {
        console.error('Error in removeFriend:', error);
        throw error.response?.data?.error || 'Failed to remove friend';
    }
};

// Function to toggle vacation mode
export const toggleVacationMode = async (userId: number, isEnabled: boolean, startDate?: string, endDate?: string) => {
    try {
        const data = {
            onVacation: isEnabled,
            vacation_start: startDate,
            vacation_end: endDate
        };
        return await updateData<ApiResponse<User>>(`/api/profile/${userId}`, data);
    } catch (error: any) {
        console.error('Error in toggleVacationMode:', error);
        throw error.response?.data?.error || 'Failed to update vacation mode';
    }
};

// Custom hook for profile data
export const useProfile = (userId: number) => {
    const [profile, setProfile] = React.useState<Profile | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchProfile = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getUserProfile(userId);
            if (response.success && response.data) {
                setProfile(response.data);
            } else {
                throw new Error(response.error || 'Failed to load profile');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching profile');
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { profile, loading, error, refetch: fetchProfile };
};

// Custom hook for user stats
export const useUserStats = (userId: number) => {
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchStats = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getUserStats(userId);
            if (response.success && response.data) {
                setStats(response.data);
            } else {
                throw new Error(response.error || 'Failed to load statistics');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching statistics');
            console.error('Error fetching stats:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
};

// Custom hook for user friends
export const useUserFriends = (userId: number) => {
    const [friends, setFriends] = React.useState<Friend[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchFriends = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getUserFriends(userId);
            if (response.success && response.data) {
                setFriends(response.data);
            } else {
                throw new Error(response.error || 'Failed to load friends');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching friends');
            console.error('Error fetching friends:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    React.useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    return { friends, loading, error, refetch: fetchFriends };
};