import {
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    StatusBar,
    useColorScheme,
    Keyboard,
    Alert,
    BackHandler,
    NativeEventSubscription
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { loginUser } from "@/services/userService";
import { useDispatch } from 'react-redux';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginSuccess } from "@/store/slices/userSlice";
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import debounce from 'lodash/debounce';

// Types
interface LoginErrors {
    email: string;
    password: string;
    general: string;
}

// Constants
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PASSWORD_MIN_LENGTH = 8;
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds

// Theme colors
const GRADIENT_COLORS = ['#7C3AED', '#6D28D9']; // Purple gradient

const Login = () => {
    // Theme and System
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const dispatch = useDispatch();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

    // Error and Success States
    const [errors, setErrors] = useState<LoginErrors>({
        email: '',
        password: '',
        general: ''
    });
    const [isSuccess, setIsSuccess] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    // Refs
    const passwordRef = useRef<TextInput>(null);
    const backHandlerRef = useRef<NativeEventSubscription>();
    const loginTimeoutRef = useRef<NodeJS.Timeout>();

    // Network Connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected ?? true);
        });

        return () => unsubscribe();
    }, []);

    // Keyboard Listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Back Handler
    useEffect(() => {
        backHandlerRef.current = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (isLoading) {
                    Alert.alert(
                        'Cancel Login?',
                        'Are you sure you want to cancel the login process?',
                        [
                            { text: 'No', style: 'cancel' },
                            {
                                text: 'Yes',
                                style: 'destructive',
                                onPress: () => {
                                    setIsLoading(false);
                                    return true;
                                }
                            }
                        ]
                    );
                    return true;
                }
                return false;
            }
        );

        return () => {
            backHandlerRef.current?.remove();
        };
    }, [isLoading]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (loginTimeoutRef.current) {
                clearTimeout(loginTimeoutRef.current);
            }
        };
    }, []);

    // Reset form on screen focus
    useFocusEffect(
        useCallback(() => {
            return () => {
                clearForm();
            };
        }, [])
    );

    // Form Validation
    const validateEmail = (email: string): boolean => {
        if (!email) {
            setErrors(prev => ({...prev, email: 'Email is required'}));
            return false;
        }
        if (!EMAIL_REGEX.test(email)) {
            setErrors(prev => ({...prev, email: 'Please enter a valid email'}));
            return false;
        }
        setErrors(prev => ({...prev, email: ''}));
        return true;
    };

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setErrors(prev => ({...prev, password: 'Password is required'}));
            return false;
        }
        if (password.length < PASSWORD_MIN_LENGTH) {
            setErrors(prev => ({
                ...prev,
                password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
            }));
            return false;
        }
        setErrors(prev => ({...prev, password: ''}));
        return true;
    };

    // Handle Login Process
    const handleLogin = async () => {
        try {
            // Dismiss keyboard
            Keyboard.dismiss();

            // Check if user is locked out
            if (lockoutEndTime && Date.now() < lockoutEndTime) {
                const remainingMinutes = Math.ceil((lockoutEndTime - Date.now()) / 1000 / 60);
                setErrors(prev => ({
                    ...prev,
                    general: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`
                }));
                return;
            }

            // Validate inputs
            const isEmailValid = validateEmail(email);
            const isPasswordValid = validatePassword(password);

            if (!isEmailValid || !isPasswordValid) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            // Reset errors
            setErrors({ email: '', password: '', general: '' });
            setIsLoading(true);

            const response = await loginUser({
                userEmail: email.trim().toLowerCase(),
                password: password
            });

            if (response.success) {
                // Reset attempts on successful login
                setLoginAttempts(0);
                setLockoutEndTime(null);

                // Success feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Store token separately
                await AsyncStorage.setItem('token', response.data.token);

                // Prepare flattened user data for Redux
                const userData = {
                    user_id: response.data.user.user_id,
                    user_name: response.data.user.user_name,
                    user_email: response.data.user.user_email,
                    avatar: response.data.user.avatar || null,
                    points_gained: response.data.user.points_gained || 0,
                    theme_preference: response.data.user.theme_preference || 'auto',
                    onVacation: response.data.user.onVacation,
                    dailyGoal: response.data.user.dailyGoal,
                    totalHabitsCompleted: response.data.user.totalHabitsCompleted,
                    currentDailyStreak: response.data.user.currentDailyStreak,
                    totalHabitsCreated: response.data.user.totalHabitsCreated,
                    gender : response.data.user.gender,
                    token: response.data.token
                };


                // Dispatch to Redux with flattened structure
                dispatch(loginSuccess(userData));
                // Navigate after delay
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 1500);
                setIsSuccess(true);
            } else {
                // Handle invalid credentials
                handleInvalidCredentials();
            }
        } catch (error: any) {
            // Handle server/connection errors separately
            if (error?.response?.status === 401) {
                handleInvalidCredentials();
            } else {
                setErrors(prev => ({
                    ...prev,
                    general: "Connection error. Please check your internet and try again."
                }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // New function to handle invalid credentials
    const handleInvalidCredentials = () => {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            // Lock the user out
            setLockoutEndTime(Date.now() + LOCKOUT_DURATION);
            setErrors(prev => ({
                ...prev,
                general: "Too many failed attempts. Please try again in 2 minutes."
            }));
        } else {
            // Show remaining attempts
            setErrors(prev => ({
                ...prev,
                general: `Invalid email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.`
            }));
        }
    };

    // Helper Functions
    const clearForm = () => {
        setEmail('');
        setPassword('');
        setErrors({ email: '', password: '', general: '' });
        setIsSuccess(false);
        setIsLoading(false);
        setLoginAttempts(0);
        setLockoutEndTime(null);
    };

    const handleForgotPassword = debounce(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/forgotPassword');
    }, 300, { leading: true, trailing: false });

    const togglePasswordVisibility = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPassword(!showPassword);
    };

    const handleSignUpPress = debounce(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/signup');
    }, 300, { leading: true, trailing: false });

    return (
        <SafeAreaView className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 bg-theme-background-dark"
            >
                {/* Status bar with matching gradient color */}
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={GRADIENT_COLORS[0]}
                    translucent={false}
                />

                {/* Network Status Warning */}
                {!isOnline && (
                    <MotiView
                        from={{ opacity: 0, translateY: -50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                        className="absolute top-0 left-0 right-0 z-50 bg-error-500 py-2"
                    >
                        <Text className="text-white text-center font-montserrat-medium">
                            No internet connection
                        </Text>
                    </MotiView>
                )}

                {/* Background Gradient */}
                <LinearGradient
                    colors={GRADIENT_COLORS}
                    className={`absolute top-0 left-0 right-0 ${
                        isKeyboardVisible ? 'h-1/2' : 'h-2/3'
                    }`}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View className="absolute bottom-0 left-0 right-0 h-32">
                        <View className="absolute bottom-0 left-0 right-0 h-32 rounded-t-[60px] bg-theme-background-dark" />
                    </View>
                </LinearGradient>

                {/* Main Content */}
                <MotiView
                    from={{ opacity: 0, translateY: 50 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 1000 }}
                    className="flex-1 justify-center px-6"
                >
                    {/* Login Card */}
                    <View className="bg-theme-card-dark/90 backdrop-blur-xl rounded-3xl p-6 shadow-card-dark">
                        {/* Header */}
                        <View className="mb-8">
                            <Text className="text-3xl font-montserrat-bold text-center mb-2 text-theme-text-primary-dark">
                                Welcome Back
                            </Text>
                            <Text className="text-base font-montserrat text-center text-theme-text-secondary-dark">
                                Build better habits, achieve your goals
                            </Text>
                        </View>

                        {/* Email Input */}
                        <View className="mb-4">
                            <View className={`flex-row items-center bg-theme-input-dark rounded-2xl px-4 border ${
                                errors.email ? 'border-error-500' : 'border-theme-border-dark'
                            }`}>
                                <Mail className={`w-5 h-5 ${errors.email ? 'text-error-500' : 'text-primary-400'}`} />
                                <TextInput
                                    className="flex-1 py-4 px-3 font-montserrat text-theme-text-primary-dark"
                                    placeholder="Email"
                                    placeholderTextColor="#94A3B8"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (text) validateEmail(text);
                                    }}
                                    onBlur={() => validateEmail(email)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    blurOnSubmit={false}
                                    accessibilityLabel="Email input"
                                    accessibilityHint="Enter your email address"
                                />
                            </View>
                            {errors.email && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.email}
                                    </Text>
                                </MotiView>
                            )}
                        </View>

                        {/* Password Input */}
                        <View className="mb-6">
                            <View className={`flex-row items-center bg-theme-input-dark rounded-2xl px-4 border ${
                                errors.password ? 'border-error-500' : 'border-theme-border-dark'
                            }`}>
                                <Lock className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`} />
                                <TextInput
                                    ref={passwordRef}
                                    className="flex-1 py-4 px-3 font-montserrat text-theme-text-primary-dark"
                                    placeholder="Password"
                                    placeholderTextColor="#94A3B8"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (text) validatePassword(text);
                                    }}
                                    onBlur={() => validatePassword(password)}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoComplete="password"
                                    returnKeyType="go"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity
                                    onPress={togglePasswordVisibility}
                                    className="p-2"
                                >
                                    {showPassword ? (
                                        <EyeOff className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`} />
                                    ) : (
                                        <Eye className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {errors.password && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.password}
                                    </Text>
                                </MotiView>
                            )}
                        </View>

                        {/* Error Message */}
                        {errors.general && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 p-4 bg-error-500/20 rounded-xl"
                            >
                                <Text className="text-error-500 text-sm font-montserrat text-center">
                                    {errors.general}
                                </Text>
                            </MotiView>
                        )}

                        {/* Success Message */}
                        {isSuccess && (
                            <MotiView
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-6 p-4 bg-success-100 rounded-xl"
                            >
                                <Text className="text-success-600 text-sm font-montserrat text-center">
                                    Login successful! Redirecting...
                                </Text>
                            </MotiView>
                        )}

                        {/* Forgot Password */}
                        <TouchableOpacity
                            onPress={handleForgotPassword}
                            className="mb-4"
                        >
                            <Text className="text-right font-montserrat-medium text-sm text-primary-400">
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>

                        {/* Sign In Button */}
                        <TouchableOpacity
                            className={`bg-primary-500 rounded-2xl py-4 mb-6 shadow-button-light ${
                                isLoading ? 'opacity-70' : ''
                            }`}
                            onPress={handleLogin}
                            disabled={isLoading || !isOnline}
                            activeOpacity={0.8}
                        >
                            <View className="flex-row justify-center items-center">
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-center text-lg font-montserrat-bold">
                                        Sign In
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Sign Up Link */}
                        <View className="flex-row justify-center">
                            <Text className="font-montserrat text-theme-text-muted-dark">
                                Don't have an account?{' '}
                            </Text>
                            <TouchableOpacity onPress={handleSignUpPress}>
                                <Text className="font-montserrat-bold text-primary-400">
                                    Sign Up
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </MotiView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default Login;