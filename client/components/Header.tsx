import {Animated, Image, Text, TouchableOpacity, useColorScheme, View, Platform} from 'react-native'
import React, {useEffect, useRef, useState} from 'react'
import {router} from "expo-router"
import {LinearGradient} from 'expo-linear-gradient'
import {Bell, MessageCircle} from 'lucide-react-native'
import images from "../constants/images"
import {useSelector} from 'react-redux'
import {SafeAreaView} from 'react-native-safe-area-context'

// Array of motivational quotes
const quotes = [
    // Original
    { text: "The only thing necessary for the triumph of evil is for good men to do nothing", author: "Edmund Burke" },
    { text: "Success is not final, failure is not fatal: It is the courage to continue that counts", author: "Winston Churchill" },
    { text: "The way to get started is to quit talking and begin doing", author: "Walt Disney" },
    { text: "It does not matter how slowly you go as long as you do not stop", author: "Confucius" },
    { text: "Success is stumbling from failure to failure with no loss of enthusiasm", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there", author: "Theodore Roosevelt" },
    { text: "Don't watch the clock; do what it does. Keep going", author: "Sam Levenson" },
    { text: "The future belongs to those who believe in the beauty of their dreams", author: "Eleanor Roosevelt" },

    // Habit & Motivation
    { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { text: "Your habits will determine your future.", author: "Jack Canfield" },
    { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { text: "The secret of your future is hidden in your daily routine.", author: "Mike Murdock" },
    { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
    { text: "First we make our habits, then our habits make us.", author: "Charles C. Noble" },
    { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
    { text: "You’ll never change your life until you change something you do daily.", author: "John C. Maxwell" },
    { text: "Success doesn't come from what you do occasionally, it comes from what you do consistently.", author: "Marie Forleo" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "Good habits are worth being fanatical about.", author: "John Irving" },

    // Productivity
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
    { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },

    // Growth & Mindset
    { text: "Every strike brings me closer to the next home run.", author: "Babe Ruth" },
    { text: "Don’t be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { text: "All progress takes place outside the comfort zone.", author: "Michael John Bobak" },
    { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford" },
    { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
    { text: "Perseverance is not a long race; it's many short races one after the other.", author: "Walter Elliot" },

    // Resilience & Discipline
    { text: "Strength does not come from winning. Your struggles develop your strengths.", author: "Arnold Schwarzenegger" },
    { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
    { text: "Don’t count the days, make the days count.", author: "Muhammad Ali" },
    { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen R. Covey" },
    { text: "You miss 100% of the shots you don’t take.", author: "Wayne Gretzky" },
    { text: "Discipline is the silent force at work that breeds success.", author: "Unknown" },

    // Purpose & Focus
    { text: "Clarity precedes success.", author: "Robin Sharma" },
    { text: "When your why is strong enough, you will find your how.", author: "Unknown" },
    { text: "If you want to change the world, change yourself.", author: "Mahatma Gandhi" },
    { text: "Don’t let what you cannot do interfere with what you can do.", author: "John Wooden" },
    { text: "If you spend too much time thinking about a thing, you’ll never get it done.", author: "Bruce Lee" },
    { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Be not afraid of going slowly. Be afraid only of standing still.", author: "Chinese Proverb" },

    // Mindfulness & Present Focus
    { text: "One day or day one. You decide.", author: "Unknown" },
    { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
    { text: "The best way to predict the future is to create it.", author: "Peter Drucker" }
];


const Header = React.memo(() => {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'

    const notificationScale = useRef(new Animated.Value(1)).current
    const notificationShake = useRef(new Animated.Value(0)).current
    const userDetails = useSelector((state) => state.user)
    const quoteOpacity = useRef(new Animated.Value(0)).current
    const quoteSlide = useRef(new Animated.Value(10)).current
    const chatPulse = useRef(new Animated.Value(0)).current

    // State to track the current quote
    const [currentQuote, setCurrentQuote] = useState(quotes[0]);
    // Animation values for quote transition
    const quoteTransition = useRef(new Animated.Value(1)).current;

    // Function to change the quote with animation
    const changeQuote = () => {
        // Fade out current quote
        Animated.timing(quoteTransition, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start(() => {
            // Change quote
            const nextQuoteIndex = (quotes.findIndex(q => q.text === currentQuote.text) + 1) % quotes.length;
            setCurrentQuote(quotes[nextQuoteIndex]);

            // Fade in new quote
            Animated.timing(quoteTransition, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }).start();
        });
    };

    useEffect(() => {
        // Set an initial random quote
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setCurrentQuote(quotes[randomIndex]);

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

        // Chat pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(chatPulse, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(chatPulse, {
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

        // Set an interval to change the quote every 20 seconds
        const quoteIntervalId = setInterval(() => {
            changeQuote();
        }, 20000);

        return () => {
            clearInterval(intervalId);
            clearInterval(quoteIntervalId);
        }
    }, [])

    const fallbackAvatar = userDetails?.user?.gender?.toLowerCase() === "male"
        ? images.maleProfile
        : images.blogImage

    const pulseOpacity = chatPulse.interpolate({
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
                                    source={userDetails?.user?.avatar || fallbackAvatar || userDetails?.user?.user?.avatar }
                                    className="w-9 h-9 rounded-full"
                                />
                                <Text className={`text-xl ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat-bold'} ${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`}>
                                    Hi, {userDetails?.user?.user?.user_name || userDetails?.user?.user_name}
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
                                    onPress={() => router.push('/chat')}
                                    className={`p-2 ml-2 rounded-xl ${Platform.OS === 'android' ? 'shadow' : ''}`}
                                >
                                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                                        <MessageCircle size={18} color={isDark ? '#C4B5FD' : '#7C3AED'} />
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
                <TouchableOpacity onPress={changeQuote} activeOpacity={0.8}>
                    <LinearGradient
                        colors={isDark ? ['#4C1D95', '#5B21B6'] : ['#F3E8FF', '#E4D0FF']}
                        className={`rounded-xl overflow-hidden ${Platform.OS === 'android' ? 'shadow-md' : 'shadow-sm'}`}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    >
                        <View className="p-4">
                            <Animated.View style={{ opacity: quoteTransition }}>
                                <Text className={`text-sm ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat'} italic leading-6 ml-2 border-l-[3px] ${
                                    isDark ? 'text-theme-text-primary-dark border-secondary-400' : 'text-secondary-700 border-secondary-300'
                                } pl-3`}>
                                    "{currentQuote.text}"
                                </Text>
                                <Text className={`text-xs ${Platform.OS === 'ios' ? 'font-montserrat-medium' : 'font-montserrat-bold'} mt-2 text-right ${
                                    isDark ? 'text-secondary-400' : 'text-secondary-500'
                                }`}>
                                    - {currentQuote.author}
                                </Text>
                            </Animated.View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    )
})

export default Header