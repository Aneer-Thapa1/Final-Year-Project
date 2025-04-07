import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Modal,
    StatusBar,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Camera, Image as ImageIcon, X, ChevronDown, Tag, Users, Send, Clock, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import the getCategories function
import { getCategories } from '../services/blogService';

const BlogPostCreator = ({
                             visible,
                             onClose,
                             onPost,
                             loading = false,
                             initialData = null,
                             isEditMode = false
                         }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    // Blog post form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isCategorySelectorVisible, setIsCategorySelectorVisible] = useState(false);
    const [isPublic, setIsPublic] = useState(true);

    // State for dynamic categories
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Refs
    const titleInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Theme colors based on your Tailwind config
    const colors = {
        // Primary - Sage Green
        primary: isDark ? '#4ADE80' : '#22C55E',
        primaryLight: isDark ? '#86EFAC' : '#4ADE80',
        primaryDark: isDark ? '#16A34A' : '#15803D',
        primaryBg: isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.05)',

        // Secondary - Deep Purple
        secondary: isDark ? '#A78BFA' : '#8B5CF6',
        secondaryLight: isDark ? '#C4B5FD' : '#A78BFA',
        secondaryDark: isDark ? '#7C3AED' : '#6D28D9',

        // Background
        background: isDark ? '#0F172A' : '#FFFFFF',
        card: isDark ? '#1E293B' : '#F8FAFC',
        surface: isDark ? '#334155' : '#FFFFFF',
        input: isDark ? '#475569' : '#F1F5F9',

        // Text
        textPrimary: isDark ? '#F8FAFC' : '#0F172A',
        textSecondary: isDark ? '#E2E8F0' : '#334155',
        textMuted: isDark ? '#94A3B8' : '#64748B',

        // Border
        border: isDark ? '#475569' : '#E2E8F0',

        // Success color for online status
        success: isDark ? '#4ADE80' : '#22C55E'
    };

    // Initialize form with initial data if in edit mode
    useEffect(() => {
        if (initialData && visible) {
            setTitle(initialData.title || '');
            setContent(initialData.content || '');
            setSelectedImages(initialData.images || []);
            setIsPublic(initialData.is_public !== false);
        }
    }, [initialData, visible]);

    // Fetch categories when component mounts
    useEffect(() => {
        if (visible) {
            fetchCategories();

            // Focus on title input after a brief delay
            setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                }
            }, 300);
        }
    }, [visible]);

    // Reset form when modal closes
    useEffect(() => {
        if (!visible) {
            if (!initialData) {
                setTitle('');
                setContent('');
                setSelectedImages([]);
                setSelectedCategory(null);
                setIsPublic(true);
            }
        }
    }, [visible]);

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await getCategories();

            if (response && response.success && response.data) {
                setCategories(response.data);

                // If we have initialData with category_id, find and select the matching category
                if (initialData && initialData.category_id) {
                    const category = response.data.find(cat => cat.category_id === initialData.category_id);
                    if (category) {
                        setSelectedCategory(category);
                    }
                }
            } else {
                // Fallback to static categories if API fails
                const fallbackCategories = [
                    { category_id: 1, category_name: 'Meditation', icon: '🧘', color: '#8B5CF6' },
                    { category_id: 2, category_name: 'Exercise', icon: '🏃', color: '#F43F5E' },
                    { category_id: 3, category_name: 'Reading', icon: '📚', color: '#F59E0B' },
                    { category_id: 4, category_name: 'Coding', icon: '💻', color: '#3B82F6' },
                ];

                setCategories(fallbackCategories);

                // If we have initialData with category_id, find and select the matching category
                if (initialData && initialData.category_id) {
                    const category = fallbackCategories.find(cat => cat.category_id === initialData.category_id);
                    if (category) {
                        setSelectedCategory(category);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Fallback to static categories
            const fallbackCategories = [
                { category_id: 1, category_name: 'Meditation', icon: '🧘', color: '#8B5CF6' },
                { category_id: 2, category_name: 'Exercise', icon: '🏃', color: '#F43F5E' },
                { category_id: 3, category_name: 'Reading', icon: '📚', color: '#F59E0B' },
                { category_id: 4, category_name: 'Coding', icon: '💻', color: '#3B82F6' },
            ];

            setCategories(fallbackCategories);

            // If we have initialData with category_id, find and select the matching category
            if (initialData && initialData.category_id) {
                const category = fallbackCategories.find(cat => cat.category_id === initialData.category_id);
                if (category) {
                    setSelectedCategory(category);
                }
            }
        } finally {
            setLoadingCategories(false);
        }
    };

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "You need to allow access to your photos to add images to your post.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 4,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedImages([
                    ...selectedImages,
                    ...result.assets.map((asset) => asset.uri)
                ].slice(0, 4)); // Limit to 4 images
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert("Error", "Could not select images. Please try again.");
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "You need to allow camera access to take photos.");
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                quality: 0.8,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedImages([...selectedImages, result.assets[0].uri].slice(0, 4)); // Limit to 4 images
            }
        } catch (error) {
            console.error('Error with camera:', error);
            Alert.alert("Error", "Could not take photo. Please try again.");
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

    const togglePublicStatus = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPublic(!isPublic);
    };

    const handlePost = () => {
        // Validate inputs
        if (!selectedCategory) {
            Alert.alert("Required Field", "Please select a category for your post.");
            return;
        }

        if (!title.trim() && !content.trim() && selectedImages.length === 0) {
            Alert.alert("Empty Post", "Please add some content to your post.");
            return;
        }

        // Create post data
        const postData = {
            title: title.trim() ? title : isEditMode ? "Updated Post" : 'My Progress Update',
            content: content.trim(),
            images: selectedImages,
            category_id: selectedCategory.category_id,
            is_public: isPublic
        };

        // Call the provided callback
        onPost(postData);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Clean close (no confirmation if no changes)
    const handleClose = () => {
        const hasNoChanges = isEditMode &&
            title === (initialData?.title || '') &&
            content === (initialData?.content || '') &&
            JSON.stringify(selectedImages) === JSON.stringify(initialData?.images || []) &&
            selectedCategory?.category_id === initialData?.category_id &&
            isPublic === (initialData?.is_public !== false);

        if (!hasNoChanges && (title || content || selectedImages.length > 0 || selectedCategory)) {
            Alert.alert(
                "Discard Changes?",
                "You have unsaved changes. Are you sure you want to discard them?",
                [
                    { text: "Continue Editing", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: onClose }
                ]
            );
        } else {
            onClose();
        }
    };

    const isPostButtonEnabled = (title.trim() || content.trim() || selectedImages.length > 0) && selectedCategory;

    // Render category item for FlatList
    const renderCategoryItem = ({ item, index }) => (
        <TouchableOpacity
            key={item.category_id}
            onPress={() => selectCategory(item)}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                borderBottomWidth: index < categories.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: selectedCategory?.category_id === item.category_id
                    ? colors.primaryBg
                    : 'transparent',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{item.icon}</Text>
                <Text
                    style={{
                        fontFamily: 'montserrat-medium',
                        fontSize: 15,
                        color: colors.textPrimary,
                    }}
                >
                    {item.category_name}
                </Text>
            </View>
            {selectedCategory?.category_id === item.category_id && (
                <CheckCircle size={18} color={colors.primary} />
            )}
        </TouchableOpacity>
    );

    // Render image item for the horizontal image list
    const renderImageItem = ({ item, index }) => (
        <View
            key={index}
            style={{
                marginRight: 12,
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                borderWidth: 1,
                borderColor: colors.border,
                width: 100,
                height: 100,
            }}
        >
            <Image
                source={{ uri: item }}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 8,
                }}
            />
            <TouchableOpacity
                onPress={() => removeImage(index)}
                style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <X size={16} color="white" />
            </TouchableOpacity>
        </View>
    );

    // Render add more button for image list
    const renderAddMoreButton = () => {
        if (selectedImages.length >= 4) return null;

        return (
            <TouchableOpacity
                onPress={pickImage}
                style={{
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                }}
            >
                <ImageIcon size={24} color={colors.textMuted} />
                <Text
                    style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontFamily: 'montserrat',
                        color: colors.textMuted,
                    }}
                >
                    Add More
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                {/* Header */}
                <View
                    style={{
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: colors.card,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    }}
                >
                    <TouchableOpacity
                        onPress={handleClose}
                        style={{
                            padding: 8,
                            borderRadius: 8,
                            backgroundColor: isDark ? colors.surface : '#f3f4f6',
                            hitSlop: { top: 10, bottom: 10, left: 10, right: 10 }
                        }}
                    >
                        <X size={22} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            fontFamily: 'montserrat-bold',
                            color: colors.textPrimary,
                        }}
                    >
                        {isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}
                    </Text>

                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={loading || !isPostButtonEnabled}
                        style={{
                            padding: 8,
                            borderRadius: 8,
                            backgroundColor: isPostButtonEnabled ? colors.primary : isDark ? colors.surface : '#f3f4f6',
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text
                                style={{
                                    fontWeight: '600',
                                    fontFamily: 'montserrat-semibold',
                                    color: isPostButtonEnabled ? '#ffffff' : colors.textMuted,
                                }}
                            >
                                {isEditMode ? 'Update' : 'Post'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16 }}
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Main Form Content */}
                        <View style={{ flex: 1 }}>
                            {/* Blog Title */}
                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Post Title {isEditMode ? '' : '(Optional)'}
                                </Text>
                                <TextInput
                                    ref={titleInputRef}
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        fontFamily: 'montserrat',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                    placeholder="Enter post title"
                                    placeholderTextColor={colors.textMuted}
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={100}
                                />
                            </View>

                            {/* Blog Content */}
                            <View style={{ marginBottom: 24 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Content
                                </Text>
                                <TextInput
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        fontFamily: 'montserrat',
                                        fontSize: 15,
                                        minHeight: 120,
                                        textAlignVertical: 'top',
                                        color: colors.textPrimary,
                                    }}
                                    placeholder="What's your progress today? Share details about your journey..."
                                    placeholderTextColor={colors.textMuted}
                                    value={content}
                                    onChangeText={setContent}
                                    multiline
                                    numberOfLines={5}
                                    maxLength={1000}
                                />
                            </View>

                            {/* Category Selector */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text
                                        style={{
                                            fontFamily: 'montserrat-medium',
                                            fontSize: 15,
                                            color: colors.textPrimary,
                                        }}
                                    >
                                        Category <Text style={{ color: '#EF4444' }}>*</Text>
                                    </Text>

                                    {selectedCategory && (
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontFamily: 'montserrat-medium',
                                                color: colors.primary,
                                            }}
                                        >
                                            {selectedCategory.category_name}
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    onPress={toggleCategorySelector}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        marginBottom: 8,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Tag size={18} color={selectedCategory ? colors.primary : colors.textMuted} />
                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                fontFamily: 'montserrat',
                                                fontSize: 15,
                                                color: selectedCategory ? colors.textPrimary : colors.textMuted,
                                            }}
                                        >
                                            {selectedCategory
                                                ? `${selectedCategory.icon} ${selectedCategory.category_name}`
                                                : 'Select a category'}
                                        </Text>
                                    </View>
                                    <ChevronDown
                                        size={18}
                                        color={colors.textMuted}
                                        style={{
                                            transform: [{ rotate: isCategorySelectorVisible ? '180deg' : '0deg' }]
                                        }}
                                    />
                                </TouchableOpacity>

                                {/* Categories Dropdown */}
                                {isCategorySelectorVisible && (
                                    <View
                                        style={{
                                            marginBottom: 16,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: colors.surface,
                                            maxHeight: 200,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {loadingCategories ? (
                                            <View style={{ padding: 16, alignItems: 'center' }}>
                                                <ActivityIndicator size="small" color={colors.primary} />
                                                <Text style={{ marginTop: 8, color: colors.textMuted, fontFamily: 'montserrat' }}>
                                                    Loading categories...
                                                </Text>
                                            </View>
                                        ) : (
                                            <FlatList
                                                data={categories}
                                                renderItem={renderCategoryItem}
                                                keyExtractor={(item) => item.category_id.toString()}
                                                style={{ maxHeight: 200 }}
                                                showsVerticalScrollIndicator={false}
                                                scrollEnabled={true}
                                                nestedScrollEnabled={true}
                                            />
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Images Section */}
                            <View style={{ marginBottom: 20 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Images {isEditMode ? '' : '(Optional)'}
                                </Text>

                                {/* Selected Images */}
                                {selectedImages.length > 0 && (
                                    <View style={{ marginBottom: 16, height: 100 }}>
                                        <FlatList
                                            horizontal
                                            data={selectedImages}
                                            renderItem={renderImageItem}
                                            keyExtractor={(item, index) => index.toString()}
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{ paddingRight: 8 }}
                                            ListFooterComponent={renderAddMoreButton}
                                            scrollEnabled={true}
                                            nestedScrollEnabled={true}
                                        />
                                    </View>
                                )}

                                {/* Image action buttons */}
                                {selectedImages.length === 0 && (
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            onPress={takePhoto}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: colors.surface,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                            }}
                                        >
                                            <Camera size={20} color={colors.primary} />
                                            <Text
                                                style={{
                                                    marginLeft: 8,
                                                    fontFamily: 'montserrat-medium',
                                                    fontSize: 14,
                                                    color: colors.primary,
                                                }}
                                            >
                                                Camera
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={pickImage}
                                            style={{
                                                flex: 1,
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 12,
                                                borderRadius: 12,
                                                backgroundColor: colors.surface,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                            }}
                                        >
                                            <ImageIcon size={20} color={colors.primary} />
                                            <Text
                                                style={{
                                                    marginLeft: 8,
                                                    fontFamily: 'montserrat-medium',
                                                    fontSize: 14,
                                                    color: colors.primary,
                                                }}
                                            >
                                                Gallery
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Visibility Toggle */}
                            <View style={{ marginBottom: 24 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Visibility
                                </Text>
                                <TouchableOpacity
                                    onPress={togglePublicStatus}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Users size={18} color={colors.textMuted} />
                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                fontFamily: 'montserrat',
                                                fontSize: 15,
                                                color: colors.textPrimary,
                                            }}
                                        >
                                            {isPublic ? 'Public post' : 'Private post'}
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            width: 50,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: isPublic ? colors.primary : isDark ? colors.surface : '#E5E7EB',
                                            justifyContent: 'center',
                                            padding: 2,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                                backgroundColor: 'white',
                                                transform: [{ translateX: isPublic ? 22 : 0 }],
                                            }}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Bottom Action Buttons */}
                    <View
                        style={{
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            backgroundColor: colors.card,
                            paddingBottom: Math.max(16, insets.bottom),
                        }}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={{
                                    flex: 1,
                                    marginRight: 8,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: 'montserrat-semibold',
                                        fontSize: 15,
                                        color: colors.textSecondary,
                                    }}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handlePost}
                                disabled={loading || !isPostButtonEnabled}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isPostButtonEnabled
                                        ? loading ? colors.primaryLight : colors.primary
                                        : isDark ? '#374151' : '#E5E7EB',
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Send size={18} color={isPostButtonEnabled ? 'white' : colors.textMuted} />
                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                color: isPostButtonEnabled ? 'white' : colors.textMuted,
                                                fontFamily: 'montserrat-semibold',
                                                fontSize: 15,
                                            }}
                                        >
                                            {isEditMode ? 'Update Post' : 'Post Blog'}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
};

export default BlogPostCreator;