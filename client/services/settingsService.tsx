import { fetchData, postData, updateData, deleteData } from './api';
import React from 'react';

// Settings interfaces
export interface UserSettings {
    user_name: string;
    user_email: string;
    avatar?: string;
    gender?: string;
    timezone?: string;
    prefersNotifications: boolean;
    theme_preference: 'light' | 'dark' | 'auto';
    language: string;
    premium_status: boolean;
    premium_until?: string;
    onVacation: boolean;
    vacation_start?: string;
    vacation_end?: string;
    dailyGoal: number;
    weeklyGoal: number;
    monthlyGoal: number;
    totalHabitsCreated: number;
    totalHabitsCompleted: number;
    currentDailyStreak: number;
    longestDailyStreak: number;
    registeredAt: string;
    lastActive: string;
}

export interface ProfileUpdateData {
    user_name?: string;
    gender?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
}

export interface PreferencesUpdateData {
    prefersNotifications?: boolean;
    theme_preference?: 'light' | 'dark' | 'auto';
}

export interface GoalsUpdateData {
    dailyGoal?: number;
    weeklyGoal?: number;
    monthlyGoal?: number;
}

export interface VacationModeData {
    onVacation: boolean;
    vacation_start?: string;
    vacation_end?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string>;
}

// Function to get user settings
export const getUserSettings = async () => {
    try {
        const response = await fetchData<ApiResponse<UserSettings>>('/api/settings');

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getUserSettings:', response);
            throw new Error('Failed to fetch user settings');
        }
    } catch (error: any) {
        console.error('Error in getUserSettings:', error);
        throw error.response?.data?.error || error.message || 'Failed to fetch user settings';
    }
};

// Function to update profile information
export const updateProfile = async (profileData: ProfileUpdateData) => {
    try {
        return await updateData<ApiResponse<ProfileUpdateData>>('/api/settings/profile', profileData);
    } catch (error: any) {
        console.error('Error in updateProfile:', error);
        throw error.response?.data?.error || error.message || 'Failed to update profile';
    }
};

// Function to update app preferences
export const updatePreferences = async (preferencesData: PreferencesUpdateData) => {
    try {
        return await updateData<ApiResponse<PreferencesUpdateData>>('/api/settings/preferences', preferencesData);
    } catch (error: any) {
        console.error('Error in updatePreferences:', error);
        throw error.response?.data?.error || error.message || 'Failed to update preferences';
    }
};

// Function to update habit goals
export const updateGoals = async (goalsData: GoalsUpdateData) => {
    try {
        return await updateData<ApiResponse<GoalsUpdateData>>('/api/settings/goals', goalsData);
    } catch (error: any) {
        console.error('Error in updateGoals:', error);
        throw error.response?.data?.error || error.message || 'Failed to update habit goals';
    }
};

// Function to toggle vacation mode
export const toggleVacationMode = async (vacationData: VacationModeData) => {
    try {
        return await updateData<ApiResponse<VacationModeData>>('/api/settings/vacation', vacationData);
    } catch (error: any) {
        console.error('Error in toggleVacationMode:', error);
        throw error.response?.data?.error || error.message || 'Failed to toggle vacation mode';
    }
};

// Function to change email address
export const changeEmail = async (new_email: string, password: string) => {
    try {
        return await updateData<ApiResponse<void>>('/api/settings/email', {
            new_email,
            password
        });
    } catch (error: any) {
        console.error('Error in changeEmail:', error);
        throw error.response?.data?.error || error.message || 'Failed to change email';
    }
};

// Function to change password
export const changePassword = async (current_password: string, new_password: string, confirm_password: string) => {
    try {
        return await updateData<ApiResponse<void>>('/api/settings/password', {
            current_password,
            new_password,
            confirm_password
        });
    } catch (error: any) {
        console.error('Error in changePassword:', error);
        throw error.response?.data?.error || error.message || 'Failed to change password';
    }
};

// Function to delete account
export const deleteAccount = async (password: string) => {
    try {
        return await deleteData<ApiResponse<void>>('/api/settings/account', { password });
    } catch (error: any) {
        console.error('Error in deleteAccount:', error);
        throw error.response?.data?.error || error.message || 'Failed to delete account';
    }
};

// Function to check if email exists
export const checkEmailExists = async (email: string) => {
    try {
        const response = await fetchData<ApiResponse<{ exists: boolean }>>(`/api/settings/check-email/${encodeURIComponent(email)}`);

        if (response && response.success) {
            return response.data?.exists || false;
        } else {
            console.warn('Unexpected API response format in checkEmailExists:', response);
            return false;
        }
    } catch (error: any) {
        console.error('Error in checkEmailExists:', error);
        throw error.response?.data?.error || error.message || 'Failed to check email';
    }
};

