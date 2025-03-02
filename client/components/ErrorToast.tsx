// components/ErrorToast.js
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { MotiView } from 'moti';
import { AlertCircle, X } from 'lucide-react-native';

const ErrorToast = ({ visible, message, onClose }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Auto-close after 5 seconds
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [visible, onClose]);

    if (!visible) return null;

    return (
        <MotiView
            from={{ opacity: 0, translateY: -50 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -50 }}
            transition={{ type: 'timing', duration: 300 }}
            className="absolute top-0 left-0 right-0 z-50"
            style={{ elevation: 5 }}
        >
            <View className={`mx-4 mt-4 rounded-xl p-4 flex-row items-center justify-between ${isDark ? 'bg-red-900' : 'bg-red-50'}`}>
                <View className="flex-row items-center flex-1">
                    <AlertCircle size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
                    <Text className={`ml-3 font-montserrat flex-1 ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                        {message}
                    </Text>
                </View>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                    <X size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
                </TouchableOpacity>
            </View>
        </MotiView>
    );
};

export default ErrorToast;