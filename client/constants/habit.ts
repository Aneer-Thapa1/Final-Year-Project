// constants/habitConstants.js

// Domain categories
export const domains = [
    { id: 1, name: 'Health', icon: '💪' },
    { id: 2, name: 'Learning', icon: '📚' },
    { id: 3, name: 'Productivity', icon: '⚡' },
    { id: 4, name: 'Mindfulness', icon: '🧘' },
    { id: 5, name: 'Creativity', icon: '🎨' },
    { id: 6, name: 'Finance', icon: '💰' },
    { id: 7, name: 'Social', icon: '👥' },
    { id: 8, name: 'Sleep', icon: '😴' }
    // Add more as needed
];

// Tracking types
export const trackingTypes = [
    { id: 'BOOLEAN', name: 'Yes/No', description: 'Simple completion tracking', icon: '✓' },
    { id: 'COUNTABLE', name: 'Counter', description: 'Track a specific count', icon: '🔢' },
    { id: 'TIMER', name: 'Timer', description: 'Track duration', icon: '⏱️' },
    { id: 'NUMERIC', name: 'Numeric', description: 'Track a measurement', icon: '📏' },
    { id: 'CHECKLIST', name: 'Checklist', description: 'Multiple sub-items', icon: '📋' }
];

// Difficulty levels
export const difficultyLevels = [
    { id: 1, name: 'Very Easy', color: '#10B981' },
    { id: 2, name: 'Easy', color: '#6EE7B7' },
    { id: 3, name: 'Medium', color: '#FBBF24' },
    { id: 4, name: 'Hard', color: '#F97316' },
    { id: 5, name: 'Very Hard', color: '#EF4444' }
];

// Reminder types
export const reminderTypes = [
    { id: 'PUSH', name: 'Push Notification' },
    { id: 'EMAIL', name: 'Email' },
    { id: 'SMS', name: 'SMS' },
    { id: 'CALENDAR', name: 'Calendar' },
    { id: 'WIDGET', name: 'Widget' }
];

// Days of week
export const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const dayNumbers = [1, 2, 3, 4, 5, 6, 7];

// Default habit state (initial values)
export const defaultHabitState = {
    // Basic info
    name: '',
    description: '',
    domain_id: '',
    difficulty_id: 3, // Medium difficulty by default

    // Tracking methodology
    tracking_type: 'BOOLEAN',
    count_goal: null,
    duration_goal: null,
    numeric_goal: null,
    units: '',

    // Frequency settings
    frequency_type_id: '1', // Daily by default
    frequency_value: '1',
    frequency_interval: '1',
    custom_frequency: null,

    // Dates
    start_date: new Date(),
    end_date: null,

    // Schedule parameters
    day_of_week: [], // For weekly habits [1,3,5] = Mon,Wed,Fri
    day_of_month: [], // For monthly habits [1,15] = 1st and 15th
    month_of_year: [], // For yearly habits [1,6,12] = Jan,Jun,Dec
    week_of_month: [], // For "first Monday" type schedules
    times_of_day: [], // Times for daily habits
    time_window_start: null,
    time_window_end: null,
    is_all_day: false,

    // Reminders
    reminder_times: [],
    reminder_type: 'PUSH',
    reminder_sound: null,
    smart_reminder: false,
    adaptive_timing: false,
    reminder_message: '',
    snooze_enabled: true,
    snooze_duration: 10,
    only_when_due: true,
    reminder_days: [1, 2, 3, 4, 5, 6, 7], // All days by default

    // Advanced options
    skip_on_vacation: false,
    allow_backfill: true,
    roll_over: false,
    require_evidence: false,
    require_verification: false,

    // Location trigger
    has_location_trigger: false,
    location_lat: null,
    location_long: null,
    location_radius: null,
    location_name: '',

    // Customization
    color: '#6366F1', // Default primary color
    icon: null,
    motivation_quote: '',
    external_resource_url: '',

    // Subtasks for checklist habits
    subtasks: [],

    // Tags
    tags: []
};

