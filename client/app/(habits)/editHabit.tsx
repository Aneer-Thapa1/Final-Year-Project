import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
    useColorScheme,
    KeyboardAvoidingView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Save,
    Calendar,
    Bell,
    Clock,
    BarChart3,
    Trash2,
    ShieldAlert,
    Layers,
    HelpCircle,
    ChevronDown,
    ChevronRight,
    Calendar as CalendarIcon,
    XCircle
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

// Import services
import {
    getHabitDetails,
    updateHabit,
    deleteHabit,
    getHabitDomains
} from '../../services/habitService';

// Import constants for habit types
import { DIFFICULTY_LEVELS, TRACKING_TYPES, FREQUENCY_TYPES } from '../../constants/habit';

const EditHabitScreen = () => {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const params = useLocalSearchParams();

    // Get habit data from params
    const parsedHabit = params.habit ? JSON.parse(String(params.habit)) : null;
    const habitId = parsedHabit?.habit_id || parsedHabit?.id;

    // State for form data
    const [habit, setHabit] = useState(parsedHabit || {});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState('start_date');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState(null);
    const [domains, setDomains] = useState([]);
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
    const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
    const [showTrackingPicker, setShowTrackingPicker] = useState(false);
    const [error, setError] = useState(null);

    // Fetch habit details and domains
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // If we have a habit ID, fetch the full details
                if (habitId) {
                    const habitDetails = await getHabitDetails(habitId);
                    setHabit(habitDetails);
                }

                // Fetch habit domains
                const domainsData = await getHabitDomains();
                setDomains(domainsData || []);
            } catch (err) {
                console.error('Error fetching habit data:', err);
                setError('Failed to load habit data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [habitId]);

    // Handle save
    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);

            // Validate required fields
            if (!habit.name) {
                Alert.alert('Error', 'Habit name is required');
                setIsSaving(false);
                return;
            }

            // Prepare habit data for update
            const updatedHabit = {
                ...habit,
                // Ensure dates are properly formatted
                start_date: habit.start_date instanceof Date ?
                    format(habit.start_date, 'yyyy-MM-dd') : habit.start_date,
                end_date: habit.end_date instanceof Date ?
                    format(habit.end_date, 'yyyy-MM-dd') : habit.end_date,
            };

            // Update the habit
            await updateHabit(habitId, updatedHabit, {
                preserveExistingReminders: true,
                fetchAfterUpdate: true
            });

            // Show success message
            Alert.alert('Success', 'Habit updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err) {
            console.error('Error saving habit:', err);
            setError('Failed to save habit. Please try again.');
            Alert.alert('Error', 'Failed to save habit');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle delete
    const handleDelete = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to delete this habit? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: confirmDelete
                }
            ]
        );
    };

    const confirmDelete = async () => {
        try {
            setIsDeleting(true);
            await deleteHabit(habitId);
            Alert.alert('Success', 'Habit deleted successfully', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/habits') }
            ]);
        } catch (err) {
            console.error('Error deleting habit:', err);
            Alert.alert('Error', 'Failed to delete habit');
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle input changes
    const handleInputChange = (field, value) => {
        setHabit(prev => ({ ...prev, [field]: value }));
    };

    // Handle date picker
    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);

        if (selectedDate) {
            setHabit(prev => ({
                ...prev,
                [datePickerField]: selectedDate
            }));
        }
    };

    // Show date picker for a specific field
    const showDatePickerFor = (field) => {
        setDatePickerField(field);
        setShowDatePicker(true);
    };

    // Handle reminder time picker
    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);

        if (selectedTime && selectedReminder !== null) {
            const timeString = format(selectedTime, 'HH:mm:00');
            const updatedReminders = [...(habit.reminders || [])];

            if (selectedReminder < updatedReminders.length) {
                updatedReminders[selectedReminder] = {
                    ...updatedReminders[selectedReminder],
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
    };

    // Show time picker for a reminder
    const showTimePickerFor = (reminderIndex) => {
        setSelectedReminder(reminderIndex);
        setShowTimePicker(true);
    };

    // Add a new reminder
    const addReminder = () => {
        showTimePickerFor(habit.reminders?.length || 0);
    };

    // Remove a reminder
    const removeReminder = (index) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders.splice(index, 1);
        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Toggle a reminder's enabled status
    const toggleReminderEnabled = (index) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders[index] = {
            ...updatedReminders[index],
            is_enabled: !updatedReminders[index].is_enabled
        };

        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Update reminder repeat type
    const updateReminderRepeat = (index, repeat) => {
        const updatedReminders = [...(habit.reminders || [])];
        updatedReminders[index] = {
            ...updatedReminders[index],
            repeat
        };

        setHabit(prev => ({ ...prev, reminders: updatedReminders }));
    };

    // Toggle specific days for weekly habits
    const toggleSpecificDay = (day) => {
        const currentDays = habit.specific_days || [];
        let updatedDays;

        if (currentDays.includes(day)) {
            updatedDays = currentDays.filter(d => d !== day);
        } else {
            updatedDays = [...currentDays, day];
        }

        setHabit(prev => ({ ...prev, specific_days: updatedDays }));
    };

    // Format frequency for display
    const formatFrequency = (type, value) => {
        switch (type) {
            case 'DAILY':
                return 'Every Day';
            case 'WEEKDAYS':
                return 'Weekdays';
            case 'WEEKENDS':
                return 'Weekends';
            case 'X_TIMES_WEEK':
                return `${value || 1} Times per Week`;
            case 'INTERVAL':
                return `Every ${value || 1} Days`;
            case 'SPECIFIC_DAYS':
                return 'Specific Days';
            default:
                return type.replace('_', ' ');
        }
    };

    // Format specific days for display
    const formatSpecificDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const specificDays = habit.specific_days || [];

        if (specificDays.length === 0) return 'No days selected';

        return specificDays.map(day => days[day]).join(', ');
    };

    // Get a domain by ID
    const getDomainById = (domainId) => {
        return domains.find(d => d.domain_id === domainId) || null;
    };

    // Select a domain
    const selectDomain = (domain) => {
        setHabit(prev => ({
            ...prev,
            domain_id: domain.domain_id,
            domain_name: domain.name,
            domain_color: domain.color
        }));
        setShowDomainPicker(false);
    };

    // Clear domain
    const clearDomain = () => {
        setHabit(prev => ({
            ...prev,
            domain_id: null,
            domain_name: null,
            domain_color: null
        }));
    };

    // Select frequency type
    const selectFrequencyType = (type) => {
        setHabit(prev => ({
            ...prev,
            frequency_type: type
        }));
        setShowFrequencyPicker(false);
    };

    // Select difficulty level
    const selectDifficultyLevel = (level) => {
        setHabit(prev => ({
            ...prev,
            difficulty: level
        }));
        setShowDifficultyPicker(false);
    };

    // Select tracking type
    const selectTrackingType = (type) => {
        setHabit(prev => ({
            ...prev,
            tracking_type: type
        }));
        setShowTrackingPicker(false);
    };

    // Get status bar style based on mode
    const getStatusBarStyle = () => {
        return isDarkMode ? 'light-content' : 'dark-content';
    };

    // Theme and style values
    const theme = {
        bg: isDarkMode ? 'bg-theme-background-dark' : 'bg-theme-background-DEFAULT',
        card: isDarkMode ? 'bg-theme-card-dark' : 'bg-theme-card-DEFAULT',
        text: isDarkMode ? 'text-theme-text-primary-dark' : 'text-theme-text-primary-DEFAULT',
        textSecondary: isDarkMode ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary-DEFAULT',
        textMuted: isDarkMode ? 'text-theme-text-muted-dark' : 'text-theme-text-muted-DEFAULT',
        border: isDarkMode ? 'border-theme-border-dark' : 'border-theme-border-DEFAULT',
        input: isDarkMode ? 'bg-theme-input-dark' : 'bg-theme-input-DEFAULT',
    };

    // Render loading state
    if (isLoading) {
        return (
            <SafeAreaView className={`flex-1 ${theme.bg}`}>
                <StatusBar
                    barStyle={getStatusBarStyle()}
                    backgroundColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                    translucent={Platform.OS === 'android'}
                />
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#22C55E" />
                    <Text className={`mt-4 text-base font-montserrat ${theme.textSecondary}`}>
                        Loading habit...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={`flex-1 ${theme.bg}`}>
            <StatusBar
                barStyle={getStatusBarStyle()}
                backgroundColor={isDarkMode ? '#0F172A' : '#FFFFFF'}
                translucent={Platform.OS === 'android'}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                style={{
                    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
                }}
            >
                {/* Header */}
                <View className={`flex-row justify-between items-center px-4 py-3 border-b ${theme.border}`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className={`p-2 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`}
                    >
                        <ArrowLeft size={22} className={isDarkMode ? 'text-white' : 'text-black'} />
                    </TouchableOpacity>

                    <Text className={`text-xl font-montserrat-bold ${theme.text}`}>
                        Edit Habit
                    </Text>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isSaving}
                        className={`p-2 rounded-full ${isSaving ? 'bg-primary-300' : 'bg-primary-500'}`}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Save size={22} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Error message */}
                    {error && (
                        <View className="mb-4 px-4 py-3 rounded-lg bg-error-100">
                            <Text className="text-error-600 font-montserrat">{error}</Text>
                        </View>
                    )}

                    {/* Basic Information Section */}
                    <View className={`mb-6 p-4 rounded-card ${theme.card} border ${theme.border}`}>
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${theme.text}`}>
                            Basic Information
                        </Text>

                        {/* Habit Name */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Habit Name*
                            </Text>
                            <TextInput
                                className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text}`}
                                value={habit.name || ''}
                                onChangeText={(text) => handleInputChange('name', text)}
                                placeholder="Enter habit name"
                                placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                            />
                        </View>

                        {/* Description */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Description
                            </Text>
                            <TextInput
                                className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text}`}
                                value={habit.description || ''}
                                onChangeText={(text) => handleInputChange('description', text)}
                                placeholder="Enter description (optional)"
                                placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                                multiline
                                numberOfLines={3}
                                style={{ textAlignVertical: 'top', minHeight: 80 }}
                            />
                        </View>

                        {/* Domain Selection */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Domain
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDomainPicker(!showDomainPicker)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
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

                            {/* Domain picker dropdown */}
                            {showDomainPicker && (
                                <View className={`mt-1 rounded-md border ${theme.border} ${theme.card}`}>
                                    {domains.length > 0 ? (
                                        <>
                                            {domains.map((domain) => (
                                                <TouchableOpacity
                                                    key={domain.domain_id}
                                                    onPress={() => selectDomain(domain)}
                                                    className={`flex-row items-center px-3 py-2.5 border-b ${theme.border}`}
                                                >
                                                    <View
                                                        className="w-4 h-4 rounded-full mr-2"
                                                        style={{ backgroundColor: domain.color || '#22C55E' }}
                                                    />
                                                    <Text className={`font-montserrat ${theme.text}`}>
                                                        {domain.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            {habit.domain_id && (
                                                <TouchableOpacity
                                                    onPress={clearDomain}
                                                    className="flex-row items-center px-3 py-2.5"
                                                >
                                                    <XCircle size={16} className="text-error-500 mr-2" />
                                                    <Text className="font-montserrat text-error-500">
                                                        Clear Selection
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </>
                                    ) : (
                                        <View className="px-3 py-2.5">
                                            <Text className={`font-montserrat ${theme.textMuted}`}>
                                                No domains available
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Scheduling Section */}
                    <View className={`mb-6 p-4 rounded-card ${theme.card} border ${theme.border}`}>
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${theme.text}`}>
                            Scheduling
                        </Text>

                        {/* Frequency Type */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Frequency
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
                            >
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {formatFrequency(habit.frequency_type, habit.frequency_value)}
                                </Text>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>

                            {/* Frequency picker dropdown */}
                            {showFrequencyPicker && (
                                <View className={`mt-1 rounded-md border ${theme.border} ${theme.card}`}>
                                    {FREQUENCY_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => selectFrequencyType(type.value)}
                                            className={`px-3 py-2.5 border-b ${theme.border}`}
                                        >
                                            <Text className={`font-montserrat ${theme.text}`}>
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Specific Days (for weekly habits) */}
                        {habit.frequency_type === 'SPECIFIC_DAYS' && (
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                    Specific Days
                                </Text>
                                <Text className={`text-xs font-montserrat mb-2 ${theme.textMuted}`}>
                                    {formatSpecificDays()}
                                </Text>
                                <View className="flex-row flex-wrap justify-between">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                        <TouchableOpacity
                                            key={day}
                                            onPress={() => toggleSpecificDay(index)}
                                            className={`mb-2 px-3 py-1.5 rounded-full ${
                                                (habit.specific_days || []).includes(index)
                                                    ? 'bg-primary-500'
                                                    : `${theme.input}`
                                            }`}
                                        >
                                            <Text className={`text-xs font-montserrat-medium ${
                                                (habit.specific_days || []).includes(index)
                                                    ? 'text-white'
                                                    : theme.text
                                            }`}>
                                                {day}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* X Times Per Week */}
                        {habit.frequency_type === 'X_TIMES_WEEK' && (
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                    Times Per Week
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
                                        value={String(habit.frequency_value || 1)}
                                        onChangeText={(text) => {
                                            const value = parseInt(text);
                                            if (!isNaN(value) && value > 0 && value <= 7) {
                                                handleInputChange('frequency_value', value);
                                            }
                                        }}
                                        keyboardType="numeric"
                                    />
                                    <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                        times per week
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Interval Days */}
                        {habit.frequency_type === 'INTERVAL' && (
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                    Every X Days
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
                                        value={String(habit.frequency_value || 1)}
                                        onChangeText={(text) => {
                                            const value = parseInt(text);
                                            if (!isNaN(value) && value > 0) {
                                                handleInputChange('frequency_value', value);
                                            }
                                        }}
                                        keyboardType="numeric"
                                    />
                                    <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                        days
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Start Date */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Start Date
                            </Text>
                            <TouchableOpacity
                                onPress={() => showDatePickerFor('start_date')}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
                            >
                                <View className="flex-row items-center">
                                    <CalendarIcon size={18} className={`mr-2 ${theme.textSecondary}`} />
                                    <Text className={`font-montserrat ${theme.text}`}>
                                        {habit.start_date
                                            ? typeof habit.start_date === 'string'
                                                ? habit.start_date
                                                : format(habit.start_date, 'yyyy-MM-dd')
                                            : 'Select start date'}
                                    </Text>
                                </View>
                                <ChevronRight size={18} className={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* End Date (Optional) */}
                        <View className="mb-4">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className={`text-sm font-montserrat-medium ${theme.textSecondary}`}>
                                    End Date
                                </Text>
                                <TouchableOpacity
                                    onPress={() => handleInputChange('end_date', null)}
                                    className="px-2 py-0.5"
                                >
                                    <Text className="text-xs font-montserrat text-primary-500">
                                        {habit.end_date ? 'Clear' : 'Optional'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                onPress={() => showDatePickerFor('end_date')}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
                            >
                                <View className="flex-row items-center">
                                    <CalendarIcon size={18} className={`mr-2 ${theme.textSecondary}`} />
                                    <Text className={`font-montserrat ${
                                        habit.end_date ? theme.text : theme.textMuted
                                    }`}>
                                        {habit.end_date
                                            ? typeof habit.end_date === 'string'
                                                ? habit.end_date
                                                : format(habit.end_date, 'yyyy-MM-dd')
                                            : 'No end date'}
                                    </Text>
                                </View>
                                <ChevronRight size={18} className={theme.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tracking Section */}
                    <View className={`mb-6 p-4 rounded-card ${theme.card} border ${theme.border}`}>
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${theme.text}`}>
                            Tracking & Difficulty
                        </Text>

                        {/* Tracking Type */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Tracking Method
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowTrackingPicker(!showTrackingPicker)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
                            >
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {TRACKING_TYPES.find(t => t.value === habit.tracking_type)?.label || 'Yes/No Completion'}
                                </Text>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>

                            {/* Tracking method picker dropdown */}
                            {showTrackingPicker && (
                                <View className={`mt-1 rounded-md border ${theme.border} ${theme.card}`}>
                                    {TRACKING_TYPES.map((type) => (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => selectTrackingType(type.value)}
                                            className={`px-3 py-2.5 border-b ${theme.border}`}
                                        >
                                            <Text className={`font-montserrat ${theme.text}`}>
                                                {type.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Target Value (for COUNT and NUMERIC) */}
                        {(habit.tracking_type === 'COUNT' || habit.tracking_type === 'NUMERIC') && (
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                    Target Value
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
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
                                        placeholder="0"
                                    />
                                    <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                        {habit.tracking_type === 'COUNT' ? 'times' : 'units'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Target Duration (for DURATION) */}
                        {habit.tracking_type === 'DURATION' && (
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                    Target Duration (minutes)
                                </Text>
                                <View className="flex-row items-center">
                                    <TextInput
                                        className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
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
                                        placeholder="0"
                                    />
                                    <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                        minutes
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Difficulty Level */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Difficulty Level
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDifficultyPicker(!showDifficultyPicker)}
                                className={`flex-row justify-between items-center px-3 py-2.5 rounded-input ${theme.input}`}
                            >
                                <Text className={`font-montserrat ${theme.text}`}>
                                    {DIFFICULTY_LEVELS.find(d => d.value === habit.difficulty)?.label || 'Medium'}
                                </Text>
                                <ChevronDown size={18} className={theme.textMuted} />
                            </TouchableOpacity>

                            {/* Difficulty picker dropdown */}
                            {showDifficultyPicker && (
                                <View className={`mt-1 rounded-md border ${theme.border} ${theme.card}`}>
                                    {DIFFICULTY_LEVELS.map((level) => (
                                        <TouchableOpacity
                                            key={level.value}
                                            onPress={() => selectDifficultyLevel(level.value)}
                                            className={`px-3 py-2.5 border-b ${theme.border}`}
                                        >
                                            <Text className={`font-montserrat ${theme.text}`}>
                                                {level.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Points per Completion */}
                        <View className="mb-4">
                            <Text className={`text-sm font-montserrat-medium mb-1 ${theme.textSecondary}`}>
                                Points per Completion
                            </Text>
                            <View className="flex-row items-center">
                                <TextInput
                                    className={`px-3 py-2.5 rounded-input ${theme.input} font-montserrat ${theme.text} w-20 text-center`}
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
                                    placeholder="0"
                                />
                                <Text className={`ml-2 font-montserrat ${theme.text}`}>
                                    points
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Reminders Section */}
                    <View className={`mb-6 p-4 rounded-card ${theme.card} border ${theme.border}`}>
                        <Text className={`text-lg font-montserrat-semibold mb-4 ${theme.text}`}>
                            Reminders
                        </Text>

                        {/* List of existing reminders */}
                        {habit.reminders && habit.reminders.length > 0 ? (
                            <View className="mb-4">
                                {habit.reminders.map((reminder, index) => (
                                    <View key={index} className={`mb-3 p-3 rounded-lg border ${theme.border}`}>
                                        <View className="flex-row justify-between items-center mb-2">
                                            <View className="flex-row items-center">
                                                <Clock size={16} className={`mr-2 ${theme.textSecondary}`} />
                                                <Text className={`font-montserrat-medium ${theme.text}`}>
                                                    {reminder.time ||
                                                        (reminder.reminder_time ? reminder.reminder_time : '09:00:00')}
                                                </Text>
                                            </View>
                                            <Switch
                                                value={reminder.is_enabled !== false}
                                                onValueChange={() => toggleReminderEnabled(index)}
                                                trackColor={{ false: '#CBD5E1', true: '#4ADE80' }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>

                                        <View className="flex-row items-center mb-2">
                                            <Bell size={16} className={`mr-2 ${theme.textSecondary}`} />
                                            <TouchableOpacity onPress={() => showTimePickerFor(index)}>
                                                <Text className={`font-montserrat ${theme.text}`}>
                                                    {reminder.repeat || 'DAILY'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Remove reminder button */}
                                        <TouchableOpacity
                                            onPress={() => removeReminder(index)}
                                            className="flex-row items-center mt-1"
                                        >
                                            <XCircle size={16} className="text-error-500 mr-2" />
                                            <Text className="font-montserrat text-error-500">
                                                Remove
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="mb-4 py-3 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <Text className={`font-montserrat ${theme.textMuted} text-center`}>
                                    No reminders set
                                </Text>
                            </View>
                        )}

                        {/* Add reminder button */}
                        <TouchableOpacity
                            onPress={addReminder}
                            className="flex-row items-center justify-center py-3 bg-primary-100 rounded-lg"
                        >
                            <Bell size={18} className="text-primary-600 mr-2" />
                            <Text className="font-montserrat-medium text-primary-600">
                                Add Reminder
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Danger Zone */}
                    <View className="mb-6 p-4 rounded-card bg-error-50 dark:bg-gray-800 border border-error-200 dark:border-error-900">
                        <Text className="text-lg font-montserrat-semibold mb-4 text-error-600 dark:text-error-400">
                            Danger Zone
                        </Text>

                        <TouchableOpacity
                            onPress={handleDelete}
                            disabled={isDeleting}
                            className="flex-row items-center justify-center py-3 bg-white dark:bg-gray-700 rounded-lg border border-error-300 dark:border-error-800"
                        >
                            {isDeleting ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                            ) : (
                                <>
                                    <Trash2 size={18} className="text-error-500 mr-2" />
                                    <Text className="font-montserrat-medium text-error-500">
                                        Delete Habit
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Spacer for bottom padding */}
                    <View className="h-10" />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal (for iOS) */}
            {Platform.OS === 'ios' && showDatePicker && (
                <DateTimePicker
                    value={habit[datePickerField] ? new Date(habit[datePickerField]) : new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                />
            )}

            {/* Date Picker Modal (for Android) */}
            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={habit[datePickerField] ? new Date(habit[datePickerField]) : new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Time Picker Modal (for iOS) */}
            {Platform.OS === 'ios' && showTimePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                />
            )}

            {/* Time Picker Modal (for Android) */}
            {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
        </SafeAreaView>
    );
};

export default EditHabitScreen;