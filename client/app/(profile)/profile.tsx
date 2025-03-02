import { Image, Text, View, ScrollView, TouchableOpacity, useColorScheme } from 'react-native'
import React from 'react'
import images from '../../constants/images'
import { useSelector } from 'react-redux';
import { ArrowLeft, Settings, Trophy, Activity, Users } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { router } from 'expo-router';

const Profile = () => {
    const userDetails = useSelector((state) => state.user);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [activeTab, setActiveTab] = React.useState('Achievements');

    const tabs = [
        { id: 'Activity', icon: Activity },
        { id: 'Achievements', icon: Trophy },
        { id: 'Friends', icon: Users }
    ];

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}>
            <ScrollView className="flex-1">
                {/* Profile Card */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    className="mx-4 mt-4"
                >
                    <View className={`rounded-3xl overflow-hidden ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}>
                        {/* Top Bar */}
                        <View className="p-4 flex-row justify-between items-center">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="p-2"
                            >
                                <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                            </TouchableOpacity>
                            <TouchableOpacity className="p-2">
                                <Settings size={24} color={isDark ? '#E2E8F0' : '#1F2937'} />
                            </TouchableOpacity>
                        </View>

                        {/* Profile Info */}
                        <View className="px-6 pb-6">
                            <View className="flex-row items-center space-x-4">
                                <Image
                                    source={images.maleProfile}
                                    className="h-24 w-24 rounded-full"
                                />
                                <View className="flex-1">
                                    <Text className={`text-xl font-montserrat-bold mb-2 ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {userDetails?.user?.user?.user_name}
                                    </Text>
                                    <View className="flex-row gap-2 items-center bg-primary-100 rounded-full py-2 px-4 self-start">
                                        <Trophy size={16} className="text-primary-500 mr-2" />
                                        <Text className="text-primary-700 font-montserrat-medium">
                                            {userDetails?.user?.user?.points_gained} Points
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Tab Bar */}
                            <View className="mt-6 bg-gray-100 rounded-full p-1 flex-row">
                                {tabs.map((tab) => (
                                    <TouchableOpacity
                                        key={tab.id}
                                        onPress={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-2 rounded-full flex-row items-center justify-center space-x-2 ${
                                            activeTab === tab.id ? 'bg-white shadow' : ''
                                        }`}
                                    >
                                        <tab.icon
                                            size={16}
                                            className={activeTab === tab.id ? 'text-primary-500' : 'text-gray-500'}
                                        />
                                        <Text className={`font-montserrat-medium ${
                                            activeTab === tab.id
                                                ? 'text-primary-500'
                                                : 'text-gray-500'
                                        }`}>
                                            {tab.id}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </MotiView>

                {/* Content based on active tab */}
                <View className="p-4 flex-1">
                    {activeTab === 'Activity' && (
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Add Activity content */}
                        </MotiView>
                    )}

                    {activeTab === 'Achievements' && (
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Add Achievements content */}
                        </MotiView>
                    )}

                    {activeTab === 'Friends' && (
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Add Friends content */}
                        </MotiView>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Profile;