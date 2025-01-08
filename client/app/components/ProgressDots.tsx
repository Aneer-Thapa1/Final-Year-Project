import { View } from 'react-native';

type Props = {
    currentStep: number;
}

export default function ProgressDots({ currentStep }: Props) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {[1,2,3].map(step => (
                <View
                    key={step}
                    style={{
                        height: 8,
                        width: 8,
                        borderRadius: 4,
                        backgroundColor: currentStep === step ? '#3B82F6' : '#475569'
                    }}
                />
            ))}
        </View>
    );
}