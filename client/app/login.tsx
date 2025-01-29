import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Chrome,
    Eye,
    EyeOff,
    Github,
    Lock,
    Mail,
    Target
} from 'lucide-react-native';
import React, {useEffect} from 'react';
import axios from "axios";
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {loginUser} from "@/services/userService";
import {useDispatch, useSelector} from 'react-redux'
import AsyncStorage from "@react-native-async-storage/async-storage";
import {loginSuccess} from "@/store/slices/userSlice";

// Types
interface LoginErrors {
    email: string;
    password: string;
    general: string;
}

interface LoginResponse {
    success: boolean;
    token?: string;
    message?: string;
}

const Login = () => {
    const [userEmail, setUserEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [errors, setErrors] = React.useState<LoginErrors>({
        email: '', password: '', general: ''
    });
    const [isSuccess, setIsSuccess] = React.useState(false);


    const dispatch = useDispatch();
    const user = useSelector((state) => state.user.user);

    // Handle navigation after successful login
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isSuccess) {
            timeoutId = setTimeout(() => {
                router.replace("/(tabs)");
            }, 1500);
        }
        return () => clearTimeout(timeoutId);
    }, [isSuccess]);

    // Email validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
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

    // Password validation
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

    const handleLogin = async () => {
        // Reset all errors
        setErrors({email: '', password: '', general: ''});
        setIsSuccess(false);

        // Validate inputs
        const isEmailValid = validateEmail(userEmail);
        const isPasswordValid = validatePassword(password);

        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        try {
            setIsLoading(true);
            const response = await loginUser({userEmail: userEmail, password: password});

            console.log(response)

            if (response.success) {
                await AsyncStorage.setItem('token', response.data.token);
                setIsSuccess(true);
                dispatch(loginSuccess({ user: response.data.user}));
            } else {
                setErrors(prev => ({...prev, general: response.message || 'Login failed'}));
            }
        } catch (error) {
            const errorMsg = error ? error.response?.data?.message : "Connection error. Please try again.";
            setErrors(prev => ({...prev, general: errorMsg}));
        } finally {
            setIsLoading(false);
        }
    };

    return (<KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <ScrollView
                className="flex-1 bg-background-light"
                contentContainerStyle={{flexGrow: 1}}
                keyboardShouldPersistTaps="handled"
            >
                {/* Top Gradient Section */}
                <LinearGradient
                    colors={['#7C3AED', '#9D6FFF']}
                    className="h-72 w-full absolute top-0 rounded-b-[50px]"
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                />

                {/* Main Content Container */}
                <View className="flex-1 px-6">
                    {/* Logo and Welcome Section */}
                    <View className="items-center mt-16 mb-8">
                        <View className="bg-white/20 p-5 rounded-3xl mb-4">
                            <Target className="w-16 h-16 text-white"/>
                        </View>
                        <Text className="text-white text-3xl font-bold mb-1">
                            Welcome Back!
                        </Text>
                        <Text className="text-white/80 text-base">
                            Your habits journey continues here
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View className="bg-white rounded-3xl p-6 shadow-lg mt-4">
                        {/* Email Input */}
                        <View className="mb-5">
                            <Text className="text-gray-700 text-sm font-medium mb-2 ml-1">
                                Email Address
                            </Text>
                            <View
                                className={`bg-gray-50 rounded-xl flex-row items-center border ${errors.email ? 'border-error-500' : 'border-gray-100'}`}>
                                <Mail className={`w-5 h-5 ml-3 ${errors.email ? 'text-error-500' : 'text-gray-400'}`}/>
                                <TextInput
                                    className="flex-1 px-3 py-3 text-gray-800"
                                    placeholder="Enter your email"
                                    onChangeText={(text) => {
                                        setUserEmail(text);
                                        validateEmail(text);
                                    }}
                                    value={userEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                    accessibilityLabel="Email input"
                                />
                            </View>
                            {errors.email && (<View className="flex-row items-center mt-2">
                                    <AlertCircle className="w-4 h-4 text-error-500 mr-1"/>
                                    <Text className="text-error-500 text-sm">{errors.email}</Text>
                                </View>)}
                        </View>

                        {/* Password Input */}
                        <View className="mb-5">
                            <Text className="text-gray-700 text-sm font-medium mb-2 ml-1">
                                Password
                            </Text>
                            <View
                                className={`bg-gray-50 rounded-xl flex-row items-center border ${errors.password ? 'border-error-500' : 'border-gray-100'}`}>
                                <Lock
                                    className={`w-5 h-5 ml-3 ${errors.password ? 'text-error-500' : 'text-gray-400'}`}/>
                                <TextInput
                                    className="flex-1 px-3 py-3 text-gray-800"
                                    placeholder="Enter your password"
                                    secureTextEntry={!showPassword}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        validatePassword(text);
                                    }}
                                    value={password}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="go"
                                    onSubmitEditing={handleLogin}
                                    accessibilityLabel="Password input"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    className="px-4"
                                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                                    accessibilityRole="button"
                                >
                                    {showPassword ? (<EyeOff
                                            className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-gray-400'}`}/>) : (
                                        <Eye
                                            className={`w-5 h-5 ${errors.password ? 'text-error-500' : 'text-gray-400'}`}/>)}
                                </TouchableOpacity>
                            </View>
                            {errors.password && (<View className="flex-row items-center mt-2">
                                    <AlertCircle className="w-4 h-4 text-error-500 mr-1"/>
                                    <Text className="text-error-500 text-sm">{errors.password}</Text>
                                </View>)}
                        </View>

                        {/* Success Message */}
                        {isSuccess && (<View className="bg-success-100 p-4 rounded-xl mb-6 flex-row items-center">
                                <CheckCircle2 className="w-5 h-5 text-success-500 mr-2"/>
                                <Text className="text-success-500 font-medium flex-1">
                                    Login successful! Redirecting to home page...
                                </Text>
                            </View>)}

                        {/* General Error Message */}
                        {errors.general && (<View className="bg-error-100 p-4 rounded-xl mb-6 flex-row items-center">
                                <AlertCircle className="w-5 h-5 text-error-500 mr-2"/>
                                <Text className="text-error-500 font-medium flex-1">
                                    {errors.general}
                                </Text>
                            </View>)}

                        <TouchableOpacity
                            className="self-end mb-6"
                            accessibilityLabel="Forgot password"
                            accessibilityRole="button"
                        >
                            <Text className="text-primary-500 font-medium">
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            disabled={isLoading}
                            className={`
                                bg-primary-500 
                                py-4 
                                rounded-xl 
                                shadow-sm
                                ${isLoading ? 'opacity-70' : ''}
                            `}
                            accessibilityLabel="Sign in button"
                            accessibilityRole="button"
                        >
                            <View className="flex-row items-center justify-center space-x-2">
                                {isLoading ? (<ActivityIndicator color="white"/>) : (<>
                                        <Text className="text-white text-center font-semibold text-lg">
                                            Sign In
                                        </Text>
                                        <ArrowRight className="w-5 h-5 text-white"/>
                                    </>)}
                            </View>
                        </TouchableOpacity>

                        {/* Social Login Options */}
                        <View className="mt-8">
                            <View className="flex-row items-center mb-6">
                                <View className="flex-1 h-[1px] bg-gray-200"/>
                                <Text className="mx-4 text-gray-500">
                                    Or continue with
                                </Text>
                                <View className="flex-1 h-[1px] bg-gray-200"/>
                            </View>

                            <View className="flex-row justify-center space-x-4">
                                <TouchableOpacity
                                    className="bg-gray-50 p-4 rounded-full w-14 h-14 items-center justify-center"
                                    accessibilityLabel="Sign in with Google"
                                    accessibilityRole="button"
                                >
                                    <Chrome className="w-6 h-6 text-gray-700"/>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="bg-gray-50 p-4 rounded-full w-14 h-14 items-center justify-center"
                                    accessibilityLabel="Sign in with GitHub"
                                    accessibilityRole="button"
                                >
                                    <Github className="w-6 h-6 text-gray-700"/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Sign Up Link */}
                    <View className="flex-row justify-center mt-6 mb-8">
                        <Text className="text-gray-600">
                            Don't have an account?{" "}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/signup")}
                            accessibilityLabel="Sign up"
                            accessibilityRole="button"
                        >
                            <Text className="text-primary-500 font-semibold">
                                Sign Up
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>);
};

export default Login;