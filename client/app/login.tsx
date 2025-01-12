import {Text, TextInput, TouchableOpacity, View, Alert} from 'react-native';
import React from 'react';
import axios from "axios";
import {router} from "expo-router";

const Login = () => {
    const baseURL = process.env.REACT_APP_BASE_URL;
    const [userEmail, setUserEmail] = React.useState<string>('');
    const [password, setPassword] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const handleLogin = async () => {
        if (!userEmail || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        try {
            setIsLoading(true);
            const response = await axios.post(`${baseURL}/api/users/login`, {
                userEmail,
                password
            });
            Alert.alert("Success", `Welcome back, ${userEmail}!`);

        } catch (error: any) {
            Alert.alert(
                "Success",
                `Welcome back, ${userEmail}!`,
                [
                    {
                        text: "OK",
                        onPress: () => {
                            // Redirect to index after user clicks OK on alert
                            router.replace("/index)");  // or router.replace("/index")
                        }
                    }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className='flex-1 bg-white p-6'>
            {/* Header Section */}
            <View className='mt-20 mb-10'>
                <Text className='text-4xl font-bold text-gray-800 mb-2'>Welcome Back</Text>
                <Text className='text-lg text-gray-600'>Login to Habit Pulse!</Text>
            </View>

            {/* Form Section */}
            <View className='space-y-6'>
                {/* Email Input */}
                <View>
                    <Text className='text-sm font-semibold text-gray-700 mb-2'>Email Address</Text>
                    <TextInput
                        className='bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200'
                        placeholder="Enter your email"
                        onChangeText={setUserEmail}
                        value={userEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Password Input */}
                <View>
                    <Text className='text-sm font-semibold text-gray-700 mb-2'>Password</Text>
                    <TextInput
                        className='bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200'
                        placeholder="Enter your password"
                        secureTextEntry
                        onChangeText={setPassword}
                        value={password}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Forgot Password */}
                <TouchableOpacity className='self-end'>
                    <Text className='text-blue-600 font-semibold'>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    className={`bg-blue-600 py-4 rounded-xl mt-4 ${isLoading ? 'opacity-70' : ''}`}
                >
                    <Text className='text-white text-center font-semibold text-lg'>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Text>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <View className='flex-row justify-center mt-6'>
                    <Text className='text-gray-600'>Don't have an account? </Text>
                    <TouchableOpacity>
                        <Text className='text-blue-600 font-semibold'>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default Login;