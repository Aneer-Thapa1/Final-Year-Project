import { Stack} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "./global.css";
import {useFonts} from "expo-font";
import {string} from "prop-types";
import {useEffect} from "react";




export default function RootLayout() {

  const [fontsLoaded] = useFonts( {
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-ExtraBold': require('../assets/fonts/Montserrat-ExtraBold.ttf'),
    'Montserrat-Light': require('../assets/fonts/Montserrat-Light.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
  });

  useEffect(() => {
    if(fontsLoaded){
SplashScreen.hideAsync();
    }

  },[fontsLoaded])

  if(!fontsLoaded) return null;


  return <Stack screenOptions={{ headerShown: false }} />;
}
