// components/shared/ErrorMessage.tsx
import React from 'react';
import { View, Text, useColorScheme, TouchableOpacity } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';

interface ErrorMessageProps {
    message: string;
    onDismiss?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className={`mb-4 rounded-xl p-4 ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <View className="flex-row items-center">
                <AlertCircle size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
                <Text className={`ml-2 flex-1 font-montserrat ${isDark ? 'text-red-200' : 'text-red-700'}`}>
                    {message}
                </Text>

                {onDismiss && (
                    <TouchableOpacity
                        onPress={onDismiss}
                        activeOpacity={0.7}
                    >
                        <X size={18} color={isDark ? '#FCA5A5' : '#DC2626'} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default ErrorMessage;