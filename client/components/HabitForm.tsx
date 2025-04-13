import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    Modal,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    useColorScheme,
    TouchableWithoutFeedback,
    LogBox
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    Check,
    Clock,
    Calendar,
    Bell,
    Star,
    Tag,
    Bookmark,
    Umbrella,
    Info,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    Heart,
    Shield,
    Settings,
    Trash2,
    Edit2
} from 'lucide-react-native';
import { getDomains } from '../services/domainService';
import { addHabit, updateHabit } from '../services/habitService';

// Default habit state for new habits
const defaultHabitState = {
    name: "",
    description: "",
    domain_id: null,
    icon: "🏃",
    color: "#4285F4",
    start_date: new Date(),
    end_date: null,
    is_favorite: false,
    frequency_type: "DAILY",
    frequency_value: 1,
    frequency_interval: 1,
    specific_days: [],
    tracking_type: "BOOLEAN",
    duration_goal: null,
    count_goal: null,
    numeric_goal: null,
    units: "",
    skip_on_vacation: false,
    require_evidence: false,
    motivation_quote: "",
    cue: "",
    reward: "",
    difficulty: "MEDIUM",
    tags: [],
    reminders: [],
    grace_period_enabled: true,
    grace_period_hours: 24
};

/**
 * HabitForm - A reusable component for creating and editing habits
 *
 * @param {Object} props
 * @param {Object} props.existingHabit - Existing habit data for edit mode (optional)
 * @param {Function} props.onSubmitSuccess - Callback when form submission is successful
 * @param {Function} props.onCancel - Callback when user cancels the form
 * @param {Boolean} props.isEditMode - Whether the form is in edit mode
 */
