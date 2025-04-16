import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'next/navigation'; // or 'expo-router' depending on your setup

// Async function to load user data from AsyncStorage
export const loadUser = createAsyncThunk('user/loadUser', async (_, { rejectWithValue }) => {
    try {
        const userData = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');

        if (userData && token) {
            return {
                ...JSON.parse(userData),
                token
            };
        }
        return null;
    } catch (error) {
        return rejectWithValue('Failed to load user data');
    }
});

// Async function to update user data
export const updateUser = createAsyncThunk(
    'user/updateUser',
    async (userData, { rejectWithValue }) => {
        try {
            // Get current user data from storage
            const currentUserData = await AsyncStorage.getItem('user');

            if (!currentUserData) {
                return rejectWithValue('No user data found');
            }

            // Merge current data with new data
            const updatedUser = {
                ...JSON.parse(currentUserData),
                ...userData
            };

            // Update AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            return updatedUser;
        } catch (error) {
            console.error('Update user error:', error);
            return rejectWithValue('Failed to update user data');
        }
    }
);

// Async function to handle logout with redirect
export const logoutUser = createAsyncThunk(
    'user/logoutUser',
    async (_, { dispatch }) => {
        try {
            // Clear storage
            await AsyncStorage.multiRemove(['user', 'token']);

            // Dispatch regular logout action
            dispatch(logout());

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }
);

// Define the initial state for the user slice
const initialState = {
    user_id: null,
    user_name: null,
    user_email: null,
    avatar: null,
    points_gained: 0,
    theme_preference: 'auto',
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
};

// Create the user slice
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        // Action: Start the login process
        loginStart(state) {
            state.loading = true;
            state.error = null;
        },

        // Action: Login successful
        loginSuccess(state, action) {
            try {
                // Safely extract user data with optional chaining
                const userData = action.payload;
                if (!userData) {
                    console.error('Invalid user data structure');
                    return state; // Prevent state mutation if no user data
                }

                // Create updated user state with default values and null coalescing
                const updatedUserState = {
                    user_id: userData.user_id ?? null,
                    user_name: userData.user_name ?? '',
                    user_email: userData.user_email ?? '',
                    avatar: userData.avatar ?? null,
                    gender: userData.gender ?? null,
                    points_gained: userData.points_gained ?? 0,
                    theme_preference: userData.theme_preference ?? 'auto',
                    onVacation: userData.onVacation ?? false,
                    dailyGoal: userData.dailyGoal ?? null,
                    totalHabitsCompleted: userData.totalHabitsCompleted ?? 0,
                    currentDailyStreak: userData.currentDailyStreak ?? 0,
                    totalHabitsCreated: userData.totalHabitsCreated ?? 0,

                    // Authentication state
                    isAuthenticated: true,
                    loading: false
                };

                // Create a new state object instead of mutating existing state
                const newState = {
                    ...state,
                    ...updatedUserState
                };

                // Save to AsyncStorage
                AsyncStorage.setItem('user', JSON.stringify({
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    user_email: userData.user_email,
                    avatar: userData.avatar,
                    points_gained: userData.points_gained,
                    theme_preference: userData.theme_preference,
                    gender: userData.gender
                })).catch(error => {
                    console.error('Error saving user data to AsyncStorage:', error);
                });

                return newState;
            } catch (error) {
                console.error('Login success reducer error:', error);

                // Return original state or a reset state
                return {
                    ...state,
                    isAuthenticated: false,
                    loading: false
                };
            }
        },

        // Action: Login failed
        loginFailure(state, action) {
            state.error = action.payload;
            state.loading = false;
        },

        // Action: Logout the user (without redirect)
        logout(state) {
            // Reset to initial state
            Object.assign(state, initialState);
        },

        // Action: Update user profile
        updateProfile(state, action) {
            // Update only the provided fields
            Object.assign(state, action.payload);

            // Update AsyncStorage
            AsyncStorage.getItem('user').then(userData => {
                if (userData) {
                    const updatedUser = {
                        ...JSON.parse(userData),
                        ...action.payload
                    };
                    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                }
            });
        },

        // Action: Update theme preference
        updateTheme(state, action) {
            state.theme_preference = action.payload;

            // Update in AsyncStorage
            AsyncStorage.getItem('user').then(userData => {
                if (userData) {
                    const updatedUser = {
                        ...JSON.parse(userData),
                        theme_preference: action.payload
                    };
                    AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                }
            });
        },
    },
    extraReducers: (builder) => {
        builder
            // Load user cases
            .addCase(loadUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadUser.fulfilled, (state, action) => {
                if (action.payload) {
                    const userData = action.payload;

                    state.user_id = userData.user_id;
                    state.user_name = userData.user_name;
                    state.user_email = userData.user_email;
                    state.avatar = userData.avatar || null;
                    state.points_gained = userData.points_gained || 0;
                    state.theme_preference = userData.theme_preference || 'auto';
                    state.token = userData.token;

                    state.isAuthenticated = true;
                }
                state.loading = false;
            })
            .addCase(loadUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Update user cases
            .addCase(updateUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                const userData = action.payload;

                // Update state with new user data
                Object.keys(userData).forEach(key => {
                    if (state.hasOwnProperty(key)) {
                        state[key] = userData[key];
                    }
                });

                state.loading = false;
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Logout user cases
            .addCase(logoutUser.pending, (state) => {
                state.loading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                // State will be reset by the regular logout action
                state.loading = false;
            })
            .addCase(logoutUser.rejected, (state) => {
                state.loading = false;
                // Don't change authenticated state on logout failure
            });
    },
});

// Export the actions
export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    updateProfile,
    updateTheme
} = userSlice.actions;

// Export the reducer
export default userSlice.reducer;