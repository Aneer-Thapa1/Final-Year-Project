import {Image, Text, View} from "react-native";
import {Link} from "expo-router";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >

      <Text className='text-3xl font-montserrat-light'>Welcome to Habit Pulse!</Text>
        <Link href='/sign-in'>Sign In</Link>
        <Link href='/profile'>Profile</Link>
        <Link href='/explore'>Explore</Link>
    </View>
  );
}
