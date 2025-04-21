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
        throw error || 'Login failed';
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

// Function to request password reset OTP
export const requestPasswordResetOTP = async (email: string) => {
    try {
        return await postData('/api/users/forgotPassword', { email });
    } catch (error: any) {
        throw error.response?.data?.error || 'Failed to send reset OTP';
    }
};

// Function to verify OTP
export const verifyOTP = async (email: string, otp: string) => {
    try {
        return await postData('/api/users/verifyOTP', { email, otp });
    } catch (error: any) {
        throw error.response?.data?.error || 'OTP verification failed';
    }
};

// Function to reset password with token
export const resetPassword = async (token: string, newPassword: string) => {
    try {
        return await postData('/api/users/resetPassword', { token, newPassword });
    } catch (error: any) {
        throw error.response?.data?.error || 'Password reset failed';
    }
};

// Function to change password (when user is logged in)
export const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
        return await postData('/api/users/changePassword', { currentPassword, newPassword });
    } catch (error: any) {
        throw error.response?.data?.error || 'Password change failed';
    }
};

export const checkAuthStatus = async () => {
    try {
        const token = await AsyncStorage.getItem('token');

        if (!token) return null;


        // Validate token with your backend
        const response = await fetchData('/api/users/verifyUser');


        if (response) {
            return response.data.user;
        } else {
            await AsyncStorage.removeItem('token'); // Clear invalid token
            return null;
        }
    } catch (error) {
        await AsyncStorage.removeItem('token');
        return null;
    }
};