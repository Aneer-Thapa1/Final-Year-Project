import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import ProgressDots from '../components/ProgressDots';

export default function Step1() {
    return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <Animated.View
                entering={FadeInDown.delay(500).springify()}
                style={{ width: '80%', height: '40%', marginBottom: 40, alignItems: 'center', justifyContent: 'center' }}
            >
                <Ionicons name="checkmark-circle-outline" size={120} color="#3B82F6" />
            </Animated.View>

            <Animated.View style={{ alignItems: 'center', marginBottom: 64 }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 16, textAlign: 'center' }}>
                    Build Better Habits
                </Text>
                <Text style={{ fontSize: 18, color: '#94A3B8', textAlign: 'center', lineHeight: 26, paddingHorizontal: 20 }}>
                    Track your daily habits and achieve your goals
                </Text>
            </Animated.View>

            <Link href="/boarding/step2" asChild>
                <View style={{ width: '80%', backgroundColor: '#3B82F6', padding: 16, borderRadius: 30 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>
                        Next
                    </Text>
                </View>
            </Link>
            <ProgressDots currentStep={1} />
        </View>
    );
}