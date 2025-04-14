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
    ScrollView,
    Alert
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Mail, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import debounce from 'lodash/debounce';
import { requestPasswordResetOTP, verifyOTP, resetPassword } from '@/services/userService';

// Constants
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const GRADIENT_COLORS = ['#7C3AED', '#6D28D9']; // Purple gradient
const OTP_EXPIRY_SECONDS = 90; // OTP expires in 90 seconds

// Stages of the password reset flow
enum ResetStage {
    REQUEST_OTP,
    VERIFY_OTP,
    RESET_PASSWORD,
    COMPLETE
}

interface ResetErrors {
    email: string;
    otp: string;
    password: string;
    confirmPassword: string;
    general: string;
}

const ForgotPassword = () => {
    // Theme and System
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Stage tracking
    const [resetStage, setResetStage] = useState<ResetStage>(ResetStage.REQUEST_OTP);

    // Form State
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);

    // OTP timer state
    const [otpTimer, setOtpTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Refs
    const otpInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Error State
    const [errors, setErrors] = useState<ResetErrors>({
        email: '',
        otp: '',
        password: '',
        confirmPassword: '',
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

    // Handle OTP timer
    useEffect(() => {
        if (isTimerRunning && otpTimer > 0) {
            timerRef.current = setTimeout(() => {
                setOtpTimer(prev => prev - 1);
            }, 1000);
        } else if (otpTimer === 0 && isTimerRunning) {
            setIsTimerRunning(false);

            // Show alert when OTP expires
            if (resetStage === ResetStage.VERIFY_OTP) {
                Alert.alert(
                    "OTP Expired",
                    "Your verification code has expired. Please request a new one.",
                    [
                        {
                            text: "Request New Code",
                            onPress: () => setResetStage(ResetStage.REQUEST_OTP)
                        }
                    ]
                );
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [otpTimer, isTimerRunning, resetStage]);

    // Start OTP timer
    const startOtpTimer = () => {
        setOtpTimer(OTP_EXPIRY_SECONDS);
        setIsTimerRunning(true);
    };

    // Form Validation Functions
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

    const validateOtp = (otp: string): boolean => {
        if (!otp) {
            setErrors(prev => ({...prev, otp: 'Verification code is required'}));
            return false;
        }
        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            setErrors(prev => ({...prev, otp: 'Please enter a valid 6-digit code'}));
            return false;
        }
        setErrors(prev => ({...prev, otp: ''}));
        return true;
    };

    const validatePassword = (password: string): boolean => {
        if (!password) {
            setErrors(prev => ({...prev, password: 'Password is required'}));
            return false;
        }
        if (password.length < 8) {
            setErrors(prev => ({...prev, password: 'Password must be at least 8 characters'}));
            return false;
        }
        setErrors(prev => ({...prev, password: ''}));
        return true;
    };

    const validateConfirmPassword = (confirmPass: string): boolean => {
        if (!confirmPass) {
            setErrors(prev => ({...prev, confirmPassword: 'Please confirm your password'}));
            return false;
        }
        if (confirmPass !== password) {
            setErrors(prev => ({...prev, confirmPassword: 'Passwords do not match'}));
            return false;
        }
        setErrors(prev => ({...prev, confirmPassword: ''}));
        return true;
    };

    // Handle Password Reset Flow

    // STEP 1: Request OTP
    const handleRequestOTP = async () => {
        // Reset errors
        setErrors(prev => ({...prev, email: '', general: ''}));

        // Validate email
        if (!validateEmail(email)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Check online status
        if (!isOnline) {
            setErrors(prev => ({
                ...prev,
                general: 'No internet connection. Please check your network.'
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            setIsLoading(true);
            Keyboard.dismiss();

            // Use the service function to request OTP
            const response = await requestPasswordResetOTP(email);

            if (response.success) {
                // Start the OTP timer
                startOtpTimer();

                // Clear OTP field if user is returning to this stage
                setOtp('');

                // Move to OTP verification stage
                setResetStage(ResetStage.VERIFY_OTP);

                // Focus the OTP input when it becomes available
                setTimeout(() => {
                    otpInputRef.current?.focus();
                }, 100);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setErrors(prev => ({...prev, general: 'Failed to send verification code. Please try again.'}));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error: any) {
            setErrors(prev => ({...prev, general: error.toString()}));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    // STEP 2: Verify OTP
    const handleVerifyOTP = async () => {
        // Reset errors
        setErrors(prev => ({...prev, otp: '', general: ''}));

        // Validate OTP
        if (!validateOtp(otp)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        // Check if OTP timer is still running
        if (!isTimerRunning) {
            setErrors(prev => ({...prev, general: 'Verification code has expired. Please request a new one.'}));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            setIsLoading(true);
            Keyboard.dismiss();

            // Use the service function to verify OTP
            const response = await verifyOTP(email, otp);

            if (response.success) {
                // Store the reset token for password reset
                setResetToken(response.data.resetToken);

                // Clear password fields
                setPassword('');
                setConfirmPassword('');

                // Move to password reset stage
                setResetStage(ResetStage.RESET_PASSWORD);

                // Focus the password input when it becomes available
                setTimeout(() => {
                    passwordInputRef.current?.focus();
                }, 100);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setErrors(prev => ({...prev, general: 'Invalid verification code. Please try again.'}));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error: any) {
            setErrors(prev => ({...prev, general: error.toString()}));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    // STEP 3: Reset Password
    const handleResetPassword = async () => {
        // Reset errors
        setErrors(prev => ({...prev, password: '', confirmPassword: '', general: ''}));

        // Validate password fields
        const isPasswordValid = validatePassword(password);
        const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

        if (!isPasswordValid || !isConfirmPasswordValid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            setIsLoading(true);
            Keyboard.dismiss();

            // Use the service function to reset password
            const response = await resetPassword(resetToken, password);

            if (response.success) {
                // Move to completion stage
                setResetStage(ResetStage.COMPLETE);
                setIsSuccess(true);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Navigate back to login after a delay
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                setErrors(prev => ({...prev, general: 'Failed to reset password. Please try again.'}));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } catch (error: any) {
            setErrors(prev => ({...prev, general: error.toString()}));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    // Navigation Handlers
    const handleGoBack = debounce(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (resetStage === ResetStage.REQUEST_OTP) {
            router.back(); // Go back to login
        } else {
            // Go back to previous stage in the flow
            setResetStage(prev => prev - 1);

            // Clear stage-specific errors
            if (resetStage === ResetStage.VERIFY_OTP) {
                setErrors(prev => ({...prev, otp: '', general: ''}));
            } else if (resetStage === ResetStage.RESET_PASSWORD) {
                setErrors(prev => ({...prev, password: '', confirmPassword: '', general: ''}));
            }
        }
    }, 300, { leading: true, trailing: false });

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPassword(!showPassword);
    };

    // Format timer for display
    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Get stage-specific title and description
    const getStageText = () => {
        switch (resetStage) {
            case ResetStage.REQUEST_OTP:
                return {
                    title: "Reset Password",
                    description: "Enter your email to receive a verification code"
                };
            case ResetStage.VERIFY_OTP:
                return {
                    title: "Verify Code",
                    description: `Enter the 6-digit code sent to ${email}`
                };
            case ResetStage.RESET_PASSWORD:
                return {
                    title: "New Password",
                    description: "Create a new password for your account"
                };
            case ResetStage.COMPLETE:
                return {
                    title: "Success!",
                    description: "Your password has been reset successfully"
                };
        }
    };

    // Get primary button text based on current stage
    const getPrimaryButtonText = () => {
        switch (resetStage) {
            case ResetStage.REQUEST_OTP:
                return "Send Verification Code";
            case ResetStage.VERIFY_OTP:
                return "Verify Code";
            case ResetStage.RESET_PASSWORD:
                return "Reset Password";
            case ResetStage.COMPLETE:
                return "Back to Login";
        }
    };

    // Get action for primary button
    const handlePrimaryAction = () => {
        switch (resetStage) {
            case ResetStage.REQUEST_OTP:
                return handleRequestOTP();
            case ResetStage.VERIFY_OTP:
                return handleVerifyOTP();
            case ResetStage.RESET_PASSWORD:
                return handleResetPassword();
            case ResetStage.COMPLETE:
                return router.push('/login');
        }
    };

    const { title, description } = getStageText();

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#F9FAFB' }}
            >
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={GRADIENT_COLORS[0]}
                />

                {/* Network Status Warning */}
                {!isOnline && (
                    <MotiView
                        from={{ opacity: 0, translateY: -50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            backgroundColor: '#EF4444',
                            paddingVertical: 8
                        }}
                    >
                        <Text style={{
                            color: 'white',
                            textAlign: 'center',
                            fontFamily: 'Montserrat-Medium'
                        }}>
                            No internet connection
                        </Text>
                    </MotiView>
                )}

                {/* Background Gradient */}
                <LinearGradient
                    colors={GRADIENT_COLORS}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: isKeyboardVisible ? '50%' : '65%'
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 32
                    }}>
                        <View style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 32,
                            borderTopLeftRadius: 32,
                            borderTopRightRadius: 32,
                            backgroundColor: isDark ? '#121212' : '#F9FAFB'
                        }} />
                    </View>
                </LinearGradient>

                {/* Back Button */}
                <TouchableOpacity
                    onPress={handleGoBack}
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        zIndex: 50,
                        padding: 8,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: 12
                    }}
                >
                    <ArrowLeft
                        color="white"
                        size={24}
                    />
                </TouchableOpacity>

                {/* Main Content */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    keyboardShouldPersistTaps="handled"
                >
                    <MotiView
                        from={{ opacity: 0, translateY: 50 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 800 }}
                        style={{ paddingHorizontal: 24, paddingVertical: 16 }}
                    >
                        {/* Reset Password Card */}
                        <View style={{
                            backgroundColor: isDark ? 'rgba(30, 31, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            borderRadius: 28,
                            padding: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 10 },
                            shadowOpacity: isDark ? 0.25 : 0.1,
                            shadowRadius: 20,
                            elevation: 5
                        }}>
                            {/* Header */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{
                                    fontSize: 28,
                                    fontFamily: 'Montserrat-Bold',
                                    textAlign: 'center',
                                    marginBottom: 8,
                                    color: isDark ? '#F1F5F9' : '#1E293B'
                                }}>
                                    {title}
                                </Text>
                                <Text style={{
                                    fontSize: 16,
                                    fontFamily: 'Montserrat',
                                    textAlign: 'center',
                                    color: isDark ? '#94A3B8' : '#64748B'
                                }}>
                                    {description}
                                </Text>

                                {/* OTP Timer */}
                                {resetStage === ResetStage.VERIFY_OTP && isTimerRunning && (
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        marginTop: 8
                                    }}>
                                        <Text style={{
                                            fontFamily: 'Montserrat-Medium',
                                            color: isDark ? '#A78BFA' : '#7C3AED',
                                            fontSize: 14
                                        }}>
                                            Code expires in {formatTimer(otpTimer)}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Input Fields Based on Stage */}
                            {resetStage === ResetStage.REQUEST_OTP && (
                                <View style={{ marginBottom: 16 }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: isDark ? 'rgba(39, 39, 45, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                                        borderRadius: 16,
                                        paddingHorizontal: 16,
                                        borderWidth: 1,
                                        borderColor: errors.email ? '#EF4444' : isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'
                                    }}>
                                        <Mail color={errors.email ? '#EF4444' : '#7C3AED'} size={20} />
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                paddingVertical: 16,
                                                paddingHorizontal: 12,
                                                fontFamily: 'Montserrat',
                                                color: isDark ? '#F1F5F9' : '#1E293B',
                                                fontSize: 16
                                            }}
                                            placeholder="Email"
                                            placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
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
                                            onSubmitEditing={handleRequestOTP}
                                        />
                                    </View>
                                    {errors.email && (
                                        <MotiView
                                            from={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            style={{ marginTop: 4, marginLeft: 16 }}
                                        >
                                            <Text style={{ color: '#EF4444', fontSize: 14, fontFamily: 'Montserrat' }}>
                                                {errors.email}
                                            </Text>
                                        </MotiView>
                                    )}
                                </View>
                            )}

                            {resetStage === ResetStage.VERIFY_OTP && (
                                <View style={{ marginBottom: 16 }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: isDark ? 'rgba(39, 39, 45, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                                        borderRadius: 16,
                                        paddingHorizontal: 16,
                                        borderWidth: 1,
                                        borderColor: errors.otp ? '#EF4444' : isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'
                                    }}>
                                        <TextInput
                                            ref={otpInputRef}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 16,
                                                paddingHorizontal: 12,
                                                fontFamily: 'Montserrat',
                                                color: isDark ? '#F1F5F9' : '#1E293B',
                                                fontSize: 16,
                                                textAlign: 'center',
                                                letterSpacing: 8
                                            }}
                                            placeholder="6-digit code"
                                            placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                                            value={otp}
                                            onChangeText={(text) => {
                                                // Only allow digits
                                                const newText = text.replace(/[^0-9]/g, '');

                                                // Limit to 6 digits
                                                if (newText.length <= 6) {
                                                    setOtp(newText);
                                                }

                                                // Automatically submit when 6 digits are entered
                                                if (newText.length === 6) {
                                                    setOtp(newText);
                                                    setTimeout(() => handleVerifyOTP(), 300);
                                                }
                                            }}
                                            keyboardType="number-pad"
                                            returnKeyType="send"
                                            maxLength={6}
                                            onSubmitEditing={handleVerifyOTP}
                                        />
                                    </View>
                                    {errors.otp && (
                                        <MotiView
                                            from={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            style={{ marginTop: 4, marginLeft: 16 }}
                                        >
                                            <Text style={{ color: '#EF4444', fontSize: 14, fontFamily: 'Montserrat' }}>
                                                {errors.otp}
                                            </Text>
                                        </MotiView>
                                    )}

                                    {/* Resend OTP */}
                                    <TouchableOpacity
                                        onPress={handleRequestOTP}
                                        disabled={isTimerRunning || isLoading}
                                        style={{
                                            marginTop: 8,
                                            alignSelf: 'center'
                                        }}
                                    >
                                        <Text style={{
                                            fontFamily: 'Montserrat-Medium',
                                            color: isTimerRunning ? (isDark ? '#64748B' : '#94A3B8') : (isDark ? '#A78BFA' : '#7C3AED'),
                                            fontSize: 14
                                        }}>
                                            {isTimerRunning ? 'Resend code after timer expires' : 'Resend verification code'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {resetStage === ResetStage.RESET_PASSWORD && (
                                <View>
                                    {/* New Password */}
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: isDark ? 'rgba(39, 39, 45, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                                            borderRadius: 16,
                                            paddingHorizontal: 16,
                                            borderWidth: 1,
                                            borderColor: errors.password ? '#EF4444' : isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'
                                        }}>
                                            <Lock color={errors.password ? '#EF4444' : '#7C3AED'} size={20} />
                                            <TextInput
                                                ref={passwordInputRef}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 16,
                                                    paddingHorizontal: 12,
                                                    fontFamily: 'Montserrat',
                                                    color: isDark ? '#F1F5F9' : '#1E293B',
                                                    fontSize: 16
                                                }}
                                                placeholder="New Password"
                                                placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                                                value={password}
                                                onChangeText={(text) => {
                                                    setPassword(text);
                                                    if (text) validatePassword(text);
                                                    // Re-validate confirm password if it exists
                                                    if (confirmPassword) validateConfirmPassword(confirmPassword);
                                                }}
                                                secureTextEntry={!showPassword}
                                                returnKeyType="next"
                                                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                                            />
                                            <TouchableOpacity
                                                onPress={togglePasswordVisibility}
                                                style={{ padding: 8 }}
                                            >
                                                {showPassword ? (
                                                    <EyeOff color="#7C3AED" size={20} />
                                                ) : (
                                                    <Eye color="#7C3AED" size={20} />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        {errors.password && (
                                            <MotiView
                                                from={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{ marginTop: 4, marginLeft: 16 }}
                                            >
                                                <Text style={{ color: '#EF4444', fontSize: 14, fontFamily: 'Montserrat' }}>
                                                    {errors.password}
                                                </Text>     </MotiView>
                                        )}
                                    </View>

                                    {/* Confirm Password */}
                                    <View style={{ marginBottom: 16 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: isDark ? 'rgba(39, 39, 45, 0.8)' : 'rgba(241, 245, 249, 0.8)',
                                            borderRadius: 16,
                                            paddingHorizontal: 16,
                                            borderWidth: 1,
                                            borderColor: errors.confirmPassword ? '#EF4444' : isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(226, 232, 240, 0.8)'
                                        }}>
                                            <Lock color={errors.confirmPassword ? '#EF4444' : '#7C3AED'} size={20} />
                                            <TextInput
                                                ref={confirmPasswordInputRef}
                                                style={{
                                                    flex: 1,
                                                    paddingVertical: 16,
                                                    paddingHorizontal: 12,
                                                    fontFamily: 'Montserrat',
                                                    color: isDark ? '#F1F5F9' : '#1E293B',
                                                    fontSize: 16
                                                }}
                                                placeholder="Confirm Password"
                                                placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                                                value={confirmPassword}
                                                onChangeText={(text) => {
                                                    setConfirmPassword(text);
                                                    if (text) validateConfirmPassword(text);
                                                }}
                                                secureTextEntry={!showPassword}
                                                returnKeyType="done"
                                                onSubmitEditing={handleResetPassword}
                                            />
                                        </View>
                                        {errors.confirmPassword && (
                                            <MotiView
                                                from={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                style={{ marginTop: 4, marginLeft: 16 }}
                                            >
                                                <Text style={{ color: '#EF4444', fontSize: 14, fontFamily: 'Montserrat' }}>
                                                    {errors.confirmPassword}
                                                </Text>
                                            </MotiView>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Error Message */}
                            {errors.general && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        marginBottom: 16,
                                        padding: 16,
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: 12,
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#EF4444'
                                    }}
                                >
                                    <Text style={{
                                        color: '#EF4444',
                                        fontSize: 14,
                                        fontFamily: 'Montserrat',
                                        textAlign: 'center'
                                    }}>
                                        {errors.general}
                                    </Text>
                                </MotiView>
                            )}

                            {/* Success Message */}
                            {isSuccess && (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        marginBottom: 16,
                                        padding: 16,
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: 12,
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#10B981'
                                    }}
                                >
                                    <Text style={{
                                        color: '#10B981',
                                        fontSize: 14,
                                        fontFamily: 'Montserrat',
                                        textAlign: 'center'
                                    }}>
                                        Password reset successful! Redirecting to login...
                                    </Text>
                                </MotiView>
                            )}

                            {/* Primary Action Button */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#7C3AED',
                                    borderRadius: 16,
                                    paddingVertical: 16,
                                    marginBottom: 16,
                                    marginTop: 8,
                                    shadowColor: '#7C3AED',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 4,
                                    opacity: (isLoading || !isOnline) ? 0.7 : 1
                                }}
                                onPress={handlePrimaryAction}
                                disabled={isLoading || !isOnline}
                                activeOpacity={0.8}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={{
                                            color: 'white',
                                            textAlign: 'center',
                                            fontSize: 16,
                                            fontFamily: 'Montserrat-Bold'
                                        }}>
                                            {getPrimaryButtonText()}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Back to Login */}
                            {resetStage !== ResetStage.COMPLETE && (
                                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                    <Text style={{
                                        fontFamily: 'Montserrat',
                                        color: isDark ? '#94A3B8' : '#64748B'
                                    }}>
                                        {resetStage === ResetStage.REQUEST_OTP
                                            ? 'Remember your password? '
                                            : 'Need to use different email? '}
                                    </Text>
                                    <TouchableOpacity onPress={resetStage === ResetStage.REQUEST_OTP
                                        ? () => router.push('/login')
                                        : () => setResetStage(ResetStage.REQUEST_OTP)}>
                                        <Text style={{
                                            fontFamily: 'Montserrat-Bold',
                                            color: '#7C3AED'
                                        }}>
                                            {resetStage === ResetStage.REQUEST_OTP
                                                ? 'Back to Login'
                                                : 'Change Email'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </MotiView>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ForgotPassword;