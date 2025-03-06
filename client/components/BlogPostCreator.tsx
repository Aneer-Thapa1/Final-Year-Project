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
    Dimensions,
    Alert
} from 'react-native';
import { MotiView } from 'moti';
import { Camera, Image as ImageIcon, X, ChevronDown, Tag, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

// Static categories - no API fetching needed
const STATIC_CATEGORIES = [
    { category_id: 1, category_name: 'Meditation', icon: '🧘' },
    { category_id: 2, category_name: 'Exercise', icon: '🏃' },
    { category_id: 3, category_name: 'Reading', icon: '📚' },
    { category_id: 4, category_name: 'Coding', icon: '💻' },
];

const BlogPostCreator = ({ isDark, onPost }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCategorySelectorVisible, setIsCategorySelectorVisible] = useState(false);

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

    const toggleCategorySelector = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsCategorySelectorVisible(!isCategorySelectorVisible);
    };

    const selectCategory = (category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCategory(category);
        setIsCategorySelectorVisible(false);
    };

    const handlePost = () => {
        if (!selectedCategory) {
            Alert.alert('Error', 'Please select a category for your post.');
            return;
        }

        if (title.trim() || content.trim() || selectedImages.length > 0) {
            // Create the blog post object with category_id
            const postData = {
                title: title.trim() ? title : 'My Progress Update',
                content,
                images: selectedImages,
                // Include the category ID in the post data
                category_id: selectedCategory.category_id,
                createdAt: new Date(),
            };

            onPost(postData);

            // Reset form
            setTitle('');
            setContent('');
            setSelectedImages([]);
            setSelectedCategory(null);
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

                            {/* Category Selector */}
                            <View className="mb-4">
                                <TouchableOpacity
                                    onPress={toggleCategorySelector}
                                    className={`flex-row items-center justify-between px-4 py-3 rounded-2xl ${
                                        isDark
                                            ? 'bg-theme-input-dark'
                                            : 'bg-gray-100'
                                    }`}
                                >
                                    <View className="flex-row items-center">
                                        <Tag size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedCategory
                                                ? `${selectedCategory.icon} ${selectedCategory.category_name}`
                                                : 'Select a category (required)'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={16} color={isDark ? '#E5E7EB' : '#4B5563'} style={{
                                        transform: [{ rotate: isCategorySelectorVisible ? '180deg' : '0deg' }]
                                    }} />
                                </TouchableOpacity>

                                {/* Categories list */}
                                {isCategorySelectorVisible && (
                                    <View className={`mt-2 p-3 rounded-2xl ${
                                        isDark
                                            ? 'bg-gray-800'
                                            : 'bg-gray-50'
                                    }`}>
                                        {STATIC_CATEGORIES.map(category => (
                                            <TouchableOpacity
                                                key={category.category_id}
                                                onPress={() => selectCategory(category)}
                                                className={`flex-row items-center justify-between py-2 px-3 mb-1 rounded-xl ${
                                                    selectedCategory?.category_id === category.category_id
                                                        ? isDark ? 'bg-primary-500/20' : 'bg-primary-500/10'
                                                        : 'bg-transparent'
                                                }`}
                                            >
                                                <View className="flex-row items-center">
                                                    <Text className="mr-2">{category.icon}</Text>
                                                    <Text className={`font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {category.category_name}
                                                    </Text>
                                                </View>
                                                {selectedCategory?.category_id === category.category_id && (
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
                                    disabled={(!title.trim() && !content.trim() && selectedImages.length === 0) || !selectedCategory}
                                    className={`px-4 py-2 rounded-xl ${
                                        (title.trim() || content.trim() || selectedImages.length > 0) && selectedCategory
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                    }`}
                                >
                                    <Text
                                        className={`font-montserrat-medium ${
                                            (title.trim() || content.trim() || selectedImages.length > 0) && selectedCategory
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