import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { Tag } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';
import { domains } from '../constants/habit';

const DomainSection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Category"
                icon={<Tag size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('domain')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <ScrollView
                        horizontal={false}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                    >
                        {domains.map((domain) => (
                            <TouchableOpacity
                                key={domain.id}
                                className={`px-4 py-3 rounded-xl flex-row items-center mb-2 ${
                                    habitData.domain_id === domain.id
                                        ? 'bg-primary-500'
                                        : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}
                                onPress={() => setHabitData({...habitData, domain_id: domain.id})}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-montserrat ${
                                    habitData.domain_id === domain.id
                                        ? 'text-white'
                                        : isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {domain.icon} {domain.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </MotiView>
            )}
        </View>
    );
};

export default DomainSection;