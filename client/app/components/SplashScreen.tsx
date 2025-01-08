import { View, Text } from 'react-native';
import Logo from './Logo';

export default function SplashScreen() {
    return (
        <View style={{ flex: 1, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center' }}>
            <Logo />
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 16 }}>
                Habit Pulse
            </Text>
            <Text style={{ color: '#E0E7FF', fontSize: 16 }}>
                Sow habit, reap success
            </Text>
        </View>
    );
}