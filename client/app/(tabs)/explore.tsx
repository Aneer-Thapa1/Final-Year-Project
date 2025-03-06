import {
  View,
  ScrollView,
  Text,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// Components
import BlogPostCreator from "../../components/BlogPostCreator";
import BlogPost from "../../components/BlogPost";
import icons from "../../constants/images";

// Import the blog service properly
import * as blogService from "../../services/blogService";

const Explore: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastLoadedBlogId, setLastLoadedBlogId] = useState<number>(0);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);

  // Get user details from Redux state
  const userDetails = useSelector((state: any) => state.user);
  const userId = userDetails?.id || userDetails?.user_id;

  // Sample profile image for demo purposes
  const userProfile = icons.maleProfile;

  // Load posts from backend
  const loadPosts = async (refresh = false) => {
    try {
      setLoading(true);
      // If refreshing, start from the beginning
      const startId = refresh ? 0 : lastLoadedBlogId;

      const response = await blogService.getBlogs(startId);

      if (response && response.data) {
        const fetchedPosts = response.data;

        // If refreshing, replace posts. Otherwise, append new posts
        if (refresh) {
          setPosts(fetchedPosts);
        } else {
          setPosts(prev => [...prev, ...fetchedPosts]);
        }

        // Update last loaded ID for pagination - use the last post's ID
        if (fetchedPosts.length > 0) {
          const lastPost = fetchedPosts[fetchedPosts.length - 1];
          setLastLoadedBlogId(lastPost.blog_id);
        }

        // Check if there are more posts to load
        setHasMorePosts(fetchedPosts.length > 0);
      } else {
        // No data or empty array
        if (refresh) {
          setPosts([]);
        }
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle creating a new post
  const handleCreatePost = async (newPost: any) => {
    try {
      setLoading(true);

      // Map from UI post format to API format
      const blogData = {
        blog_title: newPost.title || 'My Progress Update',
        blog_description: newPost.content,
        blog_image: newPost.images && newPost.images.length > 0 ? newPost.images[0] : undefined,
        category_id: newPost.category_id // Make sure to include the category_id
      };

      // Call the API to create the post
      const response = await blogService.addBlog(blogData);

      if (response && response.success) {
        // Show success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Refresh the posts to include the new one
        await loadPosts(true);
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Could not create your post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle liking a post (placeholder - implement when API supports it)
  const handleLikePost = async (postId: number) => {
    try {
      // For now, we'll just update the UI optimistically
      // This should be replaced with an actual API call when available

      const updatedPosts = posts.map(post => {
        if (post.blog_id === postId) {
          // Toggle like state
          const isLiked = post.isLiked || false;
          return {
            ...post,
            likes: isLiked ? (post.likes || 1) - 1 : (post.likes || 0) + 1,
            isLiked: !isLiked
          };
        }
        return post;
      });

      setPosts(updatedPosts);

      // In future: Call the API to toggle like status
      // await blogService.toggleLikeBlog(postId);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLastLoadedBlogId(0); // Reset pagination
    await loadPosts(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Load more posts when user reaches the end
  const loadMorePosts = async () => {
    if (!loading && hasMorePosts) {
      await loadPosts();
    }
  };

  // Load posts when the screen is focused
  useFocusEffect(
      useCallback(() => {
        loadPosts(true);
      }, [])
  );

  // Initial load
  useEffect(() => {
    loadPosts(true);
  }, []);

  // Format posts from API to match UI component expectations
  const formatPost = (apiPost: any) => {
    return {
      id: apiPost.blog_id.toString(),
      title: apiPost.blog_title,
      content: apiPost.blog_description,
      images: apiPost.blog_image ? [apiPost.blog_image] : [],
      author: apiPost.user?.username || 'Anonymous',
      authorId: apiPost.user_id,
      categoryId: apiPost.category_id,
      categoryName: apiPost.category?.category_name || 'Uncategorized',
      likes: apiPost.likes || 0,
      comments: apiPost.comments || 0,
      createdAt: new Date(apiPost.created_at),
      isLiked: apiPost.isLiked || false
    };
  };

  return (
      <ScrollView
          className={`flex-1 ${isDark ? "bg-theme-background-dark" : "bg-gray-50"}`}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDark ? "#E5E7EB" : "#4B5563"}
            />
          }
          onScrollEndDrag={loadMorePosts}
      >
        {/* Content container with padding */}
        <View className="py-4">
          {/* Blog Post Creator */}
          <View className="px-4">
            <BlogPostCreator
                isDark={isDark}
                onPost={handleCreatePost}
            />
          </View>

          {/* Section title */}
          <View className="px-4 mt-2 mb-4">
            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Community Feed
            </Text>
          </View>

          {/* Loading state */}
          {loading && !refreshing && (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#6366F1" />
                <Text className={`mt-2 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Loading posts...
                </Text>
              </View>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
              <MotiView
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  className="mx-4 p-6 rounded-3xl items-center justify-center bg-primary-500/10"
              >
                <Text className="text-primary-500 font-montserrat-bold text-lg mb-2">
                  No posts yet
                </Text>
                <Text className={`text-center font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                  Be the first to share your progress with the community.
                </Text>
              </MotiView>
          )}

          {/* Posts list */}
          {!loading && posts.map((post, index) => {
            // Format the post data for the UI component
            const formattedPost = formatPost(post);

            return (
                <MotiView
                    key={formattedPost.id || index}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{
                      type: 'timing',
                      duration: 500,
                      delay: index * 100,
                    }}
                >
                  <BlogPost
                      post={formattedPost}
                      isDark={isDark}
                      authorProfile={formattedPost.authorId === userId ? userProfile : null}
                      onLike={() => handleLikePost(post.blog_id)}
                  />
                </MotiView>
            );
          })}

          {/* Loading more indicator */}
          {hasMorePosts && !loading && posts.length > 0 && (
              <View className="py-4 items-center">
                <Text className={`font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Pull to load more posts
                </Text>
              </View>
          )}

          {/* Bottom padding */}
          <View className="h-20" />
        </View>
      </ScrollView>
  );
};

export default Explore;