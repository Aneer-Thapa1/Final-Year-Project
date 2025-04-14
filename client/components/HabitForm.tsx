import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    useColorScheme,
    Platform,
    Keyboard,
    Modal,
    Pressable
} from 'react-native';
import {
    Calendar,
    Clock,
    ChevronDown,
    ChevronRight,
    Bell,
    X,
    Check,
    Plus,
    Tag,
    Star,
    Info,
    Shield,
    CalendarCheck,
    Bookmark
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getAllHabitDomains } from '../services/habitService';

// Types
type DifficultyLevel = 'VERY_EASY' | 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
type TrackingType = 'BOOLEAN' | 'DURATION' | 'COUNT' | 'NUMERIC';
type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | 'X_TIMES_WEEK' | 'INTERVAL' | 'SPECIFIC_DAYS';

interface Reminder {
    time: string;
    repeat?: string;
    message?: string;
    is_enabled?: boolean;
    pre_notification_minutes?: number;
    follow_up_enabled?: boolean;
    follow_up_minutes?: number;
}

interface HabitFormProps {
    initialData?: any;
    onSubmit: (data: any) => void;
    onCancel: () => void;
    isEditMode?: boolean;
}

// Utility function to format date
const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'yyyy-MM-dd');
};

// Utility function to format time
const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    // Handle different time formats (HH:mm:ss or ISO string)
    if (timeString.includes('T')) {
        // ISO string format
        return format(new Date(timeString), 'HH:mm');
    } else {
        // HH:mm:ss format
        return timeString.substring(0, 5);
    }
};

const FREQUENCY_TYPES = [
    { label: 'Every Day', value: 'DAILY' },
    { label: 'Weekdays Only', value: 'WEEKDAYS' },
    { label: 'Weekends Only', value: 'WEEKENDS' },
    { label: 'Specific Days', value: 'SPECIFIC_DAYS' },
    { label: 'X Times per Week', value: 'X_TIMES_WEEK' },
    { label: 'Every X Days', value: 'INTERVAL' }
];

