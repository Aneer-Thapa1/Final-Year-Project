import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    InteractionManager,
    RefreshControl,
    Share,
    Text,
    TouchableOpacity,
    useColorScheme,
    View
} from "react-native";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {MotiView} from "moti";
import * as Haptics from "expo-haptics";
import {useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Send} from "lucide-react-native";

// Import the full modal BlogPostCreator
import BlogPostCreatorModal from "../../components/BlogPostCreator";
import Blog from "../../components/Blogs";

import icons from "../../constants/images";

// Import the blog service
import * as blogService from "../../services/blogService";

// Utility function to generate truly unique keys
const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const Explore = ({navigation}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // State management
    const [posts, setPosts] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastLoadedBlogId, setLastLoadedBlogId] = useState(0);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [creatingPost, setCreatingPost] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Blog creator modal state
    const [blogModalVisible, setBlogModalVisible] = useState(false);

    // Refs
    const flatListRef = useRef(null);
    const isMounted = useRef(true);
    const isLoadingMoreRef = useRef(false);
    const prevScrollY = useRef(0);
    const PAGE_SIZE = 6; // Reduced for smoother loading

    // Animated values for tab bar
    const tabBarOpacity = useRef(new Animated.Value(1)).current;

    // Get user from Redux
    const user = useSelector(state => state.user);
    const userId = user?.user?.user?.user_id || user?.id;

    // Theme-specific styles
    const themeStyles = {
        container: isDark ? 'bg-gray-900' : 'bg-gray-50',
        card: isDark ? 'bg-gray-800' : 'bg-white',
        text: isDark ? 'text-white' : 'text-gray-900',
        subtext: isDark ? 'text-gray-400' : 'text-gray-600'
    };

    // Normalize blog post data to ensure consistent structure
    const normalizeBlogData = useCallback((post) => {
        if (!post) return null;

        // Add a unique clientId for each post to use as a reliable React key
        const uniqueClientId = generateUniqueId();

        return {
            ...post,
            blog_id: post.blog_id || 0,
            clientId: uniqueClientId, // Add this unique client-side ID
            title: post.title || '',
            content: post.content || '',
            image: post.image || null,
            user: post.user || {user_name: 'Anonymous'},
            category: post.category || {category_name: 'General'},
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            createdAt: post.createdAt || new Date().toISOString(),
            isLiked: !!post.isLiked
        };
    }, []);

    // Initial load of posts with performance optimizations
    const initialLoadPosts = useCallback(async () => {
        if (!isMounted.current) return;

        try {
            setInitialLoading(true);
            setLastLoadedBlogId(0);

            const response = await blogService.getBlogs(0, PAGE_SIZE);

            // Cancel if component unmounted during network request
            if (!isMounted.current) return;

            // Use InteractionManager to process data after animations
            InteractionManager.runAfterInteractions(() => {
                if (!isMounted.current) return;

                if (response && response.success && Array.isArray(response.data)) {
                    // Ensure each post has a unique identifier
                    const normalizedPosts = response.data
                        .map(normalizeBlogData)
                        .filter(Boolean);

                    setPosts(normalizedPosts);

                    if (normalizedPosts.length > 0) {
                        const lastPost = normalizedPosts[normalizedPosts.length - 1];
                        setLastLoadedBlogId(lastPost.blog_id);
                        setHasMorePosts(normalizedPosts.length >= PAGE_SIZE);
                    } else {
                        setHasMorePosts(false);
                    }
                } else {
                    setPosts([]);
                    setHasMorePosts(false);
                }

                setInitialLoading(false);
            });
        } catch (error) {
            console.error('Error loading initial posts:', error);

            if (isMounted.current) {
                Alert.alert('Error', 'Failed to load posts. Please try again.');
                setInitialLoading(false);
            }
        }
    }, [normalizeBlogData]);

    // Load more posts with improved lazy loading implementation
    const loadMorePosts = useCallback(async () => {
        // Protect against concurrent calls and unnecessary loading
        if (!hasMorePosts || isLoadingMoreRef.current || refreshing || posts.length === 0) return;

        // Set loading state with both ref and state for different purposes
        isLoadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            // Small delay to allow UI to breathe
            await new Promise(resolve => setTimeout(resolve, 100));

            const response = await blogService.getBlogs(lastLoadedBlogId, PAGE_SIZE);

            // Early exit if component unmounted
            if (!isMounted.current) return;

            if (response && response.success && Array.isArray(response.data)) {
                // Split the new data into smaller chunks for smoother processing
                const newData = response.data;
                const chunkSize = 3;

                // Process in smaller chunks
                for (let i = 0; i < newData.length; i += chunkSize) {
                    if (!isMounted.current) return;

                    const chunk = newData.slice(i, i + chunkSize);
                    const normalizedChunk = chunk.map(normalizeBlogData).filter(Boolean);

                    setPosts(prev => {
                        // Check for duplicates by blog_id before adding new posts
                        const existingIds = new Set(prev.map(p => p.blog_id));
                        const uniquePosts = normalizedChunk.filter(p => !existingIds.has(p.blog_id));
                        return [...prev, ...uniquePosts];
                    });

                    // Give UI thread time to breathe between chunks
                    if (i + chunkSize < newData.length) {
                        await new Promise(resolve => setTimeout(resolve, 16));
                    }
                }

                // Update pagination info
                if (newData.length > 0) {
                    const lastItem = newData[newData.length - 1];
                    setLastLoadedBlogId(lastItem.blog_id);
                    setHasMorePosts(newData.length >= PAGE_SIZE);
                } else {
                    setHasMorePosts(false);
                }
            } else {
                setHasMorePosts(false);
            }
        } catch (error) {
            console.error('Error loading more posts:', error);
            // Silent fail for pagination errors to avoid disrupting UX
        } finally {
            if (isMounted.current) {
                setLoadingMore(false);
                isLoadingMoreRef.current = false;
            }
        }
    }, [hasMorePosts, lastLoadedBlogId, normalizeBlogData, posts.length, refreshing]);

    // Handle refresh (pull-to-refresh)
    const handleRefresh = useCallback(async () => {
        if (refreshing) return;

        try {
            setRefreshing(true);
            setLastLoadedBlogId(0);

            const response = await blogService.getBlogs(0, PAGE_SIZE);

            // Early exit if component unmounted
            if (!isMounted.current) return;

            InteractionManager.runAfterInteractions(() => {
                if (!isMounted.current) return;

                if (response && response.success && Array.isArray(response.data)) {
                    // Normalize with unique client IDs
                    const normalizedPosts = response.data
                        .map(normalizeBlogData)
                        .filter(Boolean);

                    setPosts(normalizedPosts);

                    if (normalizedPosts.length > 0) {
                        const lastPost = normalizedPosts[normalizedPosts.length - 1];
                        setLastLoadedBlogId(lastPost.blog_id);
                        setHasMorePosts(normalizedPosts.length >= PAGE_SIZE);
                    } else {
                        setHasMorePosts(false);
                    }
                } else {
                    setPosts([]);
                    setHasMorePosts(false);
                }

                // Provide haptic feedback
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setRefreshing(false);
            });
        } catch (error) {
            console.error('Error refreshing posts:', error);

            if (isMounted.current) {
                Alert.alert('Error', 'Failed to refresh posts. Please try again.');
                setRefreshing(false);
            }
        }
    }, [refreshing, normalizeBlogData]);

    // Create new post
    const handleCreatePost = useCallback(async (postData) => {
        try {
            setCreatingPost(true);

            const blogData = {
                title: postData.title || '', content: postData.content, category_id: postData.category_id,
            };

            // Add the first image if available
            if (postData.images && postData.images.length > 0) {
                blogData.image = postData.images[0];
            }

            const response = await blogService.addBlog(blogData);

            if (response && response.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Your post has been created!');

                // Refresh to show the new post
                handleRefresh();

                // Close the modal
                setBlogModalVisible(false);
            } else {
                throw new Error(response.error || 'Failed to create post');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Error', error.message || 'Could not create your post. Please try again.');
        } finally {
            setCreatingPost(false);
        }
    }, [handleRefresh]);

    // Handle liking a post with optimistic UI update
    const handleLikePost = useCallback(async (blogId, isLiked) => {
        try {
            // Optimistic UI update
            setPosts(currentPosts => currentPosts.map(post => post.blog_id === blogId ? {
                ...post, isLiked: !isLiked, likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
            } : post));

            // API call in background
            await blogService.toggleLikeBlog(blogId);
        } catch (error) {
            console.error('Error liking post:', error);

            // Revert optimistic update if API fails
            setPosts(currentPosts => currentPosts.map(post => post.blog_id === blogId ? {
                ...post, isLiked: isLiked, likesCount: isLiked ? post.likesCount : post.likesCount - 1
            } : post));
        }
    }, []);

    // Handle adding a comment with optimistic UI update
    const handleAddComment = useCallback(async (blogId, comment) => {
        try {
            // Optimistic UI update
            setPosts(currentPosts => currentPosts.map(post => post.blog_id === blogId ? {
                ...post,
                commentsCount: post.commentsCount + 1
            } : post));

            // API call
            await blogService.addComment(blogId, {content: comment});
        } catch (error) {
            console.error('Error adding comment:', error);

            // Revert optimistic update
            setPosts(currentPosts => currentPosts.map(post => post.blog_id === blogId ? {
                ...post,
                commentsCount: Math.max(0, post.commentsCount - 1)
            } : post));

            Alert.alert('Error', 'Failed to add comment. Please try again.');
        }
    }, []);

    // Handle sharing a post
    const handleSharePost = useCallback(async (blogId) => {
        try {
            const post = posts.find(p => p.blog_id === blogId);
            const title = post?.title || 'Check out this post';

            await Share.share({
                message: title, url: `yourapp://blog/${blogId}`
            });
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    }, [posts]);

    // Handle bookmarking a post
    const handleBookmarkPost = useCallback(async (blogId, isBookmarked) => {
        try {
            // In a real app, you would call an API to save/unsave the post
            console.log(`Post ${blogId} ${isBookmarked ? 'bookmarked' : 'unbookmarked'}`);

            // Provide haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
            console.error('Error bookmarking post:', error);
        }
    }, []);

    // Handle scroll events for tab bar hiding
    const handleScroll = useCallback((event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > prevScrollY.current;

        // Show tab bar when scrolling up, hide when scrolling down
        if (isScrollingDown) {
            Animated.timing(tabBarOpacity, {
                toValue: 0, duration: 200, useNativeDriver: true
            }).start();
        } else {
            Animated.timing(tabBarOpacity, {
                toValue: 1, duration: 200, useNativeDriver: true
            }).start();
        }

        prevScrollY.current = currentScrollY;
    }, [tabBarOpacity]);

    // Load posts when screen is focused
    useFocusEffect(useCallback(() => {
        // Small delay to ensure smooth transition
        const timer = setTimeout(() => {
            initialLoadPosts();
            // Reset tab bar to visible state when screen gains focus
            tabBarOpacity.setValue(1);
        }, 100);

        return () => {
            clearTimeout(timer);
        };
    }, [initialLoadPosts, tabBarOpacity]));

    // Initialize component
    useEffect(() => {
        isMounted.current = true;

        // Ensure tab bar is visible when component mounts
        tabBarOpacity.setValue(1);

        // Set up global tab bar context if needed
        if (global.TabBarContext) {
            global.TabBarContext.setOpacity(tabBarOpacity);
        }

        return () => {
            isMounted.current = false;
        };
    }, [tabBarOpacity]);

    // Open blog creator modal
    const openBlogModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBlogModalVisible(true);
    };

    // Close blog creator modal
    const closeBlogModal = () => {
        setBlogModalVisible(false);
    };

    // Header component for FlatList
    const ListHeader = useMemo(() => (<View className="px-4 pb-2">
            {/* Blog Creator Card */}
            <MotiView
                className={`rounded-3xl mb-4 ${isDark ? 'bg-[#252F3C]' : 'bg-white'} shadow-sm overflow-hidden`}
                style={{
                    shadowColor: isDark ? '#000' : '#333',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 3
                }}
            >
                <TouchableOpacity
                    onPress={openBlogModal}
                    className="px-4 py-4 flex-row items-center justify-between"
                    activeOpacity={0.7}
                >
                    <Text className={`text-lg font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Share your progress...
                    </Text>

                    <View className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <Send size={16} color={isDark ? '#E5E7EB' : '#4B5563'}/>
                    </View>
                </TouchableOpacity>
            </MotiView>

            {/* Section heading */}
            <View className="flex-row items-center justify-between mt-4 mb-2">
                <Text className={`text-xl font-bold ${themeStyles.text}`}>
                    Community Feed
                </Text>
            </View>
        </View>), [isDark, themeStyles.text]);

    // Empty state component when no posts are available
    const EmptyComponent = useMemo(() => (<View className={`p-6 rounded-xl mx-4 mt-4 ${themeStyles.card}`}>
            <Text className={`text-center font-bold text-lg mb-2 ${themeStyles.text}`}>
                No posts available
            </Text>
            <Text className={`text-center ${themeStyles.subtext} mb-4`}>
                Be the first to share your progress with the community.
            </Text>
            <TouchableOpacity
                onPress={() => {
                    if (flatListRef.current) {
                        flatListRef.current.scrollToOffset({offset: 0, animated: true});
                    }
                    openBlogModal();
                }}
                className="bg-primary-500 py-2 px-4 rounded-lg self-center"
            >
                <Text className="text-white font-medium">Create Post</Text>
            </TouchableOpacity>
        </View>), [themeStyles]);

    // Render a single blog post with memoization
    const renderBlog = useCallback(({item}) => {
        // Add defensive check
        if (!item || typeof item !== 'object' || !item.blog_id) {
            return null;
        }

        return (<View className="px-4 mb-4">
                <Blog
                    blog={item}
                    isDark={isDark}
                    onLike={handleLikePost}
                    onComment={handleAddComment}
                    onShare={handleSharePost}
                    onBookmark={handleBookmarkPost}
                    authorProfile={item.user?.avatar ? {uri: item.user.avatar} : icons.maleProfile}
                />
            </View>);
    }, [isDark, handleLikePost, handleAddComment, handleSharePost, handleBookmarkPost]);

    // Footer component with memoization
    const ListFooter = useMemo(() => {
        if (loadingMore) {
            return (<View className="py-6 items-center">
                    <ActivityIndicator size="small" color="#6366F1"/>
                    <Text className={`mt-2 ${themeStyles.subtext}`}>
                        Loading more posts...
                    </Text>
                </View>);
        }

        if (!hasMorePosts && posts.length > 0) {
            return (<View className="py-6 items-center">
                    <Text className={themeStyles.subtext}>
                        You've reached the end!
                    </Text>
                    {/* Add extra padding at the bottom to prevent tab bar from covering content */}
                    <View className="h-20"/>
                </View>);
        }

        // Extra padding at the bottom to prevent tab bar from covering content
        return <View className="h-32"/>;
    }, [loadingMore, hasMorePosts, posts.length, themeStyles.subtext]);

    // Get item layout for FlatList optimization
    const getItemLayout = useCallback((data, index) => ({
        length: 240, // Approximate height of a blog post
        offset: 240 * index, index,
    }), []);

    // Key extractor using the clientId we added in normalization
    const keyExtractor = useCallback(item => {
        // Use the clientId we created during normalization
        return item?.clientId || `fallback-${generateUniqueId()}`;
    }, []);

    return (<SafeAreaView className={`flex-1 ${themeStyles.container}`} edges={['left', 'right']}>
            <FlatList
                ref={flatListRef}
                data={posts}
                renderItem={renderBlog}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={!initialLoading ? EmptyComponent : null}
                ListFooterComponent={ListFooter}
                onEndReached={loadMorePosts}
                onEndReachedThreshold={0.2}
                contentContainerStyle={{paddingTop: 0}}
                refreshControl={<RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={isDark ? "#E5E7EB" : "#6366F1"}
                    colors={[isDark ? "#E5E7EB" : "#6366F1"]}
                />}
                onScroll={handleScroll}
                scrollEventThrottle={16} // Increased sensitivity for better tab bar animation
                showsVerticalScrollIndicator={false}

                // Performance optimizations
                removeClippedSubviews={true}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                updateCellsBatchingPeriod={100}
                windowSize={5}
                getItemLayout={getItemLayout}
                extraData={loadingMore}
            />

            {/* Blog Post Creator Modal */}
            <BlogPostCreatorModal
                visible={blogModalVisible}
                onClose={closeBlogModal}
                onPost={handleCreatePost}
                loading={creatingPost}
            />

            {/* Initial Loading Overlay */}
            {initialLoading && (<View className="absolute inset-0 justify-center items-center bg-black/20">
                    <View className={`p-4 rounded-xl ${themeStyles.card}`}>
                        <ActivityIndicator size="large" color="#6366F1"/>
                        <Text className={`mt-2 text-center ${themeStyles.text}`}>
                            Loading posts...
                        </Text>
                    </View>
                </View>)}
        </SafeAreaView>);
};

export default Explore;