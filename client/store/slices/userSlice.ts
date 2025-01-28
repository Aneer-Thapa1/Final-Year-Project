import { createSlice } from '@reduxjs/toolkit';

// Define the initial state for the user slice
const initialState = {
    user: null, // Holds the user data (e.g., userId, name, email, token)
    isAuthenticated: false, // Tracks if the user is logged in
    loading: false, // Tracks if a request is in progress
    error: null, // Holds error messages
};

// Create the user slice
const userSlice = createSlice({
    name: 'user', // Name of the slice
    initialState, // Initial state
    reducers: {
        // Action: Start the login process
        loginStart(state) {
            state.loading = true;
            state.error = null;
        },
        // Action: Login successful
        loginSuccess(state, action) {
            state.user = action.payload; // Set user data
            state.isAuthenticated = true; // Mark user as authenticated
            state.loading = false; // Stop loading
        },
        // Action: Login failed
        loginFailure(state, action) {
            state.error = action.payload; // Set error message
            state.loading = false; // Stop loading
        },
        // Action: Logout the user
        logout(state) {
            state.user = null; // Clear user data
            state.isAuthenticated = false; // Mark user as logged out
            state.error = null; // Clear any errors
        },
        // Action: Update user profile
        updateProfile(state, action) {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }; // Merge new data with existing user data
            }
        },
    },
});

// Export the actions
export const { loginStart, loginSuccess, loginFailure, logout, updateProfile } = userSlice.actions;

// Export the reducer
export default userSlice.reducer;