// app/onboarding.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    FlatList,
    useColorScheme,
    Image,
    StyleSheet,
    ListRenderItem
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingData } from '../constants/onBoarding';

const { width } = Dimensions.get('window');

export interface OnboardingItem {
    id: string;
    title: string;
    description: string;
    image: any;
    highlight: string;
}

const Onboarding = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const flatListRef = useRef<FlatList<OnboardingItem>>(null);
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
        try {
            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
            router.replace('/signup');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    };

    const renderItem: ListRenderItem<OnboardingItem> = ({ item }) => (
        <View style={styles.slide} className="flex-1 items-center px-8">
            {/* Image Container */}
            <MotiView
                from={{
                    opacity: 0,
                    scale: 0.8,
                    translateY: 50
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    translateY: 0
                }}
                transition={{
                    type: 'spring',
                    damping: 15,
                    duration: 800
                }}
                className="w-full aspect-square items-center justify-center mb-10"
            >
                <Image
                    source={item.image}
                    className="w-full h-full"
                    resizeMode="contain"
                />
            </MotiView>

            {/* Text Content */}
            <MotiView
                from={{
                    opacity: 0,
                    translateY: 50,
                    scale: 0.95
                }}
                animate={{
                    opacity: 1,
                    translateY: 0,
                    scale: 1
                }}
                transition={{
                    type: 'timing',
                    duration: 700,
                    delay: 300
                }}
                className="items-center"
            >
                <Text className={`
                    text-sm font-montserrat-semibold mb-3 px-4 py-1.5 rounded-full
                    ${isDark ? 'bg-primary-500/10 text-primary-400' : 'bg-primary-50 text-primary-500'}
                `}>
                    {item.highlight}
                </Text>
                <Text className={`
                    text-3xl font-montserrat-bold text-center mb-4 
                    ${isDark ? 'text-white' : 'text-gray-900'}
                `}>
                    {item.title}
                </Text>
                <Text className={`
                    text-base font-montserrat text-center leading-7
                    ${isDark ? 'text-gray-300' : 'text-gray-600'}
                `}>
                    {item.description}
                </Text>
            </MotiView>
        </View>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-white'}`}>
            {/* Skip Button */}
            <MotiView
                from={{ opacity: 0, translateY: -10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600 }}
                className="absolute top-12 right-6 z-10"
            >
                <TouchableOpacity
                    onPress={handleGetStarted}
                    className={`
                        px-4 py-2 rounded-full
                        ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
                    `}
                >
                    <Text className={`
                        font-montserrat-medium
                        ${isDark ? 'text-gray-300' : 'text-gray-600'}
                    `}>
                        Skip
                    </Text>
                </TouchableOpacity>
            </MotiView>

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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                keyExtractor={item => item.id}
            />

            {/* Bottom Controls */}
            <View className="px-8 pb-10">
                {/* Progress Dots */}
                <View className="flex-row justify-center space-x-3 mb-10">
                    {onboardingData.map((_, index) => (
                        <MotiView
                            key={index}
                            animate={{
                                scale: currentIndex === index ? 1 : 0.8,
                                width: currentIndex === index ? 24 : 8,
                            }}
                            transition={{
                                type: 'spring',
                                damping: 15
                            }}
                            className={`
                                h-2 rounded-full
                                ${currentIndex === index
                                ? 'bg-primary-500'
                                : isDark ? 'bg-gray-700' : 'bg-gray-200'
                            }
                            `}
                        />
                    ))}
                </View>

                {/* Next/Get Started Button */}
                <MotiView
                    animate={{
                        scale: currentIndex === onboardingData.length - 1 ? 1.02 : 1
                    }}
                    transition={{
                        type: 'spring',
                        damping: 15
                    }}
                >
                    <TouchableOpacity
                        onPress={handleNext}
                        className="bg-primary-500 rounded-2xl py-5 flex-row items-center justify-center space-x-2"
                    >
                        <Text className="text-white font-montserrat-bold text-lg">
                            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <MotiView
                            animate={{
                                translateX: currentIndex === onboardingData.length - 1 ? 3 : 0
                            }}
                            transition={{
                                type: 'spring',
                                damping: 15,
                                repeat: currentIndex === onboardingData.length - 1 ? 3 : 0
                            }}
                        >
                            {currentIndex === onboardingData.length - 1 ? (
                                <ArrowRight size={22} color="white" />
                            ) : (
                                <ChevronRight size={22} color="white" />
                            )}
                        </MotiView>
                    </TouchableOpacity>
                </MotiView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    slide: {
        width
    }
});

export default Onboarding;