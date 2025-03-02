// components/habits/CustomizationSection.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { Brush, Plus, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import SectionHeader from './SectionHeader';

// Mock component for color picker
const ColorPicker = ({ selectedColor, onColorChange }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const colors = [
        '#6366F1', // primary
        '#10B981', // green
        '#F59E0B', // amber
        '#EF4444', // red
        '#EC4899', // pink
        '#8B5CF6', // purple
        '#3B82F6', // blue
        '#06B6D4', // cyan
        '#F97316', // orange
        '#71717A', // gray
    ];

    return (
        <View className="flex-row flex-wrap gap-2 mb-4">
            {colors.map((color) => (
                <TouchableOpacity
                    key={color}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: isDark ? 'white' : 'black' }}
                    onPress={() => onColorChange(color)}
                    activeOpacity={0.7}
                >
                    {selectedColor === color && (
                        <View className="w-4 h-4 rounded-full bg-white" />
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Mock component for icon picker
const IconPicker = ({ selectedIcon, onIconChange }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const icons = ['💪', '🏃', '🧘', '📚', '💻', '🎨', '🎵', '🚰', '💤', '🥗', '💰', '📝', '😊', '📱', '🧹', '🧠', '❤️', '🌱'];

    return (
        <View className="flex-row flex-wrap gap-2 mb-4">
            {icons.map((icon) => (
                <TouchableOpacity
                    key={icon}
                    className={`w-10 h-10 rounded-lg items-center justify-center ${
                        selectedIcon === icon
                            ? 'bg-primary-500'
                            : isDark ? 'bg-gray-700' : 'bg-gray-100'
                    }`}
                    onPress={() => onIconChange(icon)}
                    activeOpacity={0.7}
                >
                    <Text className="text-lg">{icon}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const CustomizationSection = ({ habitData, setHabitData, isExpanded, toggleSection }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Tag management
    const [newTag, setNewTag] = useState({ name: '', color: '#6366F1' });

    // Add a tag
    const addTag = () => {
        if (!newTag.name.trim()) {
            return;
        }

        setHabitData({
            ...habitData,
            tags: [...habitData.tags, { ...newTag }]
        });
        setNewTag({ name: '', color: '#6366F1' });
    };

    // Remove a tag
    const removeTag = (index) => {
        const updatedTags = [...habitData.tags];
        updatedTags.splice(index, 1);
        setHabitData({ ...habitData, tags: updatedTags });
    };

    return (
        <View className={`mb-6 p-4 rounded-2xl shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <SectionHeader
                title="Customization"
                icon={<Brush size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />}
                isExpanded={isExpanded}
                onToggle={() => toggleSection('customization')}
            />

            {isExpanded && (
                <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="mt-3"
                >
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Color
                    </Text>
                    <ColorPicker
                        selectedColor={habitData.color}
                        onColorChange={(color) => setHabitData({...habitData, color: color})}
                    />

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Icon
                    </Text>
                    <IconPicker
                        selectedIcon={habitData.icon}
                        onIconChange={(icon) => setHabitData({...habitData, icon: icon})}
                    />

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Motivation Quote
                    </Text>
                    <TextInput
                        className={`p-4 rounded-xl mb-4 font-montserrat ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="A quote to keep you motivated"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={habitData.motivation_quote}
                        onChangeText={(text) => setHabitData({...habitData, motivation_quote: text})}
                        multiline
                    />

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        External Resource URL (Optional)
                    </Text>
                    <TextInput
                        className={`p-4 rounded-xl mb-4 font-montserrat ${
                            isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                        }`}
                        placeholder="Link to a helpful resource"
                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        value={habitData.external_resource_url}
                        onChangeText={(text) => setHabitData({...habitData, external_resource_url: text})}
                        keyboardType="url"
                    />

                    {/* Tags */}
                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Tags
                    </Text>

                    {/* Display existing tags */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="mb-3"
                    >
                        <View className="flex-row gap-2">
                            {habitData.tags.map((tag, index) => (
                                <View
                                    key={index}
                                    className="flex-row items-center rounded-full py-1 px-3"
                                    style={{ backgroundColor: tag.color }}
                                >
                                    <Text className="text-white font-montserrat-medium mr-1">
                                        {tag.name}
                                    </Text>
                                    <TouchableOpacity onPress={() => removeTag(index)} activeOpacity={0.7}>
                                        <X size={14} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Add new tag */}
                    <View className="flex-row mb-2">
                        <TextInput
                            className={`flex-1 p-3 rounded-lg font-montserrat mr-2 ${
                                isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                            }`}
                            placeholder="New tag name"
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            value={newTag.name}
                            onChangeText={(text) => setNewTag({...newTag, name: text})}
                        />
                        <TouchableOpacity
                            className="bg-primary-500 p-3 rounded-lg flex-row justify-center items-center"
                            onPress={addTag}
                            activeOpacity={0.7}
                            disabled={!newTag.name.trim()}
                            style={{ opacity: !newTag.name.trim() ? 0.5 : 1 }}
                        >
                            <Plus size={16} color="#FFFFFF" />
                            <Text className="text-white font-montserrat-medium ml-1">
                                Add
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Tag Color
                    </Text>
                    <ColorPicker
                        selectedColor={newTag.color}
                        onColorChange={(color) => setNewTag({...newTag, color: color})}
                    />
                </MotiView>
            )}
        </View>
    );
};

export default CustomizationSection;