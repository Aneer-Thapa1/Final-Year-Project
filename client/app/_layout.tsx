// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "./global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { store } from '../store/store';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
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
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        // You can use the value of hasLaunched here
      }
    };
    initialize();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

// Wrap the root component with Provider
export default function RootLayout() {
  return (
      <Provider store={store}>
        <RootLayoutNav />
      </Provider>
  );
}