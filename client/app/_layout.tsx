import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../store/store';
import { checkAuthStatus } from '@/services/userService';
import { loginSuccess } from '@/store/slices/userSlice';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [fontsLoaded] = useFonts({
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-ExtraBold': require('../assets/fonts/Montserrat-ExtraBold.ttf'),
    'Montserrat-Light': require('../assets/fonts/Montserrat-Light.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        if (fontsLoaded) {
          // Check both onboarding and auth status
          const [hasCompletedOnboarding, userData] = await Promise.all([
            AsyncStorage.getItem('hasCompletedOnboarding'),
            checkAuthStatus()
          ]);



          // Determine the initial route
          let initialRoute = '/onboarding';

          if (userData) {
            // User is authenticated
            initialRoute = '/(tabs)';
          } else if (hasCompletedOnboarding) {
            // User has seen onboarding but isn't authenticated
            initialRoute = '/login';
          }

          // If user is authenticated, update Redux state
          if (userData) {
            dispatch(loginSuccess(userData));
          }

          // Navigate to the determined route
          router.replace(initialRoute);

          // Hide splash screen
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        router.replace('/login');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [fontsLoaded, dispatch, router]);

  // Show loading screen while initializing or fonts are loading
  if (!fontsLoaded || isInitializing) {
    return (
        <View className={`flex-1 justify-center items-center ${isDark ? 'bg-theme-background-dark' : 'bg-white'}`}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <ActivityIndicator size="large" color={isDark ? '#22C55E' : '#7C3AED'} />
        </View>
    );
  }

  return (
      <View className="flex-1">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen
              name="(tabs)"
              options={{
                animation: 'fade',
              }}
          />
        </Stack>
      </View>
  );
}

function AuthenticatedLayout() {
  return (
      <Provider store={store}>
        <RootLayoutNav />
      </Provider>
  );
}

export default function RootLayout() {
  return <AuthenticatedLayout />
}