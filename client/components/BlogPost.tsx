// src/components/Blogs/BlogPost.js
import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions
} from 'react-native';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import images  from '../constants/images'
import {router} from "expo-router";
import {useSelector} from "react-redux";


const BlogPost = ({ post, isDark, authorProfile }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [expandContent, setExpandContent] = useState(false);
    const [showAllImages, setShowAllImages] = useState(false);

    // Get current user from Redux
    const userDetails = useSelector((state) => state.user);
    const currentUser = userDetails?.user || {};

    const { width } = Dimensions.get('window');
    const imageWidth = width - 48; // Full width minus padding
    const multipleImagesWidth = (width - 56) / 2; // Half width for multiple images

    const toggleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLiked(!isLiked);
    };

    const toggleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsSaved(!isSaved);
    };

    const toggleExpandContent = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandContent(!expandContent);
    };

    const toggleShowAllImages = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowAllImages(!showAllImages);
    };

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Calculate if we need a "Read More" button
    const shouldTruncate = post.content.length > 150;

    return (
        <View className={`mb-4 mx-4 rounded-3xl overflow-hidden shadow-sm ${isDark ? 'bg-[#252F3C]' : 'bg-white'}`}>
            {/* Post Header */}
            <View className="p-4 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center">
                        <Image
                            source={authorProfile || images.maleProfile}
                            className="w-10 h-10 rounded-full"
                        />
                        <View className="ml-3">
                            <TouchableOpacity >
                            <Text  className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {post.author || 'You'}
                            </Text>
                            </TouchableOpacity>
                            <View className="flex-row items-center">
                                <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatDate(post.createdAt)}
                                </Text>
                                {post.relatedHabits && post.relatedHabits.length > 0 && (
                                    <View className="flex-row items-center ml-2">
                                        <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                                        <Text className={`text-xs font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {post.relatedHabits.map(h => h.icon).join(' ')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity className="p-2">
                        <MoreHorizontal size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Post Content */}
            <View className="p-4">
                {/* Post Title if exists */}
                {post.title && (
                    <Text className={`text-lg font-montserrat-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {post.title}
                    </Text>
                )}

                {/* Post Text Content */}
                <TouchableOpacity
                    activeOpacity={shouldTruncate ? 0.7 : 1}
                    onPress={shouldTruncate ? toggleExpandContent : null}
                    disabled={!shouldTruncate}
                >
                    <Text
                        className={`font-montserrat ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                        numberOfLines={expandContent ? null : 5}
                    >
                        {post.content}
                    </Text>

                    {shouldTruncate && (
                        <View className="flex-row items-center mt-1">
                            <Text className="text-primary-500 font-montserrat-medium mr-1">
                                {expandContent ? 'Show less' : 'Read more'}
                            </Text>
                            <ChevronDown
                                size={14}
                                color="#6366F1"
                                style={{ transform: [{ rotate: expandContent ? '180deg' : '0deg' }] }}
                            />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Post Images */}
                {post.images && post.images.length > 0 && (
                    <View className="mt-3">
                        {post.images.length === 1 ? (
                            // Single image
                            <Image
                                source={ images.blogImage  }
                                className="rounded-xl"
                                style={{ width: imageWidth, height: imageWidth * 0.66 }}
                                resizeMode="cover"
                            />
                        ) : (
                            // Multiple images
                            <View>
                                <View className="flex-row flex-wrap gap-2">
                                    {(showAllImages ? post.images : post.images.slice(0, 4)).map((uri, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={toggleShowAllImages}
                                            activeOpacity={0.9}
                                        >
                                            <Image
                                                source={{ uri }}
                                                className="rounded-xl"
                                                style={{
                                                    width: multipleImagesWidth,
                                                    height: multipleImagesWidth,
                                                    opacity: !showAllImages && index === 3 && post.images.length > 4 ? 0.7 : 1
                                                }}
                                                resizeMode="cover"
                                            />

                                            {!showAllImages && index === 3 && post.images.length > 4 && (
                                                <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-xl">
                                                    <Text className="text-white font-montserrat-bold text-lg">
                                                        +{post.images.length - 4}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {showAllImages && post.images.length > 4 && (
                                    <TouchableOpacity
                                        onPress={toggleShowAllImages}
                                        className="mt-2"
                                    >
                                        <Text className="text-primary-500 font-montserrat-medium">
                                            Show less
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Post Actions */}
            <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center space-x-4">
                    <TouchableOpacity
                        onPress={toggleLike}
                        className="flex-row items-center"
                    >
                        <Heart
                            size={20}
                            color={isLiked ? '#EF4444' : isDark ? '#E5E7EB' : '#4B5563'}
                            fill={isLiked ? '#EF4444' : 'none'}
                        />
                        <Text className={`ml-1 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {post.likes || 0}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center">
                        <MessageCircle
                            size={20}
                            color={isDark ? '#E5E7EB' : '#4B5563'}
                        />
                        <Text className={`ml-1 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {post.comments || 0}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Share2
                            size={20}
                            color={isDark ? '#E5E7EB' : '#4B5563'}
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={toggleSave}>
                    <Bookmark
                        size={20}
                        color={isSaved ? '#6366F1' : isDark ? '#E5E7EB' : '#4B5563'}
                        fill={isSaved ? '#6366F1' : 'none'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default BlogPost;