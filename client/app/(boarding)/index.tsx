import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BoardingScreen() {
    return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
                entering={FadeInDown.delay(500).springify()}
                style={{ width: '80%', height: '40%', marginBottom: 40, alignItems: 'center', justifyContent: 'center' }}
            >
                <Ionicons name="checkmark-circle-outline" size={120} color="#3B82F6" />
            </Animated.View>

            <Animated.View
                entering={FadeInDown.delay(1000).springify()}
                style={{ alignItems: 'center', marginBottom: 64 }}
            >
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 16, textAlign: 'center' }}>
                    Track Your Progress
                </Text>
                <Text style={{ fontSize: 18, color: '#94A3B8', textAlign: 'center', lineHeight: 26, paddingHorizontal: 20 }}>
                    "Every small step counts towards your bigger goals"
                </Text>
            </Animated.View>

            <Animated.View
                entering={FadeInRight.delay(1500).springify()}
                style={{ width: '100%', alignItems: 'center' }}
            >
                <Link href="/tabs" asChild>
                    <View style={{ width: '80%', backgroundColor: '#3B82F6', padding: 16, borderRadius: 30 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>
                            Start Your Journey
                        </Text>
                    </View>
                </Link>
            </Animated.View>
        </View>
    );
}