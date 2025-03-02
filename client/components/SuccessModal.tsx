// components/SuccessModal.js
import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SuccessModal = ({ visible, message, onClose, onConfirm }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Auto-close after 3 seconds if user doesn't interact
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                onConfirm();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible, onConfirm]);

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        type: 'timing',
                        duration: 300,
                        easing: Easing.out(Easing.ease)
                    }}
                    className={`w-4/5 rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    {/* Success Icon */}
                    <MotiView
                        from={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            delay: 200,
                            damping: 12,
                            stiffness: 120
                        }}
                        className="items-center justify-center mb-4"
                    >
                        <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center">
                            <MotiView
                                from={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    delay: 400,
                                    damping: 10
                                }}
                            >
                                <Check size={40} color="white" strokeWidth={3} />
                            </MotiView>
                        </View>
                    </MotiView>

                    {/* Success Title */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ delay: 300 }}
                    >
                        <Text className={`text-xl font-montserrat-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Success!
                        </Text>
                    </MotiView>

                    {/* Message */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ delay: 400 }}
                    >
                        <Text className={`text-center mb-6 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {message}
                        </Text>
                    </MotiView>

                    {/* Button */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{ delay: 500 }}
                    >
                        <TouchableOpacity
                            onPress={onConfirm}
                            className="bg-primary-500 py-3 rounded-xl"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-center font-montserrat-semibold">
                                Great!
                            </Text>
                        </TouchableOpacity>
                    </MotiView>

                    {/* Close button */}
                    <TouchableOpacity
                        onPress={onClose}
                        className="absolute top-3 right-3"
                        activeOpacity={0.7}
                    >
                        <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>
                </MotiView>
            </View>
        </Modal>
    );
};

export default SuccessModal;