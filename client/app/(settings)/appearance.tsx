// app/settings/appearance.tsx
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
import { Moon, Sun, Monitor } from 'lucide-react-native';

// Import actions (replace with your actual actions)
import { updateProfile } from '../../store/slices/userSlice';

export default function AppearanceScreen() {
    const dispatch = useDispatch();
    const systemColorScheme = useColorScheme();

    // Get user data from Redux store (update selectors based on your store structure)
    const { theme_preference } = useSelector((state) => state.user);

    // Loading states
    const [loading, setLoading] = useState(false);

    // Determine if dark mode is active
    const isDark = theme_preference === 'dark' ||
        (theme_preference === 'auto' && systemColorScheme === 'dark');

    // Handle theme change
    const setThemePreference = async (newTheme) => {
        try {
            setLoading(true);

            // Update user settings in Redux and backend
            await dispatch(updateProfile({ theme_preference: newTheme })).unwrap();

            // Success
            // (no need for alert here as the UI changes provide enough feedback)
        } catch (error) {
            Alert.alert('Error', 'Failed to update theme settings');
        } finally {
            setLoading(false);
        }
    };

    // Theme-based styles
    const styles = {
        container: isDark ? 'bg-gray-900' : 'bg-gray-50',
        cardBg: isDark ? 'bg-gray-800' : 'bg-white',
        sectionTitle: isDark ? 'text-gray-300' : 'text-gray-600',
        text: isDark ? 'text-white' : 'text-gray-800',
        textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
        themeOptionBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        themeOptionActiveBg: isDark ? 'bg-gray-600' : 'bg-primary-50',
        themeOptionActiveBorder: isDark ? 'border-primary-400' : 'border-primary-500',
    };

    return (
        <ScrollView className={`flex-1 ${styles.container}`}>
            {/* Theme Options */}
            <View className={`${styles.cardBg} rounded-xl mt-4 mb-4 mx-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Theme
                </Text>

                <View className="p-4">
                    {loading ? (
                        <View className="items-center py-8">
                            <ActivityIndicator size="large" color="#4F46E5" />
                            <Text className={`mt-4 font-montserrat-medium ${styles.textMuted}`}>
                                Updating theme...
                            </Text>
                        </View>
                    ) : (
                        <View className="flex-row justify-between">
                            {/* Light Mode Option */}
                            <TouchableOpacity
                                className={`rounded-lg p-4 items-center w-[30%] border-2 ${
                                    theme_preference === 'light'
                                        ? `${styles.themeOptionActiveBg} ${styles.themeOptionActiveBorder}`
                                        : `${styles.themeOptionBg} border-transparent`
                                }`}
                                onPress={() => setThemePreference('light')}
                            >
                                <View className={`h-12 w-12 items-center justify-center rounded-full bg-white mb-2`}>
                                    <Sun size={24} color="#F59E0B" />
                                </View>
                                <Text className={`font-montserrat-medium ${styles.text}`}>Light</Text>
                            </TouchableOpacity>

                            {/* Dark Mode Option */}
                            <TouchableOpacity
                                className={`rounded-lg p-4 items-center w-[30%] border-2 ${
                                    theme_preference === 'dark'
                                        ? `${styles.themeOptionActiveBg} ${styles.themeOptionActiveBorder}`
                                        : `${styles.themeOptionBg} border-transparent`
                                }`}
                                onPress={() => setThemePreference('dark')}
                            >
                                <View className={`h-12 w-12 items-center justify-center rounded-full bg-gray-800 mb-2`}>
                                    <Moon size={24} color="#A1A1AA" />
                                </View>
                                <Text className={`font-montserrat-medium ${styles.text}`}>Dark</Text>
                            </TouchableOpacity>

                            {/* System Option */}
                            <TouchableOpacity
                                className={`rounded-lg p-4 items-center w-[30%] border-2 ${
                                    theme_preference === 'auto'
                                        ? `${styles.themeOptionActiveBg} ${styles.themeOptionActiveBorder}`
                                        : `${styles.themeOptionBg} border-transparent`
                                }`}
                                onPress={() => setThemePreference('auto')}
                            >
                                <View className={`h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-white to-gray-800 mb-2`}>
                                    <Monitor size={24} color="#4F46E5" />
                                </View>
                                <Text className={`font-montserrat-medium ${styles.text}`}>Auto</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text className={`mt-4 font-montserrat-regular ${styles.textMuted} text-center`}>
                        {theme_preference === 'auto' ?
                            'Automatically switch between light and dark themes based on your device settings.' :
                            theme_preference === 'dark' ?
                                'Dark theme reduces eye strain in low-light conditions.' :
                                'Light theme works best in bright environments.'
                        }
                    </Text>
                </View>
            </View>

            {/* Font Options */}
            <View className={`${styles.cardBg} rounded-xl mb-4 mx-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Typography
                </Text>

                <View className="p-4">
                    <Text className={`font-montserrat-regular ${styles.textMuted}`}>
                        Font settings will be available in a future update.
                    </Text>
                </View>
            </View>

            {/* Color Options */}
            <View className={`${styles.cardBg} rounded-xl mb-4 mx-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Accent Color
                </Text>

                <View className="p-4">
                    <View className="flex-row flex-wrap gap-4 justify-center">
                        {/* Primary Blue (Current) */}
                        <TouchableOpacity
                            className="items-center"
                            onPress={() => Alert.alert('Default', 'This is the default accent color')}
                        >
                            <View className="h-12 w-12 rounded-full bg-primary-500 border-2 border-white dark:border-gray-700 mb-1" />
                            <Text className={`text-xs font-montserrat-medium ${styles.text}`}>Indigo</Text>
                        </TouchableOpacity>

                        {/* Other color options (these would actually change the color in a real app) */}
                        <TouchableOpacity
                            className="items-center opacity-50"
                            onPress={() => Alert.alert('Coming Soon', 'Custom accent colors will be available in a future update')}
                        >
                            <View className="h-12 w-12 rounded-full bg-blue-500 mb-1" />
                            <Text className={`text-xs font-montserrat-medium ${styles.text}`}>Blue</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="items-center opacity-50"
                            onPress={() => Alert.alert('Coming Soon', 'Custom accent colors will be available in a future update')}
                        >
                            <View className="h-12 w-12 rounded-full bg-green-500 mb-1" />
                            <Text className={`text-xs font-montserrat-medium ${styles.text}`}>Green</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="items-center opacity-50"
                            onPress={() => Alert.alert('Coming Soon', 'Custom accent colors will be available in a future update')}
                        >
                            <View className="h-12 w-12 rounded-full bg-purple-500 mb-1" />
                            <Text className={`text-xs font-montserrat-medium ${styles.text}`}>Purple</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="items-center opacity-50"
                            onPress={() => Alert.alert('Coming Soon', 'Custom accent colors will be available in a future update')}
                        >
                            <View className="h-12 w-12 rounded-full bg-amber-500 mb-1" />
                            <Text className={`text-xs font-montserrat-medium ${styles.text}`}>Amber</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className={`mt-4 font-montserrat-regular ${styles.textMuted} text-center`}>
                        Premium users can customize accent colors. More options coming soon!
                    </Text>
                </View>
            </View>

            {/* Screen Orientation and Layout Options */}
            <View className={`${styles.cardBg} rounded-xl mb-4 mx-4 shadow-sm overflow-hidden`}>
                <Text className={`px-4 pt-4 pb-2 font-montserrat-semibold ${styles.sectionTitle} uppercase text-xs tracking-wider`}>
                    Layout
                </Text>

                <View className="p-4">
                    <Text className={`font-montserrat-regular ${styles.textMuted}`}>
                        Layout customization will be available in a future update.
                    </Text>
                </View>
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