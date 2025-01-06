import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";

import images from "@/constants/images";
import { Link } from "expo-router";
import axios from "axios";

const SignIn = () => {

  // usestates to store data of users for login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const BASE_URL = process.env.REACT_APP_BASE_URL;


  // function to handle login
  const handleLogin = async () => {
    // response of login
    try{
      const response = await axios.post(`${BASE_URL}/api/users/login`, { username, password });
      alert(`Username: ${username}, Password: ${password}`);

    }catch (error) {
      console.log(error)

    }

  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName="h-full flex relative items">
        <View className="bg-primary-500 w-full h-3/6 flex items-center gap-6">
          <Image source={images.logo} className="mt-10 w-12 h-12" />
          <Text className="text-white text-4xl font-montserrat-extrabold text-center">
            Sign in to your {"\n"} Account
          </Text>
          <Text className="text-white">
            Enter your email and password to log in{" "}
          </Text>
        </View>

        <View className=" bg-gray-200 h-3/6 w-full"></View>
        <View
          style={{
            position: "absolute",
            backgroundColor: "white",
            top: "30%",
            left: "50%",
            width: "83.33%",
            height: "fit",
            borderRadius: "20px",
            transform: [{ translateX: "-50%" }],
          }}
        >
          <View className="flex-1 justify-center p-4 gap-6">
            <Text className="text-center text-xl font-bold mb-2">Login</Text>
            <TextInput
              className="border border-gray-300 px-2  py-4 rounded mb-4"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              className="border border-gray-300 px-2   rounded mb-4 "
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <View className="flex flex-row justify-between text-base">
              <Text className="font-montserrat-light text-base">
                {" "}
                Remember me
              </Text>
              <Text className="font-montserrat-light text-primary-300">
                {" "}
                Forgot Password?
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              className="bg-blue-500 p-3 rounded"
            >
              <Text className="text-white text-lg text-center">Sign In</Text>
            </TouchableOpacity>

            <Text className="text-center">
              Don't have an account?{" "}
              <Text className="text-primary-300">
                {" "}
                <Link href="/sign-up">Sign Up</Link>{" "}
              </Text>{" "}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
