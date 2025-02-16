import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    FlatList,
    useColorScheme,
    Image
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const onboardingData = [
    {
        id: '1',
        title: 'Track Your Progress',
        description: 'Visualize your journey with intuitive dashboards and celebrate every achievement along the way.',
        image: require('../assets/images/onboarding1.png'), // Add your illustrations
        highlight: 'Dashboard & Analytics'
    },
    {
        id: '2',
        title: 'AI-Powered Guidance',
        description: 'Get personalized habit recommendations and real-time support from our intelligent AI coach.',
        image: require('../assets/images/onboarding2.png'),
        highlight: 'Smart Recommendations'
    },
    {
        id: '3',
        title: 'Gamified Experience',
        description: 'Stay motivated with streaks, badges, and points while building lasting habits.',
        image: require('../assets/images/onboarding3.png'),
        highlight: 'Rewards & Achievements'
    },
    {
        id: '4',
        title: 'Community Support',
        description: 'Join a supportive community, share your progress, and inspire others on their journey.',
        image: require('../assets/images/onboarding4.png'),
        highlight: 'Connect & Grow'
    }
];

const Onboarding = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < onboardingData.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true
            });
        } else {
            handleGetStarted();
        }
    };

    const handleGetStarted = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        router.replace('/signup');
    };

    const renderItem = ({ item, index }: { item: typeof onboardingData[0], index: number }) => (
        <View style={{ width }} className="flex-1 items-center px-6">
            {/* Image Container */}
            <MotiView
                from={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 500 }}
                className="w-full aspect-square items-center justify-center mb-8"
            >
                <Image
                    source={item.image}
                    className="w-full h-full"
                    resizeMode="contain"
                />
            </MotiView>

            {/* Text Content */}
            <MotiView
                from={{ opacity: 0, translateY: 50 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 500, delay: 200 }}
                className="items-center"
            >
                <Text className={`text-xs font-montserrat-medium mb-2 ${
                    isDark ? 'text-primary-400' : 'text-primary-500'
                }`}>
                    {item.highlight}
                </Text>
                <Text className={`text-2xl font-montserrat-bold text-center mb-4 ${
                    isDark ? 'text-white' : 'text-gray-900'
                }`}>
                    {item.title}
                </Text>
                <Text className={`text-base font-montserrat text-center ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                    {item.description}
                </Text>
            </MotiView>
        </View>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-white'}`}>
            {/* Skip Button */}
            <TouchableOpacity
                onPress={handleGetStarted}
                className="absolute top-12 right-6 z-10"
            >
                <Text className={`font-montserrat-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                    Skip
                </Text>
            </TouchableOpacity>

            {/* Main Content */}
            <FlatList
                ref={flatListRef}
                data={onboardingData}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
            />

            {/* Bottom Controls */}
            <View className="px-6 pb-8">
                {/* Progress Dots */}
                <View className="flex-row justify-center space-x-2 mb-8">
                    {onboardingData.map((_, index) => (
                        <MotiView
                            key={index}
                            animate={{
                                scale: currentIndex === index ? 1.2 : 1,
                                opacity: currentIndex === index ? 1 : 0.5
                            }}
                            className={`w-2 h-2 rounded-full ${
                                currentIndex === index
                                    ? 'bg-primary-500'
                                    : isDark ? 'bg-gray-600' : 'bg-gray-300'
                            }`}
                        />
                    ))}
                </View>

                {/* Next/Get Started Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    className="bg-primary-500 rounded-2xl py-4 px-6 flex-row items-center justify-center space-x-2"
                >
                    <Text className="text-white font-montserrat-bold text-lg">
                        {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    {currentIndex === onboardingData.length - 1 ? (
                        <ArrowRight size={20} color="white" />
                    ) : (
                        <ChevronRight size={20} color="white" />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default Onboarding;