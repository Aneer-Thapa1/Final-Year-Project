import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex items-center justify-center bg-white">
      <Text className="text-3xl">
        Open up App.js to start working on your app!
      </Text>
      <Link href="/blogs" className="text-blue-700 font-bold">
        {" "}
        Go to blogs
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}
