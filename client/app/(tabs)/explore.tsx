import { Image, TextInput, View, ScrollView, TouchableOpacity, Text, useColorScheme } from 'react-native'
import React, { useState } from 'react'
import icons from '../../constants/images'
import { MotiView } from 'moti'
import { Camera, Image as ImageIcon, Smile, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import Blog from '@/components/Blogs'
import * as ImagePicker from 'expo-image-picker'

const Explore = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [postText, setPostText] = useState('');

    // In React Native Debugger console
    const getAllKeys = async () => {
        const keys = await AsyncStorage.getAllKeys();
        const items = await AsyncStorage.multiGet(keys);
        console.table(items);
    };
    getAllKeys();

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: 4,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImages([...selectedImages, ...result.assets.map(asset => asset.uri)]);
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
            let result = await ImagePicker.launchCameraAsync({
                quality: 1,
            });

            if (!result.canceled) {
                setSelectedImages([...selectedImages, result.assets[0].uri]);
            }
        }
    };

    const removeImage = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedImages(selectedImages.filter((_, i) => i !== index));
    };

    const handlePost = () => {
        if (postText.trim() || selectedImages.length > 0) {
            // Handle post creation
            console.log('Creating post with:', { text: postText, images: selectedImages });
            // Reset form
            setPostText('');
            setSelectedImages([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    return (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-gray-50'}`}
            showsVerticalScrollIndicator={false}
        >
            {/* Post Creation Card */}
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600 }}
                className="px-4 "
            >
                <View className={`rounded-3xl ${isDark ? 'bg-theme-card-dark' : 'bg-white'} shadow-sm`}>
                    <View className="p-4">
                        {/* User Input Row */}
                        <View className="flex-row items-start space-x-3">
                            <Image
                                source={icons.maleProfile}
                                className="w-10 h-10 rounded-full"
                            />
                            <View className="flex-1">
                                <TextInput
                                    value={postText}
                                    onChangeText={setPostText}
                                    placeholder="What's your progress today?"
                                    placeholderTextColor={isDark ? '#94A3B8' : '#6B7280'}
                                    className={`px-4 py-3 rounded-2xl ${
                                        isDark ? 'bg-theme-input-dark text-white' : 'bg-gray-100 text-gray-900'
                                    }`}
                                    multiline
                                    numberOfLines={3}
                                    style={{ textAlignVertical: 'top' }}
                                />
                            </View>
                        </View>

                        {/* Selected Images Preview */}
                        {selectedImages.length > 0 && (
                            <View className="flex-row flex-wrap mt-4 gap-2">
                                {selectedImages.map((uri, index) => (
                                    <View key={index} className="relative">
                                        <Image
                                            source={{ uri }}
                                            className="w-20 h-20 rounded-xl"
                                        />
                                        <TouchableOpacity
                                            onPress={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-black/50 rounded-full p-1"
                                        >
                                            <X size={12} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <View className="flex-row space-x-4">
                                <TouchableOpacity
                                    onPress={takePhoto}
                                    className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                >
                                    <Camera size={20} className="text-primary-500" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={pickImage}
                                    className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                >
                                    <ImageIcon size={20} className="text-primary-500" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center rounded-xl p-2 bg-primary-500/10"
                                >
                                    <Smile size={20} className="text-primary-500" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handlePost}
                                disabled={!postText.trim() && selectedImages.length === 0}
                                className={`px-4 py-2 rounded-xl ${
                                    postText.trim() || selectedImages.length > 0
                                        ? 'bg-primary-500'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            >
                                <Text className={`font-medium ${
                                    postText.trim() || selectedImages.length > 0
                                        ? 'text-white'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    Post
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </MotiView>

            {/* Posts Feed */}
            <View className="mt-4">
                {[1, 2].map((_, index) => (
                    <MotiView
                        key={index}
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{
                            type: 'timing',
                            duration: 500,
                            delay: index * 100
                        }}
                    >
                        <Blog />
                    </MotiView>
                ))}
            </View>
        </ScrollView>
    );
};

export default Explore;