import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Dimensions
} from 'react-native';
import { MotiView } from 'moti';
import { Camera, Image as ImageIcon, X, ChevronDown, Tag, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const BlogPostCreator = ({ isDark, onPost }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedHabits, setSelectedHabits] = useState([]);
    const [isHabitSelectorVisible, setIsHabitSelectorVisible] = useState(false);

    // Sample habits for selection
    const availableHabits = [
        { id: '1', title: 'Morning Meditation', icon: '🧘' },
        { id: '2', title: 'Running', icon: '🏃' },
        { id: '3', title: 'Reading', icon: '📚' },
        { id: '4', title: 'Coding Practice', icon: '💻' },
    ];

    const contentInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Calculate input height based on content
    const [contentHeight, setContentHeight] = useState(100);
    const windowHeight = Dimensions.get('window').height;
    const maxHeight = windowHeight * 0.5; // Max 50% of screen height

    const toggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!isExpanded) {
            setIsExpanded(true);
            setTimeout(() => {
                contentInputRef.current?.focus();
            }, 300);
        } else {
            Keyboard.dismiss();
            setIsExpanded(false);
        }
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 4,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImages([
                ...selectedImages,
                ...result.assets.map((asset) => asset.uri),
            ]);
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === "granted") {
            let result = await ImagePicker.launchCameraAsync({
                quality: 1,
            });

            if (!result.canceled) {
                setSelectedImages([...selectedImages, result.assets[0].uri]);
            }
        }
    };

    const removeImage = (index) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const toggleHabitSelector = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsHabitSelectorVisible(!isHabitSelectorVisible);
    };

    const toggleHabitSelection = (habit) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (selectedHabits.some(h => h.id === habit.id)) {
            setSelectedHabits(selectedHabits.filter(h => h.id !== habit.id));
        } else {
            setSelectedHabits([...selectedHabits, habit]);
        }
    };

    const handlePost = () => {
        if (title.trim() || content.trim() || selectedImages.length > 0) {
            onPost({
                title: title.trim() ? title : 'My Progress Update',
                content,
                images: selectedImages,
                relatedHabits: selectedHabits,
                createdAt: new Date(),
            });

            // Reset form
            setTitle('');
            setContent('');
            setSelectedImages([]);
            setSelectedHabits([]);
            setIsExpanded(false);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >
            <MotiView
                from={{
                    height: 80,
                    opacity: 0.8
                }}
                animate={{
                    height: isExpanded ? 'auto' : 80,
                    opacity: 1
                }}
                transition={{
                    type: 'timing',
                    duration: 300
                }}
                className={`rounded-3xl mb-4 ${isDark ? 'bg-[#252F3C]' : 'bg-white'} shadow-sm overflow-hidden`}
            >
                <View className="px-4 py-3">
                    {/* Header with expand/collapse control */}
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isExpanded ? 'Create Blog Post' : 'Share your progress...'}
                        </Text>
                        <TouchableOpacity
                            onPress={toggleExpand}
                            className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                            <ChevronDown size={16} color={isDark ? '#E5E7EB' : '#4B5563'} style={{
                                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                            }} />
                        </TouchableOpacity>
                    </View>

                    {/* Main content area (visible when expanded) */}
                    {isExpanded && (
                        <ScrollView
                            ref={scrollViewRef}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Title input */}
                            <View className="mb-4">
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Post Title (optional)"
                                    placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
                                    className={`px-4 py-3 rounded-2xl text-base font-montserrat-semibold ${
                                        isDark
                                            ? 'bg-theme-input-dark text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    }`}
                                />
                            </View>

                            {/* Content input with auto-expanding height */}
                            <View className="mb-4">
                                <TextInput
                                    ref={contentInputRef}
                                    value={content}
                                    onChangeText={setContent}
                                    placeholder="What's your progress today? Share details about your journey..."
                                    placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
                                    className={`px-4 py-3 rounded-2xl text-base font-montserrat ${
                                        isDark
                                            ? 'bg-theme-input-dark text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    }`}
                                    multiline
                                    textAlignVertical="top"
                                    onContentSizeChange={(e) => {
                                        const height = e.nativeEvent.contentSize.height;
                                        setContentHeight(Math.min(Math.max(100, height), maxHeight));
                                    }}
                                    style={{ height: contentHeight }}
                                />
                            </View>

                            {/* Related Habits Selector */}
                            <View className="mb-4">
                                <TouchableOpacity
                                    onPress={toggleHabitSelector}
                                    className={`flex-row items-center justify-between px-4 py-3 rounded-2xl ${
                                        isDark
                                            ? 'bg-theme-input-dark'
                                            : 'bg-gray-100'
                                    }`}
                                >
                                    <View className="flex-row items-center">
                                        <Tag size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedHabits.length > 0
                                                ? `${selectedHabits.length} habit${selectedHabits.length > 1 ? 's' : ''} selected`
                                                : 'Link to habits'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={16} color={isDark ? '#E5E7EB' : '#4B5563'} style={{
                                        transform: [{ rotate: isHabitSelectorVisible ? '180deg' : '0deg' }]
                                    }} />
                                </TouchableOpacity>

                                {/* Habits list */}
                                {isHabitSelectorVisible && (
                                    <View className={`mt-2 p-3 rounded-2xl ${
                                        isDark
                                            ? 'bg-gray-800'
                                            : 'bg-gray-50'
                                    }`}>
                                        {availableHabits.map(habit => (
                                            <TouchableOpacity
                                                key={habit.id}
                                                onPress={() => toggleHabitSelection(habit)}
                                                className={`flex-row items-center justify-between py-2 px-3 mb-1 rounded-xl ${
                                                    selectedHabits.some(h => h.id === habit.id)
                                                        ? isDark ? 'bg-primary-500/20' : 'bg-primary-500/10'
                                                        : 'bg-transparent'
                                                }`}
                                            >
                                                <View className="flex-row items-center">
                                                    <Text className="mr-2">{habit.icon}</Text>
                                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {habit.title}
                                                    </Text>
                                                </View>
                                                {selectedHabits.some(h => h.id === habit.id) && (
                                                    <View className="bg-primary-500 rounded-full p-1">
                                                        <Text className="text-white text-xs">✓</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Selected Images Preview */}
                            {selectedImages.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    className="mb-4"
                                >
                                    <View className="flex-row space-x-2">
                                        {selectedImages.map((uri, index) => (
                                            <View key={index} className="relative">
                                                <Image source={{ uri }} className="w-24 h-24 rounded-xl" />
                                                <TouchableOpacity
                                                    onPress={() => removeImage(index)}
                                                    className="absolute -top-2 -right-2 bg-black/50 rounded-full p-1"
                                                >
                                                    <X size={12} color="white" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            )}

                            {/* Action Buttons */}
                            <View className="flex-row items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                <View className="flex-row space-x-3">
                                    <TouchableOpacity
                                        onPress={takePhoto}
                                        className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                    >
                                        <Camera size={20} color="#6366F1" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={pickImage}
                                        className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                    >
                                        <ImageIcon size={20} color="#6366F1" />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                    >
                                        <Clock size={20} color="#6366F1" />
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handlePost}
                                    disabled={!title.trim() && !content.trim() && selectedImages.length === 0}
                                    className={`px-4 py-2 rounded-xl ${
                                        title.trim() || content.trim() || selectedImages.length > 0
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                    }`}
                                >
                                    <Text
                                        className={`font-montserrat-medium ${
                                            title.trim() || content.trim() || selectedImages.length > 0
                                                ? 'text-white'
                                                : isDark ? 'text-gray-500' : 'text-gray-400'
                                        }`}
                                    >
                                        Post
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </MotiView>
        </KeyboardAvoidingView>
    );
};

export default BlogPostCreator;