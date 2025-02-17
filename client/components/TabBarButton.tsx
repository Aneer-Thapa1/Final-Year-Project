import React from 'react';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { icon } from "@/constants/icons";
import { StyleProp, ViewStyle, useColorScheme } from 'react-native';
import { MotiView } from 'moti';

type TabBarButtonProps = {
    onPress: () => void;
    onLongPress: () => void;
    isFocused: boolean;
    routeName: string;
    color: string;
    label: string;
    style?: StyleProp<ViewStyle>;
}

const TabBarButton = ({
                          onPress,
                          onLongPress,
                          isFocused,
                          routeName,
                          color,
                          label,
                          style
                      }: TabBarButtonProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <PlatformPressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
                style,
                { opacity: isFocused ? 1 : 0.7 }
            ]}
            className="items-center justify-center"
        >
            <MotiView
                animate={{ scale: isFocused ? 1.1 : 1 }}
                transition={{ type: 'spring', duration: 250 }}
                className="items-center justify-center gap-1"
            >
                {icon[routeName]({
                    color: isFocused
                        ? isDark ? '#22C55E' : '#7C3AED'  // Primary color
                        : isDark ? '#94A3B8' : '#6B7280', // Muted color
                    size: 24,
                    strokeWidth: 2
                })}

                <Text className={`
                    text-xs font-montserrat-medium
                    ${isFocused
                    ? isDark ? 'text-primary-400' : 'text-primary-500'
                    : isDark ? 'text-gray-400' : 'text-gray-500'
                }
                `}>
                    {label}
                </Text>

                {isFocused && (
                    <MotiView
                        from={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', duration: 300 }}
                        className={`absolute -top-1 w-1 h-1 rounded-full ${
                            isDark ? 'bg-primary-400' : 'bg-primary-500'
                        }`}
                    />
                )}
            </MotiView>
        </PlatformPressable>
    );
};

export default TabBarButton;