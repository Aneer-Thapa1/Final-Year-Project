import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchData, postData, updateData, deleteData } from '../../services/api';

// Define types for our state
export interface Friend {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    premium_status?: boolean;
    friendship_date: string;
    friendship_id: number;
    streak?: number; // Optional streak property
}

export interface FriendRequest {
    request_id: number;
    sender_id: number;
    receiver_id: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    sender?: {
        user_id: number;
        user_name: string;
        avatar?: string;
    };
}

export interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    premium_status?: boolean;
    request_sent?: boolean;
    request_received?: boolean;
    request_id?: number;
    mutualFriends?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

interface FriendshipState {
    friends: Friend[];
    pendingRequests: FriendRequest[];
    sentRequests: FriendRequest[];
    suggestions: User[];
    searchResults: User[];
    loading: {
        friends: boolean;
        requests: boolean;
        sentRequests: boolean;
        suggestions: boolean;
        action: boolean;
        search: boolean;
    };
    error: string | null;
}

// Initial state
const initialState: FriendshipState = {
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    suggestions: [],
    searchResults: [],
    loading: {
        friends: false,
        requests: false,
        sentRequests: false,
        suggestions: false,
        action: false,
        search: false
    },
    error: null
};

// Async thunks for API calls
export const fetchFriends = createAsyncThunk(
    'friendship/fetchFriends',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchData<ApiResponse<Friend[]>>('/api/friends');
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch friends');
        }
    }
);

export const fetchPendingRequests = createAsyncThunk(
    'friendship/fetchPendingRequests',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchData<ApiResponse<FriendRequest[]>>('/api/friends/requests');
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending requests');
        }
    }
);

export const fetchSentRequests = createAsyncThunk(
    'friendship/fetchSentRequests',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchData<ApiResponse<FriendRequest[]>>('/api/friends/sent-requests');
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch sent requests');
        }
    }
);

export const fetchFriendSuggestions = createAsyncThunk(
    'friendship/fetchFriendSuggestions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchData<ApiResponse<User[]>>('/api/friends/suggestions');
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch friend suggestions');
        }
    }
);

