import { View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

export default function Logo() {
    return (
        <Svg width={80} height={80} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={45} fill="#A5B4FC" />
            <Path
                d="M30 50 Q 50 20, 70 50 T 70 50"
                stroke="#4338CA"
                strokeWidth={4}
                fill="none"
            />
            <G transform="translate(35, 25)">
                <Path
                    d="M15 40 C 8 37, 15 25, 15 20 C 15 15, 20 10, 30 15 C 40 20, 35 30, 30 35 C 25 40, 22 43, 15 40"
                    fill="#4338CA"
                />
            </G>
        </Svg>
    );
}   