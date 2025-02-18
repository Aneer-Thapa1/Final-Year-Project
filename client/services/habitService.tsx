import { fetchData, postData, updateData } from './api';

// Interface for habit data
interface HabitData {
    name: string;
    description?: string;
    domain_id: number;
    frequency_type_id: number;
    frequency_value: number;
    frequency_interval: number;
    start_date: string;
    end_date?: string;
    specific_time?: string;
    days_of_week?: number[];
    days_of_month?: number[];
    reminder_time?: string[];
}

// Function to add a new habit
export const addHabit = async (habitData: HabitData) => {
    try {
        console.log(habitData);
        return await postData('/api/habit/addHabit', habitData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to add habit';
    }
};

// Function to get user's habits
export const getUserHabits = async () => {
    try {
        return await fetchData('/api/habit/getHabit');
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habits';
    }
};

// Function to get a single habit's details
export const getSingleHabit = async (habitId: number) => {
    try {
        return await fetchData(`/api/habit/getSingleHabit/${habitId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habit details';
    }
};

// Function to delete (archive) a habit
export const deleteHabit = async (habitId: number) => {
    try {
        return await fetchData(`/api/habit/deleteHabit/${habitId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to archive habit';
    }
};

// Function to get habit statistics
export const getHabitStats = async (habitId: number, startDate?: string, endDate?: string) => {
    try {
        let url = `/api/habit/getHabitStats/${habitId}/stats`;
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        return await fetchData(url);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habit statistics';
    }
};

// Function to log habit completion
export const logHabitCompletion = async (habitId: number, completionData: {
    completed_at?: string;
    notes?: string;
    mood_rating?: number;
}) => {
    try {
        return await postData(`/api/habit/logHabitCompletion/${habitId}`, completionData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to log habit completion';
    }
};

// Function to update a habit
export const updateHabit = async (habitId: number, habitData: Partial<HabitData>) => {
    try {
        return await updateData(`/api/habit/updateHabit/${habitId}`, habitData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update habit';
    }
};

// Function to get upcoming habits
export const getUpcomingHabits = async () => {
    try {
        return await fetchData('/api/habit/getUpcomingHabits');
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch upcoming habits';
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

// Function to update habit reminders
export const updateHabitReminders = async (habitId: number, reminderData: {
    reminder_time?: string;
    is_enabled?: boolean;
}) => {
    try {
        return await updateData(`/api/habit/updateHabitReminders/${habitId}`, reminderData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update reminder settings';
    }
};

// Function to get habit completion history
export const getHabitHistory = async (habitId: number, startDate?: string, endDate?: string) => {
    try {
        let url = `/api/habit/getHabitHistory/${habitId}`;
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        return await fetchData(url);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habit history';
    }
};