// Function to export user data
export const exportUserData = async () => {
    try {
        // This will trigger a file download
        window.location.href = '/api/settings/export-data';
        return { success: true };
    } catch (error: any) {
        console.error('Error in exportUserData:', error);
        throw error.response?.data?.error || error.message || 'Failed to export user data';
    }
};

// Custom hook for settings management
export const useSettings = () => {
    const [settings, setSettings] = React.useState<UserSettings | null>(null);
    const [loading, setLoading] = React.useState<{
        settings: boolean;
        update: boolean;
    }>({
        settings: false,
        update: false
    });
    const [error, setError] = React.useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setLoading(prev => ({ ...prev, settings: true }));
            const response = await getUserSettings();
            if (response.success && response.data) {
                setSettings(response.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch settings');
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(prev => ({ ...prev, settings: false }));
        }
    };

    const handleUpdateProfile = async (profileData: ProfileUpdateData) => {
        try {
            setLoading(prev => ({ ...prev, update: true }));
            const response = await updateProfile(profileData);

            if (response.success && response.data) {
                // Update local state with new values
                setSettings(prev => prev ? { ...prev, ...response.data } : null);
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
            console.error('Error updating profile:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    const handleUpdatePreferences = async (preferencesData: PreferencesUpdateData) => {
        try {
            setLoading(prev => ({ ...prev, update: true }));
            const response = await updatePreferences(preferencesData);

            if (response.success && response.data) {
                // Update local state with new values
                setSettings(prev => prev ? { ...prev, ...response.data } : null);
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to update preferences');
            console.error('Error updating preferences:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    const handleUpdateGoals = async (goalsData: GoalsUpdateData) => {
        try {
            setLoading(prev => ({ ...prev, update: true }));
            const response = await updateGoals(goalsData);

            if (response.success && response.data) {
                // Update local state with new values
                setSettings(prev => prev ? { ...prev, ...response.data } : null);
                return true;
            }
            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to update goals');
            console.error('Error updating goals:', err);
            return false;
        } finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    const handleToggleVacationMode = async (vacationData: VacationModeData) => {
        try {
            setLoading(prev => ({ ...prev, update: true }));
            const response = await toggleVacationMode(vacationData);

            if (response.success && response.data) {
                // Update local state with new values
                setSettings(prev => prev ? {
                    ...prev,
                    onVacation: response.data.onVacation,
                    vacation_start: response.data.vacation_start,
                    vacation_end: response.data.vacation_end
                } : null);
                return { success: true, message: response.message };
            }
            return { success: false, message: response.message || 'Failed to toggle vacation mode' };
        } catch (err: any) {
            setError(err.message || 'Failed to toggle vacation mode');
            console.error('Error toggling vacation mode:', err);
            return { success: false, message: err.message || 'Failed to toggle vacation mode' };
        } finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    // Load settings on initial mount
    React.useEffect(() => {
        fetchSettings();
    }, []);

    return {
        settings,
        loading,
        error,
        fetchSettings,
        updateProfile: handleUpdateProfile,
        updatePreferences: handleUpdatePreferences,
        updateGoals: handleUpdateGoals,
        toggleVacationMode: handleToggleVacationMode,
        changeEmail,
        changePassword,
        deleteAccount,
        checkEmailExists,
        exportUserData
    };
};

// Language Options (Aligned with User model default 'en')
export const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'ru', label: 'Russian' }
];

// Timezone Options (Aligned with User model default 'UTC')
export const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    { value: 'America/New_York', label: 'Eastern Time (UTC-5)' },
    { value: 'America/Chicago', label: 'Central Time (UTC-6)' },
    { value: 'America/Denver', label: 'Mountain Time (UTC-7)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (UTC-8)' },
    { value: 'Europe/London', label: 'British Time (UTC+0)' },
    { value: 'Europe/Paris', label: 'Central European Time (UTC+1)' },
    { value: 'Europe/Moscow', label: 'Moscow Time (UTC+3)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (UTC+9)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (UTC+10)' }
];

// Theme Preference Options (Aligned with User model theme_preference)
export const THEME_OPTIONS = [
    { value: 'auto', label: 'System Default' },
    { value: 'light', label: 'Light Mode' },
    { value: 'dark', label: 'Dark Mode' }
];

// Gender Options (Made optional as in the schema)
export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: null, label: 'Prefer Not to Say' }
];

// Reminder Sound Options (Custom addition for app functionality)
export const REMINDER_SOUND_OPTIONS = [
    { value: 'default', label: 'Default System Sound' },
    { value: 'gentle_chime', label: 'Gentle Chime' },
    { value: 'soft_bell', label: 'Soft Bell' },
    { value: 'electronic_ping', label: 'Electronic Ping' },
    { value: 'silent', label: 'Silent' }
];

// Device Type Options (for UserDevice model)
export const DEVICE_TYPE_OPTIONS = [
    { value: 'IOS', label: 'iOS' },
    { value: 'ANDROID', label: 'Android' },
    { value: 'WEB', label: 'Web' }
];