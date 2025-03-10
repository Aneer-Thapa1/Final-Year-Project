
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    useColorScheme,
    ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    LogOut,
    ChevronRight,
    Trash2,
    HelpCircle,
    FileText,
    Languages,
    MapPin,
    Clock
} from 'lucide-react-native';
import ModalSelector from 'react-native-modal-selector';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import actions (replace with your actual actions)
import { logout, updateProfile } from '../../store/slices/userSlice';

export default function SettingsScreen() {
    const dispatch = useDispatch();
    const systemColorScheme = useColorScheme();

    // Get user data from Redux store (update selectors based on your store structure)
    const {
        user_name,
        theme_preference,
        prefersNotifications,
        language,
        timezone,
        premium_status
    } = useSelector((state) => state.user);

    // Loading state for actions
    const [loading, setLoading] = useState({
        logout: false,
        timezone: false,
        language: false
    });

    // Determine if dark mode is active
    const isDark = theme_preference === 'dark' ||
        (theme_preference === 'auto' && systemColorScheme === 'dark');

    // Available languages
    const languages = [
        { key: 'en', label: 'English' },
        { key: 'es', label: 'Español' },
        { key: 'fr', label: 'Français' },
        { key: 'de', label: 'Deutsch' },
        { key: 'hi', label: 'हिन्दी' },
        { key: 'zh', label: '中文' },
        { key: 'ja', label: '日本語' },
        { key: 'ko', label: '한국어' },
        { key: 'ar', label: 'العربية' },
        { key: 'ne', label: 'नेपाली' }
    ];

    // Time zones (simplified list)
    const timezones = [
        { key: 'UTC', label: 'UTC (Coordinated Universal Time)' },
        { key: 'GMT', label: 'GMT (Greenwich Mean Time)' },
        { key: 'EST', label: 'EST (Eastern Standard Time)' },
        { key: 'CST', label: 'CST (Central Standard Time)' },
        { key: 'MST', label: 'MST (Mountain Standard Time)' },
        { key: 'PST', label: 'PST (Pacific Standard Time)' },
        { key: 'IST', label: 'IST (Indian Standard Time)' },
        { key: 'JST', label: 'JST (Japan Standard Time)' },
        { key: 'AEST', label: 'AEST (Australian Eastern Standard Time)' },
        { key: 'NPT', label: 'NPT (Nepal Time)' }
    ];

    // Handle language change
    const handleLanguageChange = async (option) => {
        try {
            setLoading(prev => ({ ...prev, language: true }));

            // Update user settings in Redux and backend
            await dispatch(updateProfile({ language: option.key })).unwrap();

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

            // Update user settings in Redux and backend
            await dispatch(updateProfile({ timezone: option.key })).unwrap();

            // Success message
            Alert.alert('Success', `Timezone updated to ${option.key}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update timezone setting');
        } finally {
            setLoading(prev => ({ ...prev, timezone: false }));
        }
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            setLoading(prev => ({ ...prev, logout: true }));

            // Clear local storage and dispatch logout action
            await AsyncStorage.clear();
            dispatch(logout());

            // Navigate to login screen would happen automatically through navigation guards
        } catch (error) {
            Alert.alert('Error', 'Failed to log out. Please try again.');
            setLoading(prev => ({ ...prev, logout: false }));
        }
    };

    // Handle account deletion confirmation
    const confirmDelete = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.')
                }
            ]
        );
    };

    // Theme-based styles
    const styles = {
        container: isDark ? 'bg-gray-900' : 'bg-gray-50',
        cardBg: isDark ? 'bg-gray-800' : 'bg-white',
        sectionTitle: isDark ? 'text-gray-300' : 'text-gray-600',
        text: isDark ? 'text-white' : 'text-gray-800',
        textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
        separator: isDark ? 'bg-gray-700' : 'bg-gray-200',
        iconColor: isDark ? '#9CA3AF' : '#6B7280',
        premiumBadge: isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700',
        dangerZone: isDark ? 'bg-red-900/20' : 'bg-red-50',
        dangerText: isDark ? 'text-red-300' : 'text-red-600',
    };

    // Get current language name from language code
    const getCurrentLanguage = () => {
        const lang = languages.find(l => l.key === language);
        return lang ? lang.label : 'English';
    };

    return (
        <ScrollView className={`flex-1 ${styles.container}`}>
            {/* User Info Bar */}
            <View className={`${styles.cardBg} px-4 py-5 mb-4 shadow-sm`}>
                <View className="flex-row justify-between items-center">
                    <View>
                        <Text className={`text-lg font-montserrat-bold ${styles.text}`}>
                            {user_name}
                        </Text>
                        <Text className={`font-montserrat-medium ${styles.textMuted}`}>
                            {getCurrentLanguage()} • {timezone}
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

            {/* Settings Groups */}
            {/* Language Settings */}
            <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Localization
                </Text>

                <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                    <View className="flex-row items-center">
                        <Languages size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Language</Text>
                    </View>

                    <ModalSelector
                        data={languages}
                        initValue={getCurrentLanguage()}
                        onChange={handleLanguageChange}
                        cancelText="Cancel"
                        optionContainerStyle={{ backgroundColor: isDark ? '#374151' : '#FFFFFF' }}
                        optionTextStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        cancelTextStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        cancelStyle={{ backgroundColor: isDark ? '#374151' : '#FFFFFF' }}
                    >
                        <View className="flex-row items-center">
                            <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                {loading.language ? 'Updating...' : getCurrentLanguage()}
                            </Text>
                            {loading.language ? (
                                <ActivityIndicator size="small" color="#4F46E5" />
                            ) : (
                                <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            )}
                        </View>
                    </ModalSelector>
                </TouchableOpacity>

                <View className={`h-px ${styles.separator}`} />

                <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                    <View className="flex-row items-center">
                        <Clock size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Time Zone</Text>
                    </View>

                    <ModalSelector
                        data={timezones}
                        initValue={timezone}
                        onChange={handleTimezoneChange}
                        cancelText="Cancel"
                        optionContainerStyle={{ backgroundColor: isDark ? '#374151' : '#FFFFFF' }}
                        optionTextStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        cancelTextStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                        cancelStyle={{ backgroundColor: isDark ? '#374151' : '#FFFFFF' }}
                    >
                        <View className="flex-row items-center">
                            <Text className={`mr-2 font-montserrat-regular ${styles.textMuted}`}>
                                {loading.timezone ? 'Updating...' : timezone}
                            </Text>
                            {loading.timezone ? (
                                <ActivityIndicator size="small" color="#4F46E5" />
                            ) : (
                                <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
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
                        <HelpCircle size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Help & Support</Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>

                <View className={`h-px ${styles.separator}`} />

                <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                    <View className="flex-row items-center">
                        <FileText size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Terms of Service</Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>

                <View className={`h-px ${styles.separator}`} />

                <TouchableOpacity className="flex-row justify-between items-center px-4 py-4">
                    <View className="flex-row items-center">
                        <FileText size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Privacy Policy</Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
            </View>

            {/* Account Actions */}
            <View className={`${styles.cardBg} rounded-xl mb-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Account
                </Text>

                <TouchableOpacity
                    className="flex-row justify-between items-center px-4 py-4"
                    onPress={handleLogout}
                    disabled={loading.logout}
                >
                    <View className="flex-row items-center">
                        <LogOut size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text className={`ml-3 font-montserrat-medium ${styles.text}`}>Logout</Text>
                    </View>

                    {loading.logout ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                        <ChevronRight size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <View className={`${styles.dangerZone} rounded-xl mb-6 p-4`}>
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
    );
}