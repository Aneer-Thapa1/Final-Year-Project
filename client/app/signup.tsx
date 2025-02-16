import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {router, useFocusEffect} from 'expo-router';
import {Eye, EyeOff, Lock, Mail, User} from 'lucide-react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {MotiView} from 'moti';
import * as Haptics from 'expo-haptics';
import {useDispatch} from 'react-redux';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {loginSuccess} from "@/store/slices/userSlice";
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import {registerUser} from "@/services/userService";

// Types
interface SignupErrors {
    name: string;
    email: string;
    password: string;
    gender: string;
    general: string;
}

interface SignupResponse {
    success: boolean;
    message?: string;
    data?: {
        user: any; token: string;
    };
    error?: string;
}

const Signup = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const dispatch = useDispatch();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [errors, setErrors] = useState<SignupErrors>({
        name: '', email: '', password: '', gender: '', general: ''
    });
    const [isSuccess, setIsSuccess] = useState(false);

    // Refs
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    // Keyboard handling
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Reset form on screen focus
    useFocusEffect(React.useCallback(() => {
        return () => {
            clearForm();
        };
    }, []));

    // Validation Functions
    const validateName = (name: string): boolean => {
        if (!name?.trim()) {
            setErrors(prev => ({...prev, name: 'Name is required'}));
            return false;
        }
        if (name.length < 2) {
            setErrors(prev => ({...prev, name: 'Name must be at least 2 characters'}));
            return false;
        }
        setErrors(prev => ({...prev, name: ''}));
        return true;
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email?.trim()) {
            setErrors(prev => ({...prev, email: 'Email is required'}));
            return false;
        }
        if (!emailRegex.test(email)) {
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
        if (password.length < 6) {
            setErrors(prev => ({...prev, password: 'Password must be at least 6 characters'}));
            return false;
        }
        setErrors(prev => ({...prev, password: ''}));
        return true;
    };

    const validateGender = (gender: string): boolean => {
        if (!gender) {
            setErrors(prev => ({...prev, gender: 'Please select your gender'}));
            return false;
        }
        setErrors(prev => ({...prev, gender: ''}));
        return true;
    };

    // Form Handlers
    const clearForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setGender('');
        setErrors({
            name: '', email: '', password: '', gender: '', general: ''
        });
        setIsSuccess(false);
        setIsLoading(false);
    };

    const handleSignup = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();

        // Reset errors
        setErrors({
            name: '',
            email: '',
            password: '',
            gender: '',
            general: ''
        });
        setIsSuccess(false);

        // Validate all fields
        const isNameValid = validateName(name);
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);
        const isGenderValid = validateGender(gender);

        if (!isNameValid || !isEmailValid || !isPasswordValid || !isGenderValid) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            setIsLoading(true);

            const response = await registerUser({
                user_name: name.trim(),
                user_email: email.toLowerCase().trim(),
                password,
                gender
            });

            if (response.success) {

                // Show success state
                setIsSuccess(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                // Clear form
                clearForm();

                // Navigate after delay
                setTimeout(() => {
                    router.replace("/login");
                }, 1500);
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error: any) {
            const errorMsg = error.message || "Unable to complete registration";
            setErrors(prev => ({...prev, general: errorMsg}));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowPassword(!showPassword);
    };

    return (<SafeAreaView className="flex-1">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 bg-theme-background-dark"
            >
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"}/>

                {/* Background Gradient */}
                <LinearGradient
                    colors={['#7C3AED', '#6D28D9']}
                    className={`absolute top-0 left-0 right-0 ${isKeyboardVisible ? 'h-1/2' : 'h-2/3'}`}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                >
                    <View className="absolute bottom-0 left-0 right-0 h-32">
                        <View
                            className="absolute bottom-0 left-0 right-0 h-32 rounded-t-[60px] bg-theme-background-dark"/>
                    </View>
                </LinearGradient>

                {/* Main Content */}
                <MotiView
                    from={{opacity: 0, translateY: 50}}
                    animate={{opacity: 1, translateY: 0}}
                    transition={{type: 'timing', duration: 1000}}
                    className="flex-1 justify-center px-6"
                >
                    {/* Signup Card */}
                    <View className="bg-theme-card-dark/90 backdrop-blur-xl rounded-3xl p-6 shadow-card-dark">
                        {/* Header */}
                        <View className="mb-8">
                            <Text
                                className="text-3xl font-montserrat-bold text-center mb-2 text-theme-text-primary-dark">
                                Create Account
                            </Text>
                            <Text className="text-base font-montserrat text-center text-theme-text-secondary-dark">
                                Start your journey to better habits
                            </Text>
                        </View>

                        {/* Name Input */}
                        <View className="mb-4">
                            <View
                                className={`flex-row items-center bg-theme-input-dark rounded-2xl px-4 border ${errors.name ? 'border-error-500' : 'border-theme-border-dark'}`}>
                                <User className={`w-5 h-5 ${errors.name ? 'text-error-500' : 'text-primary-400'}`}/>
                                <TextInput
                                    className="flex-1 py-4 px-3 font-montserrat text-theme-text-primary-dark"
                                    placeholder="Full Name"
                                    placeholderTextColor="#94A3B8"
                                    value={name}
                                    onChangeText={(text) => {
                                        setName(text);
                                        if (text) validateName(text);
                                    }}
                                    onBlur={() => validateName(name)}
                                    returnKeyType="next"
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                    autoCapitalize="words"
                                />
                            </View>
                            {errors.name && (<MotiView
                                    from={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.name}
                                    </Text>
                                </MotiView>)}
                        </View>

                        {/* Email Input */}
                        <View className="mb-4">
                            <View
                                className={`flex-row items-center bg-theme-input-dark rounded-2xl px-4 border ${errors.email ? 'border-error-500' : 'border-theme-border-dark'}`}>
                                <Mail className={`w-5 h-5 ${errors.email ? 'text-error-500' : 'text-primary-400'}`}/>
                                <TextInput
                                    ref={emailRef}
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
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>
                            {errors.email && (<MotiView
                                    from={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.email}
                                    </Text>
                                </MotiView>)}
                        </View>

                        {/* Password Input */}
                        <View className="mb-4">
                            <View
                                className={`flex-row items-center bg-theme-input-dark rounded-2xl px-4 border ${errors.password ? 'border-error-500' : 'border-theme-border-dark'}`}>
                                <Lock className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`}/>
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
                                    returnKeyType="next"
                                />
                                <TouchableOpacity
                                    onPress={togglePasswordVisibility}
                                    className="p-2"
                                >
                                    {showPassword ? (<EyeOff
                                            className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`}/>) : (
                                        <Eye
                                            className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-primary-400'}`}/>)}
                                </TouchableOpacity>
                            </View>
                            {errors.password && (<MotiView
                                    from={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.password}
                                    </Text>
                                </MotiView>)}
                        </View>

                        {/* Gender Selection */}
                        <View className="mb-6">
                            <View
                                className={`bg-theme-input-dark rounded-2xl px-4 border ${errors.gender ? 'border-error-500' : 'border-theme-border-dark'}`}>
                                <Picker
                                    selectedValue={gender}
                                    onValueChange={(itemValue) => {
                                        setGender(itemValue);
                                        validateGender(itemValue);
                                    }}
                                    className="text-theme-text-primary-dark font-montserrat"
                                    dropdownIconColor={isDark ? '#fff' : '#000'}
                                >
                                    <Picker.Item label="Select Gender" value=""/>
                                    <Picker.Item label="Male" value="male"/>
                                    <Picker.Item label="Female" value="female"/>
                                    <Picker.Item label="Other" value="other"/>
                                </Picker>
                            </View>
                            {errors.gender && (<MotiView
                                    from={{opacity: 0, scale: 0.95}}
                                    animate={{opacity: 1, scale: 1}}
                                    className="mt-1 ml-4"
                                >
                                    <Text className="text-error-500 text-sm font-montserrat">
                                        {errors.gender}
                                    </Text>
                                </MotiView>)}
                        </View>

                        {/* Error Message */}
                        {errors.general && (<MotiView
                                from={{opacity: 0, scale: 0.95}}
                                animate={{opacity: 1, scale: 1}}
                                className="mb-6 p-4 bg-error-500/20 rounded-xl"
                            >
                                <Text className="text-error-500 text-sm font-montserrat text-center">
                                    {errors.general}
                                </Text>
                            </MotiView>)}

                        {/* Success Message */}
                        {isSuccess && (<MotiView
                                from={{opacity: 0, scale: 0.95}}
                                animate={{opacity: 1, scale: 1}}
                                className="mb-6 p-4 bg-success-100 rounded-xl"
                            >
                                <Text className="text-success-600 text-sm font-montserrat text-center">
                                    Registration successful! Redirecting...
                                </Text>
                            </MotiView>)}

                        {/* Sign Up Button */}
                        <TouchableOpacity
                            className={`bg-primary-500 rounded-2xl py-4 mb-6 shadow-button-light ${isLoading ? 'opacity-70' : ''}`}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            <View className="flex-row justify-center items-center">
                                {isLoading ? (<ActivityIndicator color="white"/>) : (
                                    <Text className="text-white text-center text-lg font-montserrat-bold">
                                        Create Account
                                    </Text>)}
                            </View>
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View className="flex-row justify-center">
                            <Text className="font-montserrat text-theme-text-muted-dark">
                                Already have an account?{' '}
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/login')}>
                                <Text className="font-montserrat-bold text-primary-400">
                                    Sign In
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </MotiView>
            </KeyboardAvoidingView>
        </SafeAreaView>);
};

export default Signup;