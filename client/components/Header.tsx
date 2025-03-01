import {Animated, Image, Text, TouchableOpacity, useColorScheme, View, Platform} from 'react-native'
import React, {useEffect, useRef} from 'react'
import {router} from "expo-router"
import {LinearGradient} from 'expo-linear-gradient'
import {Bell, Brain} from 'lucide-react-native'
import images from "../constants/images"
import {useSelector} from 'react-redux'
import {SafeAreaView} from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'

const Header = React.memo(() => {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'

    const notificationScale = useRef(new Animated.Value(1)).current
    const notificationShake = useRef(new Animated.Value(0)).current
    const userDetails = useSelector((state) => state.user)
    const quoteOpacity = useRef(new Animated.Value(0)).current
    const quoteSlide = useRef(new Animated.Value(10)).current
    const robotPulse = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Initial animations
        Animated.sequence([
            Animated.spring(notificationScale, {
                toValue: 1.2,
                tension: 100,
                friction: 5,
                useNativeDriver: true,
            }),
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
        ]).start()

        // Robot pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(robotPulse, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(robotPulse, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                })
            ])
        ).start()

        // Notification shake animation
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
        ])

        const intervalId = setInterval(() => {
            shakeAnimation.start()
        }, 5000)

        return () => clearInterval(intervalId)
    }, [])

    const fallbackAvatar = userDetails?.user?.gender?.toLowerCase() === "male"
        ? images.maleProfile
        : images.blogImage

    const pulseOpacity = robotPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1]
    })

    return (
        <View className={`mb-${Platform.OS === 'ios' ? '10' : '5'} relative`}>
            <View className={`${isDark ? 'bg-theme-card-dark' : 'bg-white'} ${Platform.OS === 'ios' ? 'rounded-b-[60px]' : 'rounded-b-[30px]'} ${Platform.OS === 'android' ? 'shadow-lg' : ''}`}>
                <SafeAreaView className={`${isDark ? 'bg-theme-card-dark' : 'bg-white'} ${Platform.OS === 'ios' ? 'rounded-b-[60px]' : 'rounded-b-[30px]'}`}>
                    <View className={`relative ${Platform.OS === 'ios' ? 'h-[110px]' : 'h-[150px]'} px-${Platform.OS === 'ios' ? '6' : '4'} py-${Platform.OS === 'ios' ? '6' : '3'}`}>
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                className={`flex-row items-center gap-3 ${Platform.OS === 'android' ? 'p-1' : ''}`}
                            >
                                <Image
                                    source={userDetails?.user?.avatar || fallbackAvatar}
                                    className="w-9 h-9 rounded-full"
                                />
                                <Text className={`text-xl ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat-bold'} ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                    Hi, {userDetails?.user?.user_name}
                                </Text>
                            </TouchableOpacity>

                            <View className="flex-row items-center gap-4 pr-1">
                                <TouchableOpacity
                                    onPress={() => router.push('/notifications')}
                                    className="relative p-2"
                                >
                                    <Bell
                                        size={24}
                                        color={isDark ? '#E2E8F0' : '#374151'}
                                        strokeWidth={2}
                                    />
                                    <Animated.View
                                        className={`absolute -top-2 -right-1 bg-secondary-500 rounded-full w-5 h-5 items-center justify-center ${Platform.OS === 'android' ? 'shadow-md' : ''}`}
                                        style={{
                                            transform: [
                                                {scale: notificationScale},
                                                {translateX: notificationShake}
                                            ]
                                        }}
                                    >
                                        <Text className={`text-white ${Platform.OS === 'ios' ? 'font-montserrat-bold' : 'font-montserrat-extrabold'} text-xs`}>3</Text>
                                    </Animated.View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => router.push('/chatbot')}
                                    className={`p-2 ml-2 rounded-xl ${isDark ? 'bg-secondary-900/10' : 'bg-secondary-300/10'} ${Platform.OS === 'android' ? 'shadow' : ''}`}
                                >
                                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                                        <Brain size={18} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <Animated.View
                className={`absolute ${Platform.OS === 'ios' ? '-bottom-6' : '-bottom-4'} z-10 w-full px-4`}
                style={{
                    opacity: quoteOpacity,
                    transform: [{translateY: quoteSlide}]
                }}
            >
                <LinearGradient
                    colors={isDark ? ['#4C1D95', '#5B21B6'] : ['#F3E8FF', '#E4D0FF']}
                    className={`rounded-xl overflow-hidden ${Platform.OS === 'android' ? 'shadow-md' : 'shadow-sm'}`}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <View className="p-4">
                        <Text className={`text-sm ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat'} italic leading-6 ml-2 border-l-[3px] ${
                            isDark ? 'text-theme-text-primary-dark border-secondary-400' : 'text-secondary-700 border-secondary-300'
                        } pl-3`}>
                            "The only thing necessary for the triumph of evil is for good men to do nothing"
                        </Text>
                        <Text className={`text-xs ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat-bold'} mt-2 text-right ${
                            isDark ? 'text-secondary-400' : 'text-secondary-500'
                        }`}>
                            - Edmund Burke
                        </Text>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View>
    )
})

export default Header