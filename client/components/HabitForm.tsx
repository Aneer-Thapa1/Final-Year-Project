import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
    Switch,
    ActivityIndicator,
    Modal,
    FlatList,
    Keyboard,
    TouchableWithoutFeedback
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
    MapPin,
    BookOpen,
    Link,
    Zap
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { getAllHabitDomains } from '../services/habitService';

const HabitForm = ({ initialData, onSubmit, onCancel, isEditMode = false }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Default habit state aligned with backend controller
    const defaultHabitState = {
        name: "",
        description: "",
        icon: null,
        color: null,
        start_date: new Date(),
        end_date: null,
        is_favorite: false,

        // Frequency fields
        frequency_type: "DAILY",
        frequency_value: 1,
        frequency_interval: 1,
        custom_frequency: null,
        specific_days: [],

        // Tracking fields
        tracking_type: "BOOLEAN",
        duration_goal: null,
        count_goal: null,
        numeric_goal: null,
        units: null,

        // Advanced options
        skip_on_vacation: false,
        require_evidence: false,
        location_based: false,
        location_name: null,
        location_lat: null,
        location_lng: null,
        location_radius: null,

        // Motivation
        motivation_quote: null,
        external_resource_url: null,
        tags: [],
        cue: null,
        reward: null,

        // Other fields
        difficulty: "MEDIUM",
        domain_id: null,

        // Streak protection
        grace_period_enabled: true,
        grace_period_hours: 24,

        // Points system
        points_per_completion: 5,
        bonus_points_streak: 1,

        // Reminders
        reminders: []
    };

    // Form state - Ensure initial tags are properly initialized as an array
    const [habit, setHabit] = useState(() => {
        // Make sure we have a proper initialData object
        const data = initialData || defaultHabitState;

        // Ensure tags is always an array
        return {
            ...data,
            tags: Array.isArray(data.tags) ? data.tags : [],
            specific_days: Array.isArray(data.specific_days) ? data.specific_days : [],
            reminders: Array.isArray(data.reminders) ? data.reminders : []
        };
    });

    const [domains, setDomains] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeSection, setActiveSection] = useState("basic");
    const [error, setError] = useState(null);

    // UI state for pickers
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
    const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
    const [showTrackingPicker, setShowTrackingPicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedReminderIndex, setSelectedReminderIndex] = useState(null);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTagsModal, setShowTagsModal] = useState(false);
    const [newTag, setNewTag] = useState('');

    // Constants for form options
    const FREQUENCY_TYPES = [
        { label: 'Every Day', value: 'DAILY' },
        { label: 'Weekdays Only', value: 'WEEKDAYS' },
        { label: 'Weekends Only', value: 'WEEKENDS' },
        { label: 'Specific Days', value: 'SPECIFIC_DAYS' },
        { label: 'X Times per Week', value: 'X_TIMES_WEEK' },
        { label: 'Every X Days', value: 'INTERVAL' },
        { label: 'Custom', value: 'CUSTOM' }
    ];

    const DIFFICULTY_LEVELS = [
        { label: 'Very Easy', value: 'VERY_EASY' },
        { label: 'Easy', value: 'EASY' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Hard', value: 'HARD' },
        { label: 'Very Hard', value: 'VERY_HARD' }
    ];

    const TRACKING_TYPES = [
        { label: 'Yes/No Completion', value: 'BOOLEAN', icon: <Check size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Duration Tracking', value: 'DURATION', icon: <Clock size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Count Tracking', value: 'COUNT', icon: <Tag size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Numeric Value', value: 'NUMERIC', icon: <Info size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> }
    ];

    const ICON_OPTIONS = [
        { label: 'Check', value: 'check', icon: <Check size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Clock', value: 'clock', icon: <Clock size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Book', value: 'book', icon: <BookOpen size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Star', value: 'star', icon: <Star size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Map Pin', value: 'map-pin', icon: <MapPin size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        { label: 'Lightning', value: 'zap', icon: <Zap size={20} color={isDark ? '#d1d5db' : '#4b5563'} /> },
        // Add more icon options as needed
    ];

    const COLOR_OPTIONS = [
        { label: 'Green', value: '#10b981' }, // Tailwind green-500
        { label: 'Blue', value: '#3b82f6' },  // Tailwind blue-500
        { label: 'Purple', value: '#8b5cf6' }, // Tailwind purple-500
        { label: 'Red', value: '#ef4444' },   // Tailwind red-500
        { label: 'Yellow', value: '#f59e0b' }, // Tailwind yellow-500
        { label: 'Pink', value: '#ec4899' },  // Tailwind pink-500
        { label: 'Gray', value: '#6b7280' },  // Tailwind gray-500
    ];

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

        // Log initial data for debugging - using console.log instead of console.table
        if (initialData) {
            console.log("Initial habit form data:", initialData);
        }
    }, []);

    // Function to dismiss keyboard
    const dismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Handle input changes
    const handleInputChange = (field, value) => {
        setHabit(prev => ({ ...prev, [field]: value }));
    };

    // Format date for display
    const formatDate = (date) => {
        if (!date) return '';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return format(dateObj, 'yyyy-MM-dd');
    };

    // Format time for display
    const formatTime = (timeString) => {
        if (!timeString) return '';
        if (timeString.includes('T')) {
            return format(new Date(timeString), 'HH:mm');
        } else {
            return timeString.substring(0, 5);
        }
    };

    // Handle date changes
    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android' && event.type === 'dismissed') {
            setShowStartDatePicker(false);
            setShowEndDatePicker(false);
            return;
        }

        if (selectedDate) {
            if (showStartDatePicker) {
                handleInputChange('start_date', selectedDate);
            } else if (showEndDatePicker) {
                handleInputChange('end_date', selectedDate);
            }
        }

        // Always close pickers on both platforms
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
    };

    // Toggle specific day for weekly habits
    const toggleSpecificDay = (day) => {
        const updatedDays = [...(habit.specific_days || [])];
        const index = updatedDays.indexOf(day);

        if (index !== -1) {
            updatedDays.splice(index, 1);
        } else {
            updatedDays.push(day);
        }

        handleInputChange('specific_days', updatedDays);
    };

    // Handle form submission
    const handleSubmit = () => {
        // Dismiss keyboard first
        dismissKeyboard();

        // Validate form
        if (!habit.name.trim()) {
            setError('Habit name is required');
            return;
        }

        if (!habit.domain_id) {
            setError('Domain is required');
            return;
        }

        // Validate tracking type-specific fields
        if (habit.tracking_type === 'DURATION' && !habit.duration_goal) {
            setError('Duration goal is required');
            return;
        }

        if (habit.tracking_type === 'COUNT' && !habit.count_goal) {
            setError('Count goal is required');
            return;
        }

        if (habit.tracking_type === 'NUMERIC' && (!habit.numeric_goal || !habit.units)) {
            setError('Numeric goal and units are required');
            return;
        }

        setIsSubmitting(true);

        // Prepare data for submission - aligning with backend
        const formData = {
            ...habit,
            start_date: habit.start_date instanceof Date ? formatDate(habit.start_date) : habit.start_date,
            end_date: habit.end_date ? (habit.end_date instanceof Date ? formatDate(habit.end_date) : habit.end_date) : null,
            // Ensure tags is always an array
            tags: Array.isArray(habit.tags) ? habit.tags : [],
            // Ensure specific_days is always an array
            specific_days: Array.isArray(habit.specific_days) ? habit.specific_days : [],
            // Ensure reminders is always an array
            reminders: Array.isArray(habit.reminders) ? habit.reminders : []
        };

        // Call the onSubmit callback
        onSubmit(formData);
        setIsSubmitting(false);
    };

    // Handle adding a reminder
    const addReminder = (time) => {
        const newReminder = {
            time: time ? format(time, 'HH:mm:00') : '09:00:00',
            repeat: 'DAILY',
            message: `Time to complete: ${habit.name}`,
            is_enabled: true,
            pre_notification_minutes: 10,
            follow_up_enabled: true,
            follow_up_minutes: 30
        };

        setHabit(prev => ({
            ...prev,
            reminders: [...(prev.reminders || []), newReminder]
        }));
    };

    // Handle reminder time change
    const handleTimeChange = (event, selectedTime) => {
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
                    is_enabled: true,
                    pre_notification_minutes: 10,
                    follow_up_enabled: true,
                    follow_up_minutes: 30
                });
            }

            setHabit(prev => ({ ...prev, reminders: updatedReminders }));
        }

        // Always close picker
        setShowTimePicker(false);
    };

    // Handle removing a reminder
    const removeReminder = (index) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders.splice(index, 1);
        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Toggle reminder enable/disable
    const toggleReminderEnabled = (index) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders[index] = {
            ...updatedReminders[index],
            is_enabled: !updatedReminders[index].is_enabled
        };

        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Handle adding a new tag
    const addTag = () => {
        if (newTag.trim()) {
            const updatedTags = Array.isArray(habit.tags) ? [...habit.tags] : [];
            updatedTags.push(newTag.trim());
            setHabit(prev => ({ ...prev, tags: updatedTags }));
            setNewTag('');
        }
    };

    // Handle removing a tag
    const removeTag = (index) => {
        if (!Array.isArray(habit.tags)) {
            setHabit(prev => ({ ...prev, tags: [] }));
            return;
        }

        const updatedTags = [...habit.tags];
        updatedTags.splice(index, 1);
        setHabit(prev => ({ ...prev, tags: updatedTags }));
    };

    // Select a domain
    const selectDomain = (domain) => {
        handleInputChange('domain_id', domain.value);
        setShowDomainPicker(false);
    };

    // Dropdown Modal Component
    const DropdownModal = ({ visible, title, options, onSelect, onClose, withIcon = false, withColor = false }) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                className="flex-1 justify-center bg-black/50 p-4"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <View className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <Text className={`text-base font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {title}
                        </Text>
                    </View>
                    <FlatList
                        data={options}
                        keyExtractor={(item, index) => `${item.value}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className={`flex-row items-center p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                                onPress={() => onSelect(item)}
                            >
                                {withIcon && item.icon && (
                                    <View className="mr-2">
                                        {item.icon}
                                    </View>
                                )}
                                {withColor && (
                                    <View
                                        style={{ backgroundColor: item.value }}
                                        className="w-10 h-10 rounded-full mr-2"
                                    />
                                )}
                                <Text className={`text-base font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // Tags Modal Component
    const TagsModal = ({ visible, onClose }) => (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                className="flex-1 justify-center bg-black/50 p-4"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <View className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <Text className={`text-base font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Manage Tags
                        </Text>
                    </View>
                    <View className="p-4">
                        <View className="flex-row flex-wrap mt-2 gap-2">
                            {Array.isArray(habit.tags) && habit.tags.map((tag, index) => (
                                <View
                                    key={index}
                                    className={`flex-row items-center rounded-full px-3 py-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                >
                                    <Text className={`mr-1 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {tag}
                                    </Text>
                                    <TouchableOpacity onPress={() => removeTag(index)}>
                                        <X size={14} color={isDark ? '#d1d5db' : '#4b5563'} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View className="flex-row items-center mt-3">
                            <TextInput
                                value={newTag}
                                onChangeText={setNewTag}
                                placeholder="Add new tag"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                className={`flex-1 px-3 py-2 rounded-lg mr-2 font-montserrat ${
                                    isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                                onSubmitEditing={addTag}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                className="bg-green-500 rounded-lg px-3 py-2"
                                onPress={addTag}
                            >
                                <Text className="text-white font-montserrat-medium">Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // Render date picker
    const renderDatePicker = () => {
        if (!showStartDatePicker && !showEndDatePicker && !showTimePicker) {
            return null;
        }

        let currentDate = new Date();
        let mode = 'date';

        if (showStartDatePicker) {
            currentDate = habit.start_date instanceof Date ? habit.start_date : new Date(habit.start_date);
        } else if (showEndDatePicker) {
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

        // For iOS, use a modal wrapper with Done button
        if (Platform.OS === 'ios') {
            return (
                <Modal
                    transparent={true}
                    visible={true}
                    animationType="slide"
                >
                    <View className="flex-1 justify-end bg-black/50">
                        <View className={`rounded-t-xl p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            <View className="flex-row justify-between items-center mb-2">
                                <TouchableOpacity onPress={() => {
                                    setShowStartDatePicker(false);
                                    setShowEndDatePicker(false);
                                    setShowTimePicker(false);
                                }}>
                                    <Text className="text-green-500 text-base font-montserrat-medium">Cancel</Text>
                                </TouchableOpacity>
                                <Text className={`text-base font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {showTimePicker ? 'Select Time' : 'Select Date'}
                                </Text>
                                <TouchableOpacity onPress={() => {
                                    // Apply the current date/time value
                                    if (showTimePicker) {
                                        handleTimeChange({}, currentDate);
                                    } else {
                                        handleDateChange({}, currentDate);
                                    }
                                }}>
                                    <Text className="text-green-500 text-base font-montserrat-medium">Done</Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={currentDate}
                                mode={mode}
                                display="spinner"
                                onChange={onChange}
                                textColor={isDark ? 'white' : 'black'}
                                style={{ height: 200 }}
                            />
                        </View>
                    </View>
                </Modal>
            );
        }

        // For Android, use the standard picker
        return (
            <DateTimePicker
                value={currentDate}
                mode={mode}
                display="default"
                onChange={onChange}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
                <View className="flex-1">
                    {/* Header */}
                    <View className={`flex-row justify-between items-center px-4 py-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                        <TouchableOpacity
                            onPress={onCancel}
                            className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                        >
                            <X size={20} color={isDark ? '#f9fafb' : '#111827'} />
                        </TouchableOpacity>

                        <Text className={`text-lg font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isEditMode ? 'Edit Habit' : 'New Habit'}
                        </Text>

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-500 px-4 py-1.5 rounded-full"
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
                        <View className={`mx-4 my-2 p-3 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-500/10'}`}>
                            <Text className="text-red-500 font-montserrat">{error}</Text>
                        </View>
                    )}

                    {/* Tabs */}
                    <View className="flex-row px-4 py-3 gap-2">
                        <TouchableOpacity
                            className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${
                                activeSection === "basic"
                                    ? `border-green-500 ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`
                                    : `${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`
                            }`}
                            onPress={() => setActiveSection("basic")}
                        >
                            <Info size={18} color={activeSection === "basic" ? '#10b981' : isDark ? '#9ca3af' : '#6b7280'} />
                            <Text className={`mt-1 text-xs font-montserrat-medium ${
                                activeSection === "basic" ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Basics
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${
                                activeSection === "schedule"
                                    ? `border-green-500 ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`
                                    : `${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`
                            }`}
                            onPress={() => setActiveSection("schedule")}
                        >
                            <CalendarCheck size={18} color={activeSection === "schedule" ? '#10b981' : isDark ? '#9ca3af' : '#6b7280'} />
                            <Text className={`mt-1 text-xs font-montserrat-medium ${
                                activeSection === "schedule" ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Schedule
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${
                                activeSection === "tracking"
                                    ? `border-green-500 ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`
                                    : `${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`
                            }`}
                            onPress={() => setActiveSection("tracking")}
                        >
                            <Check size={18} color={activeSection === "tracking" ? '#10b981' : isDark ? '#9ca3af' : '#6b7280'} />
                            <Text className={`mt-1 text-xs font-montserrat-medium ${
                                activeSection === "tracking" ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Tracking
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-1 items-center justify-center py-2.5 rounded-lg border ${
                                activeSection === "more"
                                    ? `border-green-500 ${isDark ? 'bg-green-500/20' : 'bg-green-500/10'}`
                                    : `${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`
                            }`}
                            onPress={() => setActiveSection("more")}
                        >
                            <Shield size={18} color={activeSection === "more" ? '#10b981' : isDark ? '#9ca3af' : '#6b7280'} />
                            <Text className={`mt-1 text-xs font-montserrat-medium ${
                                activeSection === "more" ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                More
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        className="flex-1 px-4"
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Basic Information Section */}
                        {activeSection === "basic" && (
                            <View>
                                <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Basic Information
                                </Text>

                                {/* Habit Name */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Habit Name
                                        </Text>
                                        <Text className="text-red-500 ml-1">*</Text>
                                    </View>
                                    <TextInput
                                        value={habit.name}
                                        onChangeText={(text) => handleInputChange('name', text)}
                                        placeholder="What habit do you want to build?"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        className={`p-3 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        onSubmitEditing={dismissKeyboard}
                                        returnKeyType="done"
                                    />
                                </View>

                                {/* Description */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Description
                                    </Text>
                                    <TextInput
                                        value={habit.description}
                                        onChangeText={(text) => handleInputChange('description', text)}
                                        placeholder="Why is this habit important to you?"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        multiline
                                        numberOfLines={3}
                                        className={`p-3 rounded-xl font-montserrat min-h-[100px] ${
                                            isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* Domain/Category */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Domain/Category
                                        </Text>
                                        <Text className="text-red-500 ml-1">*</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setShowDomainPicker(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            {habit.domain_id && domains.find(d => d.domain_id === habit.domain_id) ? (
                                                <>
                                                    <View
                                                        style={{
                                                            backgroundColor: domains.find(d => d.domain_id === habit.domain_id).color || '#10b981'
                                                        }}
                                                        className="w-4 h-4 rounded-full mr-2"
                                                    />
                                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {domains.find(d => d.domain_id === habit.domain_id).name}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text className={`font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Select a domain
                                                </Text>
                                            )}
                                        </View>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Icon Selection */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Icon
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowIconPicker(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            {habit.icon ? (
                                                <>
                                                    {ICON_OPTIONS.find(i => i.value === habit.icon)?.icon ||
                                                        <Info size={20} color={isDark ? '#d1d5db' : '#4b5563'} />}
                                                    <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {ICON_OPTIONS.find(i => i.value === habit.icon)?.label || 'Custom Icon'}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text className={`font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Choose an icon (optional)
                                                </Text>
                                            )}
                                        </View>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Color Selection */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Color
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowColorPicker(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            {habit.color ? (
                                                <>
                                                    <View
                                                        style={{ backgroundColor: habit.color }}
                                                        className="w-4 h-4 rounded-full mr-2"
                                                    />
                                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {COLOR_OPTIONS.find(c => c.value === habit.color)?.label || 'Custom Color'}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text className={`font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    Choose a color (optional)
                                                </Text>
                                            )}
                                        </View>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Difficulty */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Difficulty
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDifficultyPicker(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {DIFFICULTY_LEVELS.find(d => d.value === habit.difficulty)?.label || 'Medium'}
                                        </Text>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Motivation Quote */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Motivation Quote
                                    </Text>
                                    <TextInput
                                        value={habit.motivation_quote || ''}
                                        onChangeText={(text) => handleInputChange('motivation_quote', text)}
                                        placeholder="Why do you want to build this habit? This will be shown as motivation."
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        className={`p-3 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        multiline
                                        numberOfLines={2}
                                    />
                                </View>

                                {/* Add to Favorites */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Add to Favorites
                                    </Text>
                                    <View className={`flex-row justify-between items-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}>
                                        <View className="flex-row items-center">
                                            <Star
                                                size={18}
                                                color={habit.is_favorite ? '#fbbf24' : isDark ? '#9ca3af' : '#6b7280'}
                                                fill={habit.is_favorite ? '#fbbf24' : 'none'}
                                            />
                                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Show in favorites tab
                                            </Text>
                                        </View>
                                        <Switch
                                            value={habit.is_favorite}
                                            onValueChange={(value) => handleInputChange('is_favorite', value)}
                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Schedule Section */}
                        {activeSection === "schedule" && (
                            <View>
                                <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Scheduling & Frequency
                                </Text>

                                {/* Frequency */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Frequency
                                        </Text>
                                        <Text className="text-red-500 ml-1">*</Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setShowFrequencyPicker(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {FREQUENCY_TYPES.find(t => t.value === habit.frequency_type)?.label || 'Every Day'}
                                        </Text>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* Specific frequency options based on type */}
                                {habit.frequency_type === 'SPECIFIC_DAYS' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Select Days
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row justify-between py-2">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => toggleSpecificDay(index)}
                                                    className={`w-10 h-10 rounded-full items-center justify-center ${
                                                        habit.specific_days.includes(index)
                                                            ? 'bg-green-500'
                                                            : isDark ? 'bg-gray-800' : 'bg-gray-100'
                                                    }`}
                                                >
                                                    <Text className={`font-montserrat-medium ${
                                                        habit.specific_days.includes(index)
                                                            ? 'text-white'
                                                            : isDark ? 'text-white' : 'text-gray-900'
                                                    }`}>
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* X Times per Week */}
                                {habit.frequency_type === 'X_TIMES_WEEK' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Times per Week
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <TextInput
                                                value={String(habit.frequency_value || '')}
                                                onChangeText={(text) => {
                                                    const value = parseInt(text);
                                                    if (!isNaN(value) && value > 0 && value <= 7) {
                                                        handleInputChange('frequency_value', value);
                                                        handleInputChange('frequency_interval', 7); // Set interval for weekly
                                                    } else if (text === '') {
                                                        handleInputChange('frequency_value', '');
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                className={`w-20 text-center p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                times per week
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Every X Days */}
                                {habit.frequency_type === 'INTERVAL' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Every X Days
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <TextInput
                                                value={String(habit.frequency_interval || '')}
                                                onChangeText={(text) => {
                                                    const value = parseInt(text);
                                                    if (!isNaN(value) && value > 0) {
                                                        handleInputChange('frequency_interval', value);
                                                        handleInputChange('frequency_value', 1); // Set value for interval
                                                    } else if (text === '') {
                                                        handleInputChange('frequency_interval', '');
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                className={`w-20 text-center p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                days
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Start Date */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Start Date
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            dismissKeyboard();
                                            setShowStartDatePicker(true);
                                        }}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            <Calendar size={18} className="mr-2" color={isDark ? '#d1d5db' : '#4b5563'} />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {habit.start_date
                                                    ? typeof habit.start_date === 'string'
                                                        ? habit.start_date
                                                        : formatDate(habit.start_date)
                                                    : 'Select start date'}
                                            </Text>
                                        </View>
                                        <ChevronRight size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                </View>

                                {/* End Date */}
                                <View className="mb-4">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            End Date
                                        </Text>
                                        <Switch
                                            value={!!habit.end_date}
                                            onValueChange={(value) => {
                                                handleInputChange('end_date', value ? new Date() : null);
                                            }}
                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>

                                    {habit.end_date && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                dismissKeyboard();
                                                setShowEndDatePicker(true);
                                            }}
                                            className={`flex-row justify-between items-center p-3 rounded-xl ${
                                                isDark ? 'bg-gray-800' : 'bg-gray-100'
                                            }`}
                                        >
                                            <View className="flex-row items-center">
                                                <Calendar size={18} className="mr-2" color={isDark ? '#d1d5db' : '#4b5563'} />
                                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {typeof habit.end_date === 'string'
                                                        ? habit.end_date
                                                        : formatDate(habit.end_date)}
                                                </Text>
                                            </View>
                                            <ChevronRight size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Skip on Vacation */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Skip on Vacation
                                    </Text>
                                    <View className={`flex-row justify-between items-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}>
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Automatically skip when on vacation
                                        </Text>
                                        <Switch
                                            value={habit.skip_on_vacation}
                                            onValueChange={(value) => handleInputChange('skip_on_vacation', value)}
                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                </View>

                                {/* Reminders */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Reminders
                                    </Text>

                                    {(habit.reminders || []).length > 0 ? (
                                        <View className="mb-3">
                                            {(habit.reminders || []).map((reminder, index) => (
                                                <View
                                                    key={index}
                                                    className={`flex-row justify-between items-center p-3 rounded-xl mb-2 ${
                                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                                    }`}
                                                >
                                                    <View className="flex-row items-center">
                                                        <Bell
                                                            size={18}
                                                            className="mr-2"
                                                            color={reminder.is_enabled ? '#10b981' : isDark ? '#d1d5db' : '#4b5563'}
                                                        />
                                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                            {formatTime(reminder.time)}
                                                        </Text>
                                                    </View>

                                                    <View className="flex-row items-center gap-2">
                                                        <Switch
                                                            value={reminder.is_enabled !== false}
                                                            onValueChange={() => toggleReminderEnabled(index)}
                                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                                            thumbColor="#FFFFFF"
                                                            style={{ marginRight: 4 }}
                                                        />

                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                dismissKeyboard();
                                                                setSelectedReminderIndex(index);
                                                                setShowTimePicker(true);
                                                            }}
                                                            className="p-1"
                                                        >
                                                            <Clock size={16} color="#10b981" />
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            onPress={() => removeReminder(index)}
                                                            className="p-1"
                                                        >
                                                            <X size={16} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View className={`items-center py-4 rounded-xl mb-3 ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}>
                                            <Text className={`font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                No reminders set
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => {
                                            dismissKeyboard();
                                            setSelectedReminderIndex((habit.reminders || []).length);
                                            setShowTimePicker(true);
                                        }}
                                        className={`flex-row items-center justify-center p-3 rounded-xl border border-dashed ${
                                            isDark ? 'border-gray-600' : 'border-gray-400'
                                        }`}
                                    >
                                        <Plus size={18} color="#10b981" />
                                        <Text className="ml-2 text-green-500 font-montserrat-medium">
                                            Add Reminder
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Tracking Section */}
                        {activeSection === "tracking" && (
                            <View>
                                <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Tracking Method
                                </Text>

                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        How would you like to track this habit?
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            dismissKeyboard();
                                            setShowTrackingPicker(true);
                                        }}
                                        className={`flex-row justify-between items-center p-3 rounded-xl mb-3 ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            {TRACKING_TYPES.find(t => t.value === habit.tracking_type)?.icon}
                                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {TRACKING_TYPES.find(t => t.value === habit.tracking_type)?.label || 'Yes/No Completion'}
                                            </Text>
                                        </View>
                                        <ChevronDown size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>

                                    <Text className={`text-sm font-montserrat mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {habit.tracking_type === 'BOOLEAN' && 'Simply mark the habit as complete when you finish it.'}
                                        {habit.tracking_type === 'DURATION' && 'Track how much time you spend on this habit.'}
                                        {habit.tracking_type === 'COUNT' && 'Track how many times or units you complete.'}
                                        {habit.tracking_type === 'NUMERIC' && 'Track a specific value with custom units.'}
                                    </Text>
                                </View>

                                {/* Target value fields based on tracking type */}
                                {habit.tracking_type === 'DURATION' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Duration Goal
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <TextInput
                                                value={String(habit.duration_goal || '')}
                                                onChangeText={(text) => {
                                                    const value = parseFloat(text);
                                                    if (!isNaN(value) && value > 0) {
                                                        handleInputChange('duration_goal', value);
                                                    } else if (text === '') {
                                                        handleInputChange('duration_goal', '');
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                className={`w-24 text-center p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
                                                placeholder="0"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                minutes
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {habit.tracking_type === 'COUNT' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Count Goal
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <TextInput
                                                value={String(habit.count_goal || '')}
                                                onChangeText={(text) => {
                                                    const value = parseFloat(text);
                                                    if (!isNaN(value) && value > 0) {
                                                        handleInputChange('count_goal', value);
                                                    } else if (text === '') {
                                                        handleInputChange('count_goal', '');
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                className={`w-24 text-center p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                placeholder="0"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                count
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {habit.tracking_type === 'NUMERIC' && (
                                    <View className="mb-4">
                                        <View className="flex-row items-center mb-1">
                                            <Text className={`text-sm font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Value Goal
                                            </Text>
                                            <Text className="text-red-500 ml-1">*</Text>
                                        </View>
                                        <View className="flex-row items-center gap-3">
                                            <TextInput
                                                value={String(habit.numeric_goal || '')}
                                                onChangeText={(text) => {
                                                    const value = parseFloat(text);
                                                    if (!isNaN(value) && value > 0) {
                                                        handleInputChange('numeric_goal', value);
                                                    } else if (text === '') {
                                                        handleInputChange('numeric_goal', '');
                                                    }
                                                }}
                                                keyboardType="numeric"
                                                className={`w-24 text-center p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                placeholder="0"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />

                                            <TextInput
                                                value={habit.units || ''}
                                                onChangeText={(text) => handleInputChange('units', text)}
                                                placeholder="units"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                className={`flex-1 p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Require Evidence */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Require Evidence
                                    </Text>
                                    <View className={`flex-row justify-between items-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}>
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Require photo or note as evidence
                                        </Text>
                                        <Switch
                                            value={habit.require_evidence}
                                            onValueChange={(value) => handleInputChange('require_evidence', value)}
                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                </View>

                                {/* Points */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Points Per Completion
                                    </Text>
                                    <View className="flex-row items-center gap-3">
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
                                            className={`w-24 text-center p-3 rounded-xl font-montserrat ${
                                                isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                            }`}
                                            placeholder="5"
                                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                            onSubmitEditing={dismissKeyboard}
                                            returnKeyType="done"
                                        />
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            points per completion
                                        </Text>
                                    </View>
                                </View>

                                {/* Streak Bonus Points */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Streak Bonus Points
                                    </Text>
                                    <View className="flex-row items-center gap-3">
                                        <TextInput
                                            value={String(habit.bonus_points_streak || '')}
                                            onChangeText={(text) => {
                                                const value = parseInt(text);
                                                if (!isNaN(value) && value >= 0) {
                                                    handleInputChange('bonus_points_streak', value);
                                                } else if (text === '') {
                                                    handleInputChange('bonus_points_streak', '');
                                                }
                                            }}
                                            keyboardType="numeric"
                                            className={`w-24 text-center p-3 rounded-xl font-montserrat ${
                                                isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                            }`}
                                            placeholder="1"
                                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                            onSubmitEditing={dismissKeyboard}
                                            returnKeyType="done"
                                        />
                                        <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            bonus points per streak day
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Advanced Options Section */}
                        {activeSection === "more" && (
                            <View>
                                <Text className={`text-lg font-montserrat-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Advanced Options
                                </Text>

                                {/* Tags */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Tags
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowTagsModal(true)}
                                        className={`flex-row justify-between items-center p-3 rounded-xl ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-100'
                                        }`}
                                    >
                                        <View className="flex-row items-center">
                                            <Tag size={18} className="mr-2" color={isDark ? '#d1d5db' : '#4b5563'} />
                                            <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {Array.isArray(habit.tags) && habit.tags.length > 0
                                                    ? `${habit.tags.length} tag(s) selected`
                                                    : 'Add tags (optional)'}
                                            </Text>
                                        </View>
                                        <ChevronRight size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                                    </TouchableOpacity>
                                    {Array.isArray(habit.tags) && habit.tags.length > 0 && (
                                        <View className="flex-row flex-wrap mt-2 gap-2">
                                            {habit.tags.map((tag, index) => (
                                                <View key={index} className={`rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Location Based */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Location Based
                                    </Text>
                                    <View className={`flex-row justify-between items-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}>
                                        <View className="flex-row items-center">
                                            <MapPin size={18} color={isDark ? '#d1d5db' : '#4b5563'} />
                                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                Enable location-based reminders
                                            </Text>
                                        </View>
                                        <Switch
                                            value={habit.location_based}
                                            onValueChange={(value) => handleInputChange('location_based', value)}
                                            trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                </View>

                                {/* Location details - shown only when location_based is true */}
                                {habit.location_based && (
                                    <View className="mb-4">
                                        <View className="mb-3">
                                            <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Location Name
                                            </Text>
                                            <TextInput
                                                value={habit.location_name || ''}
                                                onChangeText={(text) => handleInputChange('location_name', text)}
                                                placeholder="E.g., Home, Gym, Office"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                className={`p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                        </View>

                                        <View className="flex-row gap-2 mb-3">
                                            <View className="flex-1">
                                                <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Latitude
                                                </Text>
                                                <TextInput
                                                    value={habit.location_lat ? String(habit.location_lat) : ''}
                                                    onChangeText={(text) => {
                                                        const value = parseFloat(text);
                                                        if (!isNaN(value)) {
                                                            handleInputChange('location_lat', value);
                                                        } else if (text === '') {
                                                            handleInputChange('location_lat', '');
                                                        }
                                                    }}
                                                    placeholder="0.0000"
                                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                    className={`p-3 rounded-xl font-montserrat ${
                                                        isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                    }`}
                                                    keyboardType="numeric"
                                                    onSubmitEditing={dismissKeyboard}
                                                    returnKeyType="done"
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    Longitude
                                                </Text>
                                                <TextInput
                                                    value={habit.location_lng ? String(habit.location_lng) : ''}
                                                    onChangeText={(text) => {
                                                        const value = parseFloat(text);
                                                        if (!isNaN(value)) {
                                                            handleInputChange('location_lng', value);
                                                        } else if (text === '') {
                                                            handleInputChange('location_lng', '');
                                                        }
                                                    }}
                                                    placeholder="0.0000"
                                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                    className={`p-3 rounded-xl font-montserrat ${
                                                        isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                    }`}
                                                    keyboardType="numeric"
                                                    onSubmitEditing={dismissKeyboard}
                                                    returnKeyType="done"
                                                />
                                            </View>
                                        </View>

                                        <View className="mb-3">
                                            <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Radius (meters)
                                            </Text>
                                            <TextInput
                                                value={habit.location_radius ? String(habit.location_radius) : ''}
                                                onChangeText={(text) => {
                                                    const value = parseInt(text);
                                                    if (!isNaN(value) && value > 0) {
                                                        handleInputChange('location_radius', value);
                                                    } else if (text === '') {
                                                        handleInputChange('location_radius', '');
                                                    }
                                                }}
                                                placeholder="100"
                                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                                className={`p-3 rounded-xl font-montserrat ${
                                                    isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                                }`}
                                                keyboardType="numeric"
                                                onSubmitEditing={dismissKeyboard}
                                                returnKeyType="done"
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* External Resource */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        External Resource URL
                                    </Text>
                                    <View className="flex-row items-center">
                                        <Link size={18} className="mr-2" color={isDark ? '#d1d5db' : '#4b5563'} />
                                        <TextInput
                                            value={habit.external_resource_url || ''}
                                            onChangeText={(text) => handleInputChange('external_resource_url', text)}
                                            placeholder="https://example.com"
                                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                            className={`flex-1 p-3 rounded-xl font-montserrat ${
                                                isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                            }`}
                                            onSubmitEditing={dismissKeyboard}
                                            returnKeyType="done"
                                            autoCapitalize="none"
                                            keyboardType="url"
                                        />
                                    </View>
                                </View>

                                {/* Habit Building - Cue & Reward */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Habit Cue
                                    </Text>
                                    <TextInput
                                        value={habit.cue || ''}
                                        onChangeText={(text) => handleInputChange('cue', text)}
                                        placeholder="What triggers this habit? (e.g., After brushing teeth)"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        className={`p-3 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        onSubmitEditing={dismissKeyboard}
                                        returnKeyType="done"
                                    />
                                </View>

                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Habit Reward
                                    </Text>
                                    <TextInput
                                        value={habit.reward || ''}
                                        onChangeText={(text) => handleInputChange('reward', text)}
                                        placeholder="How will you reward yourself? (e.g., 5 minutes of reading)"
                                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                        className={`p-3 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        onSubmitEditing={dismissKeyboard}
                                        returnKeyType="done"
                                    />
                                </View>

                                {/* Streak Protection */}
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Streak Protection
                                    </Text>
                                    <View className={`p-3 rounded-xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <Shield size={18} className="mr-2" color={isDark ? '#d1d5db' : '#4b5563'} />
                                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    Enable Grace Period
                                                </Text>
                                            </View>
                                            <Switch
                                                value={habit.grace_period_enabled}
                                                onValueChange={(value) => handleInputChange('grace_period_enabled', value)}
                                                trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#10b981' }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>

                                        <Text className={`mt-2 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Allows you to complete the habit later without breaking your streak
                                        </Text>

                                        {habit.grace_period_enabled && (
                                            <View className="flex-row items-center mt-3">
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
                                                    className={`w-16 text-center p-2 rounded-lg mr-2 font-montserrat ${
                                                        isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                                                    }`}
                                                    onSubmitEditing={dismissKeyboard}
                                                    returnKeyType="done"
                                                />
                                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    hours
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        <View className="h-16" />
                    </ScrollView>

                    {/* Date/Time Pickers */}
                    {renderDatePicker()}

                    {/* Dropdown Modals */}
                    <DropdownModal
                        visible={showDomainPicker}
                        title="Select Domain"
                        options={domains.map(domain => ({
                            label: domain.name,
                            value: domain.domain_id,
                            icon: (
                                <View
                                    style={{
                                        backgroundColor: domain.color || '#10b981'
                                    }}
                                    className="w-4 h-4 rounded-full"
                                />
                            )
                        }))}
                        onSelect={(item) => selectDomain(item)}
                        onClose={() => setShowDomainPicker(false)}
                        withIcon={true}
                    />

                    <DropdownModal
                        visible={showFrequencyPicker}
                        title="Select Frequency"
                        options={FREQUENCY_TYPES}
                        onSelect={(item) => {
                            handleInputChange('frequency_type', item.value);
                            setShowFrequencyPicker(false);
                        }}
                        onClose={() => setShowFrequencyPicker(false)}
                    />

                    <DropdownModal
                        visible={showDifficultyPicker}
                        title="Select Difficulty"
                        options={DIFFICULTY_LEVELS}
                        onSelect={(item) => {
                            handleInputChange('difficulty', item.value);
                            setShowDifficultyPicker(false);
                        }}
                        onClose={() => setShowDifficultyPicker(false)}
                    />

                    <DropdownModal
                        visible={showTrackingPicker}
                        title="Select Tracking Method"
                        options={TRACKING_TYPES}
                        onSelect={(item) => {
                            handleInputChange('tracking_type', item.value);
                            setShowTrackingPicker(false);
                        }}
                        onClose={() => setShowTrackingPicker(false)}
                        withIcon={true}
                    />

                    <DropdownModal
                        visible={showIconPicker}
                        title="Select Icon"
                        options={ICON_OPTIONS}
                        onSelect={(item) => {
                            handleInputChange('icon', item.value);
                            setShowIconPicker(false);
                        }}
                        onClose={() => setShowIconPicker(false)}
                        withIcon={true}
                    />

                    <DropdownModal
                        visible={showColorPicker}
                        title="Select Color"
                        options={COLOR_OPTIONS}
                        onSelect={(item) => {
                            handleInputChange('color', item.value);
                            setShowColorPicker(false);
                        }}
                        onClose={() => setShowColorPicker(false)}
                        withColor={true}
                    />

                    <TagsModal
                        visible={showTagsModal}
                        onClose={() => setShowTagsModal(false)}
                    />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

export default HabitForm;