const HabitForm = ({ existingHabit, onSubmitSuccess, onCancel, isEditMode = false }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scrollViewRef = useRef(null);

    // Debug: Track when keyboard is shown/hidden
    const keyboardShownRef = useRef(false);

    // State for habit data
    const [habitData, setHabitData] = useState(existingHabit || defaultHabitState);
    const [domains, setDomains] = useState([]);
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [currentTag, setCurrentTag] = useState("");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [activeSection, setActiveSection] = useState("basic");

    // Date picker states
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date());
    const [editingReminderIndex, setEditingReminderIndex] = useState(null);

    // Dropdown states
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
    const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

    // Debug: Add keyboard event listeners
    useEffect(() => {
        // Ignore yellow box warnings in development
        LogBox.ignoreLogs(['Animated:']);

        // Track keyboard events
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (event) => {
                console.log('[DEBUG] Keyboard SHOWN', {
                    keyboardHeight: event.endCoordinates.height,
                    timestamp: new Date().toISOString()
                });
                keyboardShownRef.current = true;
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            (event) => {
                console.log('[DEBUG] Keyboard HIDDEN', {
                    timestamp: new Date().toISOString()
                });
                keyboardShownRef.current = false;
            }
        );

        // Cleanup listeners
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Set selected domain if editing an existing habit
    useEffect(() => {
        if (existingHabit && existingHabit.domain_id) {
            const domain = domains.find(d => d.domain_id === existingHabit.domain_id);
            if (domain) setSelectedDomain(domain);
        }
    }, [existingHabit, domains]);

    // Fetch domains on component mount
    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const domainsData = await getDomains();
                setDomains(domainsData);

                // If we have an existing habit with domain_id, find and set the selected domain
                if (existingHabit && existingHabit.domain_id) {
                    const domain = domainsData.find(d => d.domain_id === existingHabit.domain_id);
                    if (domain) setSelectedDomain(domain);
                }
            } catch (error) {
                console.error("Failed to fetch domains:", error);
            }
        };

        fetchDomains();
    }, []);

    // Dismiss keyboard when tapping outside of TextInputs
    const dismissKeyboard = () => {
        console.log('[DEBUG] dismissKeyboard explicitly called', { keyboardShown: keyboardShownRef.current });
        if (keyboardShownRef.current) {
            // Add a small delay to prevent race conditions
            setTimeout(() => {
                Keyboard.dismiss();
            }, 10);
        }
    };

    // Form validation
    const validateForm = () => {
        if (!habitData.name.trim()) {
            setErrorMessage("Please enter a habit name");
            setShowErrorToast(true);
            return false;
        }

        if (!habitData.domain_id) {
            setErrorMessage("Please select a category for your habit");
            setShowErrorToast(true);
            return false;
        }

        if (habitData.tracking_type === "DURATION" && !habitData.duration_goal) {
            setErrorMessage("Please enter a duration goal");
            setShowErrorToast(true);
            return false;
        }

        if (habitData.tracking_type === "COUNT" && !habitData.count_goal) {
            setErrorMessage("Please enter a count goal");
            setShowErrorToast(true);
            return false;
        }

        if (habitData.tracking_type === "NUMERIC" && !habitData.numeric_goal) {
            setErrorMessage("Please enter a numeric goal");
            setShowErrorToast(true);
            return false;
        }

        if (habitData.frequency_type === "SPECIFIC_DAYS" && habitData.specific_days.length === 0) {
            setErrorMessage("Please select at least one day of the week");
            setShowErrorToast(true);
            return false;
        }

        return true;
    };

    // Handle form submission
    const handleSubmit = async () => {
        console.log('[DEBUG] handleSubmit called');
        dismissKeyboard();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);

            // Prepare data for submission
            const formData = {
                ...habitData,
                start_date: habitData.start_date.toISOString(),
                end_date: habitData.end_date ? habitData.end_date.toISOString() : null,
                duration_goal: habitData.tracking_type === "DURATION" ? Number(habitData.duration_goal) : null,
                count_goal: habitData.tracking_type === "COUNT" ? Number(habitData.count_goal) : null,
                numeric_goal: habitData.tracking_type === "NUMERIC" ? Number(habitData.numeric_goal) : null,
                frequency_value: Number(habitData.frequency_value),
                frequency_interval: Number(habitData.frequency_interval),
                tags: habitData.tags.length > 0 ? habitData.tags : null,
                reminders: habitData.reminders.length > 0 ? habitData.reminders.map(reminder => ({
                    time: reminder.time,
                    repeat: reminder.repeat || "DAILY",
                    message: reminder.message || `Time to complete your ${habitData.name} habit!`,
                    pre_notification_minutes: reminder.pre_notification_minutes || 10,
                    follow_up_enabled: reminder.follow_up_enabled || true,
                    follow_up_minutes: reminder.follow_up_minutes || 30
                })) : null
            };

            let response;
            if (isEditMode) {
                response = await updateHabit(habitData.id, formData);
            } else {
                response = await addHabit(formData);
            }

            if (response.success) {
                setShowSuccessModal(true);
            } else {
                throw new Error(response.message || "Failed to save habit");
            }
        } catch (error) {
            console.error("Error saving habit:", error);
            setErrorMessage(error.message || "Something went wrong. Please try again.");
            setShowErrorToast(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle text input changes
    const handleTextChange = (text, field) => {
        console.log(`[DEBUG] Text changed for field: ${field}`, { length: text.length });
        setHabitData(prev => ({
            ...prev,
            [field]: text
        }));
    };

    // Handle date changes
    const handleDateChange = (event, selectedDate, dateType) => {
        if (Platform.OS === "android" && event.type === "dismissed") {
            return;
        }

        if (selectedDate) {
            setHabitData(prev => ({
                ...prev,
                [dateType]: selectedDate
            }));
        }

        // Close date pickers
        if (dateType === "start_date") setShowStartDatePicker(false);
        if (dateType === "end_date") setShowEndDatePicker(false);
    };

    // Handle reminder time change
    const handleReminderTimeChange = (event, selectedTime) => {
        if (Platform.OS === "android" && event.type === "dismissed") {
            setShowReminderTimePicker(false);
            return;
        }

        if (selectedTime) {
            setReminderTime(selectedTime);
        }

        if (Platform.OS === "android") {
            setShowReminderTimePicker(false);
        }
    };

    // Add reminder
    const addReminder = () => {
        const newReminder = {
            time: reminderTime.toISOString(),
            repeat: "DAILY",
            message: `Time to complete your ${habitData.name} habit!`,
            pre_notification_minutes: 10,
            follow_up_enabled: true,
            follow_up_minutes: 30
        };

        if (editingReminderIndex !== null) {
            // Edit existing reminder
            const updatedReminders = [...habitData.reminders];
            updatedReminders[editingReminderIndex] = newReminder;
            setHabitData(prev => ({ ...prev, reminders: updatedReminders }));
            setEditingReminderIndex(null);
        } else {
            // Add new reminder
            setHabitData(prev => ({
                ...prev,
                reminders: [...prev.reminders, newReminder]
            }));
        }

        setShowReminderTimePicker(false);
    };

    // Delete reminder
    const deleteReminder = (index) => {
        const updatedReminders = [...habitData.reminders];
        updatedReminders.splice(index, 1);
        setHabitData(prev => ({ ...prev, reminders: updatedReminders }));
    };


    // Toggle day selection for weekly habits
    const toggleDaySelection = (dayIndex) => {
        const updatedDays = [...habitData.specific_days];
        const dayPosition = updatedDays.indexOf(dayIndex);

        if (dayPosition >= 0) {
            updatedDays.splice(dayPosition, 1);
        } else {
            updatedDays.push(dayIndex);
        }

        setHabitData(prev => ({
            ...prev,
            specific_days: updatedDays
        }));
    };

    // Add tag
    const addTag = () => {
        console.log('[DEBUG] addTag called', { currentTag });
        if (currentTag.trim() && !habitData.tags.includes(currentTag.trim())) {
            setHabitData(prev => ({
                ...prev,
                tags: [...prev.tags, currentTag.trim()]
            }));
            setCurrentTag("");
        }
    };

    // Remove tag
    const removeTag = (tagToRemove) => {
        setHabitData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    // Format time for display
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle success modal completion
    const handleSuccessConfirmation = () => {
        setShowSuccessModal(false);
        if (onSubmitSuccess) onSubmitSuccess(habitData);
    };

    // Render date picker based on platform
    const renderDatePicker = (visible, currentDate, onChange, mode = "date") => {
        if (!visible) return null;

        if (Platform.OS === "ios") {
            return (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={visible}
                >
                    <View className="flex-1 justify-end bg-black/40">
                        <View className={`p-5 rounded-t-3xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
                            <DateTimePicker
                                value={currentDate || new Date()}
                                mode={mode}
                                display="spinner"
                                onChange={onChange}
                                textColor={isDark ? "white" : "black"}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    if (mode === "time" && onChange === handleReminderTimeChange) {
                                        setShowReminderTimePicker(false);
                                        addReminder();
                                    } else if (mode === "date" && onChange === ((e, d) => handleDateChange(e, d, "start_date"))) {
                                        setShowStartDatePicker(false);
                                    } else if (mode === "date" && onChange === ((e, d) => handleDateChange(e, d, "end_date"))) {
                                        setShowEndDatePicker(false);
                                    }
                                }}
                                className="mt-5 bg-primary-500 py-4 rounded-xl"
                            >
                                <Text className="text-white text-center font-bold">Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            );
        } else {
            return (
                <DateTimePicker
                    value={currentDate || new Date()}
                    mode={mode}
                    display="default"
                    onChange={onChange}
                />
            );
        }
    };

    // Modern styled components for the form UI
    const FormField = ({ label, children, required = false, className = "" }) => (
        <View className={`mb-6 ${className}`}>
            <View className="flex-row items-center mb-2.5">
                <Text className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium text-base`}>
                    {label}
                </Text>
                {required && <Text className="text-red-500 ml-1.5">*</Text>}
            </View>
            {children}
        </View>
    );

    const TabButton = ({ title, icon, isActive, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 py-3.5 items-center justify-center rounded-lg ${
                isActive
                    ? (isDark ? 'bg-primary-900/30 border border-primary-700' : 'bg-primary-100 border border-primary-200')
                    : (isDark ? 'bg-gray-800' : 'bg-gray-100')
            }`}
        >
            {icon}
            <Text className={`mt-1.5 text-xs font-medium ${
                isActive
                    ? (isDark ? 'text-primary-400' : 'text-primary-700')
                    : (isDark ? 'text-gray-400' : 'text-gray-600')
            }`}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const StyledInput = ({
                             value,
                             onChangeText,
                             placeholder,
                             multiline = false,
                             keyboardType = "default",
                             blurOnSubmit = false, // Changed default to false
                             onSubmitEditing = null
                         }) => (
        <TextInput
            value={value}
            onChangeText={(text) => {
                console.log('[DEBUG] TextInput onChange', { field: placeholder, multiline });
                onChangeText(text);
            }}
            placeholder={placeholder}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            keyboardType={keyboardType}
            className={`p-4 rounded-lg ${
                isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
            } border ${multiline ? "min-h-[100px] text-top" : ""}`}
            blurOnSubmit={blurOnSubmit}
            returnKeyType={multiline ? "default" : "next"}
            onSubmitEditing={(event) => {
                console.log('[DEBUG] TextInput onSubmitEditing', { multiline, field: placeholder });
                if (onSubmitEditing) {
                    onSubmitEditing(event);
                }
                // Do not dismiss keyboard on submit
            }}
            onBlur={() => {
                console.log('[DEBUG] TextInput onBlur', { multiline, field: placeholder });
            }}
            onFocus={() => {
                console.log('[DEBUG] TextInput onFocus', { multiline, field: placeholder });
            }}
        />
    );

    const StyledTrackingOption = ({ icon, label, description, active, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            className={`p-5 rounded-lg border-2 mb-4 ${
                active
                    ? (isDark ? "border-primary-500 bg-primary-900/20" : "border-primary-500 bg-primary-50")
                    : (isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white")
            }`}
        >
            <View className="flex-row items-center mb-2">
                <View className={`mr-4 p-2.5 rounded-full ${
                    isDark ? "bg-gray-700" : "bg-gray-100"
                }`}>
                    {icon}
                </View>
                <Text className={`${isDark ? "text-white" : "text-gray-900"} font-bold text-base`}>
                    {label}
                </Text>
                {active && (
                    <View className="ml-auto">
                        <Check size={18} color={isDark ? "#60A5FA" : "#3B82F6"} />
                    </View>
                )}
            </View>
            <Text className={`${isDark ? "text-gray-400" : "text-gray-600"} text-sm ml-12`}>
                {description}
            </Text>
        </TouchableOpacity>
    );

    // Error toast component
    const ErrorToast = () => (
        showErrorToast && (
            <View className="absolute top-6 left-5 right-5 bg-red-500 rounded-lg p-4 z-50 shadow-lg">
                <Text className="text-white font-medium">{errorMessage}</Text>
                <TouchableOpacity
                    className="absolute top-2 right-2"
                    onPress={() => setShowErrorToast(false)}
                >
                    <Text className="text-white text-lg">×</Text>
                </TouchableOpacity>
            </View>
        )
    );

    // Success modal component
    const SuccessModal = () => (
        <Modal
            visible={showSuccessModal}
            transparent={true}
            animationType="fade"
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className={`w-4/5 p-6 rounded-2xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-xl`}>
                    <View className="items-center mb-5">
                        <View className={`w-16 h-16 rounded-full ${isDark ? "bg-green-900" : "bg-green-100"} items-center justify-center mb-4`}>
                            <Check size={32} color={isDark ? "#4ADE80" : "#22C55E"} />
                        </View>
                        <Text className={`text-xl font-bold text-center ${isDark ? "text-white" : "text-gray-900"}`}>
                            {isEditMode ? "Updated Successfully!" : "Created Successfully!"}
                        </Text>
                    </View>
                    <Text className={`text-center mb-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {isEditMode
                            ? "Your habit has been updated successfully."
                            : "Your new habit has been created. Start building your streak today!"}
                    </Text>
                    <TouchableOpacity
                        onPress={handleSuccessConfirmation}
                        className={`${isDark ? "bg-primary-600" : "bg-primary-500"} py-4 rounded-xl`}
                    >
                        <Text className="text-white text-center font-bold">Got it</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Dropdown modal component
    const DropdownModal = ({ visible, options, onSelect, onClose, title }) => (
        visible && (
            <View className="absolute left-0 right-0 top-0 bottom-0 bg-black/50 z-50" onTouchStart={onClose}>
                <View
                    className={`mx-5 mt-20 rounded-xl ${isDark ? "bg-gray-800" : "bg-white"} shadow-lg overflow-hidden`}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {title && (
                        <View className={`px-5 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                            <Text className={`${isDark ? "text-white" : "text-gray-900"} font-bold text-base`}>{title}</Text>
                        </View>
                    )}

                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => onSelect(option)}
                            className={`px-5 py-4 ${index !== options.length - 1 ? `border-b ${isDark ? "border-gray-700" : "border-gray-200"}` : ''}`}
                        >
                            <View className="flex-row items-center">
                                {option.icon && <View className="mr-4">{option.icon}</View>}
                                <Text className={`${isDark ? "text-white" : "text-gray-900"}`}>{option.label}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
            <ErrorToast />
            <SuccessModal />

            {/* Domain Picker Modal */}
            <DropdownModal
                visible={showDomainPicker}
                title="Select Category"
                options={domains.map(domain => ({
                    label: domain.name,
                    value: domain.domain_id,
                    icon: <Text style={{ fontSize: 20 }}>{domain.icon}</Text>
                }))}
                onSelect={(option) => {
                    setHabitData(prev => ({ ...prev, domain_id: option.value }));
                    setSelectedDomain(domains.find(d => d.domain_id === option.value));
                    setShowDomainPicker(false);
                }}
                onClose={() => setShowDomainPicker(false)}
            />

            {/* Difficulty Picker Modal */}
            <DropdownModal
                visible={showDifficultyPicker}
                title="Select Difficulty"
                options={[
                    { label: "Very Easy", value: "VERY_EASY" },
                    { label: "Easy", value: "EASY" },
                    { label: "Medium", value: "MEDIUM" },
                    { label: "Hard", value: "HARD" },
                    { label: "Very Hard", value: "VERY_HARD" }
                ]}
                onSelect={(option) => {
                    setHabitData(prev => ({ ...prev, difficulty: option.value }));
                    setShowDifficultyPicker(false);
                }}
                onClose={() => setShowDifficultyPicker(false)}
            />

            {/* Frequency Type Picker Modal */}
            <DropdownModal
                visible={showFrequencyPicker}
                title="Select Frequency Type"
                options={[
                    { label: "Daily", value: "DAILY" },
                    { label: "Weekdays Only", value: "WEEKDAYS" },
                    { label: "Weekends Only", value: "WEEKENDS" },
                    { label: "Specific Days", value: "SPECIFIC_DAYS" },
                    { label: "X Times per Week", value: "X_TIMES_WEEK" },
                    { label: "X Times per Month", value: "X_TIMES_MONTH" },
                    { label: "Every X Days", value: "INTERVAL" }
                ]}
                onSelect={(option) => {
                    setHabitData(prev => ({ ...prev, frequency_type: option.value }));
                    setShowFrequencyPicker(false);
                }}
                onClose={() => setShowFrequencyPicker(false)}
            />

            {/* Date Pickers */}
            {renderDatePicker(
                showStartDatePicker,
                habitData.start_date,
                (e, d) => handleDateChange(e, d, "start_date"),
                "date"
            )}

            {renderDatePicker(
                showEndDatePicker,
                habitData.end_date || new Date(),
                (e, d) => handleDateChange(e, d, "end_date"),
                "date"
            )}

            {renderDatePicker(
                showReminderTimePicker,
                reminderTime,
                handleReminderTimeChange,
                "time"
            )}

            {/* Header */}
            <View className="px-5 py-4 flex-row justify-between items-center border-b border-gray-200 dark:border-gray-800">
                <TouchableOpacity onPress={onCancel} className="p-2">
                    <X size={24} color={isDark ? "#E5E7EB" : "#1F2937"} />
                </TouchableOpacity>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {isEditMode ? "Edit Habit" : "Create Habit"}
                </Text>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    className="p-2"
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={isDark ? "#60A5FA" : "#3B82F6"} />
                    ) : (
                        <Text className={`${isDark ? "text-primary-400" : "text-primary-600"} font-bold`}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Tab Navigation for Sections */}
            <View className="px-5 flex-row space-x-3 my-4">
                <TabButton
                    title="Basics"
                    icon={<Info size={18} color={activeSection === "basic" ? (isDark ? "#60A5FA" : "#3B82F6") : (isDark ? "#9CA3AF" : "#6B7280")} />}
                    isActive={activeSection === "basic"}
                    onPress={() => setActiveSection("basic")}
                />
                <TabButton
                    title="Tracking"
                    icon={<Check size={18} color={activeSection === "tracking" ? (isDark ? "#60A5FA" : "#3B82F6") : (isDark ? "#9CA3AF" : "#6B7280")} />}
                    isActive={activeSection === "tracking"}
                    onPress={() => setActiveSection("tracking")}
                />
                <TabButton
                    title="Schedule"
                    icon={<Calendar size={18} color={activeSection === "schedule" ? (isDark ? "#60A5FA" : "#3B82F6") : (isDark ? "#9CA3AF" : "#6B7280")} />}
                    isActive={activeSection === "schedule"}
                    onPress={() => setActiveSection("schedule")}
                />
                <TabButton
                    title="More"
                    icon={<Settings size={18} color={activeSection === "more" ? (isDark ? "#60A5FA" : "#3B82F6") : (isDark ? "#9CA3AF" : "#6B7280")} />}
                    isActive={activeSection === "more"}
                    onPress={() => setActiveSection("more")}
                />
            </View>

            {/* Content Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <TouchableWithoutFeedback
                    onPress={(event) => {
                        // IMPORTANT FIX: Don't dismiss keyboard when tapping on TextInput components
                        const targetTag = event.target?._nativeTag;
                        const targetClass = event.target?.className;

                        // Check if we're tapping on a text input or within one
                        const isTextInput =
                            (typeof targetClass === 'string' && targetClass.includes('TextInput')) ||
                            (targetTag && typeof targetTag === 'number');

                        console.log('[DEBUG] TouchableWithoutFeedback pressed', {
                            isTextInput,
                            target: event.target,
                            timestamp: new Date().toISOString(),
                            keyboardShown: keyboardShownRef.current
                        });

                        // Only dismiss if we're not tapping on a TextInput
                        if (keyboardShownRef.current && !isTextInput) {
                            dismissKeyboard();
                        }
                    }}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        className="flex-1"
                        contentContainerClassName="pb-24 px-5"
                        keyboardShouldPersistTaps="always" // Changed from "handled" to "always"
                        keyboardDismissMode="none" // Changed from "on-drag" to "none"
                        showsVerticalScrollIndicator={false}
                        onScroll={() => {
                            console.log('[DEBUG] ScrollView onScroll');
                        }}
                    >
                        {/* Basic Information Section */}
                        {activeSection === "basic" && (
                            <View className="pt-4">
                                <FormField label="Habit Name" required>
                                    <StyledInput
                                        value={habitData.name}
                                        onChangeText={(text) => handleTextChange(text, "name")}
                                        placeholder="What habit do you want to build?"
                                    />
                                </FormField>

                                <FormField label="Category" required>
                                    <TouchableOpacity
                                        onPress={() => {
                                            console.log('[DEBUG] Category picker opened');
                                            setShowDomainPicker(true);
                                        }}
                                        className={`flex-row items-center justify-between p-4 rounded-lg ${
                                            isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                        } border`}
                                    >
                                        <View className="flex-row items-center">
                                            {selectedDomain && (
                                                <Text style={{ fontSize: 20 }} className="mr-3">{selectedDomain.icon}</Text>
                                            )}
                                            <Text className={isDark ? "text-white" : "text-gray-900"}>
                                                {selectedDomain?.name || "Select a category"}
                                            </Text>
                                        </View>
                                        <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                    </TouchableOpacity>
                                </FormField>

                                <FormField label="Description">
                                    <StyledInput
                                        value={habitData.description}
                                        onChangeText={(text) => handleTextChange(text, "description")}
                                        placeholder="Add some details about this habit"
                                        multiline
                                    />
                                </FormField>

                                <FormField label="Difficulty">
                                    <TouchableOpacity
                                        onPress={() => {
                                            console.log('[DEBUG] Difficulty picker opened');
                                            setShowDifficultyPicker(true);
                                        }}
                                        className={`flex-row items-center justify-between p-4 rounded-lg ${
                                            isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                        } border`}
                                    >
                                        <Text className={isDark ? "text-white" : "text-gray-900"}>
                                            {habitData.difficulty === "VERY_EASY" ? "Very Easy" :
                                                habitData.difficulty === "EASY" ? "Easy" :
                                                    habitData.difficulty === "MEDIUM" ? "Medium" :
                                                        habitData.difficulty === "HARD" ? "Hard" :
                                                            habitData.difficulty === "VERY_HARD" ? "Very Hard" : "Medium"}
                                        </Text>
                                        <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                    </TouchableOpacity>
                                </FormField>

                                <FormField label="Tags">
                                    <View className="flex-row flex-wrap mb-3">
                                        {habitData.tags.map((tag, index) => (
                                            <View
                                                key={index}
                                                className={`flex-row items-center rounded-full px-3 py-1.5 mr-2 mb-2 ${
                                                    isDark ? "bg-gray-700" : "bg-gray-100"
                                                }`}
                                            >
                                                <Text className={isDark ? "text-white" : "text-gray-900"}>{tag}</Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        console.log('[DEBUG] Tag removed:', tag);
                                                        removeTag(tag);
                                                    }}
                                                    className="ml-1.5"
                                                >
                                                    <X size={14} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                    <View className="flex-row">
                                        <TextInput
                                            value={currentTag}
                                            onChangeText={(text) => {
                                                console.log('[DEBUG] Tag input changed:', text);
                                                setCurrentTag(text);
                                            }}
                                            placeholder="Add a tag"
                                            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                            className={`flex-1 p-4 rounded-l-lg border ${
                                                isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                            }`}
                                            onSubmitEditing={(event) => {
                                                console.log('[DEBUG] Tag input submitted:', currentTag);
                                                addTag();
                                                // Don't dismiss keyboard after adding tag
                                                return false;
                                            }}
                                            blurOnSubmit={false}
                                            returnKeyType="done"
                                        />
                                        <TouchableOpacity
                                            onPress={() => {
                                                console.log('[DEBUG] Add tag button pressed');
                                                addTag();
                                            }}
                                            className={`px-5 items-center justify-center rounded-r-lg ${
                                                isDark ? "bg-primary-600" : "bg-primary-500"
                                            }`}
                                        >
                                            <Plus size={20} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </FormField>
                            </View>
                        )}

                        {/* Tracking Section */}
                        {activeSection === "tracking" && (
                            <View className="pt-4">
                                <Text className={`mb-4 font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                                    How would you like to track this habit?
                                </Text>

                                <StyledTrackingOption
                                    icon={<Check size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                                    label="Simple Completion"
                                    description="Mark as done when completed"
                                    active={habitData.tracking_type === "BOOLEAN"}
                                    onPress={() => {
                                        console.log('[DEBUG] Tracking option changed to: BOOLEAN');
                                        setHabitData(prev => ({ ...prev, tracking_type: "BOOLEAN" }));
                                    }}
                                />

                                <StyledTrackingOption
                                    icon={<Clock size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                                    label="Duration"
                                    description="Track how long you spend on this habit"
                                    active={habitData.tracking_type === "DURATION"}
                                    onPress={() => {
                                        console.log('[DEBUG] Tracking option changed to: DURATION');
                                        setHabitData(prev => ({ ...prev, tracking_type: "DURATION" }));
                                    }}
                                />

                                <StyledTrackingOption
                                    icon={<Tag size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                                    label="Count"
                                    description="Track how many times you complete this habit"
                                    active={habitData.tracking_type === "COUNT"}
                                    onPress={() => {
                                        console.log('[DEBUG] Tracking option changed to: COUNT');
                                        setHabitData(prev => ({ ...prev, tracking_type: "COUNT" }));
                                    }}
                                />

                                <StyledTrackingOption
                                    icon={<Info size={20} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                                    label="Numeric Value"
                                    description="Track a specific value with units"
                                    active={habitData.tracking_type === "NUMERIC"}
                                    onPress={() => {
                                        console.log('[DEBUG] Tracking option changed to: NUMERIC');
                                        setHabitData(prev => ({ ...prev, tracking_type: "NUMERIC" }));
                                    }}
                                />

                                {habitData.tracking_type === "DURATION" && (
                                    <FormField label="Duration Goal" required>
                                        <View className="flex-row">
                                            <TextInput
                                                value={habitData.duration_goal?.toString() || ""}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Duration goal changed:', text);
                                                    handleTextChange(text.replace(/[^0-9]/g, ""), "duration_goal");
                                                }}
                                                keyboardType="numeric"
                                                placeholder="e.g., 30"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`flex-1 p-4 mr-2 rounded-lg border ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                                onSubmitEditing={(event) => {
                                                    console.log('[DEBUG] Duration goal input submitted');
                                                    // Don't dismiss keyboard
                                                    return false;
                                                }}
                                            />
                                            <TouchableOpacity
                                                className={`px-4 rounded-lg flex-row items-center ${
                                                    isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                                } border`}
                                                onPress={() => {
                                                    console.log('[DEBUG] Duration units toggled');
                                                    setHabitData(prev => ({
                                                        ...prev,
                                                        units: prev.units === "minutes" ? "hours" : "minutes"
                                                    }));
                                                }}
                                            >
                                                <Text className={isDark ? "text-white" : "text-gray-900"}>
                                                    {habitData.units || "minutes"}
                                                </Text>
                                                <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} className="ml-2" />
                                            </TouchableOpacity>
                                        </View>
                                    </FormField>
                                )}

                                {habitData.tracking_type === "COUNT" && (
                                    <FormField label="Count Goal" required>
                                        <StyledInput
                                            value={habitData.count_goal?.toString() || ""}
                                            onChangeText={(text) => handleTextChange(text.replace(/[^0-9]/g, ""), "count_goal")}
                                            placeholder="e.g., 8 glasses of water"
                                            keyboardType="numeric"
                                            blurOnSubmit={false}
                                            returnKeyType="done"
                                        />
                                    </FormField>
                                )}

                                {habitData.tracking_type === "NUMERIC" && (
                                    <FormField label="Numeric Goal with Units" required>
                                        <View className="flex-row">
                                            <TextInput
                                                value={habitData.numeric_goal?.toString() || ""}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Numeric goal changed:', text);
                                                    handleTextChange(text.replace(/[^0-9.]/g, ""), "numeric_goal");
                                                }}
                                                keyboardType="numeric"
                                                placeholder="e.g., 5"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`flex-1 p-4 mr-2 rounded-lg border ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="next"
                                                blurOnSubmit={false}
                                            />
                                            <TextInput
                                                value={habitData.units}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Units changed:', text);
                                                    handleTextChange(text, "units");
                                                }}
                                                placeholder="units"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`p-4 rounded-lg border w-1/3 ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                            />
                                        </View>
                                    </FormField>
                                )}
                            </View>
                        )}

                        {/* Schedule Section */}
                        {activeSection === "schedule" && (
                            <View className="pt-4">
                                <FormField label="Frequency Type" required>
                                    <TouchableOpacity
                                        onPress={() => {
                                            console.log('[DEBUG] Frequency picker opened');
                                            setShowFrequencyPicker(true);
                                        }}
                                        className={`flex-row items-center justify-between p-4 rounded-lg ${
                                            isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                        } border`}
                                    >
                                        <Text className={isDark ? "text-white" : "text-gray-900"}>
                                            {habitData.frequency_type === "DAILY" ? "Daily" :
                                                habitData.frequency_type === "WEEKDAYS" ? "Weekdays Only" :
                                                    habitData.frequency_type === "WEEKENDS" ? "Weekends Only" :
                                                        habitData.frequency_type === "SPECIFIC_DAYS" ? "Specific Days" :
                                                            habitData.frequency_type === "X_TIMES_WEEK" ? "X Times per Week" :
                                                                habitData.frequency_type === "X_TIMES_MONTH" ? "X Times per Month" :
                                                                    habitData.frequency_type === "INTERVAL" ? "Every X Days" : "Daily"}
                                        </Text>
                                        <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                    </TouchableOpacity>
                                </FormField>

                                {habitData.frequency_type === "SPECIFIC_DAYS" && (
                                    <FormField label="Select Days" required>
                                        <View className="flex-row justify-between">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    onPress={() => {
                                                        console.log('[DEBUG] Day selection toggled:', day, index);
                                                        toggleDaySelection(index);
                                                    }}
                                                    className={`w-12 h-12 rounded-full items-center justify-center ${
                                                        habitData.specific_days.includes(index)
                                                            ? isDark ? "bg-primary-600" : "bg-primary-500"
                                                            : isDark ? "bg-gray-700 border border-gray-600" : "bg-gray-50 border border-gray-300"
                                                    }`}
                                                >
                                                    <Text
                                                        className={
                                                            habitData.specific_days.includes(index)
                                                                ? "text-white font-bold"
                                                                : isDark ? "text-gray-300" : "text-gray-700"
                                                        }
                                                    >
                                                        {day}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </FormField>
                                )}

                                {habitData.frequency_type === "X_TIMES_WEEK" && (
                                    <FormField label="Times per Week" required>
                                        <View className="flex-row items-center">
                                            <TextInput
                                                value={habitData.frequency_value?.toString() || ""}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Frequency value changed:', text);
                                                    handleTextChange(text.replace(/[^0-9]/g, ""), "frequency_value");
                                                }}
                                                keyboardType="numeric"
                                                placeholder="e.g., 3"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`p-4 rounded-lg border w-1/3 ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                            />
                                            <Text className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>times per week</Text>
                                        </View>
                                    </FormField>
                                )}

                                {habitData.frequency_type === "X_TIMES_MONTH" && (
                                    <FormField label="Times per Month" required>
                                        <View className="flex-row items-center">
                                            <TextInput
                                                value={habitData.frequency_value?.toString() || ""}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Frequency value changed:', text);
                                                    handleTextChange(text.replace(/[^0-9]/g, ""), "frequency_value");
                                                }}
                                                keyboardType="numeric"
                                                placeholder="e.g., 8"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`p-4 rounded-lg border w-1/3 ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                            />
                                            <Text className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>times per month</Text>
                                        </View>
                                    </FormField>
                                )}

                                {habitData.frequency_type === "INTERVAL" && (
                                    <FormField label="Every X Days" required>
                                        <View className="flex-row items-center">
                                            <TextInput
                                                value={habitData.frequency_interval?.toString() || ""}
                                                onChangeText={(text) => {
                                                    console.log('[DEBUG] Frequency interval changed:', text);
                                                    handleTextChange(text.replace(/[^0-9]/g, ""), "frequency_interval");
                                                }}
                                                keyboardType="numeric"
                                                placeholder="e.g., 3"
                                                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                className={`p-4 rounded-lg border w-1/3 ${
                                                    isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                                }`}
                                                returnKeyType="done"
                                                blurOnSubmit={false}
                                            />
                                            <Text className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>days</Text>
                                        </View>
                                    </FormField>
                                )}

                                <View className="mt-4">
                                    <FormField label="Start Date">
                                        <TouchableOpacity
                                            onPress={() => {
                                                console.log('[DEBUG] Start date picker opened');
                                                setShowStartDatePicker(true);
                                            }}
                                            className={`p-4 rounded-lg flex-row justify-between items-center border ${
                                                isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                            }`}
                                        >
                                            <View className="flex-row items-center">
                                                <Calendar size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={isDark ? "text-white" : "text-gray-900"}>
                                                    {habitData.start_date.toDateString()}
                                                </Text>
                                            </View>
                                            <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                        </TouchableOpacity>
                                    </FormField>

                                    <View className="flex-row justify-between items-center mt-5 mb-3">
                                        <Text className={`${isDark ? "text-gray-300" : "text-gray-700"} font-medium text-base`}>
                                            End Date (Optional)
                                        </Text>
                                        <Switch
                                            value={!!habitData.end_date}
                                            onValueChange={(value) => {
                                                console.log('[DEBUG] End date toggle:', value);
                                                setHabitData(prev => ({
                                                    ...prev,
                                                    end_date: value ? new Date(prev.start_date.getTime() + 30 * 24 * 60 * 60 * 1000) : null
                                                }));
                                            }}
                                            trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>

                                    {habitData.end_date && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                console.log('[DEBUG] End date picker opened');
                                                setShowEndDatePicker(true);
                                            }}
                                            className={`p-4 rounded-lg flex-row justify-between items-center border mb-4 ${
                                                isDark ? "bg-gray-700 text-white border-gray-600" : "bg-gray-50 text-gray-900 border-gray-200"
                                            }`}
                                        >
                                            <View className="flex-row items-center">
                                                <Calendar size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={isDark ? "text-white" : "text-gray-900"}>
                                                    {habitData.end_date.toDateString()}
                                                </Text>
                                            </View>
                                            <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <FormField label="Reminders" className="mt-2">
                                    {habitData.reminders.map((reminder, index) => (
                                        <View
                                            key={index}
                                            className={`mb-3 p-4 rounded-lg border flex-row justify-between items-center ${
                                                isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                            }`}
                                        >
                                            <View className="flex-row items-center">
                                                <Bell size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={isDark ? "text-white" : "text-gray-900"}>
                                                    {formatTime(reminder.time)}
                                                </Text>
                                            </View>
                                            <View className="flex-row">
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        console.log('[DEBUG] Edit reminder:', index);
                                                        setEditingReminderIndex(index);
                                                        setReminderTime(new Date(reminder.time));
                                                        setShowReminderTimePicker(true);
                                                    }}
                                                    className="mr-4"
                                                >
                                                    <Edit2 size={18} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        console.log('[DEBUG] Delete reminder:', index);
                                                        deleteReminder(index);
                                                    }}
                                                >
                                                    <Trash2 size={18} color={isDark ? "#F87171" : "#EF4444"} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}

                                    <TouchableOpacity
                                        onPress={() => {
                                            console.log('[DEBUG] Add reminder button pressed');
                                            setEditingReminderIndex(null);
                                            setReminderTime(new Date());
                                            setShowReminderTimePicker(true);
                                        }}
                                        className={`flex-row items-center justify-center p-4 rounded-lg border border-dashed ${
                                            isDark ? "border-gray-600" : "border-gray-300"
                                        }`}
                                    >
                                        <Plus size={18} color={isDark ? "#60A5FA" : "#3B82F6"} />
                                        <Text className={`ml-2 ${isDark ? "text-primary-400" : "text-primary-600"} font-medium`}>
                                            Add Reminder
                                        </Text>
                                    </TouchableOpacity>
                                </FormField>
                            </View>
                        )}

                        {/* More Settings Section */}
                        {activeSection === "more" && (
                            <View className="pt-4">
                                <FormField label="Streak Management">
                                    <View className={`p-4 rounded-lg border mb-4 ${
                                        isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <Shield size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={`${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                                                    Enable Grace Period
                                                </Text>
                                            </View>
                                            <Switch
                                                value={habitData.grace_period_enabled}
                                                onValueChange={(value) => {
                                                    console.log('[DEBUG] Grace period enabled:', value);
                                                    setHabitData(prev => ({ ...prev, grace_period_enabled: value }));
                                                }}
                                                trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>
                                        <Text className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            Grace period allows you to maintain your streak even if you miss a day
                                        </Text>

                                        {habitData.grace_period_enabled && (
                                            <View className="mt-3 flex-row items-center">
                                                <TextInput
                                                    value={habitData.grace_period_hours?.toString() || "24"}
                                                    onChangeText={(text) => {
                                                        console.log('[DEBUG] Grace period hours changed:', text);
                                                        handleTextChange(text.replace(/[^0-9]/g, ""), "grace_period_hours");
                                                    }}
                                                    keyboardType="numeric"
                                                    placeholder="e.g., 24"
                                                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                                                    className={`p-3 rounded-lg border w-1/3 ${
                                                        isDark ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"
                                                    }`}
                                                    returnKeyType="done"
                                                    blurOnSubmit={false}
                                                />
                                                <Text className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>hours</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View className={`p-4 rounded-lg border mb-4 ${
                                        isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <Umbrella size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={`${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                                                    Skip on Vacation
                                                </Text>
                                            </View>
                                            <Switch
                                                value={habitData.skip_on_vacation}
                                                onValueChange={(value) => {
                                                    console.log('[DEBUG] Skip on vacation:', value);
                                                    setHabitData(prev => ({ ...prev, skip_on_vacation: value }));
                                                }}
                                                trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>
                                        <Text className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            Maintain your streak when skipping during vacation mode
                                        </Text>
                                    </View>
                                </FormField>

                                <FormField label="Motivation">
                                    <StyledInput
                                        value={habitData.motivation_quote}
                                        onChangeText={(text) => {
                                            console.log('[DEBUG] Motivation quote changed:', text);
                                            handleTextChange(text, "motivation_quote");
                                        }}
                                        placeholder="Add a motivational quote to keep you going"
                                        multiline
                                    />
                                </FormField>

                                <FormField label="Habit Building">
                                    <View className="mb-3">
                                        <Text className={`mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            Cue (What triggers this habit?)
                                        </Text>
                                        <StyledInput
                                            value={habitData.cue}
                                            onChangeText={(text) => {
                                                console.log('[DEBUG] Cue changed:', text);
                                                handleTextChange(text, "cue");
                                            }}
                                            placeholder="e.g., After brushing teeth in the morning"
                                        />
                                    </View>

                                    <View>
                                        <Text className={`mb-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            Reward (What will you gain?)
                                        </Text>
                                        <StyledInput
                                            value={habitData.reward}
                                            onChangeText={(text) => {
                                                console.log('[DEBUG] Reward changed:', text);
                                                handleTextChange(text, "reward");
                                            }}
                                            placeholder="e.g., More energy, better health"
                                        />
                                    </View>
                                </FormField>

                                <FormField label="Advanced Options">
                                    <View className={`p-4 rounded-lg border mb-4 ${
                                        isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <Bookmark size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={`${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                                                    Add to Favorites
                                                </Text>
                                            </View>
                                            <Switch
                                                value={habitData.is_favorite}
                                                onValueChange={(value) => {
                                                    console.log('[DEBUG] Add to favorites:', value);
                                                    setHabitData(prev => ({ ...prev, is_favorite: value }));
                                                }}
                                                trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>
                                    </View>

                                    <View className={`p-4 rounded-lg border ${
                                        isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                                    }`}>
                                        <View className="flex-row justify-between items-center">
                                            <View className="flex-row items-center">
                                                <Shield size={18} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-3" />
                                                <Text className={`${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                                                    Require Evidence
                                                </Text>
                                            </View>
                                            <Switch
                                                value={habitData.require_evidence}
                                                onValueChange={(value) => {
                                                    console.log('[DEBUG] Require evidence:', value);
                                                    setHabitData(prev => ({ ...prev, require_evidence: value }));
                                                }}
                                                trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                                                thumbColor="#FFFFFF"
                                            />
                                        </View>
                                        <Text className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            You'll need to provide photo evidence when completing this habit
                                        </Text>
                                    </View>
                                </FormField>
                            </View>
                        )}
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default HabitForm;