const DIFFICULTY_LEVELS = [
    { label: 'Very Easy', value: 'VERY_EASY' },
    { label: 'Easy', value: 'EASY' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Hard', value: 'HARD' },
    { label: 'Very Hard', value: 'VERY_HARD' }
];

const TRACKING_TYPES = [
    { label: 'Yes/No Completion', value: 'BOOLEAN', icon: <Check size={20} /> },
    { label: 'Duration Tracking', value: 'DURATION', icon: <Clock size={20} /> },
    { label: 'Count Tracking', value: 'COUNT', icon: <Tag size={20} /> },
    { label: 'Numeric Value', value: 'NUMERIC', icon: <Info size={20} /> }
];

const ModernHabitForm: React.FC<HabitFormProps> = ({
                                                       initialData,
                                                       onSubmit,
                                                       onCancel,
                                                       isEditMode = false
                                                   }) => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    // Default habit state
    const defaultHabitState = {
        name: "",
        description: "",
        domain_id: null,
        domain_name: null,
        domain_color: null,
        start_date: new Date(),
        end_date: null,
        is_favorite: false,
        frequency_type: "DAILY",
        frequency_value: 1,
        specific_days: [],
        tracking_type: "BOOLEAN",
        target_value: null,
        target_duration: null,
        units: "",
        difficulty: "MEDIUM",
        reminders: [],
        grace_period_enabled: true,
        grace_period_hours: 24,
        points_per_completion: 5
    };

    // Form state
    const [habit, setHabit] = useState(initialData || defaultHabitState);
    const [domains, setDomains] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeSection, setActiveSection] = useState("basic");
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
    const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
    const [showTrackingPicker, setShowTrackingPicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedReminderIndex, setSelectedReminderIndex] = useState<number | null>(null);

    // Fetch domains on load
    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const domainsData = await getAllHabitDomains();
                setDomains(domainsData || []);
            } catch (err) {
                console.error('Error fetching domains:', err);
            }
        };

        fetchDomains();
    }, []);

    // Handle input changes
    const handleInputChange = (field: string, value: any) => {
        setHabit(prev => ({ ...prev, [field]: value }));
    };

    // Handle date changes
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android' && event.type === 'dismissed') {
            setShowStartDatePicker(false);
            setShowEndDatePicker(false);
            return;
        }

        if (selectedDate) {
            if (showStartDatePicker) {
                setHabit(prev => ({ ...prev, start_date: selectedDate }));
            } else if (showEndDatePicker) {
                setHabit(prev => ({ ...prev, end_date: selectedDate }));
            }
        }

        if (Platform.OS === 'android') {
            setShowStartDatePicker(false);
            setShowEndDatePicker(false);
        }
    };

    // Handle form submission
    const handleSubmit = () => {
        // Validate form
        if (!habit.name.trim()) {
            setError('Habit name is required');
            return;
        }

        setIsSubmitting(true);

        // Prepare data for submission
        const formData = {
            ...habit,
            start_date: habit.start_date instanceof Date ?
                formatDate(habit.start_date) : habit.start_date,
            end_date: habit.end_date ?
                (habit.end_date instanceof Date ? formatDate(habit.end_date) : habit.end_date)
                : null
        };

        // Call the onSubmit callback
        onSubmit(formData);
        setIsSubmitting(false);
    };

    // Toggle specific day for weekly habits
    const toggleSpecificDay = (day: number) => {
        const updatedDays = [...(habit.specific_days || [])];
        const index = updatedDays.indexOf(day);

        if (index !== -1) {
            updatedDays.splice(index, 1);
        } else {
            updatedDays.push(day);
        }

        setHabit(prev => ({ ...prev, specific_days: updatedDays }));
    };

    // Handle adding a reminder
    const addReminder = (time?: Date) => {
        const newReminder = {
            time: time ? format(time, 'HH:mm:00') : '09:00:00',
            repeat: 'DAILY',
            message: `Time to complete: ${habit.name}`,
            is_enabled: true
        };

        setHabit(prev => ({
            ...prev,
            reminders: [...(prev.reminders || []), newReminder]
        }));
    };

    // Handle reminder time change
    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android' && event.type === 'dismissed') {
            setShowTimePicker(false);
            return;
        }

        if (selectedTime && selectedReminderIndex !== null) {
            const timeString = format(selectedTime, 'HH:mm:00');
            const updatedReminders = [...(habit.reminders || [])];

            if (selectedReminderIndex < updatedReminders.length) {
                // Edit existing reminder
                updatedReminders[selectedReminderIndex] = {
                    ...updatedReminders[selectedReminderIndex],
                    time: timeString
                };
            } else {
                // Add new reminder
                updatedReminders.push({
                    time: timeString,
                    repeat: 'DAILY',
                    message: `Time to complete: ${habit.name}`,
                    is_enabled: true
                });
            }

            setHabit(prev => ({ ...prev, reminders: updatedReminders }));
        }

        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
    };

    // Handle removing a reminder
    const removeReminder = (index: number) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders.splice(index, 1);
        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Toggle reminder enable/disable
    const toggleReminderEnabled = (index: number) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders[index] = {
            ...updatedReminders[index],
            is_enabled: !updatedReminders[index].is_enabled
        };

        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Select a domain
    const selectDomain = (domain: any) => {
        setHabit(prev => ({
            ...prev,
            domain_id: domain.domain_id,
            domain_name: domain.name,
            domain_color: domain.color
        }));
        setShowDomainPicker(false);
    };

    // Clear selected domain
    const clearDomain = () => {
        setHabit(prev => ({
            ...prev,
            domain_id: null,
            domain_name: null,
            domain_color: null
        }));
        setShowDomainPicker(false);
    };

    // Theme styles
    const theme = {
        bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        card: isDarkMode ? 'bg-gray-800' : 'bg-white',
        input: isDarkMode ? 'bg-gray-700' : 'bg-gray-100',
        text: isDarkMode ? 'text-white' : 'text-gray-900',
        textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-700',
        textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        success: isDarkMode ? 'bg-green-800 text-green-100' : 'bg-green-50 text-green-900',
        primary: isDarkMode ? 'bg-primary-700' : 'bg-primary-500',
        primaryText: 'text-white',
        activeTab: isDarkMode ? 'bg-primary-900/40 border-primary-700' : 'bg-primary-100 border-primary-200',
        activeTabText: isDarkMode ? 'text-primary-400' : 'text-primary-700',
        inactiveTab: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
        inactiveTabText: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    };

    // Styled components
    const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View className="mb-6">
            <Text className={`text-lg font-montserrat-semibold mb-4 ${theme.text}`}>
                {title}
            </Text>
            {children}
        </View>
    );

    const FormField = ({
                           label,
                           children,
                           required = false,
                           className = ""
                       }: {
        label: string,
        children: React.ReactNode,
        required?: boolean,
        className?: string
    }) => (
        <View className={`mb-4 ${className}`}>
            <View className="flex-row items-center mb-2">
                <Text className={`text-sm font-montserrat-medium ${theme.textSecondary}`}>
                    {label}
                </Text>
                {required && <Text className="text-red-500 ml-1">*</Text>}
            </View>
            {children}
        </View>
    );

    const TabButton = ({
                           title,
                           icon,
                           isActive,
                           onPress
                       }: {
        title: string,
        icon: React.ReactNode,
        isActive: boolean,
        onPress: () => void
    }) => (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 py-3 items-center justify-center rounded-lg border ${
                isActive ? theme.activeTab : theme.inactiveTab
            }`}
        >
            {icon}
            <Text className={`mt-1 text-xs font-montserrat-medium ${
                isActive ? theme.activeTabText : theme.inactiveTabText
            }`}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    // Dropdown component
    const DropdownPicker = ({
                                visible,
                                options,
                                onSelect,
                                onClose,
                                title
                            }: {
        visible: boolean,
        options: Array<{ label: string, value: string, icon?: React.ReactNode }>,
        onSelect: (option: any) => void,
        onClose: () => void,
        title: string
    }) => (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 justify-center bg-black/50"
                onPress={onClose}
            >
                <View
                    className={`mx-4 rounded-xl ${theme.card} overflow-hidden`}
                    onStartShouldSetResponder={() => true}
                >
                    <View className={`px-4 py-3 border-b ${theme.border}`}>
                        <Text className={`text-base font-montserrat-bold ${theme.text}`}>{title}</Text>
                    </View>

                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => onSelect(option)}
                            className={`px-4 py-3.5 flex-row items-center ${
                                index !== options.length - 1 ? `border-b ${theme.border}` : ''
                            }`}
                        >
                            {option.icon && (
                                <View className="mr-3">
                                    {option.icon}
                                </View>
                            )}
                            <Text className={`${theme.text} font-montserrat`}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );

    // Date and time pickers
    const renderDatePicker = () => {
        const isStartDatePicker = showStartDatePicker;
        const isEndDatePicker = showEndDatePicker;

        if (!showStartDatePicker && !showEndDatePicker && !showTimePicker) {
            return null;
        }

        let currentDate = new Date();
        let mode: 'date' | 'time' = 'date';

        if (isStartDatePicker) {
            currentDate = habit.start_date instanceof Date ? habit.start_date : new Date(habit.start_date);
        } else if (isEndDatePicker) {
            currentDate = habit.end_date instanceof Date ? habit.end_date : (habit.end_date ? new Date(habit.end_date) : new Date());
        } else if (showTimePicker) {
            mode = 'time';
            if (selectedReminderIndex !== null && selectedReminderIndex < (habit.reminders || []).length) {
                const timeString = habit.reminders[selectedReminderIndex].time;
                const [hours, minutes] = timeString.split(':');
                currentDate = new Date();
                currentDate.setHours(parseInt(hours), parseInt(minutes));
            }
        }

        const onChange = showTimePicker ? handleTimeChange : handleDateChange;

        if (Platform.OS === 'ios') {
            return (
                <Modal
                    transparent={true}
                    visible={true}
                    animationType="slide"
                >
                    <View className="flex-1 justify-end bg-black/40">
                        <View className={`rounded-t-xl ${theme.card} p-4`}>
                            <View className="flex-row justify-between items-center mb-4">
                                <TouchableOpacity onPress={() => {
                                    setShowStartDatePicker(false);
                                    setShowEndDatePicker(false);
                                    setShowTimePicker(false);
                                }}>
                                    <Text className="text-primary-500 font-montserrat-medium">Cancel</Text>
                                </TouchableOpacity>
                                <Text className={`text-base font-montserrat-bold ${theme.text}`}>
                                    {showTimePicker ? 'Select Time' : 'Select Date'}
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    if (showTimePicker && selectedReminderIndex !== null) {
                                        handleTimeChange({}, currentDate);
                                    } else {
                                        handleDateChange({}, currentDate);
                                    }
                                    setShowStartDatePicker(false);
                                    setShowEndDatePicker(false);
                                    setShowTimePicker(false);
                                }}>
                                    <Text className="text-primary-500 font-montserrat-medium">Done</Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={currentDate}
                                mode={mode}
                                display="spinner"
                                onChange={onChange}
                                style={{ height: 200 }}
                                textColor={isDarkMode ? 'white' : 'black'}
                            />
                        </View>
                    </View>
                </Modal>
            );
        } else {
            return (
                <DateTimePicker
                    value={currentDate}
                    mode={mode}
                    display="default"
                    onChange={onChange}
                />
            );
        }
    };

    return (
        <View className={`flex-1 ${theme.bg}`}>
            {/* Header */}
            <View className={`px-4 py-3 flex-row justify-between items-center border-b ${theme.border}`}>
                <TouchableOpacity
                    onPress={onCancel}
                    className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}
                >
                    <X size={20} color={isDarkMode ? 'white' : 'black'} />
                </TouchableOpacity>

                <Text className={`text-lg font-montserrat-bold ${theme.text}`}>
                    {isEditMode ? 'Edit Habit' : 'New Habit'}
                </Text>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    className={`px-4 py-1.5 rounded-full ${theme.primary}`}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text className="text-white font-montserrat-medium">Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Error message */}
            {error && (
                <View className="mx-4 mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Text className="text-red-600 dark:text-red-400 font-montserrat">{error}</Text>
                </View>
            )}

            {/* Tabs */}
            <View className="flex-row px-4 py-3 space-x-2">
                <TabButton
                    title="Basics"
                    icon={<Info size={18} className={activeSection === "basic" ? theme.activeTabText : theme.inactiveTabText} />}
                    isActive={activeSection === "basic"}
                    onPress={() => setActiveSection("basic")}
                />
                <TabButton
                    title="Schedule"
                    icon={<CalendarCheck size={18} className={activeSection === "schedule" ? theme.activeTabText : theme.inactiveTabText} />}
                    isActive={activeSection === "schedule"}
                    onPress={() => setActiveSection("schedule")}
                />
                <TabButton
                    title="Tracking"
                    icon={<Check size={18} className={activeSection === "tracking" ? theme.activeTabText : theme.inactiveTabText} />}
                    isActive={activeSection === "tracking"}
                    onPress={() => setActiveSection("tracking")}
                />
                <TabButton
                    title="More"
                    icon={<Shield size={18} className={activeSection === "more" ? theme.activeTabText : theme.inactiveTabText} />}
                    isActive={activeSection === "more"}
                    onPress={() => setActiveSection("more")}
                />
            </View>

            {/* Content */}
            <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Basic Information Section */}
                {activeSection === "basic" && (
                    <FormSection title="Basic Information">
                        <FormField label="Habit Name" required>
                            <TextInput
                                value={habit.name}
                                onChangeText={(text) => handleInputChange('name', text)}
                                placeholder="What habit do you want to build?"
                                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text}`}
                            />
                        </FormField>

                        <FormField label="Description">
                            <TextInput
                                value={habit.description}
                                onChangeText={(text) => handleInputChange('description', text)}
                                placeholder="Why is this habit important to you?"
                                placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text}`}
                                multiline
                                numberOfLines={3}
                                style={{ textAlignVertical: 'top', minHeight: 80 }}
                            />
                        </FormField>

                        <FormField label="Domain/Category">
                            <TouchableOpacity
                                onPress={() => setShowDomainPicker(true)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}
                            >
                                <View className="flex-row items-center">
                                    {habit.domain_id ? (
                                        <>
                                            <View
                                                className="w-4 h-4 rounded-full mr-2"
                                                style={{ backgroundColor: habit.domain_color || '#22C55E' }}
                                            />
                                            <Text className={`font-montserrat ${theme.text}`}>
                                                {habit.domain_name || 'Select a domain'}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text className={`font-montserrat ${theme.textMuted}`}>
                                            Select a domain (optional)
                                        </Text>
                                    )}
                                </View>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>
                        </FormField>

                        <FormField label="Difficulty">
                            <TouchableOpacity
                                onPress={() => setShowDifficultyPicker(true)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}
                            >
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {DIFFICULTY_LEVELS.find(d => d.value === habit.difficulty)?.label || 'Medium'}
                                </Text>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>
                        </FormField>

                        <FormField label="Add to Favorites">
                            <View className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}>
                                <View className="flex-row items-center">
                                    <Star size={18} className={`mr-2 ${habit.is_favorite ? 'text-amber-400' : theme.textMuted}`} />
                                    <Text className={`font-montserrat ${theme.text}`}>
                                        Show in favorites tab
                                    </Text>
                                </View>
                                <Switch
                                    value={habit.is_favorite}
                                    onValueChange={(value) => handleInputChange('is_favorite', value)}
                                    trackColor={{ false: isDarkMode ? '#374151' : '#D1D5DB', true: '#22C55E' }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        </FormField>
                    </FormSection>
                )}

                {/* Schedule Section */}
                {activeSection === "schedule" && (
                    <FormSection title="Scheduling & Frequency">
                        <FormField label="Frequency" required>
                            <TouchableOpacity
                                onPress={() => setShowFrequencyPicker(true)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}
                            >
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {FREQUENCY_TYPES.find(t => t.value === habit.frequency_type)?.label || 'Every Day'}
                                </Text>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>
                        </FormField>

                        {/* Specific frequency options based on type */}
                        {habit.frequency_type === 'SPECIFIC_DAYS' && (
                            <FormField label="Select Days" required>
                                <View className="flex-row justify-between py-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => toggleSpecificDay(index)}
                                            className={`w-10 h-10 rounded-full items-center justify-center ${
                                                (habit.specific_days || []).includes(index)
                                                    ? 'bg-primary-500'
                                                    : `${theme.input}`
                                            }`}
                                        >
                                            <Text className={`font-montserrat-medium ${
                                                (habit.specific_days || []).includes(index)
                                                    ? 'text-white'
                                                    : theme.text
                                            }`}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </FormField>
                        )}

                        {habit.frequency_type === 'X_TIMES_WEEK' && (
                            <FormField label="Times per Week" required>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(habit.frequency_value || '')}
                                        onChangeText={(text) => {
                                            const value = parseInt(text);
                                            if (!isNaN(value) && value > 0 && value <= 7) {
                                                handleInputChange('frequency_value', value);
                                            } else if (text === '') {
                                                handleInputChange('frequency_value', '');
                                            }
                                        }}
                                        keyboardType="numeric"
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
                                    />
                                    <Text className={`ml-3 font-montserrat ${theme.text}`}>
                                        times per week
                                    </Text>
                                </View>
                            </FormField>
                        )}

                        {habit.frequency_type === 'INTERVAL' && (
                            <FormField label="Every X Days" required>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(habit.frequency_value || '')}
                                        onChangeText={(text) => {
                                            const value = parseInt(text);
                                            if (!isNaN(value) && value > 0) {
                                                handleInputChange('frequency_value', value);
                                            } else if (text === '') {
                                                handleInputChange('frequency_value', '');
                                            }
                                        }}
                                        keyboardType="numeric"
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
                                    />
                                    <Text className={`ml-3 font-montserrat ${theme.text}`}>
                                        days
                                    </Text>
                                </View>
                            </FormField>
                        )}<FormField label="Start Date">
                        <TouchableOpacity
                            onPress={() => setShowStartDatePicker(true)}
                            className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}
                        >
                            <View className="flex-row items-center">
                                <Calendar size={18} className={`mr-2 ${theme.textSecondary}`} />
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {habit.start_date
                                        ? typeof habit.start_date === 'string'
                                            ? habit.start_date
                                            : formatDate(habit.start_date)
                                        : 'Select start date'}
                                </Text>
                            </View>
                            <ChevronRight size={18} className={theme.textMuted} />
                        </TouchableOpacity>
                    </FormField>

                        <FormField label="End Date">
                            <View className="flex-row justify-between items-center mb-2">
                                <Text className={`text-sm font-montserrat ${theme.textMuted}`}>
                                    Set an end date (optional)
                                </Text>
                                <Switch
                                    value={!!habit.end_date}
                                    onValueChange={(value) => {
                                        handleInputChange('end_date', value ? new Date() : null);
                                    }}
                                    trackColor={{ false: isDarkMode ? '#374151' : '#D1D5DB', true: '#22C55E' }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>

                            {habit.end_date && (
                                <TouchableOpacity
                                    onPress={() => setShowEndDatePicker(true)}
                                    className={`flex-row justify-between items-center px-3 py-2.5 rounded-lg ${theme.input}`}
                                >
                                    <View className="flex-row items-center">
                                        <Calendar size={18} className={`mr-2 ${theme.textSecondary}`} />
                                        <Text className={`font-montserrat ${theme.text}`}>
                                            {typeof habit.end_date === 'string'
                                                ? habit.end_date
                                                : formatDate(habit.end_date)}
                                        </Text>
                                    </View>
                                    <ChevronRight size={18} className={theme.textMuted} />
                                </TouchableOpacity>
                            )}
                        </FormField>

                        <FormField label="Reminders">
                            {(habit.reminders || []).length > 0 ? (
                                <View className="mb-3">
                                    {(habit.reminders || []).map((reminder, index) => (
                                        <View
                                            key={index}
                                            className={`mb-2 p-3 rounded-lg border ${theme.border} flex-row justify-between items-center`}
                                        >
                                            <View className="flex-row items-center">
                                                <Bell size={18} className={`mr-2 ${reminder.is_enabled ? 'text-primary-500' : theme.textSecondary}`} />
                                                <Text className={`font-montserrat ${theme.text}`}>
                                                    {formatTime(reminder.time)}
                                                </Text>
                                            </View>

                                            <View className="flex-row items-center">
                                                <Switch
                                                    value={reminder.is_enabled !== false}
                                                    onValueChange={() => toggleReminderEnabled(index)}
                                                    trackColor={{ false: isDarkMode ? '#374151' : '#D1D5DB', true: '#22C55E' }}
                                                    thumbColor="#FFFFFF"
                                                    style={{ marginRight: 8 }}
                                                />

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedReminderIndex(index);
                                                        setShowTimePicker(true);
                                                    }}
                                                    className="p-1 mr-1"
                                                >
                                                    <Clock size={16} className="text-primary-500" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => removeReminder(index)}
                                                    className="p-1"
                                                >
                                                    <X size={16} className="text-red-500" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className={`px-3 py-2.5 rounded-lg mb-2 ${theme.input}`}>
                                    <Text className={`text-center font-montserrat ${theme.textMuted}`}>
                                        No reminders set
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => {
                                    setSelectedReminderIndex((habit.reminders || []).length);
                                    setShowTimePicker(true);
                                }}
                                className={`flex-row items-center justify-center py-2 px-3 rounded-lg border ${theme.border} border-dashed`}
                            >
                                <Plus size={18} className="text-primary-500 mr-2" />
                                <Text className="text-primary-500 font-montserrat-medium">
                                    Add Reminder
                                </Text>
                            </TouchableOpacity>
                        </FormField>
                    </FormSection>
                )}

                {/* Tracking Section */}
                {activeSection === "tracking" && (
                    <FormSection title="Tracking Method">
                        <FormField label="How would you like to track this habit?">
                            <View className={`p-3 rounded-lg border ${theme.border} mb-4`}>
                                <TouchableOpacity
                                    onPress={() => setShowTrackingPicker(true)}
                                    className="flex-row justify-between items-center"
                                >
                                    <View className="flex-row items-center">
                                        {TRACKING_TYPES.find(t => t.value === habit.tracking_type)?.icon}
                                        <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                            {TRACKING_TYPES.find(t => t.value === habit.tracking_type)?.label || 'Yes/No Completion'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={18} className={theme.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <Text className={`text-sm font-montserrat mb-4 ${theme.textMuted}`}>
                                {habit.tracking_type === 'BOOLEAN' && 'Simply mark the habit as complete when you finish it.'}
                                {habit.tracking_type === 'DURATION' && 'Track how much time you spend on this habit.'}
                                {habit.tracking_type === 'COUNT' && 'Track how many times or units you complete.'}
                                {habit.tracking_type === 'NUMERIC' && 'Track a specific value with custom units.'}
                            </Text>
                        </FormField>

                        {/* Target value fields based on tracking type */}
                        {habit.tracking_type === 'DURATION' && (
                            <FormField label="Duration Goal" required>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(habit.target_duration || '')}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text);
                                            if (!isNaN(value) && value > 0) {
                                                handleInputChange('target_duration', value);
                                            } else if (text === '') {
                                                handleInputChange('target_duration', '');
                                            }
                                        }}
                                        keyboardType="numeric"
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-24 text-center`}
                                        placeholder="0"
                                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                    />
                                    <Text className={`ml-3 font-montserrat ${theme.text}`}>
                                        minutes
                                    </Text>
                                </View>
                            </FormField>
                        )}

                        {habit.tracking_type === 'COUNT' && (
                            <FormField label="Count Goal" required>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(habit.target_value || '')}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text);
                                            if (!isNaN(value) && value > 0) {
                                                handleInputChange('target_value', value);
                                            } else if (text === '') {
                                                handleInputChange('target_value', '');
                                            }
                                        }}
                                        keyboardType="numeric"
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-24 text-center`}
                                        placeholder="0"
                                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                    />
                                    <Text className={`ml-3 font-montserrat ${theme.text}`}>
                                        count
                                    </Text>
                                </View>
                            </FormField>
                        )}

                        {habit.tracking_type === 'NUMERIC' && (
                            <FormField label="Value Goal" required>
                                <View className="flex-row items-center">
                                    <TextInput
                                        value={String(habit.target_value || '')}
                                        onChangeText={(text) => {
                                            const value = parseFloat(text);
                                            if (!isNaN(value) && value > 0) {
                                                handleInputChange('target_value', value);
                                            } else if (text === '') {
                                                handleInputChange('target_value', '');
                                            }
                                        }}
                                        keyboardType="numeric"
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-24 text-center mr-2`}
                                        placeholder="0"
                                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                    />

                                    <TextInput
                                        value={habit.units || ''}
                                        onChangeText={(text) => handleInputChange('units', text)}
                                        placeholder="units"
                                        placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                        className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} flex-1`}
                                    />
                                </View>
                            </FormField>
                        )}

                        <FormField label="Points">
                            <View className="flex-row items-center">
                                <TextInput
                                    value={String(habit.points_per_completion || '')}
                                    onChangeText={(text) => {
                                        const value = parseInt(text);
                                        if (!isNaN(value) && value >= 0) {
                                            handleInputChange('points_per_completion', value);
                                        } else if (text === '') {
                                            handleInputChange('points_per_completion', '');
                                        }
                                    }}
                                    keyboardType="numeric"
                                    className={`px-3 py-2.5 rounded-lg ${theme.input} font-montserrat ${theme.text} w-24 text-center`}
                                    placeholder="5"
                                    placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                                />
                                <Text className={`ml-3 font-montserrat ${theme.text}`}>
                                    points per completion
                                </Text>
                            </View>
                        </FormField>
                    </FormSection>
                )}

                {/* Advanced Options Section */}
                {activeSection === "more" && (
                    <FormSection title="Advanced Options">
                        <FormField label="Streak Protection">
                            <View className={`p-3 rounded-lg border ${theme.border} mb-2`}>
                                <View className="flex-row justify-between items-center">
                                    <View className="flex-row items-center">
                                        <Shield size={18} className={`mr-2 ${theme.textSecondary}`} />
                                        <Text className={`font-montserrat ${theme.text}`}>
                                            Enable Grace Period
                                        </Text>
                                    </View>
                                    <Switch
                                        value={habit.grace_period_enabled}
                                        onValueChange={(value) => handleInputChange('grace_period_enabled', value)}
                                        trackColor={{ false: isDarkMode ? '#374151' : '#D1D5DB', true: '#22C55E' }}
                                        thumbColor="#FFFFFF"
                                    />
                                </View>

                                <Text className={`mt-1 text-xs font-montserrat ${theme.textMuted}`}>
                                    Allows you to complete the habit later without breaking your streak
                                </Text>

                                {habit.grace_period_enabled && (
                                    <View className="mt-3 flex-row items-center">
                                        <TextInput
                                            value={String(habit.grace_period_hours || '')}
                                            onChangeText={(text) => {
                                                const value = parseInt(text);
                                                if (!isNaN(value) && value > 0) {
                                                    handleInputChange('grace_period_hours', value);
                                                } else if (text === '') {
                                                    handleInputChange('grace_period_hours', '');
                                                }
                                            }}
                                            keyboardType="numeric"
                                            className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} font-montserrat ${theme.text} w-16 text-center border ${theme.border}`}
                                        />
                                        <Text className={`ml-2 font-montserrat ${theme.text}`}>hours</Text>
                                    </View>
                                )}
                            </View>
                        </FormField>
                    </FormSection>
                )}

                <View className="h-20" />
            </ScrollView>

            {/* Modals */}
            {renderDatePicker()}

            <DropdownPicker
                visible={showDomainPicker}
                title="Select Domain"
                options={[
                    ...domains.map(domain => ({
                        label: domain.name,
                        value: domain.domain_id,
                        icon: (
                            <View
                                className="w-5 h-5 rounded-full mr-2"
                                style={{ backgroundColor: domain.color || '#22C55E' }}
                            />
                        )
                    })),
                    { label: 'Clear Selection', value: 'clear' }
                ]}
                onSelect={(option) => {
                    if (option.value === 'clear') {
                        clearDomain();
                    } else {
                        selectDomain(domains.find(d => d.domain_id === option.value));
                    }
                }}
                onClose={() => setShowDomainPicker(false)}
            />

            <DropdownPicker
                visible={showFrequencyPicker}
                title="Select Frequency"
                options={FREQUENCY_TYPES.map(type => ({
                    label: type.label,
                    value: type.value
                }))}
                onSelect={(option) => {
                    handleInputChange('frequency_type', option.value);
                    setShowFrequencyPicker(false);
                }}
                onClose={() => setShowFrequencyPicker(false)}
            />

            <DropdownPicker
                visible={showDifficultyPicker}
                title="Select Difficulty"
                options={DIFFICULTY_LEVELS.map(level => ({
                    label: level.label,
                    value: level.value
                }))}
                onSelect={(option) => {
                    handleInputChange('difficulty', option.value);
                    setShowDifficultyPicker(false);
                }}
                onClose={() => setShowDifficultyPicker(false)}
            />

            <DropdownPicker
                visible={showTrackingPicker}
                title="Select Tracking Method"
                options={TRACKING_TYPES.map(type => ({
                    label: type.label,
                    value: type.value,
                    icon: type.icon
                }))}
                onSelect={(option) => {
                    handleInputChange('tracking_type', option.value);
                    setShowTrackingPicker(false);
                }}
                onClose={() => setShowTrackingPicker(false)}
            />
        </View>
    );
};

export default ModernHabitForm;