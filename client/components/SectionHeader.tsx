import React from 'react';
import { TouchableOpacity, View, Text, useColorScheme } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

const SectionHeader = ({ title, icon, isExpanded, onToggle }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={onToggle}
            activeOpacity={0.7}
        >
            <View className="flex-row items-center">
                {icon}
                <Text className={`text-lg font-montserrat-semibold ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {title}
                </Text>
            </View>
            {isExpanded ?
                <ChevronUp size={20} color={isDark ? '#E5E7EB' : '#4B5563'} /> :
                <ChevronDown size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
            }
        </TouchableOpacity>
    );
};

export default SectionHeader;