import {
  View,
  Text,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Share,
  FlatList
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpCircle } from 'lucide-react-native';

// Components
import BlogPostCreator from "../../components/BlogPostCreator";
import Blog from "../../components/Blogs";

import icons from "../../constants/images";

// Import the blog service
import * as blogService from "../../services/blogService";

const Explore = ({ navigation }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // State management
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoadedBlogId, setLastLoadedBlogId] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [creatingPost, setCreatingPost] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs
  const flatListRef = useRef(null);
  const isMounted = useRef(true);
  const PAGE_SIZE = 10; // Number of posts to load per page

  // Get user from Redux
  const user = useSelector(state => state.user);
  const userId = user?.user?.user?.user_id || user?.id;

  // Normalize blog post data to ensure consistent structure
  const normalizeBlogData = (post) => {
    if (!post) return null;

    return {
      ...post,
      blog_id: post.blog_id || 0,
      title: post.title || '',
      content: post.content || '',
      image: post.image || null,
      user: post.user || { user_name: 'Anonymous' },
      category: post.category || { category_name: 'General' },
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      createdAt: post.createdAt || new Date().toISOString(),
      isLiked: !!post.isLiked
    };
  };

  // Initial load of posts
  const initialLoadPosts = async () => {
    try {
      setInitialLoading(true);
      setPage(1);
      setLastLoadedBlogId(0);

      const response = await blogService.getBlogs(0, PAGE_SIZE);

      if (response && response.success && Array.isArray(response.data)) {
        const normalizedPosts = response.data.map(normalizeBlogData).filter(Boolean);

        if (isMounted.current) {
          setPosts(normalizedPosts);

          if (normalizedPosts.length > 0) {
            const lastPost = normalizedPosts[normalizedPosts.length - 1];
            setLastLoadedBlogId(lastPost.blog_id);
            setHasMorePosts(normalizedPosts.length >= PAGE_SIZE);
          } else {
            setHasMorePosts(false);
          }
        }
      } else {
        if (isMounted.current) {
          setPosts([]);
          setHasMorePosts(false);
        }
      }
    } catch (error) {
      console.error('Error loading initial posts:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to load posts. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setInitialLoading(false);
      }
    }
  };

  // Load more posts (lazy loading)
  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMore || refreshing) return;

    try {
      setLoadingMore(true);

      const response = await blogService.getBlogs(lastLoadedBlogId, PAGE_SIZE);

      if (response && response.success && Array.isArray(response.data)) {
        const normalizedPosts = response.data.map(normalizeBlogData).filter(Boolean);

        if (isMounted.current) {
          if (normalizedPosts.length > 0) {
            setPosts(prev => [...prev, ...normalizedPosts]);
            setPage(prev => prev + 1);

            const lastPost = normalizedPosts[normalizedPosts.length - 1];
            setLastLoadedBlogId(lastPost.blog_id);
            setHasMorePosts(normalizedPosts.length >= PAGE_SIZE);
          } else {
            setHasMorePosts(false);
          }
        }
      } else {
        if (isMounted.current) {
          setHasMorePosts(false);
        }
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
      // Don't show alert for lazy loading errors to avoid annoying users
    } finally {
      if (isMounted.current) {
        setLoadingMore(false);
      }
    }
  };

  // Handle refresh (pull-to-refresh)
  const handleRefresh = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);

      // Reset pagination
      setPage(1);
      setLastLoadedBlogId(0);

      const response = await blogService.getBlogs(0, PAGE_SIZE);

      if (response && response.success && Array.isArray(response.data)) {
        const normalizedPosts = response.data.map(normalizeBlogData).filter(Boolean);

        if (isMounted.current) {
          setPosts(normalizedPosts);

          if (normalizedPosts.length > 0) {
            const lastPost = normalizedPosts[normalizedPosts.length - 1];
            setLastLoadedBlogId(lastPost.blog_id);
            setHasMorePosts(normalizedPosts.length >= PAGE_SIZE);
          } else {
            setHasMorePosts(false);
          }
        }
      } else {
        if (isMounted.current) {
          setPosts([]);
          setHasMorePosts(false);
        }
      }

      // Provide haptic feedback after successful refresh
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error refreshing posts:', error);
      if (isMounted.current) {
        Alert.alert('Error', 'Failed to refresh posts. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  };

  // Create new post
  const handleCreatePost = async (postData) => {
    try {
      setCreatingPost(true);

      const blogData = {
        title: postData.title || undefined,
        content: postData.content,
        image: postData.images && postData.images.length > 0 ? postData.images[0] : undefined,
        category_id: postData.category_id
      };

      const response = await blogService.addBlog(blogData);

      if (response && response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Your post has been created!');
        // Refresh to show the new post
        handleRefresh();
      } else {
        throw new Error(response.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Could not create your post. Please try again.');
    } finally {
      setCreatingPost(false);
    }
  };

  // Handle liking a post
  const handleLikePost = async (blogId, isLiked) => {
    try {
      await blogService.toggleLikeBlog(blogId);

      // Update post in local state
      setPosts(currentPosts =>
          currentPosts.map(post =>
              post.blog_id === blogId
                  ? {
                    ...post,
                    isLiked: !isLiked,
                    likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
                  }
                  : post
          )
      );
    } catch (error) {
      console.error('Error liking post:', error);
      // If API call fails, we don't need to alert the user
      // The Blog component handles its own state
    }
  };

  // Handle adding a comment
  const handleAddComment = async (blogId, comment) => {
    try {
      await blogService.addComment(blogId, { content: comment });

      // Update comment count in local state
      setPosts(currentPosts =>
          currentPosts.map(post =>
              post.blog_id === blogId
                  ? { ...post, commentsCount: post.commentsCount + 1 }
                  : post
          )
      );
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };

  // Handle sharing a post
  const handleSharePost = async (blogId) => {
    try {
      const post = posts.find(p => p.blog_id === blogId);
      const title = post?.title || 'Check out this post';

      await Share.share({
        message: title,
        url: `yourapp://blog/${blogId}`
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Handle bookmarking a post
  const handleBookmarkPost = async (blogId, isBookmarked) => {
    try {
      // In a real app, you would call an API to save/unsave the post
      console.log(`Post ${blogId} ${isBookmarked ? 'bookmarked' : 'unbookmarked'}`);

      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error bookmarking post:', error);
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle scroll events
  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
    setShowScrollToTop(currentScrollY > 300);
  };

  // Load posts when screen is focused
  useFocusEffect(
      useCallback(() => {
        initialLoadPosts();

        return () => {
          // This will run when the screen loses focus
        };
      }, [])
  );

  // Initialize component
  useEffect(() => {
    isMounted.current = true;

    // Initial load
    initialLoadPosts();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Header component for FlatList
  const ListHeader = useCallback(() => (
      <View className="px-4 pb-2">
        {/* Blog Creator */}
        <BlogPostCreator
            isDark={isDark}
            onPost={handleCreatePost}
            isLoading={creatingPost}
        />

        {/* Section heading */}
        <View className="flex-row items-center justify-between mt-4 mb-2">
          <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Community Feed
          </Text>
        </View>
      </View>
  ), [isDark, creatingPost, handleCreatePost]);

  // Empty state component when no posts are available
  const EmptyComponent = useCallback(() => (
      <View className={`p-6 rounded-xl mx-4 mt-4 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <Text className={`text-center font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          No posts available
        </Text>
        <Text className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
          Be the first to share your progress with the community.
        </Text>
        <TouchableOpacity
            onPress={() => {
              // Scroll up to post creator
              scrollToTop();
              // Add a short delay to let animation complete
              setTimeout(() => {
                // Logic to focus on post creator
              }, 300);
            }}
            className="bg-primary-500 py-2 px-4 rounded-lg self-center"
        >
          <Text className="text-white font-medium">Create Post</Text>
        </TouchableOpacity>
      </View>
  ), [isDark, scrollToTop]);

  // Render a single blog post
  const renderBlog = useCallback(({ item }) => {
    // Add defensive check to avoid rendering null/undefined items
    if (!item || typeof item !== 'object' || !item.blog_id) {
      console.warn('Invalid blog post data:', item);
      return null;
    }

    return (
        <View className="px-4 mb-4">
          <Blog
              blog={item}
              isDark={isDark}
              onLike={handleLikePost}
              onComment={handleAddComment}
              onShare={handleSharePost}
              onBookmark={handleBookmarkPost}
              authorProfile={item.user?.avatar ? { uri: item.user.avatar } : icons.maleProfile}
          />
        </View>
    );
  }, [isDark, handleLikePost, handleAddComment, handleSharePost, handleBookmarkPost]);

  // Footer component to show loading indicator or end of list message
  const ListFooter = useCallback(() => {
    if (loadingMore) {
      return (
          <View className="py-6 items-center">
            <ActivityIndicator size="small" color="#6366F1" />
            <Text className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Loading more posts...
            </Text>
          </View>
      );
    }

    if (!hasMorePosts && posts.length > 0) {
      return (
          <View className="py-6 items-center">
            <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              You've reached the end!
            </Text>
          </View>
      );
    }

    return <View className="h-20" />;
  }, [loadingMore, hasMorePosts, posts.length, isDark]);

  return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <FlatList
            ref={flatListRef}
            data={posts}
            renderItem={renderBlog}
            keyExtractor={(item) => (item?.blog_id || Math.random()).toString()}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={!initialLoading ? EmptyComponent : null}
            ListFooterComponent={ListFooter}
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={isDark ? "#E5E7EB" : "#6366F1"}
                  colors={[isDark ? "#E5E7EB" : "#6366F1"]}
              />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={21}
        />

        {/* Initial Loading Overlay */}
        {initialLoading && (
            <View className="absolute inset-0 justify-center items-center bg-black/20">
              <View className={`p-4 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text className={`mt-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Loading posts...
                </Text>
              </View>
            </View>
        )}

        {/* Scroll to top button */}
        {showScrollToTop && (
            <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 300 }}
                className="absolute bottom-6 right-6"
            >
              <TouchableOpacity
                  onPress={scrollToTop}
                  className={`w-12 h-12 rounded-full shadow-lg items-center justify-center ${
                      isDark ? 'bg-gray-800' : 'bg-white'
                  }`}
              >
                <ArrowUpCircle size={24} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </TouchableOpacity>
            </MotiView>
        )}
      </SafeAreaView>
  );
};

export default Explore;