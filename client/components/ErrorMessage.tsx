// src/components/shared/ErrorMessage.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, useColorScheme } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ErrorMessageProps {
    message: string;
    onDismiss?: () => void;
    autoHide?: boolean;
    duration?: number;
    severity?: 'error' | 'warning' | 'info';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
                                                       message,
                                                       onDismiss,
                                                       autoHide = false,
                                                       duration = 5000,
                                                       severity = 'error'
                                                   }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [fadeAnim] = useState(new Animated.Value(1));

    // Determine colors based on severity
    const getColors = () => {
        switch (severity) {
            case 'warning':
                return {
                    bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50',
                    icon: isDark ? '#FCD34D' : '#D97706',
                    text: isDark ? 'text-amber-200' : 'text-amber-700'
                };
            case 'info':
                return {
                    bg: isDark ? 'bg-blue-900/30' : 'bg-blue-50',
                    icon: isDark ? '#93C5FD' : '#2563EB',
                    text: isDark ? 'text-blue-200' : 'text-blue-700'
                };
            case 'error':
            default:
                return {
                    bg: isDark ? 'bg-red-900/30' : 'bg-red-50',
                    icon: isDark ? '#FCA5A5' : '#DC2626',
                    text: isDark ? 'text-red-200' : 'text-red-700'
                };
        }
    };

    const { bg, icon, text } = getColors();

    // Auto-hide functionality
    useEffect(() => {
        let timer: NodeJS.Timeout;

        if (autoHide && onDismiss) {
            timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                }).start(() => {
                    onDismiss();
                });
            }, duration);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [autoHide, duration, fadeAnim, onDismiss]);

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start(() => {
            onDismiss && onDismiss();
        });
    };

    return (
        <Animated.View
            style={{ opacity: fadeAnim }}
            className={`mb-4 rounded-xl p-4 ${bg}`}
        >
            <View className="flex-row items-center">
                <AlertCircle size={20} color={icon} />
                <Text className={`ml-2 flex-1 font-montserrat-medium ${text}`}>
                    {message}
                </Text>

                {onDismiss && (
                    <Pressable
                        onPress={handleDismiss}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        className="p-1 rounded-full"
                    >
                        <X size={16} color={icon} />
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
};

export default ErrorMessage;