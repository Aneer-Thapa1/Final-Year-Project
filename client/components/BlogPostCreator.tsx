import React, { useState, useEffect, useRef } from 'react';
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
    Alert,
    ActivityIndicator
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Camera, Image as ImageIcon, X, ChevronDown, Tag, Users, Send, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

// Import the getCategories function
import { getCategories } from '../services/blogService';

const BlogPostCreator = ({ isDark, onPost, isLoading = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCategorySelectorVisible, setIsCategorySelectorVisible] = useState(false);
    const [isPublic, setIsPublic] = useState(true);

    // State for dynamic categories
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const contentInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Calculate input height based on content
    const [contentHeight, setContentHeight] = useState(100);
    const windowHeight = Dimensions.get('window').height;
    const maxHeight = windowHeight * 0.5; // Max 50% of screen height

    // Fetch categories when component mounts
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                const response = await getCategories();

                if (response && response.success && response.data) {
                    setCategories(response.data);
                } else {
                    // Fallback to static categories if API fails
                    setCategories([
                        { category_id: 1, category_name: 'Meditation', icon: '🧘', color: '#8B5CF6' },
                        { category_id: 2, category_name: 'Exercise', icon: '🏃', color: '#F43F5E' },
                        { category_id: 3, category_name: 'Reading', icon: '📚', color: '#F59E0B' },
                        { category_id: 4, category_name: 'Coding', icon: '💻', color: '#3B82F6' },
                    ]);
                }
            } catch (error) {
                console.error('Error fetching categories:', error);
                // Fallback to static categories
                setCategories([
                    { category_id: 1, category_name: 'Meditation', icon: '🧘', color: '#8B5CF6' },
                    { category_id: 2, category_name: 'Exercise', icon: '🏃', color: '#F43F5E' },
                    { category_id: 3, category_name: 'Reading', icon: '📚', color: '#F59E0B' },
                    { category_id: 4, category_name: 'Coding', icon: '💻', color: '#3B82F6' },
                ]);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, []);

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

        // Request permission first
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                "Permission Required",
                "Please allow access to your photo library to select images.",
                [{ text: "OK" }]
            );
            return;
        }

        try {
            // Use the picker with fixed parameters
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 4,
                quality: 0.8,
                aspect: [4, 3],
                allowsEditing: false,
            });

            if (!result.canceled && result.assets) {
                setSelectedImages([
                    ...selectedImages,
                    ...result.assets.map((asset) => asset.uri),
                ]);
            }
        } catch (error) {
            console.error("Image picker error:", error);
            Alert.alert("Error", "Failed to select image. Please try again.");
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                "Permission Required",
                "Please allow camera access to take photos.",
                [{ text: "OK" }]
            );
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets) {
                setSelectedImages([...selectedImages, result.assets[0].uri]);
            }
        } catch (error) {
            console.error("Camera error:", error);
            Alert.alert("Error", "Failed to take photo. Please try again.");
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

    // Toggle public/private status
    const togglePublicStatus = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPublic(!isPublic);
    };

    const handlePost = () => {
        if (!selectedCategory) {
            Alert.alert('Missing Information', 'Please select a category for your post.');
            return;
        }

        if (title.trim() || content.trim() || selectedImages.length > 0) {
            // Create the blog post object with updated field names
            const postData = {
                title: title.trim() ? title : 'My Progress Update',
                content: content.trim(),
                image: selectedImages.length > 0 ? selectedImages[0] : null, // Take first image only
                category_id: selectedCategory.category_id,
                is_public: isPublic
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

    const isPostButtonEnabled = (title.trim() || content.trim() || selectedImages.length > 0) && selectedCategory;

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
                style={{
                    shadowColor: isDark ? '#000' : '#333',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 3
                }}
            >
                <View className="px-4 py-3">
                    {/* Header with expand/collapse control */}
                    <TouchableOpacity
                        onPress={toggleExpand}
                        className="flex-row items-center justify-between mb-2"
                        activeOpacity={0.7}
                    >
                        <Text className={`text-lg font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isExpanded ? 'Create Blog Post' : 'Share your progress...'}
                        </Text>
                        <View
                            className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                            <ChevronDown size={16} color={isDark ? '#E5E7EB' : '#4B5563'} style={{
                                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }]
                            }} />
                        </View>
                    </TouchableOpacity>

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
                                            ? 'bg-gray-800 text-white'
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
                                            ? 'bg-gray-800 text-white'
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

                            {/* Selected Images Preview - Moved up for better visibility */}
                            {selectedImages.length > 0 && (
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Selected Images ({selectedImages.length})
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                    >
                                        <View className="flex-row space-x-3">
                                            {selectedImages.map((uri, index) => (
                                                <View key={index} className="relative">
                                                    <Image
                                                        source={{ uri }}
                                                        className="w-24 h-24 rounded-xl"
                                                        style={{ borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }}
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => removeImage(index)}
                                                        className="absolute -top-2 -right-2 bg-black/70 rounded-full p-1.5"
                                                    >
                                                        <X size={12} color="white" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            {selectedImages.length < 4 && (
                                                <TouchableOpacity
                                                    onPress={pickImage}
                                                    className={`w-24 h-24 rounded-xl justify-center items-center border-2 border-dashed ${
                                                        isDark ? 'border-gray-600' : 'border-gray-300'
                                                    }`}
                                                >
                                                    <ImageIcon size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                                    <Text className={`mt-2 text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        Add More
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {/* Category Selector */}
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Category <Text className="text-red-500">*</Text>
                                </Text>
                                <TouchableOpacity
                                    onPress={toggleCategorySelector}
                                    className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl ${
                                        isDark
                                            ? 'bg-gray-800'
                                            : 'bg-gray-100'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <Tag size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedCategory
                                                ? `${selectedCategory.icon} ${selectedCategory.category_name}`
                                                : 'Select a category'}
                                        </Text>
                                    </View>
                                    <ChevronDown size={16} color={isDark ? '#E5E7EB' : '#4B5563'} style={{
                                        transform: [{ rotate: isCategorySelectorVisible ? '180deg' : '0deg' }]
                                    }} />
                                </TouchableOpacity>

                                {/* Categories list - Animated */}
                                <AnimatePresence>
                                    {isCategorySelectorVisible && (
                                        <MotiView
                                            from={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ type: 'timing', duration: 200 }}
                                            className={`mt-2 p-3 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {loadingCategories ? (
                                                <View className="py-4 items-center">
                                                    <ActivityIndicator size="small" color="#6366F1" />
                                                    <Text className={`mt-2 font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        Loading categories...
                                                    </Text>
                                                </View>
                                            ) : (
                                                <ScrollView
                                                    nestedScrollEnabled
                                                    className="max-h-48"
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    {categories.map(category => (
                                                        <TouchableOpacity
                                                            key={category.category_id}
                                                            onPress={() => selectCategory(category)}
                                                            className={`flex-row items-center justify-between py-2.5 px-3 mb-1 rounded-xl ${
                                                                selectedCategory?.category_id === category.category_id
                                                                    ? isDark ? 'bg-primary-500/20' : 'bg-primary-500/10'
                                                                    : 'bg-transparent'
                                                            }`}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View className="flex-row items-center">
                                                                <Text className="mr-2 text-lg">{category.icon}</Text>
                                                                <Text className={`font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                                                </ScrollView>
                                            )}
                                        </MotiView>
                                    )}
                                </AnimatePresence>
                            </View>

                            {/* Public/Private Toggle */}
                            <View className="mb-4">
                                <Text className={`text-sm font-montserrat-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Visibility
                                </Text>
                                <TouchableOpacity
                                    onPress={togglePublicStatus}
                                    className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl ${
                                        isDark ? 'bg-gray-800' : 'bg-gray-100'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        <Users size={18} color={isDark ? '#94A3B8' : '#6B7280'} />
                                        <Text className={`ml-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {isPublic ? 'Public post' : 'Private post'}
                                        </Text>
                                    </View>

                                    <View className={`w-12 h-6 rounded-full flex-row items-center px-1 ${
                                        isPublic
                                            ? 'bg-primary-500 justify-end'
                                            : isDark ? 'bg-gray-600 justify-start' : 'bg-gray-300 justify-start'
                                    }`}>
                                        <View className="w-4 h-4 bg-white rounded-full"></View>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Media Actions */}
                            {selectedImages.length === 0 && (
                                <View className="mb-4">
                                    <Text className={`text-sm font-montserrat-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Add Media (optional)
                                    </Text>
                                    <View className="flex-row space-x-3">
                                        <TouchableOpacity
                                            onPress={takePhoto}
                                            className={`flex-1 flex-row items-center justify-center rounded-xl p-3 ${
                                                isDark ? 'bg-gray-800' : 'bg-gray-100'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <Camera size={20} color="#6366F1" />
                                            <Text className={`ml-2 font-montserrat-medium text-primary-500`}>
                                                Take Photo
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={pickImage}
                                            className={`flex-1 flex-row items-center justify-center rounded-xl p-3 ${
                                                isDark ? 'bg-gray-800' : 'bg-gray-100'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <ImageIcon size={20} color="#6366F1" />
                                            <Text className={`ml-2 font-montserrat-medium text-primary-500`}>
                                                Gallery
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Post Button */}
                            <TouchableOpacity
                                onPress={handlePost}
                                disabled={isLoading || !isPostButtonEnabled}
                                className={`px-4 py-3 rounded-xl mb-2 flex-row items-center justify-center ${
                                    isLoading
                                        ? isDark ? 'bg-gray-700' : 'bg-gray-200'
                                        : isPostButtonEnabled
                                            ? 'bg-primary-500'
                                            : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                                activeOpacity={isPostButtonEnabled ? 0.7 : 1}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={isDark ? "#9CA3AF" : "#6B7280"} />
                                ) : (
                                    <>
                                        <Text
                                            className={`font-montserrat-semibold mr-2 ${
                                                isPostButtonEnabled
                                                    ? 'text-white'
                                                    : isDark ? 'text-gray-500' : 'text-gray-400'
                                            }`}
                                        >
                                            Post Blog
                                        </Text>
                                        <Send size={16} color={
                                            isPostButtonEnabled
                                                ? 'white'
                                                : isDark ? '#6B7280' : '#9CA3AF'
                                        } />
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </MotiView>
        </KeyboardAvoidingView>
    );
};

export default BlogPostCreator;