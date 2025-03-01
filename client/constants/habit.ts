// types/habit.ts
export interface HabitData {
    name: string;
    description?: string;
    domain_id: string;
    frequency_type_id: string;
    frequency_value: string;
    frequency_interval: string;
    start_date: Date;
    end_date: Date | null;
    is_active: boolean;
    skip_on_vacation: boolean;
    days_of_week: number[];
    days_of_month: number[];
    times_of_day: Date[];
    reminder_times: Date[];
    is_enabled: boolean;
}

export interface HabitLog {
    completed_at: Date;
    notes?: string;
    mood_rating?: number;
    skipped: boolean;
    skip_reason?: string;
    habit_id: number;
}

export interface Domain {
    domain_id: number;
    name: string;
    description?: string;
    icon?: string;
}

export interface FrequencyType {
    frequency_type_id: number;
    name: string;
    description?: string;
}

export interface DatePickerState {
    showStartDate: boolean;
    showEndDate: boolean;
    showTimeOfDay: boolean;
    showReminderTime: boolean;
    editingReminderIndex: number | null;
}

export interface HabitSchedule {
    day_of_week: number[];
    day_of_month: number[];
    times_of_day: Date[];
}

export interface HabitReminder {
    reminder_times: Date[];
    is_enabled: boolean;
}

export interface CommonProps {
    habitData: HabitData;
    setHabitData: (data: HabitData) => void;
    isDark: boolean;
}

export interface DatePickerProps extends CommonProps {
    datePickers: DatePickerState;
    setDatePickers: (state: DatePickerState) => void;
    handleDateChange: (event: any, date: Date | undefined, type: string) => void;
}

export const DEFAULT_HABIT_DATA: HabitData = {
    name: '',
    description: '',
    domain_id: '',
    frequency_type_id: '1',
    frequency_value: '1',
    frequency_interval: '1',
    start_date: new Date(),
    end_date: null,
    is_active: true,
    skip_on_vacation: false,
    days_of_week: [],
    days_of_month: [],
    times_of_day: [],
    reminder_times: [],
    is_enabled: true
};