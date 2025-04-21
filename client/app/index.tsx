import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationManager from '../services/NotificationManager';
import { registerPushToken } from '../services/PushTokenService';

const SplashScreen = () => {
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pulse1Anim = useRef(new Animated.Value(0.6)).current;
    const pulse2Anim = useRef(new Animated.Value(0.7)).current;
    const pulse3Anim = useRef(new Animated.Value(0.8)).current;
    const textSlideAnim = useRef(new Animated.Value(20)).current;
    const textFadeAnim = useRef(new Animated.Value(0)).current;

    // For auth checking
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check authentication status
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check if user is logged in
                const userToken = await AsyncStorage.getItem('token');
                setIsAuthenticated(userToken !== null);
                setAuthChecked(true);
            } catch (error) {
                console.error('Error checking authentication:', error);
                setAuthChecked(true); // Still mark as checked even if there's an error
            }
        };

        checkAuth();
    }, []);

    // Setup notifications and animations
    useEffect(() => {
        // Initialize notifications
        const setupNotifications = async () => {
            try {
                // Request permissions and get push token
                const token = await NotificationManager.requestPermissions();

                // Only register token if user is authenticated
                if (token && isAuthenticated) {
                    // Store token locally for future reference
                    await AsyncStorage.setItem('pushToken', token);

                    // Register token with backend
                    await registerPushToken(token);
                    console.log('Push token registered with backend successfully');
                }
            } catch (error) {
                console.log('Error setting up notifications:', error);
            }
        };

        // Only call this if auth status is determined
        if (authChecked) {
            setupNotifications();
        }

        // Flame rotation animation
        const rotate = Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
        });

        // Start animations
        Animated.parallel([
            // Fade in the whole logo
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic)
            }),
            // Scale up the logo
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
                easing: Easing.out(Easing.back(1.2))
            }),
            // Subtle flame rotation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    }),
                    Animated.timing(rotateAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    })
                ])
            ),
            // Create pulsing effect for circles
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse1Anim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    }),
                    Animated.timing(pulse1Anim, {
                        toValue: 0.6,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    })
                ])
            ),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse2Anim, {
                        toValue: 1,
                        duration: 1500,
                        delay: 200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    }),
                    Animated.timing(pulse2Anim, {
                        toValue: 0.7,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    })
                ])
            ),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse3Anim, {
                        toValue: 1,
                        duration: 1500,
                        delay: 400,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    }),
                    Animated.timing(pulse3Anim, {
                        toValue: 0.8,
                        duration: 1500,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.cubic)
                    })
                ])
            ),
            // Text animations
            Animated.timing(textSlideAnim, {
                toValue: 0,
                duration: 800,
                delay: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic)
            }),
            Animated.timing(textFadeAnim, {
                toValue: 1,
                duration: 800,
                delay: 400,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic)
            })
        ]).start();

        // Redirect after 5 seconds
        const redirectTimer = setTimeout(() => {
            if (authChecked) {
                // Navigate based on auth status
                if (isAuthenticated) {
                    router.replace('/dashboard');
                } else {
                    router.replace('/login');
                }
            }
        }, 5000);

        // Clean up timer on unmount
        return () => clearTimeout(redirectTimer);
    }, [fadeAnim, scaleAnim, rotateAnim, pulse1Anim, pulse2Anim, pulse3Anim, textSlideAnim, textFadeAnim, authChecked, isAuthenticated]);

    // If auth check completes before animation finishes, redirect will happen when the timer expires
    // If animation finishes before auth check, we need to redirect once auth check is done
    useEffect(() => {
        if (authChecked) {
            const delayedRedirect = setTimeout(() => {
                if (isAuthenticated) {
                    router.replace('/dashboard');
                } else {
                    router.replace('/login');
                }
            }, 5000); // Still give time for animations to play

            return () => clearTimeout(delayedRedirect);
        }
    }, [authChecked, isAuthenticated]);

    // Convert rotation value to degrees for animation
    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-5deg', '5deg']
    });

    return (
        <View style={styles.container}>
            <StatusBar style="auto" />

            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <View style={styles.logoIconContainer}>
                    {/* Pulse animation circles */}
                    <Animated.View
                        style={[
                            styles.pulseCircle,
                            styles.pulse1,
                            { transform: [{ scale: pulse1Anim }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.pulseCircle,
                            styles.pulse2,
                            { transform: [{ scale: pulse2Anim }] }
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.pulseCircle,
                            styles.pulse3,
                            { transform: [{ scale: pulse3Anim }] }
                        ]}
                    />

                    {/* Fire icon representing streak with rotation */}
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <View style={styles.iconGlow}>
                            <Ionicons name="flame" size={54} color="#F59E0B" />
                        </View>
                    </Animated.View>
                </View>

                <Animated.View style={{
                    opacity: textFadeAnim,
                    transform: [{ translateY: textSlideAnim }]
                }}>
                    <Text style={styles.logoText}>HabitPulse</Text>
                    <Text style={styles.tagline}>Build better habits, one day at a time</Text>
                </Animated.View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0FDF4', // primary-50 from your theme
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoIconContainer: {
        position: 'relative',
        width: 130,
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    pulseCircle: {
        position: 'absolute',
        borderRadius: 65,
    },
    pulse1: {
        width: 120,
        height: 120,
        backgroundColor: 'rgba(245, 158, 11, 0.15)', // accent-500 with opacity
    },
    pulse2: {
        width: 100,
        height: 100,
        backgroundColor: 'rgba(245, 158, 11, 0.25)', // accent-500 with opacity
    },
    pulse3: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(245, 158, 11, 0.35)', // accent-500 with opacity
    },
    iconGlow: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    logoText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#15803D', // primary-700 from your theme
        marginBottom: 12,
        letterSpacing: 0.5,
        textAlign: 'center',
        textShadowColor: 'rgba(34, 197, 94, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10
    },
    tagline: {
        fontSize: 18,
        color: '#166534', // primary-800 from your theme
        textAlign: 'center',
    },
});

export default SplashScreen;