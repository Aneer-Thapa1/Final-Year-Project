import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme, Platform, Switch } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';
import { daysOfWeek } from '../constants/habit';

const ScheduleSection = ({
                             habitData,
                             setHabitData,
                             isExpanded,
                             toggleSection,
                             showStartDate,
                             setShowStartDate,
                             showEndDate,
                             setShowEndDate,
                             showTimeWindowStart,
                             setShowTimeWindowStart,
                             showTimeWindowEnd,
                             setShowTimeWindowEnd,
                             renderDatePicker,
                             handleDateChange
                         }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Toggle a day of week
    const toggleDayOfWeek = (day) => {
        const currentDays = [...habitData.day_of_week];
        const dayIndex = currentDays.indexOf(day);

        if (dayIndex === -1) {
            currentDays.push(day);
        } else {
            currentDays.splice(dayIndex, 1);
        }

        setHabitData({
            ...habitData,
            day_of_week: currentDays
        });
    };

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Schedule"
                icon={<Calendar size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('schedule')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date Range
                    </Text>
                    <TouchableOpacity
                        className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                        onPress={() => setShowStartDate(true)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <Calendar size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Start Date: {habitData.start_date.toDateString()}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {renderDatePicker(
                        showStartDate,
                        habitData.start_date,
                        (event, selectedDate) => handleDateChange(event, selectedDate, 'start_date'),
                        () => setShowStartDate(false)
                    )}

                    <TouchableOpacity
                        className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                        onPress={() => setShowEndDate(true)}
                        activeOpacity={0.7}
                    >
                        <View className="flex-row items-center">
                            <Calendar size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                End Date: {habitData.end_date ? habitData.end_date.toDateString() : 'Not set (ongoing)'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {renderDatePicker(
                        showEndDate,
                        habitData.end_date || new Date(),
                        (event, selectedDate) => handleDateChange(event, selectedDate, 'end_date'),
                        () => setShowEndDate(false)
                    )}

                    {/* Week days selection for weekly habits */}
                    {habitData.frequency_type_id === '2' && (
                        <View className="mt-4">
                            <Text className={`mb-3 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Days of Week
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {[1, 2, 3, 4, 5, 6, 7].map((day, index) => (
                                    <TouchableOpacity
                                        key={day}
                                        className={`py-2 px-3 rounded-lg ${
                                            habitData.day_of_week.includes(day)
                                                ? 'bg-primary-500'
                                                : isDark ? 'bg-gray-700' : 'bg-gray-100'
                                        }`}
                                        onPress={() => toggleDayOfWeek(day)}
                                        activeOpacity={0.7}
                                    >
                                        <Text className={`font-montserrat text-center ${
                                            habitData.day_of_week.includes(day)
                                                ? 'text-white'
                                                : isDark ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            {daysOfWeek[index]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Time window */}
                    <View className="mt-4">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className={`font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Time Window
                            </Text>
                            <View className="flex-row items-center">
                                <Text className={`mr-2 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    All day
                                </Text>
                                <Switch
                                    value={habitData.is_all_day}
                                    onValueChange={(value) => setHabitData({...habitData, is_all_day: value})}
                                    trackColor={{ false: '#767577', true: '#6366F1' }}
                                    thumbColor={habitData.is_all_day ? '#FFFFFF' : '#f4f3f4'}
                                />
                            </View>
                        </View>

                        {!habitData.is_all_day && (
                            <View>
                                <TouchableOpacity
                                    className={`p-4 rounded-xl mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                    onPress={() => setShowTimeWindowStart(true)}
                                    activeOpacity={0.7}
                                    disabled={habitData.is_all_day}
                                >
                                    <View className="flex-row items-center">
                                        <Clock size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            Start Time: {habitData.time_window_start
                                            ? habitData.time_window_start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : 'Not set'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {renderDatePicker(
                                    showTimeWindowStart,
                                    habitData.time_window_start || new Date(),
                                    (event, selectedTime) => handleDateChange(event, selectedTime, 'time_window_start'),
                                    () => setShowTimeWindowStart(false),
                                    'time'
                                )}

                                <TouchableOpacity
                                    className={`p-4 rounded-xl mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                                    onPress={() => setShowTimeWindowEnd(true)}
                                    activeOpacity={0.7}
                                    disabled={habitData.is_all_day}
                                >
                                    <View className="flex-row items-center">
                                        <Clock size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            End Time: {habitData.time_window_end
                                            ? habitData.time_window_end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : 'Not set'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {renderDatePicker(
                                    showTimeWindowEnd,
                                    habitData.time_window_end || new Date(),
                                    (event, selectedTime) => handleDateChange(event, selectedTime, 'time_window_end'),
                                    () => setShowTimeWindowEnd(false),
                                    'time'
                                )}
                            </View>
                        )}
                    </View>
                </MotiView>
            )}
        </View>
    );
};

export default ScheduleSection;