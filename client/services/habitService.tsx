import { fetchData, postData, updateData, deleteData } from './api';

// Interface for habit data
import { Habit } from '../constants/habit';

// Interfaces for different data types
interface CompletionData {
    completed?: boolean;
    completed_at?: string;
    completion_notes?: string;
    duration_completed?: number;
    count_completed?: number;
    numeric_completed?: number;
    skipped?: boolean;
    skip_reason?: string;
    mood?: number;
    evidence_image?: string;
}

interface ReminderData {
    time: string;
    repeat?: 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    message?: string;
    pre_notification_minutes?: number;
    follow_up_enabled?: boolean;
    follow_up_minutes?: number;
}

// Function to add a new habit
export const addHabit = async (habitData: Habit) => {
    try {
        return await postData('/api/habit/addHabit', habitData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to add habit';
    }
};

// Function to get all of user's habits with filtering options
export const getUserHabits = async (
    filters?: {
        domain_id?: number;
        is_active?: boolean;
        is_favorite?: boolean;
        sort_by?: 'name' | 'createdAt' | 'start_date' | 'updatedAt' | 'streak';
        sort_order?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }
) => {
    try {
        let url = '/api/habit/getUserHabits';

        // Add query parameters if filters are provided
        if (filters) {
            const params = new URLSearchParams();

            for (const [key, value] of Object.entries(filters)) {
                if (value !== undefined) {
                    params.append(key, value.toString());
                }
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }
        }

        const response = await fetchData(url);

        // Check if response is valid and has data
        if (response && response.data) {
            return {
                habits: response.data,
                pagination: response.pagination
            };
        } else if (Array.isArray(response)) {
            return {
                habits: response,
                pagination: null
            };
        } else {
            console.warn('Unexpected API response format in getUserHabits:', response);
            return {
                habits: [],
                pagination: null
            };
        }
    } catch (error: any) {
        console.error('Error in getUserHabits:', error);
        throw error.response?.data?.message || 'Failed to fetch habits';
    }
};

// Function to get a single habit's comprehensive details
export const getHabitById = async (habitId: number) => {
    try {
        return await fetchData(`/api/habit/getHabit/${habitId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habit details';
    }
};

// Function to get habits by specific date
export const getHabitsByDate = async (date: string) => {
    try {
        return await fetchData(`/api/habit/getHabitsByDate/${date}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habits for this date';
    }
};

// Function to get habits by domain
export const getHabitsByDomain = async (domainId: number) => {
    try {
        return await fetchData(`/api/habit/getHabitsByDomain/${domainId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habits by domain';
    }
};

// Function to update a habit
export const updateHabit = async (habitId: number, habitData: Partial<Habit>) => {
    try {
        return await updateData(`/api/habit/updateHabit/${habitId}`, habitData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update habit';
    }
};

// Function to toggle favorite status
export const toggleFavorite = async (habitId: number) => {
    try {
        return await postData(`/api/habit/toggleFavorite/${habitId}`, {});
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to toggle favorite status';
    }
};

// Function to toggle active status
export const toggleActive = async (habitId: number) => {
    try {
        return await postData(`/api/habit/toggleActive/${habitId}`, {});
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to toggle active status';
    }
};

// Function to log habit completion
export const logHabitCompletion = async (habitId: number, completionData: Partial<CompletionData>) => {
    if (!habitId) {
        console.error('No habit ID provided for completion');
        throw new Error('Habit ID is required');
    }

    try {
        console.log(`Logging completion for habit ID: ${habitId}`);
        console.log('Completion data:', completionData);

        return await postData(`/api/habit/logHabitCompletion/${habitId}`, completionData);
    } catch (error: any) {
        console.error('Error in logHabitCompletion:', error);
        throw error.response?.data?.message || 'Failed to log habit completion';
    }
};

// Function to skip a habit
export const skipHabit = async (habitId: number, skipData: { date: string; reason?: string }) => {
    try {
        return await postData(`/api/habit/skipHabit/${habitId}`, skipData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to skip habit';
    }
};

// Function to delete a habit log
export const deleteHabitLog = async (logId: number) => {
    try {
        return await deleteData(`/api/habit/deleteLog/${logId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to delete habit log';
    }
};

// Function to delete a habit
export const deleteHabit = async (habitId: number) => {
    try {
        return await deleteData(`/api/habit/deleteHabit/${habitId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to delete habit';
    }
};

// Function to copy/clone a habit
export const copyHabit = async (habitId: number, newName?: string) => {
    try {
        return await postData(`/api/habit/copyHabit/${habitId}`, { newName });
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to copy habit';
    }
};

// Function to add a reminder to a habit
export const addReminder = async (habitId: number, reminderData: ReminderData) => {
    try {
        return await postData(`/api/habit/addReminder/${habitId}`, reminderData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to add reminder';
    }
};

// Function to delete a reminder
export const deleteReminder = async (reminderId: number) => {
    try {
        return await deleteData(`/api/habit/deleteReminder/${reminderId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to delete reminder';
    }
};

// Function to trigger the daily habit reset process (typically should be server-side)
export const processHabitDailyReset = async () => {
    try {
        return await postData('/api/habit/processHabitDailyReset', {});
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to process daily habit reset';
    }
};