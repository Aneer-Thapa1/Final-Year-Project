import { Image, Text, TouchableOpacity, View, Animated } from 'react-native'
import React, { useRef, useEffect } from 'react'
import { router } from "expo-router"
import { LinearGradient } from 'expo-linear-gradient'
import { Bell } from 'lucide-react-native'
import images from "../constants/images"

const Header = () => {
    // Animation controllers for notification
    const notificationScale = useRef(new Animated.Value(1)).current;
    const notificationShake = useRef(new Animated.Value(0)).current;

    // Animation controllers for quote card
    const quoteOpacity = useRef(new Animated.Value(0)).current;
    const quoteSlide = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        // Initial animation sequence
        Animated.sequence([
            // Pop notification badge
            Animated.spring(notificationScale, {
                toValue: 1.2,
                tension: 100,
                friction: 5,
                useNativeDriver: true,
            }),
            // Show quote with combined animations
            Animated.parallel([
                Animated.timing(quoteOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(quoteSlide, {
                    toValue: 0,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                })
            ])
        ]).start();

        // Setup notification shake animation
        const shakeAnimation = Animated.sequence([
            Animated.timing(notificationShake, {
                toValue: 3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(notificationShake, {
                toValue: -3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(notificationShake, {
                toValue: 3,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(notificationShake, {
                toValue: 0,
                duration: 100,
                useNativeDriver: true,
            })
        ]);

        // Repeat shake every 5 seconds
        const intervalId = setInterval(() => {
            shakeAnimation.start();
        }, 5000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    return (
        <View className="bg-white rounded-b-[60px] h-[135px] relative mb-6">
            {/* Header row */}
            <View className="p-6 flex-row items-center justify-between">
                {/* Profile section */}
                <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    className="flex-row items-center space-x-3 gap-3">
                    <Image
                        source={images.blogImage}
                        className="w-9 h-9 rounded-full"
                    />
                    <Text className="text-xl font-medium text-gray-800">
                        Hi, Anir
                    </Text>
                </TouchableOpacity>

                {/* Notification bell with animated badge */}
                <TouchableOpacity
                    onPress={() => router.push('/notifications')}
                    className="relative p-2 active:opacity-70"
                >
                    <Bell
                        size={24}
                        className="text-gray-700"
                        strokeWidth={2}
                    />
                    <Animated.View
                        className="absolute -top-2 -right-1 bg-primary-500 rounded-full w-5 h-5 items-center justify-center"
                        style={{
                            transform: [
                                { scale: notificationScale },
                                { translateX: notificationShake }
                            ]
                        }}
                    >
                        <Text className="text-white font-bold text-xs">3</Text>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* Animated quote card */}
            <Animated.View
                style={{
                    opacity: quoteOpacity,
                    transform: [{ translateY: quoteSlide }]
                }}
                className='absolute -bottom-14 z-10 '
            >
                <View className="mx-6 mb-4 rounded-2xl">
                    <LinearGradient
                        colors={['#F3E8FF', '#E4D0FF']}
                        className="rounded-2xl overflow-hidden"
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View className="p-4">
                            <Text className="text-primary-700 text-sm font-medium italic leading-6 ml-3 border-l-2 border-primary-300 pl-3">
                                "The only thing necessary for the triumph of evil is for good men to do nothing"
                            </Text>
                            <Text className="text-primary-500 text-xs font-medium mt-2 text-right">
                                - Edmund Burke
                            </Text>
                        </View>
                    </LinearGradient>
                </View>
            </Animated.View>
        </View>
    )
}

export default Header