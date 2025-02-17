import {fetchData, postData, updateData} from './api';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Function to register a new user
export const registerUser = async (userData: {
    name: string; email: string; password: string;
}) => {
    try {
        return await postData('/api/users/register', userData); // Used the `postData` utility from userService
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

export const checkAuthStatus = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        console.log(token);
        if (!token) return null;


        // Validate token with your backend
        const response = await fetchData('/api/users/verifyUser');

        console.log("res from services", response.user);
        if (response) {
            return response;
        } else {
            await AsyncStorage.removeItem('token'); // Clear invalid token
            return null;
        }
    } catch (error) {
        await AsyncStorage.removeItem('token');
        return null;
    }
};

