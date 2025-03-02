
// components/habits/AdvancedOptionsSection.js
import React from 'react';
import { View, Text, Switch, TextInput, useColorScheme } from 'react-native';
import { Sliders, MapPin } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';

const AdvancedOptionsSection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Advanced Options"
                icon={<Sliders size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('advanced')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <View className="mb-6">
                        <Text className={`mb-3 font-montserrat-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Tracking Options
                        </Text>

                        <View className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Skip on Vacation
                                </Text>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Don't break streak during vacation
                                </Text>
                            </View>
                            <Switch
                                value={habitData.skip_on_vacation}
                                onValueChange={(value) => setHabitData({...habitData, skip_on_vacation: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.skip_on_vacation ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Allow Backfill
                                </Text>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Mark past days as completed
                                </Text>
                            </View>
                            <Switch
                                value={habitData.allow_backfill}
                                onValueChange={(value) => setHabitData({...habitData, allow_backfill: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.allow_backfill ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Roll Over
                                </Text>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Carry over unfinished amounts
                                </Text>
                            </View>
                            <Switch
                                value={habitData.roll_over}
                                onValueChange={(value) => setHabitData({...habitData, roll_over: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.roll_over ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Require Evidence
                                </Text>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Need photo/note for completion
                                </Text>
                            </View>
                            <Switch
                                value={habitData.require_evidence}
                                onValueChange={(value) => setHabitData({...habitData, require_evidence: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.require_evidence ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        <View className="flex-row justify-between items-center">
                            <View>
                                <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Require Verification
                                </Text>
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Need accountability partner verification
                                </Text>
                            </View>
                            <Switch
                                value={habitData.require_verification}
                                onValueChange={(value) => setHabitData({...habitData, require_verification: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.require_verification ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    {/* Location trigger */}
                    <View>
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center">
                                <MapPin size={18} color={isDark ? '#E5E7EB' : '#4B5563'} className="mr-2" />
                                <Text className={`font-montserrat-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Location Trigger
                                </Text>
                            </View>
                            <Switch
                                value={habitData.has_location_trigger}
                                onValueChange={(value) => setHabitData({...habitData, has_location_trigger: value})}
                                trackColor={{ false: '#767577', true: '#6366F1' }}
                                thumbColor={habitData.has_location_trigger ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>

                        {habitData.has_location_trigger && (
                            <View>
                                <TextInput
                                    className={`p-4 rounded-xl mb-3 font-montserrat ${
                                        isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    placeholder="Location name (e.g. Gym, Office)"
                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    value={habitData.location_name}
                                    onChangeText={(text) => setHabitData({...habitData, location_name: text})}
                                />

                                <View className="flex-row gap-2 mb-3">
                                    <TextInput
                                        className={`flex-1 p-4 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        placeholder="Latitude"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={habitData.location_lat ? habitData.location_lat.toString() : ''}
                                        onChangeText={(text) => {
                                            const numValue = text.replace(/[^0-9.-]/g, '');
                                            setHabitData({
                                                ...habitData,
                                                location_lat: numValue ? parseFloat(numValue) : null
                                            });
                                        }}
                                        keyboardType="numeric"
                                    />

                                    <TextInput
                                        className={`flex-1 p-4 rounded-xl font-montserrat ${
                                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        placeholder="Longitude"
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        value={habitData.location_long ? habitData.location_long.toString() : ''}
                                        onChangeText={(text) => {
                                            const numValue = text.replace(/[^0-9.-]/g, '');
                                            setHabitData({
                                                ...habitData,
                                                location_long: numValue ? parseFloat(numValue) : null
                                            });
                                        }}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View className="flex-row items-center">
                                    <Text className={`font-montserrat-medium mr-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Radius:
                                    </Text>
                                    <TextInput
                                        className={`p-2 rounded-lg w-20 text-center font-montserrat ${
                                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                        }`}
                                        value={habitData.location_radius ? habitData.location_radius.toString() : ''}
                                        onChangeText={(text) => {
                                            const numValue = text.replace(/[^0-9]/g, '');
                                            setHabitData({
                                                ...habitData,
                                                location_radius: numValue ? parseInt(numValue) : null
                                            });
                                        }}
                                        keyboardType="numeric"
                                    />
                                    <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        meters
                                    </Text>
                                </View>

                                <Text className={`mt-2 text-xs font-montserrat italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    The app will remind you when you're near this location
                                </Text>
                            </View>
                        )}
                    </View>
                </MotiView>
            )}
        </View>
    );
};

export default AdvancedOptionsSection;