import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    useColorScheme,
    ActivityIndicator,
    TextInput,
    Modal,
    Platform,
    StatusBar,
    SafeAreaView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    LogOut,
    ChevronRight,
    Trash2,
    HelpCircle,
    FileText,
    Languages,
    Bell,
    Clock,
    Moon,
    Sun,
    User,
    Lock,
    Mail,
    Calendar,
    Save,
    X,
    ChevronLeft
} from 'lucide-react-native';
import ModalSelector from 'react-native-modal-selector';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import settings service actions
import {
    getUserSettings,
    updateProfile,
    updatePreferences,
    updateGoals,
    changePassword,
    toggleVacationMode,
    logoutUser,
    deleteAccount,
    LANGUAGE_OPTIONS,
    TIMEZONE_OPTIONS,
    REMINDER_SOUND_OPTIONS,
    GENDER_OPTIONS
} from '../../services/settingsService';

// Import navigation
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const systemColorScheme = useColorScheme();

    // Get user data from Redux store
    const userState = useSelector((state) => state.user);
    const {
        user_id,
        user_name,
        user_email,
        avatar,
        theme_preference,
        notifications_enabled,
        language,
        timezone,
        premium_status,
        gender,
        reminder_sound,
        dailyGoal,
        weeklyGoal,
        onVacation
    } = userState?.user.user || {};

    // Loading state for actions
    const [loading, setLoading] = useState({
        logout: false,
        timezone: false,
        language: false,
        theme: false,
        notifications: false,
        password: false,
        profile: false,
        goals: false
    });

    // Form states for editing
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [goalsModalVisible, setGoalsModalVisible] = useState(false);

    // Password change form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Profile form
    const [profileForm, setProfileForm] = useState({
        user_name: user_name || '',
        user_email: user_email || '',
        gender: gender || ''
    });

    // Goals form
    const [goalsForm, setGoalsForm] = useState({
        dailyGoal: dailyGoal || 3,
        weeklyGoal: weeklyGoal || 15,
        onVacation: onVacation || false
    });

    // Handle system theme changes
    useEffect(() => {
        if (theme_preference === 'auto') {
            // No need to dispatch an action, we'll use this information in our style logic
        }
    }, [systemColorScheme, theme_preference]);

    // Update form values when user data changes
    useEffect(() => {
        setProfileForm({
            user_name: user_name || '',
            user_email: user_email || '',
            gender: gender || ''
        });

        setGoalsForm({
            dailyGoal: dailyGoal || 3,
            weeklyGoal: weeklyGoal || 15,
            onVacation: onVacation || false
        });
    }, [user_name, user_email, gender, dailyGoal, weeklyGoal, onVacation]);

    // Determine if dark mode is active based on either preference or system
    const isDark = theme_preference === 'dark' ||
        (theme_preference === 'auto' && systemColorScheme === 'dark');

    // Available languages
    const languages = LANGUAGE_OPTIONS || [];

    // Theme options
    const themeOptions = [
        { key: 'light', label: 'Light Theme' },
        { key: 'dark', label: 'Dark Theme' },
        { key: 'auto', label: 'System Default' }
    ];

    // Gender options
    const genderOptions = GENDER_OPTIONS || [];

    // Time zones (simplified list)
    const timezones = TIMEZONE_OPTIONS || [];

    // Reminder sound options
    const reminderSounds = REMINDER_SOUND_OPTIONS || [];

    // Helper functions that don't use find method
    // Get current language name from language code
    const getCurrentLanguage = () => {
        if (!language || !languages || !Array.isArray(languages)) {
            return 'English'; // Default fallback
        }

        // Manual find implementation
        for (let i = 0; i < languages.length; i++) {
            if (languages[i].key === language) {
                return languages[i].label;
            }
        }
        return 'English'; // Fallback if not found
    };

    // Get current theme name
    const getCurrentTheme = () => {
        if (!theme_preference || !themeOptions || !Array.isArray(themeOptions)) {
            return 'System Default'; // Default fallback
        }

        // Manual find implementation
        for (let i = 0; i < themeOptions.length; i++) {
            if (themeOptions[i].key === theme_preference) {
                return themeOptions[i].label;
            }
        }
        return 'System Default'; // Fallback if not found
    };

    // Get current reminder sound name
    const getCurrentReminderSound = () => {
        if (!reminder_sound || !reminderSounds || !Array.isArray(reminderSounds)) {
            return 'Gentle Chime'; // Default fallback
        }

        // Manual find implementation
        for (let i = 0; i < reminderSounds.length; i++) {
            if (reminderSounds[i].key === reminder_sound) {
                return reminderSounds[i].label;
            }
        }
        return 'Gentle Chime'; // Fallback if not found
    };

    // Get current gender display name
    const getCurrentGender = () => {
        if (!gender || !genderOptions || !Array.isArray(genderOptions)) {
            return 'Not specified'; // Default fallback
        }

        // Manual find implementation
        for (let i = 0; i < genderOptions.length; i++) {
            if (genderOptions[i].key === gender) {
                return genderOptions[i].label;
            }
        }
        return 'Not specified'; // Fallback if not found
    };

    // Custom Redux action dispatchers to prevent undefined errors
    const updateUserProfile = (data) => {
        try {
            // Check if the profile action exists in userSlice
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/updateProfile', payload: data });
            }
        } catch (error) {
            console.error("Error dispatching updateProfile:", error);
        }
    };

    const updateUserPreferences = (data) => {
        try {
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/updatePreferences', payload: data });
            }
        } catch (error) {
            console.error("Error dispatching updatePreferences:", error);
        }
    };

    const updateUserGoals = (data) => {
        try {
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/updateGoals', payload: data });
            }
        } catch (error) {
            console.error("Error dispatching updateGoals:", error);
        }
    };

    const updateUserPassword = (data) => {
        try {
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/updatePassword', payload: data });
            }
        } catch (error) {
            console.error("Error dispatching updatePassword:", error);
        }
    };

    // Handle numeric input for goals without losing first digit
    const handleNumericInput = (value, field) => {
        // Only process if it's a valid number or empty string
        const numValue = value === '' ? '' : parseInt(value.replace(/[^0-9]/g, ''));
        setGoalsForm(prev => ({
            ...prev,
            [field]: numValue === '' ? '' : numValue
        }));
    };

    // Handle change password submission
    const handlePasswordChange = async () => {
        // Validation
        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }

        if (passwordForm.newPassword.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, password: true }));

            // Call the service function
            const response = await changePassword(
                passwordForm.currentPassword,
                passwordForm.newPassword,
                passwordForm.confirmPassword
            );

            // Update Redux if needed (safely)
            updateUserPassword({
                success: true,
                message: response?.message || 'Password updated successfully'
            });

            // Success feedback
            Alert.alert('Success', 'Password updated successfully');

            // Reset form and close modal
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordModalVisible(false);
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to update password');
        } finally {
            setLoading(prev => ({ ...prev, password: false }));
        }
    };

    // Handle profile update submission
    const handleProfileUpdate = async () => {
        // Validation
        if (!profileForm.user_name || !profileForm.user_email) {
            Alert.alert('Error', 'Name and email are required');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileForm.user_email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, profile: true }));

            // Call the service function
            const response = await updateProfile({
                user_name: profileForm.user_name,
                user_email: profileForm.user_email,
                gender: profileForm.gender
            });

            // Update Redux safely
            updateUserProfile({
                user_name: profileForm.user_name,
                user_email: profileForm.user_email,
                gender: profileForm.gender
            });

            // Success feedback
            Alert.alert('Success', 'Profile updated successfully');

            // Close modal
            setProfileModalVisible(false);
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to update profile');
        } finally {
            setLoading(prev => ({ ...prev, profile: false }));
        }
    };

    // Handle goals update submission
    const handleGoalsUpdate = async () => {
        // Validation
        const dailyGoalNum = parseInt(goalsForm.dailyGoal);
        const weeklyGoalNum = parseInt(goalsForm.weeklyGoal);

        if (isNaN(dailyGoalNum) || isNaN(weeklyGoalNum) || dailyGoalNum < 1 || weeklyGoalNum < 1) {
            Alert.alert('Error', 'Goals must be at least 1');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, goals: true }));

            // Call the service function
            const response = await updateGoals({
                dailyGoal: dailyGoalNum,
                weeklyGoal: weeklyGoalNum
            });

            // Update vacation mode if changed
            if (goalsForm.onVacation !== onVacation) {
                await toggleVacationMode({
                    onVacation: goalsForm.onVacation,
                    ...(goalsForm.onVacation && {
                        vacation_start: new Date().toISOString(),
                        vacation_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks from now
                    })
                });
            }

            // Update Redux safely
            updateUserGoals({
                dailyGoal: dailyGoalNum,
                weeklyGoal: weeklyGoalNum,
                onVacation: goalsForm.onVacation
            });

            // Success feedback
            Alert.alert('Success', 'Habit goals updated successfully');

            // Close modal
            setGoalsModalVisible(false);
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to update habit goals');
        } finally {
            setLoading(prev => ({ ...prev, goals: false }));
        }
    };

    // Handle theme change
    const handleThemeChange = async (option) => {
        try {
            setLoading(prev => ({ ...prev, theme: true }));

            // Call the service function
            await updatePreferences({ theme_preference: option.key });

            // Update Redux safely
            updateUserPreferences({ theme_preference: option.key });

            // Success message
            Alert.alert('Success', `Theme updated to ${option.label}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update theme setting');
        } finally {
            setLoading(prev => ({ ...prev, theme: false }));
        }
    };

    // Handle language change
    const handleLanguageChange = async (option) => {
        try {
            setLoading(prev => ({ ...prev, language: true }));

            // Call the service function
            await updateProfile({ language: option.key });

            // Update Redux safely
            updateUserProfile({ language: option.key });

            // Success message
            Alert.alert('Success', `Language updated to ${option.label}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update language setting');
        } finally {
            setLoading(prev => ({ ...prev, language: false }));
        }
    };

    // Handle timezone change
    const handleTimezoneChange = async (option) => {
        try {
            setLoading(prev => ({ ...prev, timezone: true }));

            // Call the service function
            await updateProfile({ timezone: option.key });

            // Update Redux safely
            updateUserProfile({ timezone: option.key });

            // Success message
            Alert.alert('Success', `Timezone updated to ${option.key}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update timezone setting');
        } finally {
            setLoading(prev => ({ ...prev, timezone: false }));
        }
    };

    // Handle notification toggle
    const toggleNotifications = async (value) => {
        try {
            setLoading(prev => ({ ...prev, notifications: true }));

            // Call the service function
            await updatePreferences({ notifications_enabled: value });

            // Update Redux safely
            updateUserPreferences({ notifications_enabled: value });

            // Success message
            Alert.alert('Success', value ? 'Notifications enabled' : 'Notifications disabled');
        } catch (error) {
            Alert.alert('Error', 'Failed to update notification settings');
        } finally {
            setLoading(prev => ({ ...prev, notifications: false }));
        }
    };

    // Handle reminder sound change
    const handleReminderSoundChange = async (option) => {
        try {
            // Call the service function
            await updatePreferences({ reminder_sound: option.key });

            // Update Redux safely
            updateUserPreferences({ reminder_sound: option.key });

            // Success message
            Alert.alert('Success', `Reminder sound updated to ${option.label}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update reminder sound');
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            setLoading(prev => ({ ...prev, logout: true }));

            // Clear local storage and logout
            await logoutUser();

            // Dispatch logout action safely
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/logout' });
            }

            // Navigate to login screen (if using react-navigation)
            if (navigation && navigation.navigate) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }]
                });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to log out. Please try again.');
            setLoading(prev => ({ ...prev, logout: false }));
        }
    };

    // Handle account deletion confirmation
    const confirmDelete = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your habits and progress will be permanently lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteAccountHandler()
                }
            ]
        );
    };

    // Handle account deletion
    const deleteAccountHandler = async () => {
        try {
            // Password prompt for confirmation - Note: iOS specific, may need alternative for Android
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Confirm Password',
                    'Please enter your password to confirm account deletion',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async (password) => await confirmDeleteWithPassword(password)
                        }
                    ],
                    'secure-text'
                );
            } else {
                // For Android, we'll use a modal with a text input
                Alert.alert(
                    'Confirm Password',
                    'Please enter your password in the next screen to confirm account deletion',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Continue',
                            style: 'destructive',
                            onPress: () => {
                                // Show password modal for Android
                                setPasswordModalVisible(true);
                                setPasswordForm({
                                    ...passwordForm,
                                    isForDeletion: true
                                });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to delete account');
        }
    };

    // Confirm deletion with password
    const confirmDeleteWithPassword = async (password) => {
        if (!password) {
            Alert.alert('Error', 'Password is required');
            return;
        }

        try {
            // Call the service function
            await deleteAccount(password);

            // Logout after deletion
            await logoutUser();
            if (dispatch && typeof dispatch === 'function') {
                dispatch({ type: 'user/logout' });
            }

            // Navigate to login screen
            if (navigation && navigation.navigate) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }]
                });
            }
        } catch (error) {
            Alert.alert('Error', error?.message || 'Failed to delete account');
        }
    };

    // Theme-based styles
    const styles = {
        container: isDark ? 'bg-theme-background-dark' : 'bg-theme-background',
        cardBg: isDark ? 'bg-theme-card-dark' : 'bg-theme-card',
        sectionTitle: isDark ? 'text-theme-text-muted-dark' : 'text-theme-text-muted',
        text: isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary',
        textSecondary: isDark ? 'text-theme-text-secondary-dark' : 'text-theme-text-secondary',
        textMuted: isDark ? 'text-theme-text-muted-dark' : 'text-theme-text-muted',
        separator: isDark ? 'bg-theme-border-dark' : 'bg-theme-border',
        iconColor: isDark ? '#94A3B8' : '#64748B',
        inputBg: isDark ? 'bg-theme-input-dark' : 'bg-theme-input',
        premiumBadge: isDark ? 'bg-accent-900/30 text-accent-300' : 'bg-accent-100 text-accent-700',
        dangerZone: isDark ? 'bg-error-dark/20' : 'bg-error-100',
        dangerText: isDark ? 'text-error-dark' : 'text-error-600',
        headerBg: isDark ? 'bg-theme-card-dark' : 'bg-theme-card',
        button: {
            primary: 'bg-primary-500',
            secondary: isDark ? 'bg-gray-700' : 'bg-gray-200',
            danger: isDark ? 'bg-error-dark' : 'bg-error-500',
        },
        buttonText: {
            primary: 'text-white',
            secondary: isDark ? 'text-white' : 'text-gray-800',
            danger: 'text-white',
        },
        modalBg: isDark ? 'bg-theme-card-dark' : 'bg-theme-card',
        modalOverlay: isDark ? 'bg-black/70' : 'bg-black/50',
    };

    return (
        <SafeAreaView className={`flex-1 ${styles.container}`}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? '#1E293B' : '#FFFFFF'}
            />

            {/* Header with Back Button */}
            <View className={`${styles.headerBg} flex-row items-center px-4 py-4 shadow-sm z-10`}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="p-1 mr-3"
                >
                    <ChevronLeft size={24} color={styles.iconColor} />
                </TouchableOpacity>
                <Text className={`text-xl font-montserrat-bold ${styles.text}`}>Settings</Text>
            </View>

            <ScrollView className="flex-1 px-4">
                {/* User Info Bar */}
                <View className={`${styles.cardBg} px-4 py-5 mt-4 mb-4 rounded-xl shadow-sm`}>
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className={`text-lg font-montserrat-bold ${styles.text}`}>
                                {user_name || 'User'}
                            </Text>
                            <Text className={`font-montserrat-medium ${styles.textMuted}`}>
                                {user_email || 'email@example.com'}
                            </Text>
                        </View>

                        {premium_status ? (
                            <View className={`py-1 px-3 rounded-full ${styles.premiumBadge}`}>
                                <Text className="font-montserrat-semibold text-sm">Premium</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                className="py-1 px-3 rounded-full bg-primary-500"
                                onPress={() => Alert.alert('Upgrade', 'Premium features coming soon!')}
                            >
                                <Text className="font-montserrat-semibold text-white text-sm">
                                    Upgrade
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Account Section */}
                <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                    <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                        Account
                    </Text>

                    <TouchableOpacity
                        className="flex-row justify-between items-center px-4 py-4"
                        onPress={() => setProfileModalVisible(true)}
                    >
                        <View className="flex-row items-center">
                            <User size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Edit Profile</Text>
                        </View>
                        <ChevronRight size={16} color={styles.iconColor} />
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity
                        className="flex-row justify-between items-center px-4 py-4"
                        onPress={() => setPasswordModalVisible(true)}
                    >
                        <View className="flex-row items-center">
                            <Lock size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Change Password</Text>
                        </View>
                        <ChevronRight size={16} color={styles.iconColor} />
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity
                        className="flex-row justify-between items-center px-4 py-4"
                        onPress={() => setGoalsModalVisible(true)}
                    >
                        <View className="flex-row items-center">
                            <Calendar size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Habit Goals</Text>
                        </View>
                        <View className="flex-row items-center">
                            <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                {dailyGoal || 3} daily / {weeklyGoal || 15} weekly
                            </Text>
                            <ChevronRight size={16} color={styles.iconColor} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* App Preferences */}
                <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                    <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                        App Preferences
                    </Text>

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            {isDark ?
                                <Moon size={20} color={styles.iconColor} /> :
                                <Sun size={20} color={styles.iconColor} />
                            }
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Theme</Text>
                        </View>

                        <ModalSelector
                            data={themeOptions}
                            initValue={getCurrentTheme()}
                            onChange={handleThemeChange}
                            cancelText="Cancel"
                            optionContainerStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                            optionTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                        >
                            <View className="flex-row items-center">
                                <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                    {loading.theme ? 'Updating...' : getCurrentTheme()}
                                </Text>
                                {loading.theme ? (
                                    <ActivityIndicator size="small" color="#22C55E" />
                                ) : (
                                    <ChevronRight size={16} color={styles.iconColor} />
                                )}
                            </View>
                        </ModalSelector>
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <Bell size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Notifications</Text>
                        </View>

                        <Switch
                            trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                            thumbColor={notifications_enabled ? "#FFFFFF" : "#FFFFFF"}
                            ios_backgroundColor="#E2E8F0"
                            onValueChange={toggleNotifications}
                            value={notifications_enabled}
                            disabled={loading.notifications}
                        />
                    </TouchableOpacity>

                    {notifications_enabled && (
                        <>
                            <View className={`h-px ${styles.separator}`} />

                            <TouchableOpacity className="flex-row justify-between items-center px-4 py-4 ml-8">
                                <Text className={`font-montserrat-medium ${styles.text}`}>Reminder Sound</Text>

                                <ModalSelector
                                    data={reminderSounds}
                                    initValue={getCurrentReminderSound()}
                                    onChange={handleReminderSoundChange}
                                    cancelText="Cancel"
                                    optionContainerStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                                    optionTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                                    cancelTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                                    cancelStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                                >
                                    <View className="flex-row items-center">
                                        <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                            {getCurrentReminderSound()}
                                        </Text>
                                        <ChevronRight size={16} color={styles.iconColor} />
                                    </View>
                                </ModalSelector>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Localization Settings */}
                <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                    <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                        Localization
                    </Text>

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <Languages size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Language</Text>
                        </View>

                        <ModalSelector
                            data={languages}
                            initValue={getCurrentLanguage()}
                            onChange={handleLanguageChange}
                            cancelText="Cancel"
                            optionContainerStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                            optionTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                        >
                            <View className="flex-row items-center">
                                <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                    {loading.language ? 'Updating...' : getCurrentLanguage()}
                                </Text>
                                {loading.language ? (
                                    <ActivityIndicator size="small" color="#22C55E" />
                                ) : (
                                    <ChevronRight size={16} color={styles.iconColor} />
                                )}
                            </View>
                        </ModalSelector>
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <Clock size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Time Zone</Text>
                        </View>

                        <ModalSelector
                            data={timezones}
                            initValue={timezone || 'UTC'}
                            onChange={handleTimezoneChange}
                            cancelText="Cancel"
                            optionContainerStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                            optionTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                        >
                            <View className="flex-row items-center">
                                <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                    {loading.timezone ? 'Updating...' : (timezone || 'UTC')}
                                </Text>
                                {loading.timezone ? (
                                    <ActivityIndicator size="small" color="#22C55E" />
                                ) : (
                                    <ChevronRight size={16} color={styles.iconColor} />
                                )}
                            </View>
                        </ModalSelector>
                    </TouchableOpacity>
                </View>

                {/* Support & Legal */}
                <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                    <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                        Support & Legal
                    </Text>

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <HelpCircle size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Help & Support</Text>
                        </View>
                        <ChevronRight size={16} color={styles.iconColor} />
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <FileText size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Terms of Service</Text>
                        </View>
                        <ChevronRight size={16} color={styles.iconColor} />
                    </TouchableOpacity>

                    <View className={`h-px ${styles.separator}`} />

                    <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                        <View className="flex-row items-center">
                            <FileText size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Privacy Policy</Text>
                        </View>
                        <ChevronRight size={16} color={styles.iconColor} />
                    </TouchableOpacity>
                </View>

                {/* Account Actions */}
                <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                    <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                        Account Actions
                    </Text>

                    <TouchableOpacity
                        className="flex-row justify-between items-center px-4 py-4"
                        onPress={handleLogout}
                        disabled={loading.logout}
                    >
                        <View className="flex-row items-center">
                            <LogOut size={20} color={styles.iconColor} />
                            <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Logout</Text>
                        </View>

                        {loading.logout ? (
                            <ActivityIndicator size="small" color="#22C55E" />
                        ) : (
                            <ChevronRight size={16} color={styles.iconColor} />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View className={`${styles.dangerZone} rounded-xl mb-8 p-4 shadow-sm`}>
                    <Text className={`font-montserrat-semibold ${styles.dangerText} mb-2`}>
                        Danger Zone
                    </Text>

                    <TouchableOpacity
                        className="flex-row items-center mt-2"
                        onPress={confirmDelete}
                    >
                        <Trash2 size={20} color={isDark ? "#F87171" : "#EF4444"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.dangerText}`}>
                            Delete Account
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Version */}
                <View className="items-center mb-8">
                    <Text className={`font-montserrat-regular ${styles.textMuted} text-sm`}>
                        Version 1.0.0
                    </Text>
                </View>
            </ScrollView>

            {/* Password Change Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={passwordModalVisible}
                onRequestClose={() => {
                    if (passwordForm.isForDeletion) {
                        setPasswordForm({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                            isForDeletion: false
                        });
                    }
                    setPasswordModalVisible(false);
                }}
            >
                <View className={`flex-1 justify-center items-center ${styles.modalOverlay}`}>
                    <View className={`${styles.modalBg} rounded-lg p-6 w-11/12 max-w-md shadow-lg`}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-lg font-montserrat-bold ${styles.text}`}>
                                {passwordForm.isForDeletion ? 'Confirm Password' : 'Change Password'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                if (passwordForm.isForDeletion) {
                                    setPasswordForm({
                                        currentPassword: '',
                                        newPassword: '',
                                        confirmPassword: '',
                                        isForDeletion: false
                                    });
                                }
                                setPasswordModalVisible(false);
                            }}>
                                <X size={20} color={styles.iconColor} />
                            </TouchableOpacity>
                        </View>

                        {passwordForm.isForDeletion ? (
                            // Deletion confirmation password form
                            <>
                                <Text className={`${styles.textMuted} mb-3`}>
                                    Please enter your password to confirm account deletion
                                </Text>
                                <TextInput
                                    className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-6 font-montserrat`}
                                    placeholder="Your Password"
                                    placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                                    secureTextEntry
                                    value={passwordForm.currentPassword}
                                    onChangeText={value => setPasswordForm(prev => ({...prev, currentPassword: value}))}
                                />

                                <View className="flex-row justify-end space-x-3">
                                    <TouchableOpacity
                                        className={`${styles.button.secondary} px-4 py-2 rounded-lg`}
                                        onPress={() => {
                                            setPasswordForm({
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: '',
                                                isForDeletion: false
                                            });
                                            setPasswordModalVisible(false);
                                        }}
                                    >
                                        <Text className={`font-montserrat-medium ${styles.buttonText.secondary}`}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className={`${styles.button.danger} px-4 py-2 rounded-lg`}
                                        onPress={() => confirmDeleteWithPassword(passwordForm.currentPassword)}
                                    >
                                        <Text className={`font-montserrat-medium ${styles.buttonText.danger}`}>Delete Account</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            // Password change form
                            <>
                                <TextInput
                                    className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                                    placeholder="Current Password"
                                    placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                                    secureTextEntry
                                    value={passwordForm.currentPassword}
                                    onChangeText={value => setPasswordForm(prev => ({...prev, currentPassword: value}))}
                                />

                                <TextInput
                                    className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                                    placeholder="New Password"
                                    placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                                    secureTextEntry
                                    value={passwordForm.newPassword}
                                    onChangeText={value => setPasswordForm(prev => ({...prev, newPassword: value}))}
                                />

                                <TextInput
                                    className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-6 font-montserrat`}
                                    placeholder="Confirm New Password"
                                    placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                                    secureTextEntry
                                    value={passwordForm.confirmPassword}
                                    onChangeText={value => setPasswordForm(prev => ({...prev, confirmPassword: value}))}
                                />

                                <View className="flex-row justify-end space-x-3">
                                    <TouchableOpacity
                                        className={`${styles.button.secondary} px-4 py-2 rounded-lg`}
                                        onPress={() => setPasswordModalVisible(false)}
                                    >
                                        <Text className={`font-montserrat-medium ${styles.buttonText.secondary}`}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className={`${styles.button.primary} px-4 py-2 rounded-lg flex-row items-center`}
                                        onPress={handlePasswordChange}
                                        disabled={loading.password}
                                    >
                                        {loading.password ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Save size={18} color="#FFFFFF" />
                                                <Text className={`ml-2 font-montserrat-medium ${styles.buttonText.primary}`}>Save</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Profile Edit Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={profileModalVisible}
                onRequestClose={() => setProfileModalVisible(false)}
            >
                <View className={`flex-1 justify-center items-center ${styles.modalOverlay}`}>
                    <View className={`${styles.modalBg} rounded-lg p-6 w-11/12 max-w-md shadow-lg`}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-lg font-montserrat-bold ${styles.text}`}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                                <X size={20} color={styles.iconColor} />
                            </TouchableOpacity>
                        </View>

                        <Text className={`font-montserrat-medium ${styles.textMuted} mb-1`}>Name</Text>
                        <TextInput
                            className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                            placeholder="Your Name"
                            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                            value={profileForm.user_name}
                            onChangeText={value => setProfileForm(prev => ({...prev, user_name: value}))}
                        />

                        <Text className={`font-montserrat-medium ${styles.textMuted} mb-1`}>Email</Text>
                        <TextInput
                            className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                            placeholder="Your Email"
                            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                            keyboardType="email-address"
                            value={profileForm.user_email}
                            onChangeText={value => setProfileForm(prev => ({...prev, user_email: value}))}
                        />

                        <Text className={`font-montserrat-medium ${styles.textMuted} mb-1`}>Gender</Text>
                        <ModalSelector
                            data={genderOptions}
                            initValue={getCurrentGender()}
                            onChange={option => setProfileForm(prev => ({...prev, gender: option.key}))}
                            cancelText="Cancel"
                            optionContainerStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                            optionTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelTextStyle={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
                            cancelStyle={{ backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }}
                        >
                            <View className={`${styles.inputBg} p-3 rounded-lg mb-6 flex-row justify-between items-center`}>
                                <Text className={`font-montserrat ${styles.text}`}>
                                    {getCurrentGender()}
                                </Text>
                                <ChevronRight size={16} color={styles.iconColor} />
                            </View>
                        </ModalSelector>

                        <View className="flex-row justify-end space-x-3">
                            <TouchableOpacity
                                className={`${styles.button.secondary} px-4 py-2 rounded-lg`}
                                onPress={() => setProfileModalVisible(false)}
                            >
                                <Text className={`font-montserrat-medium ${styles.buttonText.secondary}`}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`${styles.button.primary} px-4 py-2 rounded-lg flex-row items-center`}
                                onPress={handleProfileUpdate}
                                disabled={loading.profile}
                            >
                                {loading.profile ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Save size={18} color="#FFFFFF" />
                                        <Text className={`ml-2 font-montserrat-medium ${styles.buttonText.primary}`}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Habit Goals Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={goalsModalVisible}
                onRequestClose={() => setGoalsModalVisible(false)}
            >
                <View className={`flex-1 justify-center items-center ${styles.modalOverlay}`}>
                    <View className={`${styles.modalBg} rounded-lg p-6 w-11/12 max-w-md shadow-lg`}>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-lg font-montserrat-bold ${styles.text}`}>Habit Goals</Text>
                            <TouchableOpacity onPress={() => setGoalsModalVisible(false)}>
                                <X size={20} color={styles.iconColor} />
                            </TouchableOpacity>
                        </View>

                        <Text className={`font-montserrat-medium ${styles.textMuted} mb-1`}>Daily Goal (habits per day)</Text>
                        <TextInput
                            className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                            placeholder="Daily Goal"
                            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                            keyboardType="numeric"
                            value={goalsForm.dailyGoal?.toString()}
                            onChangeText={value => handleNumericInput(value, 'dailyGoal')}
                        />

                        <Text className={`font-montserrat-medium ${styles.textMuted} mb-1`}>Weekly Goal (habits per week)</Text>
                        <TextInput
                            className={`${styles.inputBg} ${styles.text} p-3 rounded-lg mb-4 font-montserrat`}
                            placeholder="Weekly Goal"
                            placeholderTextColor={isDark ? "#94A3B8" : "#64748B"}
                            keyboardType="numeric"
                            value={goalsForm.weeklyGoal?.toString()}
                            onChangeText={value => handleNumericInput(value, 'weeklyGoal')}
                        />

                        <View className="flex-row justify-between items-center mb-6">
                            <Text className={`font-montserrat-medium ${styles.text}`}>Vacation Mode</Text>
                            <Switch
                                trackColor={{ false: "#E2E8F0", true: "#4ADE80" }}
                                thumbColor={goalsForm.onVacation ? "#FFFFFF" : "#FFFFFF"}
                                ios_backgroundColor="#E2E8F0"
                                onValueChange={value => setGoalsForm(prev => ({...prev, onVacation: value}))}
                                value={goalsForm.onVacation}
                            />
                        </View>

                        <View className="flex-row justify-end space-x-3">
                            <TouchableOpacity
                                className={`${styles.button.secondary} px-4 py-2 rounded-lg`}
                                onPress={() => setGoalsModalVisible(false)}
                            >
                                <Text className={`font-montserrat-medium ${styles.buttonText.secondary}`}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`${styles.button.primary} px-4 py-2 rounded-lg flex-row items-center`}
                                onPress={handleGoalsUpdate}
                                disabled={loading.goals}
                            >
                                {loading.goals ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Save size={18} color="#FFFFFF" />
                                        <Text className={`ml-2 font-montserrat-medium ${styles.buttonText.primary}`}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}