    import { fetchData, postData, updateData, deleteData, patchData } from './api';
    import { format } from 'date-fns';
    
    // Interface for habit data
    import { Habit } from '../constants/habit';
    
    // Enhanced interface for reminder data with all supported options
    interface EnhancedReminderData {
        time: string;
        repeat?: 'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
        message?: string;
        is_enabled?: boolean;
    
        // Enhanced notification options
        pre_notification_minutes?: number;
        follow_up_enabled?: boolean;
        follow_up_minutes?: number;
        smart_reminder?: boolean;
    
        // For recurring reminders with custom patterns
        custom_days?: number[]; // For specific days of week (0-6)
        custom_dates?: number[]; // For specific dates of month (1-31)
        custom_months?: number[]; // For specific months (0-11)
    }
    
    // Interfaces for other data types
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
    
    interface StreakData {
        streak?: number;
        reason?: string;
    }
    
    /**
     * Function to add a new habit with better support for reminders and points system
     *
     * @param habitData - The habit data with optional reminders
     * @param options - Additional options for habit creation
     * @returns Promise with the created habit
     */
    export const addHabit = async (
        habitData: Habit & {
            reminders?: EnhancedReminderData[];
            points_per_completion?: number;
            bonus_points_streak?: number;
            grace_period_enabled?: boolean;
            grace_period_hours?: number;
        },
        options?: {
            skipInitialReminders?: boolean; // Set true to avoid creating immediate reminders
            autoGenerateReminders?: boolean; // Auto-generate default reminders if none provided
        }
    ) => {
        try {
            // If autoGenerateReminders is true and no reminders provided, create default ones
            if (options?.autoGenerateReminders && (!habitData.reminders || habitData.reminders.length === 0)) {
                // Generate sensible default reminders based on habit type/frequency
                habitData.reminders = generateDefaultReminders(habitData);
            }
    
            // Normalize reminder data to ensure all required fields are present
            if (habitData.reminders && habitData.reminders.length > 0) {
                habitData.reminders = habitData.reminders.map(normalizeReminderData);
            }
    
            // Set gamification defaults if not provided
            if (habitData.difficulty && !habitData.points_per_completion) {
                habitData.points_per_completion = getDefaultPointsForDifficulty(habitData.difficulty);
            }
    
            // Ensure proper formatting of dates
            if (habitData.start_date && typeof habitData.start_date !== 'string') {
                habitData.start_date = formatDateForAPI(habitData.start_date);
            }
    
            if (habitData.end_date && typeof habitData.end_date !== 'string') {
                habitData.end_date = formatDateForAPI(habitData.end_date);
            }
    
            return await postData('/api/habit/addHabit', habitData);
        } catch (error: any) {
            console.error('Error in addHabit:', error);
            throw error.response?.data?.message || 'Failed to add habit';
        }
    };


    /**
     * Helper function to normalize reminder data and ensure all fields are properly set
     */
    function normalizeReminderData(reminder: EnhancedReminderData): EnhancedReminderData {
        // Ensure time is properly formatted
        if (typeof reminder.time === 'object' && reminder.time instanceof Date) {
            reminder.time = reminder.time.toISOString();
        }
    
        // Set defaults for optional fields
        return {
            ...reminder,
            repeat: reminder.repeat || 'DAILY',
            is_enabled: reminder.is_enabled !== undefined ? reminder.is_enabled : true,
            pre_notification_minutes: reminder.pre_notification_minutes || 10,
            follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
            follow_up_minutes: reminder.follow_up_minutes || 30,
            smart_reminder: reminder.smart_reminder || false
        };
    }
    
    /**
     * Helper function to generate default reminders based on habit type
     */
    function generateDefaultReminders(habit: Habit): EnhancedReminderData[] {
        const reminders: EnhancedReminderData[] = [];
    
        // Default settings based on habit frequency and type
        switch (habit.frequency_type) {
            case 'DAILY':
                // Morning reminder for daily habits
                reminders.push({
                    time: '08:00:00',
                    repeat: 'DAILY',
                    message: `Time to complete your habit: ${habit.name}`,
                    pre_notification_minutes: 0,
                    follow_up_enabled: true,
                    follow_up_minutes: 60
                });
                break;
    
            case 'WEEKDAYS':
                // Work-time reminder for weekday habits
                reminders.push({
                    time: '09:00:00',
                    repeat: 'WEEKDAYS',
                    message: `Don't forget your habit: ${habit.name}`,
                    pre_notification_minutes: 15
                });
                break;
    
            case 'WEEKENDS':
                // Later reminder for weekend habits
                reminders.push({
                    time: '10:00:00',
                    repeat: 'WEEKENDS',
                    message: `Time for your weekend habit: ${habit.name}`
                });
                break;
    
            case 'SPECIFIC_DAYS':
                // Standard reminder for specific days
                reminders.push({
                    time: '12:00:00',
                    repeat: 'CUSTOM',
                    custom_days: habit.specific_days,
                    message: `Reminder for your habit: ${habit.name}`
                });
                break;
    
            default:
                // Default reminder for other frequencies
                reminders.push({
                    time: '09:00:00',
                    repeat: 'DAILY',
                    message: `Time to complete your habit: ${habit.name}`
                });
        }
    
        return reminders;
    }
    
    /**
     * Helper function to get default points based on difficulty
     */
    function getDefaultPointsForDifficulty(difficulty: string): number {
        switch (difficulty) {
            case 'VERY_EASY':
                return 2;
            case 'EASY':
                return 3;
            case 'MEDIUM':
                return 5;
            case 'HARD':
                return 8;
            case 'VERY_HARD':
                return 10;
            default:
                return 5;
        }
    }
    
    /**
     * Format a Date object for the API
     */
    function formatDateForAPI(date: Date | string): string {
        if (typeof date === 'string') return date;
        return format(date, 'yyyy-MM-dd');
    }
    
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
    export const getHabitDetails = async (habitId: number) => {
        try {
            return await fetchData(`/api/habit/getHabit/${habitId}`);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to fetch habit details';
        }
    };
    
    // Function to get habits by specific date
    export const getHabitsByDate = async (date: Date | string) => {
        try {
            // Ensure date is formatted properly
            const formattedDate = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
            return await fetchData(`/api/habit/getHabitsByDate/${formattedDate}`);
        } catch (error: any) {
            console.error('Error in getHabitsByDate:', error);
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
    
    /**
     * Function to update a habit with comprehensive support for all features
     * Handles reminders, streaks, points, and scheduling settings
     *
     * @param habitId - The ID of the habit to update
     * @param habitData - Partial habit data to update
     * @param options - Additional options for updating
     * @returns Promise with the updated habit
     */
    export const updateHabit = async (
        habitId: number,
        habitData: Partial<Habit> & {
            reminders?: EnhancedReminderData[];
            points_per_completion?: number;
            bonus_points_streak?: number;
            grace_period_enabled?: boolean;
            grace_period_hours?: number;
        },
        options?: {
            preserveExistingReminders?: boolean; // If true, merge with existing reminders instead of replacing
            resetStreak?: boolean; // If true, reset streak when frequency changes
            fetchAfterUpdate?: boolean; // If true, fetch the updated habit details after update
        }
    ) => {
        try {
            // Format dates if needed
            if (habitData.start_date && typeof habitData.start_date !== 'string') {
                habitData.start_date = formatDateForAPI(habitData.start_date);
            }
    
            if (habitData.end_date && typeof habitData.end_date !== 'string') {
                habitData.end_date = formatDateForAPI(habitData.end_date);
            }
    
            // Handle reminders with more sophistication
            if (habitData.reminders) {
                // If preserving existing reminders, fetch current ones and merge
                if (options?.preserveExistingReminders) {
                    try {
                        const existingHabit = await fetchData(`/api/habit/getHabit/${habitId}`);
    
                        if (existingHabit && existingHabit.data && existingHabit.data.reminders) {
                            // Create a map of existing reminders by time for quick lookup
                            const existingReminderMap = new Map();
                            existingHabit.data.reminders.forEach(reminder => {
                                // Create a unique key for each reminder based on time and type
                                const reminderKey = `${reminder.reminder_time}-${reminder.repeat}`;
                                existingReminderMap.set(reminderKey, reminder);
                            });
    
                            // Process new reminders, replacing existing ones with same key
                            const mergedReminders = [...existingHabit.data.reminders];
    
                            habitData.reminders.forEach(newReminder => {
                                const normalizedReminder = normalizeReminderData(newReminder);
                                const reminderKey = `${normalizedReminder.time}-${normalizedReminder.repeat}`;
    
                                // If this reminder already exists, update it
                                if (existingReminderMap.has(reminderKey)) {
                                    const index = mergedReminders.findIndex(r =>
                                        `${r.reminder_time}-${r.repeat}` === reminderKey
                                    );
    
                                    if (index !== -1) {
                                        mergedReminders[index] = {
                                            ...mergedReminders[index],
                                            ...normalizedReminder,
                                            reminder_time: normalizedReminder.time
                                        };
                                    }
                                } else {
                                    // Add as a new reminder
                                    mergedReminders.push({
                                        ...normalizedReminder,
                                        reminder_time: normalizedReminder.time
                                    });
                                }
                            });
    
                            // Replace the reminders array with our merged version
                            habitData.reminders = mergedReminders;
                        }
                    } catch (error) {
                        console.warn('Failed to fetch existing reminders for merging:', error);
                        // Just use the provided reminders if we can't fetch existing ones
                        habitData.reminders = habitData.reminders.map(normalizeReminderData);
                    }
                } else {
                    // Standard approach - normalize and replace all reminders
                    habitData.reminders = habitData.reminders.map(normalizeReminderData);
                }
            }
    
            // For frequency changes, optionally reset streak
            if (options?.resetStreak && habitData.frequency_type) {
                try {
                    const existingHabit = await fetchData(`/api/habit/getHabit/${habitId}`);
    
                    if (existingHabit && existingHabit.data &&
                        existingHabit.data.frequency_type !== habitData.frequency_type) {
                        // Frequency type changed, reset streak if requested
                        await resetHabitStreak(habitId, {
                            reason: 'Frequency type changed from ' +
                                existingHabit.data.frequency_type + ' to ' +
                                habitData.frequency_type
                        });
                    }
                } catch (error) {
                    console.warn('Failed to reset streak after frequency change:', error);
                    // Continue with the update anyway
                }
            }
    
            // Handle specific days for weekly frequency
            if (habitData.frequency_type === 'SPECIFIC_DAYS' && habitData.specific_days) {
                // Ensure specific_days is an array of numbers
                if (typeof habitData.specific_days === 'string') {
                    try {
                        habitData.specific_days = JSON.parse(habitData.specific_days);
                    } catch (e) {
                        // If parsing fails, split by commas
                        habitData.specific_days = habitData.specific_days.split(',').map(day => parseInt(day.trim()));
                    }
                }
            }
    
            // Update habit with prepared data
            const result = await updateData(`/api/habit/updateHabit/${habitId}`, habitData);
    
            // Optionally fetch full details after update
            if (options?.fetchAfterUpdate) {
                return await fetchData(`/api/habit/getHabit/${habitId}`);
            }
    
            return result;
        } catch (error: any) {
            console.error('Error updating habit:', error);
            throw error.response?.data?.message || 'Failed to update habit';
        }
    };
    
    // Function to toggle favorite status
    export const toggleFavorite = async (habitId: number) => {
        try {
            return await patchData(`/api/habit/toggleFavorite/${habitId}`, {});
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to toggle favorite status';
        }
    };
    
    // Function to archive a habit
    export const archiveHabit = async (habitId: number) => {
        try {
            return await patchData(`/api/habit/archiveHabit/${habitId}`, {});
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to archive habit';
        }
    };
    
    // Function to restore an archived habit
    export const restoreHabit = async (habitId: number) => {
        try {
            return await patchData(`/api/habit/restoreHabit/${habitId}`, {});
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to restore habit';
        }
    };
    
    /**
     * Enhanced function to log habit completion with support for tracking methods
     */
    export const logHabitCompletion = async (
        habitId: number,
        completionData: Partial<CompletionData>,
        options?: { includeDetails?: boolean }
    ) => {
        if (!habitId) {
            console.error('No habit ID provided for completion');
            throw new Error('Habit ID is required');
        }
    
        try {
            // Auto-set completion time if not provided
            if (!completionData.completed_at) {
                completionData.completed_at = new Date().toISOString();
            }
    
            let url = `/api/habit/logHabitCompletion/${habitId}`;
    
            // Add query parameters for options
            if (options?.includeDetails) {
                url += '?includeDetails=true';
            }
    
            return await postData(url, completionData);
        } catch (error: any) {
            console.error('Error in logHabitCompletion:', error);
            throw error.response?.data?.message || 'Failed to log habit completion';
        }
    };
    
    // Function to skip a habit
    export const skipHabit = async (habitId: number, skipData: { date: string | Date; reason?: string }) => {
        try {
            // Ensure date is formatted properly
            const formattedSkipData = {
                ...skipData,
                date: typeof skipData.date === 'string' ? skipData.date : format(skipData.date, 'yyyy-MM-dd')
            };
    
            return await postData(`/api/habit/skipHabit/${habitId}`, formattedSkipData);
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
    
    // Function to reset a habit streak
    export const resetHabitStreak = async (habitId: number, data?: { reason?: string; notes?: string }) => {
        try {
            return await postData(`/api/habit/resetStreak/${habitId}`, data || {});
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to reset habit streak';
        }
    };
    
    // Function to set a custom streak value
    export const setHabitStreak = async (habitId: number, streakData: StreakData) => {
        try {
            return await postData(`/api/habit/setStreak/${habitId}`, streakData);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to set habit streak';
        }
    };
    
    // Function to get streak history
    export const getStreakHistory = async (habitId: number) => {
        try {
            return await fetchData(`/api/habit/streakHistory/${habitId}`);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to get streak history';
        }
    };
    
    /**
     * Enhanced function to get habit analytics with more options
     */
    export const getHabitAnalytics = async (
        habitId: number,
        options?: {
            period?: 'week' | 'month' | 'quarter' | 'year';
            startDate?: string | Date;
            endDate?: string | Date;
            includeLogs?: boolean;
            maxLogs?: number;
            compareToPrevious?: boolean;
        }
    ) => {
        try {
            let url = `/api/habit/analytics/${habitId}`;
            const params = new URLSearchParams();
    
            if (options?.period) params.append('period', options.period);
    
            if (options?.startDate) {
                const formattedStartDate = typeof options.startDate === 'string'
                    ? options.startDate
                    : format(options.startDate, 'yyyy-MM-dd');
                params.append('start_date', formattedStartDate);
            }
    
            if (options?.endDate) {
                const formattedEndDate = typeof options.endDate === 'string'
                    ? options.endDate
                    : format(options.endDate, 'yyyy-MM-dd');
                params.append('end_date', formattedEndDate);
            }
    
            if (options?.includeLogs !== undefined) {
                params.append('include_logs', options.includeLogs.toString());
            }
    
            if (options?.maxLogs) {
                params.append('max_logs', options.maxLogs.toString());
            }
    
            if (options?.compareToPrevious !== undefined) {
                params.append('compare_to_previous', options.compareToPrevious.toString());
            }
    
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
    
            return await fetchData(url);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to get habit analytics';
        }
    };
    
    // Function to get habit domains
    export const getHabitDomains = async () => {
        try {
            return await fetchData('/api/habit/domains');
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to get habit domains';
        }
    };

    export const getAllHabitDomains = async () => {
        try {
            const response = await fetchData('/api/habit/allDomains');

            // Return the raw domains array
            return response.data || [];
        } catch (error) {
            console.error('Failed to get all habit domains:', error);
            throw error.response?.data?.message || 'Failed to get all habit domains';
        }
    };

    // Function to add a habit domain
    export const addHabitDomain = async (domainData: { name: string; description?: string; icon?: string; color?: string }) => {
        try {
            return await postData('/api/habit/domains', domainData);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to add habit domain';
        }
    };
    
    // Function to update a habit domain
    export const updateHabitDomain = async (domainId: number, domainData: { name?: string; description?: string; icon?: string; color?: string }) => {
        try {
            return await updateData(`/api/habit/domains/${domainId}`, domainData);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to update habit domain';
        }
    };
    
    // Function to delete a habit domain
    export const deleteHabitDomain = async (domainId: number) => {
        try {
            return await deleteData(`/api/habit/domains/${domainId}`);
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to delete habit domain';
        }
    };
    
    // Function to trigger the daily habit reset process
    export const processHabitDailyReset = async () => {
        try {
            return await postData('/api/habit/processHabitDailyReset', {});
        } catch (error: any) {
            throw error.response?.data?.message || 'Failed to process daily habit reset';
        }
    };