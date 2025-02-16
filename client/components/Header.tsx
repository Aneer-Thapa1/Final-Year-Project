import {Animated, Image, Text, TouchableOpacity, useColorScheme, View} from 'react-native'
import React, {useEffect, useRef} from 'react'
import {router} from "expo-router"
import {LinearGradient} from 'expo-linear-gradient'
import {Bell} from 'lucide-react-native'
import images from "../constants/images"
import {useSelector} from 'react-redux'
import {SafeAreaView} from 'react-native-safe-area-context'

const Header = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const notificationScale = useRef(new Animated.Value(1)).current;
    const notificationShake = useRef(new Animated.Value(0)).current;
    const userDetails = useSelector((state) => state.user);
    const quoteOpacity = useRef(new Animated.Value(0)).current;
    const quoteSlide = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        Animated.sequence([Animated.spring(notificationScale, {
            toValue: 1.2, tension: 100, friction: 5, useNativeDriver: true,
        }), Animated.parallel([Animated.timing(quoteOpacity, {
            toValue: 1, duration: 600, useNativeDriver: true,
        }), Animated.spring(quoteSlide, {
            toValue: 0, tension: 50, friction: 7, useNativeDriver: true,
        })])]).start();

        const shakeAnimation = Animated.sequence([Animated.timing(notificationShake, {
            toValue: 3, duration: 100, useNativeDriver: true,
        }), Animated.timing(notificationShake, {
            toValue: -3, duration: 100, useNativeDriver: true,
        }), Animated.timing(notificationShake, {
            toValue: 3, duration: 100, useNativeDriver: true,
        }), Animated.timing(notificationShake, {
            toValue: 0, duration: 100, useNativeDriver: true,
        })]);

        const intervalId = setInterval(() => {
            shakeAnimation.start();
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    return (<View className="mb-10 ">
            <View className={`${isDark ? 'bg-theme-card-dark' : 'bg-white'} rounded-b-[60px]`}>
                <SafeAreaView className={`${isDark ? 'bg-theme-card-dark' : 'bg-white'} rounded-b-[60px]`}>
                    <View className="h-[110px] relative">
                        {/* Header Content */}
                        <View className="p-6 flex-row items-center justify-between">
                            {/* Profile section */}
                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                className="flex-row items-center space-x-3 gap-3"
                            >
                                <Image
                                    source={userDetails?.user?.avatar ? userDetails.user?.avatar : (userDetails?.user?.gender?.toLowerCase() === "male" ? images.maleProfile : images.blogImage)}
                                    className="w-9 h-9 rounded-full"
                                />
                                <Text
                                    className={`text-xl font-medium ${isDark ? 'text-theme-text-primary-dark' : 'text-gray-800'}`}>
                                    Hi, {userDetails?.user?.user_name}
                                </Text>
                            </TouchableOpacity>

                            {/* Notification bell with animated badge */}
                            <TouchableOpacity
                                onPress={() => router.push('/notifications')}
                                className="relative p-2 active:opacity-70"
                            >
                                <Bell
                                    size={24}
                                    color={isDark ? '#E2E8F0' : '#374151'}
                                    strokeWidth={2}
                                />
                                <Animated.View
                                    className="absolute -top-2 -right-1 bg-primary-500 rounded-full w-5 h-5 items-center justify-center"
                                    style={{
                                        transform: [{scale: notificationScale}, {translateX: notificationShake}]
                                    }}
                                >
                                    <Text className="text-white font-bold text-xs">3</Text>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {/* Animated quote card */}
            <Animated.View
                style={{
                    opacity: quoteOpacity, transform: [{translateY: quoteSlide}]
                }}
                className="absolute -bottom-6 z-10 w-full px-4"
            >
                <LinearGradient
                    colors={isDark ? ['#4C1D95', '#5B21B6'] : ['#F3E8FF', '#E4D0FF']}
                    className="rounded-xl overflow-hidden shadow-sm"
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <View className="p-4">
                        <Text
                            className={`text-sm font-medium italic leading-6 ml-2 border-l-[3px] ${isDark ? 'text-theme-text-primary-dark border-primary-400' : 'text-primary-700 border-primary-300'} pl-3`}
                        >
                            "The only thing necessary for the triumph of evil is for good men to do nothing"
                        </Text>
                        <Text
                            className={`text-xs font-medium mt-2 text-right ${isDark ? 'text-primary-400' : 'text-primary-500'}`}
                        >
                            - Edmund Burke
                        </Text>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>);
};

export default Header;