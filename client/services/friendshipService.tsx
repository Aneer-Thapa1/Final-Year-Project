import { fetchData, postData, updateData, deleteData } from './api';
import React from 'react';

// Friendship interfaces
export interface FriendRequest {
    request_id: number;
    sender_id: number;
    receiver_id: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    sender?: User;
    receiver?: User;
}

export interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    premium_status?: boolean;
}

export interface Friend {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    premium_status?: boolean;
    friendship_date: string;
    friendship_id: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    count?: number;
    message?: string;
    error?: string;
}

// Function to send a friend request
export const sendFriendRequest = async (userId: number) => {
    try {
        return await postData<ApiResponse<FriendRequest>>('/api/friends/request', {
            user_id: userId
        });
    } catch (error: any) {
        console.error('Error in sendFriendRequest:', error);
        throw error.response?.data?.error || error.message || 'Failed to send friend request';
    }
};

// Function to respond to a friend request (accept or reject)
export const respondToFriendRequest = async (requestId: number, status: 'ACCEPTED' | 'REJECTED') => {
    try {
        return await updateData<ApiResponse<FriendRequest>>('/api/friends/respond', {
            request_id: requestId,
            status
        });
    } catch (error: any) {
        console.error('Error in respondToFriendRequest:', error);
        throw error.response?.data?.error || error.message || 'Failed to respond to friend request';
    }
};

// Function to get all friends for the logged-in user
export const getFriends = async () => {
    try {
        const response = await fetchData<ApiResponse<Friend[]>>('/api/friends');

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getFriends:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getFriends:', error);
        throw error.response?.data?.error || 'Failed to fetch friends';
    }
};

// Function to get pending friend requests
export const getPendingRequests = async () => {
    try {
        const response = await fetchData<ApiResponse<FriendRequest[]>>('/api/friends/requests');

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getPendingRequests:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getPendingRequests:', error);
        throw error.response?.data?.error || 'Failed to fetch pending requests';
    }
};

// Function to search for users by name or email
export const searchUsers = async (query: string) => {
    try {
        if (!query || query.length < 2) {
            return { success: true, data: [] };
        }

        const response = await fetchData<ApiResponse<User[]>>(`/api/friends/search?query=${encodeURIComponent(query)}`);

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in searchUsers:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in searchUsers:', error);
        throw error.response?.data?.error || 'Failed to search users';
    }
};

// Function to remove a friend
export const removeFriend = async (friendId: number) => {
    try {
        return await deleteData<ApiResponse<void>>(`/api/friends/${friendId}`);
    } catch (error: any) {
        console.error('Error in removeFriend:', error);
        throw error.response?.data?.error || 'Failed to remove friend';
    }
};

// Function to get friendship statistics
export const getFriendshipStats = async () => {
    try {
        return await fetchData<ApiResponse<{
            totalFriends: number;
            pendingRequests: number;
            activeFriends: number; // Friends active in last 7 days
        }>>('/api/friends/stats');
    } catch (error: any) {
        console.error('Error in getFriendshipStats:', error);
        throw error.response?.data?.error || 'Failed to fetch friendship statistics';
    }
};

// Function to get mutual friends with a user
export const getMutualFriends = async (userId: number) => {
    try {
        return await fetchData<ApiResponse<Friend[]>>(`/api/friends/mutual/${userId}`);
    } catch (error: any) {
        console.error('Error in getMutualFriends:', error);
        throw error.response?.data?.error || 'Failed to fetch mutual friends';
    }
};

// Function to get friend suggestions
export const getFriendSuggestions = async (limit: number = 5) => {
    try {
        return await fetchData<ApiResponse<User[]>>(`/api/friends/suggestions?limit=${limit}`);
    } catch (error: any) {
        console.error('Error in getFriendSuggestions:', error);
        throw error.response?.data?.error || 'Failed to fetch friend suggestions';
    }
};

// Create a custom hook for friend management (for React components)
export const useFriendship = () => {
    const [friends, setFriends] = React.useState<Friend[]>([]);
    const [pendingRequests, setPendingRequests] = React.useState<FriendRequest[]>([]);
    const [loading, setLoading] = React.useState<{
        friends: boolean;
        requests: boolean;
        action: boolean;
    }>({
        friends: false,
        requests: false,
        action: false
    });
    const [error, setError] = React.useState<string | null>(null);

    const fetchFriends = async () => {
        try {
            setLoading(prev => ({ ...prev, friends: true }));
            const response = await getFriends();
            if (response.success && response.data) {
                setFriends(response.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch friends');
            console.error('Error fetching friends:', err);
        } finally {
            setLoading(prev => ({ ...prev, friends: false }));
        }
    };

    const fetchPendingRequests = async () => {
        try {
            setLoading(prev => ({ ...prev, requests: true }));
            const response = await getPendingRequests();
            if (response.success && response.data) {
                setPendingRequests(response.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch pending requests');
            console.error('Error fetching pending requests:', err);
        } finally {
            setLoading(prev => ({ ...prev, requests: false }));
        }
    };

    const handleSendRequest = async (userId: number) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await sendFriendRequest(userId);
            if (response.success) {
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to send friend request');
            console.error('Error sending friend request:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleRespondToRequest = async (requestId: number, accept: boolean) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const status = accept ? 'ACCEPTED' : 'REJECTED';
            const response = await respondToFriendRequest(requestId, status);

            if (response.success) {
                // Update pending requests list
                setPendingRequests(prev => prev.filter(req => req.request_id !== requestId));

                // If accepted, refresh friends list
                if (accept) {
                    await fetchFriends();
                }
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to respond to friend request');
            console.error('Error responding to friend request:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    const handleRemoveFriend = async (friendId: number) => {
        try {
            setLoading(prev => ({ ...prev, action: true }));
            const response = await removeFriend(friendId);

            if (response.success) {
                // Update friends list
                setFriends(prev => prev.filter(friend => friend.user_id !== friendId));
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to remove friend');
            console.error('Error removing friend:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, action: false }));
        }
    };

    // Load friends and pending requests on initial mount
    React.useEffect(() => {
        fetchFriends();
        fetchPendingRequests();
    }, []);

    return {
        friends,
        pendingRequests,
        loading,
        error,
        fetchFriends,
        fetchPendingRequests,
        sendRequest: handleSendRequest,
        respondToRequest: handleRespondToRequest,
        removeFriend: handleRemoveFriend
    };
};