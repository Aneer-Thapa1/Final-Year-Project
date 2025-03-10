import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Settings, User, Bell, Moon, Lock } from 'lucide-react-native';
import { useSelector } from 'react-redux';

export default function SettingsLayout() {
    const systemColorScheme = useColorScheme();
    // Get theme from Redux store (replace with your actual redux selector)
    const { theme_preference } = useSelector((state) => state.user);

    // Determine if dark mode is active
    const isDark = theme_preference === 'dark' ||
        (theme_preference === 'auto' && systemColorScheme === 'dark');

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: isDark ? '#818CF8' : '#4F46E5',
                tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
                tabBarStyle: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderTopColor: isDark ? '#374151' : '#E5E7EB',
                },
                headerStyle: {
                    backgroundColor: isDark ? '#111827' : '#F9FAFB',
                },
                headerTintColor: isDark ? '#FFFFFF' : '#111827',
                headerTitleStyle: {
                    fontFamily: 'Montserrat-SemiBold',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'General',
                    tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                    tabBarIcon: ({ color }) => <Bell size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="appearance"
                options={{
                    title: 'Appearance',
                    tabBarIcon: ({ color }) => <Moon size={20} color={color} />,
                }}
            />
            <Tabs.Screen
                name="privacy"
                options={{
                    title: 'Privacy',
                    tabBarIcon: ({ color }) => <Lock size={20} color={color} />,
                }}
            />
        </Tabs>
    );
}