import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex justify-center items-center">
      <Text>Hello World!</Text>
      <Link href="/blogs" className="text-green-900">
        Go to blog
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}