// types/habit.ts
export interface HabitLog {
    log_id?: number;
    habit_id: number;
    completed_at: string;
    mood_rating?: number;
    energy_level?: number;
    difficulty_rating?: number;
    notes?: string;
    evidence_url?: string;
    location_lat?: number;
    location_long?: number;
    location_name?: string;
}

export interface HabitStreak {
    streak_id?: number;
    habit_id: number;
    user_id: number;
    start_date: string;
    current_streak: number;
    longest_streak: number;
    last_completed_at: string | null;
    current_week_streak: number;
    longest_week_streak: number;
    current_month_streak: number;
    longest_month_streak: number;
    total_completions: number;
    success_rate: number;
    freeze_count: number;
}

export interface HabitSubtask {
    subtask_id: number;
    habit_id: number;
    name: string;
    description?: string;
    is_required: boolean;
    sort_order: number;
    is_completed?: boolean;
}

export interface HabitDomain {
    domain_id: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
}

export interface FrequencyType {
    frequency_type_id: number;
    name: string;
    description?: string;
}

export interface HabitDifficulty {
    difficulty_id: number;
    name: string;
    points_multiplier: number;
    color: string;
}

export interface HabitSchedule {
    schedule_id?: number;
    habit_id: number;
    day_of_week: number[];
    day_of_month: number[];
    month_of_year: number[];
    week_of_month: number[];
    times_of_day: string[];
    time_window_start: string | null;
    time_window_end: string | null;
    is_all_day: boolean;
}

export interface HabitReminder {
    reminder_id?: number;
    habit_id: number;
    reminder_times: string[];
    is_enabled: boolean;
    reminder_type: string;
    sound?: string;
    smart_reminder: boolean;
    adaptive_timing: boolean;
    message?: string;
    snooze_enabled: boolean;
    snooze_duration: number;
    only_when_due: boolean;
    reminder_days: number[];
}

export interface HabitTag {
    tag_id: number;
    name: string;
    color: string;
    icon?: string;
}

export interface HabitGroup {
    group_id: number;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
}

export interface Habit {
    habit_id: number;
    user_id: number;
    name: string;
    description: string | null;
    domain_id: number;
    frequency_type_id: number;
    frequency_value: number;
    frequency_interval: number;
    frequency_text?: string;
    custom_frequency?: string;
    tracking_type: 'BOOLEAN' | 'COUNTABLE' | 'TIMER' | 'NUMERIC' | 'CHECKLIST';
    duration_goal?: number;
    count_goal?: number;
    numeric_goal?: number;
    units?: string;
    start_date: string;
    end_date: string | null;
    specific_time?: string | null; // Legacy field
    is_active: boolean;
    skip_on_vacation: boolean;
    allow_backfill: boolean;
    roll_over: boolean;
    require_evidence: boolean;
    require_verification: boolean;
    color?: string;
    icon?: string;
    image?: string;
    motivation_quote?: string;
    motivation_image?: string;
    external_resource_url?: string;
    is_smart_schedule: boolean;
    has_location_trigger: boolean;
    location_lat?: number;
    location_long?: number;
    location_radius?: number;
    location_name?: string;
    difficulty_id?: number;
    created_at?: string;
    updated_at?: string;

    // Relational data from backend
    domain?: HabitDomain;
    frequencyType?: FrequencyType;
    difficulty?: HabitDifficulty;
    habitSchedule?: HabitSchedule;
    habitStreak?: HabitStreak;
    habitReminder?: HabitReminder;
    habitSubtask?: HabitSubtask[];
    habitLog?: HabitLog[];

    // Utility fields added by the client
    isCompletedToday?: boolean;
    tags?: HabitTag[];
    groups?: HabitGroup[];

    // Legacy fields for backward compatibility
    streak?: {
        current_streak: number;
        longest_streak: number;
    };
    logs?: HabitLog[];
    times_of_day?: string[];
    time_window_start?: string;
    time_window_end?: string;
}