export const sendFriendRequest = createAsyncThunk(
    'friendship/sendFriendRequest',
    async (userId: number, { rejectWithValue }) => {
        try {
            const response = await postData<ApiResponse<FriendRequest>>('/api/friends/request', { user_id: userId });
            return { ...response, userId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to send friend request');
        }
    }
);

interface RespondToRequestParams {
    requestId: number;
    accept: boolean;
}

export const respondToFriendRequest = createAsyncThunk(
    'friendship/respondToFriendRequest',
    async ({ requestId, accept }: RespondToRequestParams, { rejectWithValue }) => {
        try {
            const response = await updateData<ApiResponse<FriendRequest>>('/api/friends/respond', {
                request_id: requestId,
                status: accept ? 'ACCEPTED' : 'REJECTED'
            });
            return { ...response, requestId, accepted: accept };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to respond to friend request');
        }
    }
);

export const removeFriend = createAsyncThunk(
    'friendship/removeFriend',
    async (friendId: number, { rejectWithValue }) => {
        try {
            await deleteData<ApiResponse<void>>(`/api/friends/${friendId}`);
            return { friendId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to remove friend');
        }
    }
);

export const searchUsers = createAsyncThunk(
    'friendship/searchUsers',
    async (query: string, { rejectWithValue }) => {
        try {
            const response = await fetchData<ApiResponse<User[]>>(`/api/friends/search?query=${encodeURIComponent(query)}`);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to search users');
        }
    }
);

// Create the friendship slice
const friendshipSlice = createSlice({
    name: 'friendship',
    initialState,
    reducers: {
        clearFriendshipErrors(state) {
            state.error = null;
        },
        clearSearchResults(state) {
            state.searchResults = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Friends
            .addCase(fetchFriends.pending, (state) => {
                state.loading.friends = true;
                state.error = null;
            })
            .addCase(fetchFriends.fulfilled, (state, action: PayloadAction<ApiResponse<Friend[]>>) => {
                state.loading.friends = false;
                if (action.payload.success && action.payload.data) {
                    state.friends = action.payload.data;
                }
            })
            .addCase(fetchFriends.rejected, (state, action) => {
                state.loading.friends = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Fetch Pending Requests
            .addCase(fetchPendingRequests.pending, (state) => {
                state.loading.requests = true;
                state.error = null;
            })
            .addCase(fetchPendingRequests.fulfilled, (state, action: PayloadAction<ApiResponse<FriendRequest[]>>) => {
                state.loading.requests = false;
                if (action.payload.success && action.payload.data) {
                    state.pendingRequests = action.payload.data;
                }
            })
            .addCase(fetchPendingRequests.rejected, (state, action) => {
                state.loading.requests = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Fetch Sent Requests
            .addCase(fetchSentRequests.pending, (state) => {
                state.loading.sentRequests = true;
                state.error = null;
            })
            .addCase(fetchSentRequests.fulfilled, (state, action: PayloadAction<ApiResponse<FriendRequest[]>>) => {
                state.loading.sentRequests = false;
                if (action.payload.success && action.payload.data) {
                    state.sentRequests = action.payload.data;
                }
            })
            .addCase(fetchSentRequests.rejected, (state, action) => {
                state.loading.sentRequests = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Fetch Friend Suggestions
            .addCase(fetchFriendSuggestions.pending, (state) => {
                state.loading.suggestions = true;
                state.error = null;
            })
            .addCase(fetchFriendSuggestions.fulfilled, (state, action: PayloadAction<ApiResponse<User[]>>) => {
                state.loading.suggestions = false;
                if (action.payload.success && action.payload.data) {
                    state.suggestions = action.payload.data;
                }
            })
            .addCase(fetchFriendSuggestions.rejected, (state, action) => {
                state.loading.suggestions = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Send Friend Request
            .addCase(sendFriendRequest.pending, (state) => {
                state.loading.action = true;
                state.error = null;
            })
            .addCase(sendFriendRequest.fulfilled, (state, action) => {
                state.loading.action = false;
                if (action.payload.success) {
                    // Add to sent requests
                    if (action.payload.data) {
                        state.sentRequests.push(action.payload.data);
                    }

                    // Remove from suggestions if present
                    state.suggestions = state.suggestions.filter(
                        suggestion => suggestion.user_id !== action.payload.userId
                    );

                    // Update search results if present
                    state.searchResults = state.searchResults.map(user =>
                        user.user_id === action.payload.userId
                            ? { ...user, request_sent: true, request_id: action.payload.data?.request_id }
                            : user
                    );
                }
            })
            .addCase(sendFriendRequest.rejected, (state, action) => {
                state.loading.action = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Respond to Friend Request
            .addCase(respondToFriendRequest.pending, (state) => {
                state.loading.action = true;
                state.error = null;
            })
            .addCase(respondToFriendRequest.fulfilled, (state, action) => {
                state.loading.action = false;

                // Remove from pending requests
                state.pendingRequests = state.pendingRequests.filter(
                    request => request.request_id !== action.payload.requestId
                );

                // If accepted, the API response should include the new friend data
                if (action.payload.accepted && action.payload.data) {
                    // In a real app, you'd update the friends list here based on API response
                    // This is just a placeholder until you implement the API
                    const requestSender = state.pendingRequests.find(
                        request => request.request_id === action.payload.requestId
                    )?.sender;

                    if (requestSender) {
                        state.friends.push({
                            user_id: requestSender.user_id,
                            user_name: requestSender.user_name,
                            avatar: requestSender.avatar,
                            lastActive: new Date().toISOString(),
                            friendship_date: new Date().toISOString(),
                            friendship_id: action.payload.data.request_id || Date.now()
                        });
                    }
                }
            })
            .addCase(respondToFriendRequest.rejected, (state, action) => {
                state.loading.action = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Remove Friend
            .addCase(removeFriend.pending, (state) => {
                state.loading.action = true;
                state.error = null;
            })
            .addCase(removeFriend.fulfilled, (state, action) => {
                state.loading.action = false;
                state.friends = state.friends.filter(
                    friend => friend.user_id !== action.payload.friendId
                );
            })
            .addCase(removeFriend.rejected, (state, action) => {
                state.loading.action = false;
                state.error = action.payload as string || 'An error occurred';
            })

            // Search Users
            .addCase(searchUsers.pending, (state) => {
                state.loading.search = true;
                state.error = null;
            })
            .addCase(searchUsers.fulfilled, (state, action: PayloadAction<ApiResponse<User[]>>) => {
                state.loading.search = false;
                if (action.payload.success && action.payload.data) {
                    state.searchResults = action.payload.data;
                }
            })
            .addCase(searchUsers.rejected, (state, action) => {
                state.loading.search = false;
                state.error = action.payload as string || 'An error occurred';
            });
    }
});

export const { clearFriendshipErrors, clearSearchResults } = friendshipSlice.actions;

export default friendshipSlice.reducer;