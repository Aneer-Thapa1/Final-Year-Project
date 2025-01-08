import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "../global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
    const router = useRouter();
    const [fontsLoaded] = useFonts({
        'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
        'Montserrat-ExtraBold': require('../../assets/fonts/Montserrat-ExtraBold.ttf'),
        'Montserrat-Light': require('../../assets/fonts/Montserrat-Light.ttf'),
        'Montserrat-Medium': require('../../assets/fonts/Montserrat-Medium.ttf'),
        'Montserrat-Regular': require('../../assets/fonts/Montserrat-Regular.ttf'),
        'Montserrat-SemiBold': require('../../assets/fonts/Montserrat-SemiBold.ttf'),
    });

    useEffect(() => {
        const initialize = async () => {
            if (fontsLoaded) {
                await SplashScreen.hideAsync();
                const hasLaunched = await AsyncStorage.getItem('hasLaunched');
                if (!hasLaunched) {
                    await AsyncStorage.setItem('hasLaunched', 'true');
                    router.replace('/(boarding)/step1');
                }
            }
        };
        initialize();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return <Stack screenOptions={{ headerShown: false }} />;
}