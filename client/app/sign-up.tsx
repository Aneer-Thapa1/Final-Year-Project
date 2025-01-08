import { View, Text, SafeAreaView, ScrollView, TextInput, Image, TouchableOpacity, Alert } from 'react-native'
import React, { useState } from 'react'
import { Link, useRouter } from "expo-router";
import images from "@/constants/images";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignUp = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('');

    const handleSignUp = async () => {
        try {
            const response = await axios.post('https://bf0b-2400-74e0-10-31cd-ac35-4ecc-87c0-5e9b.ngrok-free.app/api/users/register', {
                user_name: name,
                user_email: email,
                password,
                gender
            });

            if (response.data.token) {
                await AsyncStorage.setItem('token', response.data.token);
                router.replace('/tabs');
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.error || 'Registration failed');
        }
    };

    return (
        <SafeAreaView className='bg-white h-full'>
            <ScrollView contentContainerClassName='h-full flex relative items-center'>
                <View className='bg-primary-500 w-full h-3/6 flex items-center gap-6'>
                    <Image source={images.logo} className='mt-10 w-12 h-12'/>
                    <Text className='text-white text-4xl font-montserrat-extrabold text-center'>
                        Sign up for a {'\n'} New Account
                    </Text>
                    <Text className='text-white'>
                        Enter your details to create your account
                    </Text>
                </View>

                <View className='bg-gray-200 h-3/6 w-full' />

                <View style={{
                    position: 'absolute',
                    backgroundColor: 'white',
                    top: '30%',
                    left: '50%',
                    width: '83.33%',
                    height: 'fit',
                    borderRadius: 20,
                    transform: [{ translateX: '-50%' }]
                }}>
                    <View className="flex-1 justify-center p-4 gap-6">
                        <Text className="text-center text-xl font-bold mb-2">
                            Create Account
                        </Text>
                        <TextInput
                            className="border border-gray-300 px-2 py-4 rounded mb-4"
                            placeholder="Name"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="none"
                        />
                        <TextInput
                            className="border border-gray-300 px-2 py-4 rounded mb-4"
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            className="border border-gray-300 px-2 rounded mb-4"
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                        <TextInput
                            className="border border-gray-300 px-2 rounded mb-4"
                            placeholder="Gender"
                            value={gender}
                            onChangeText={setGender}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={handleSignUp} className="bg-blue-500 p-3 rounded">
                            <Text className="text-white text-lg text-center">
                                Sign Up
                            </Text>
                        </TouchableOpacity>
                        <Text className='text-center'>
                            Already have an account? {' '}
                            <Link href='/sign-in' className='text-primary-300'>
                                Sign In
                            </Link>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

export default SignUp;