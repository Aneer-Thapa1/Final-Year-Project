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
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import debounce from 'lodash/debounce';

// Constants
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

interface ForgotPasswordErrors {
    email: string;
    general: string;
}

const ForgotPassword = () => {
    // Theme and System
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Form State
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);

    // Error State
    const [errors, setErrors] = useState<ForgotPasswordErrors>({
        email: '',
        general: ''
    });

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

    // Email Validation
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

    // Handle Password Reset
    const handlePasswordReset = async () => {
        // Reset previous errors
        setErrors({ email: '', general: '' });

        // Validate email
        if (!validateEmail(email)) {
            return;
        }

        // Check online status
        if (!isOnline) {
            setErrors(prev => ({
                ...prev,
                general: 'No internet connection. Please check your network.'
            }));
            return;
        }

        try {
            setIsLoading(true);

            // Simulate password reset API call
            // Replace with actual password reset service
            const resetResponse = await new Promise<{success: boolean, message?: string}>((resolve) => {
                setTimeout(() => {
                    // Simulating a successful reset for demonstration
                    resolve({
                        success: true,
                        message: 'Password reset link sent to your email'
                    });
                }, 2000);
            });

            if (resetResponse.success) {
                setIsSuccess(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Navigate back to login after a delay
                setTimeout(() => {
                    router.back();
                }, 2000);
            } else {
                setErrors(prev => ({
                    ...prev,
                    general: resetResponse.message || 'Failed to send reset link. Please try again.'
                }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                general: 'An unexpected error occurred. Please try again.'
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    // Navigation Handler
    const handleGoBack = debounce(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    }, 300, { leading: true, trailing: false });

    return (
        <SafeAreaView className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 bg-theme-background-dark"
            >
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

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
                    colors={['#7C3AED', '#6D28D9']}
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

                {/* Back Button */}
                <TouchableOpacity
                    onPress={handleGoBack}
                    className="absolute top-4 left-4 z-50 p-2"
                >
                    <ArrowLeft
                        className="text-white"
                        size={24}
                    />
                </TouchableOpacity>

                {/* Main Content */}
                <MotiView
                    from={{ opacity: 0, translateY: 50 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 1000 }}
                    className="flex-1 justify-center px-6"
                >
                    {/* Reset Password Card */}
                    <View className="bg-theme-card-dark/90 backdrop-blur-xl rounded-3xl p-6 shadow-card-dark">
                        {/* Header */}
                        <View className="mb-8">
                            <Text className="text-3xl font-montserrat-bold text-center mb-2 text-theme-text-primary-dark">
                                Reset Password
                            </Text>
                            <Text className="text-base font-montserrat text-center text-theme-text-secondary-dark">
                                Enter your email to reset your password
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
                                    returnKeyType="send"
                                    onSubmitEditing={handlePasswordReset}
                                    accessibilityLabel="Email input"
                                    accessibilityHint="Enter your email to reset password"
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
                                    Password reset link sent! Redirecting...
                                </Text>
                            </MotiView>
                        )}

                        {/* Send Reset Link Button */}
                        <TouchableOpacity
                            className={`bg-primary-500 rounded-2xl py-4 mb-6 shadow-button-light ${
                                isLoading ? 'opacity-70' : ''
                            }`}
                            onPress={handlePasswordReset}
                            disabled={isLoading || !isOnline}
                            activeOpacity={0.8}
                        >
                            <View className="flex-row justify-center items-center">
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white text-center text-lg font-montserrat-bold">
                                        Send Reset Link
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Back to Login */}
                        <View className="flex-row justify-center">
                            <Text className="font-montserrat text-theme-text-muted-dark">
                                Remember your password?{' '}
                            </Text>
                            <TouchableOpacity onPress={handleGoBack}>
                                <Text className="font-montserrat-bold text-primary-400">
                                    Back to Login
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </MotiView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ForgotPassword;