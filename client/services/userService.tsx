import {fetchData, postData, updateData} from './api';

// Function to register a new user
export const registerUser = async (userData: {
    name: string; email: string; password: string;
}) => {
    try {
        return await postData('/register', userData); // Used the `postData` utility from userService
    } catch (error: any) {
        throw error.response?.data?.message || 'Registration failed';
    }
};

// Function to log in a user
export const loginUser = async (credentials: { userEmail: string; password: string }) => {
    try {
        return await postData('/api/users/login', credentials); // Used the `postData` utility from userService
    } catch (error: any) {
        throw error.response?.data?.message || 'Login failed';
    }
};

// Function to fetch the current user's profile
export const fetchUserProfile = async () => {
    try {
        return await fetchData('/api/users/profile'); // Used the `fetchData` utility from userService
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch profile';
    }
};

// Function to update the user's profile
export const updateUserProfile = async (updatedData: { name?: string; email?: string }) => {
    try {
        return await updateData('/profile', updatedData); // Used the `updateData` utility from userService
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update profile';
    }
};

// Function to log out the user
export const logoutUser = async () => {
    try {
        return await postData('/logout', null); // Used the `postData` utility from userService
    } catch (error: any) {
        throw error.response?.data?.message || 'Logout failed';
    }
};
