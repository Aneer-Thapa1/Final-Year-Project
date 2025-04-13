import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, UserPlus, UserCheck, UserX, Clock, Users, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

// Import services
import {
    getPendingRequests,
    respondToFriendRequest,
    FriendRequest
} from '../../services/friendshipService';

export default function FriendRequestsScreen() {
    // Get theme
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Get params (if coming from notification)
    const params = useLocalSearchParams();
    const highlightRequestId = params.requestId ? parseInt(params.requestId.toString()) : null;

    // State
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [respondingTo, setRespondingTo] = useState<number | null>(null);

    // Fetch friend requests
    const fetchFriendRequests = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getPendingRequests();

            if (response.success && response.data) {
                setFriendRequests(response.data);
            } else {
                setError('Failed to load friend requests');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching friend requests');
            console.error('Error fetching friend requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Handle refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFriendRequests();
    }, [fetchFriendRequests]);

    // Respond to friend request
    const handleRespond = useCallback(async (requestId: number, accept: boolean) => {
        try {
            // Haptic feedback
            Haptics.impactAsync(
                accept
                    ? Haptics.ImpactFeedbackStyle.Medium
                    : Haptics.ImpactFeedbackStyle.Light
            );

            setRespondingTo(requestId);

            const response = await respondToFriendRequest(
                requestId,
                accept ? 'ACCEPTED' : 'REJECTED'
            );

            if (response.success) {
                // Remove from list
                setFriendRequests(prevRequests =>
                    prevRequests.filter(req => req.request_id !== requestId)
                );

                // Show success message
                if (accept) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                    // Find the request to get the user name
                    const request = friendRequests.find(req => req.request_id === requestId);
                    const userName = request?.sender?.user_name || 'User';

                    Alert.alert(
                        'Friend Added!',
                        `You and ${userName} are now friends.`
                    );
                }
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', 'Failed to respond to friend request');
            }
        } catch (err: any) {
            console.error('Error responding to friend request:', err);
            Alert.alert('Error', err.message || 'An error occurred');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setRespondingTo(null);
        }
    }, [friendRequests]);

    // Load data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchFriendRequests();
        }, [fetchFriendRequests])
    );

    // Scroll to highlighted request if needed
    useEffect(() => {
        if (highlightRequestId && friendRequests.length > 0) {
            // Find the index of the highlighted request
            const index = friendRequests.findIndex(
                req => req.request_id === highlightRequestId
            );

            if (index !== -1 && flatListRef.current) {
                // Small delay to ensure the list is rendered
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5
                    });
                }, 500);
            }
        }
    }, [highlightRequestId, friendRequests]);

    // FlatList reference
    const flatListRef = React.useRef<FlatList>(null);

    // Render friend request item
    const renderRequestItem = ({ item, index }: { item: FriendRequest; index: number }) => {
        const isHighlighted = item.request_id === highlightRequestId;
        const isRespondingTo = respondingTo === item.request_id;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 300, delay: index * 100 }}
                className={`mx-3 mb-3 p-4 rounded-xl ${
                    isDark ? 'bg-gray-800' : 'bg-white'
                } ${isHighlighted ? (isDark ? 'border-2 border-primary-500' : 'border-2 border-primary-500') : ''}`}
                style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                }}
            >
                {/* User info row */}
                <View className="flex-row items-center mb-3">
                    {/* Avatar */}
                    <View className="mr-3">
                        {item.sender?.avatar ? (
                            <Image
                                source={{ uri: item.sender.avatar }}
                                className="h-14 w-14 rounded-full"
                            />
                        ) : (
                            <View className="h-14 w-14 rounded-full bg-primary-500 items-center justify-center">
                                <Text className="text-white text-xl font-montserrat-bold">
                                    {item.sender?.user_name?.[0] || 'U'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* User details */}
                    <View className="flex-1">
                        <Text className={`font-montserrat-semibold text-base ${
                            isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                            {item.sender?.user_name || 'Unknown User'}
                        </Text>

                        <View className="flex-row items-center mt-1">
                            <Clock size={14} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            <Text className={`ml-1 text-xs font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                Sent {formatRequestTime(item.createdAt)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions row */}
                <View className="flex-row mt-2">
                    {isRespondingTo ? (
                        <View className="flex-1 items-center justify-center py-2">
                            <ActivityIndicator size="small" color={isDark ? "#93C5FD" : "#3B82F6"} />
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                className={`flex-1 mr-2 py-2 rounded-lg flex-row justify-center items-center ${
                                    isDark ? 'bg-primary-700' : 'bg-primary-500'
                                }`}
                                onPress={() => handleRespond(item.request_id, true)}
                            >
                                <UserCheck size={16} color="#FFFFFF" />
                                <Text className="text-white font-montserrat-medium ml-2">
                                    Accept
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 ml-2 py-2 rounded-lg flex-row justify-center items-center ${
                                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                                onPress={() => handleRespond(item.request_id, false)}
                            >
                                <UserX size={16} color={isDark ? "#E5E7EB" : "#4B5563"} />
                                <Text className={`font-montserrat-medium ml-2 ${
                                    isDark ? 'text-white' : 'text-gray-700'
                                }`}>
                                    Decline
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </MotiView>
        );
    };

    // Format request time
    const formatRequestTime = (timestamp: string) => {
        if (!timestamp) return '';

        try {
            const requestTime = new Date(timestamp);
            const now = new Date();

            const diffMs = now.getTime() - requestTime.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

            return requestTime.toLocaleDateString();
        } catch (e) {
            return 'some time ago';
        }
    };

    // Empty state component
    const renderEmptyState = () => (
        <View className="flex-1 items-center justify-center py-10">
            <Users size={60} color={isDark ? "#4B5563" : "#9CA3AF"} />
            <Text className={`text-lg font-montserrat-semibold mt-4 ${
                isDark ? 'text-white' : 'text-gray-900'
            }`}>
                No Friend Requests
            </Text>
            <Text className={`text-center mt-2 mx-6 font-montserrat ${
                isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
                You don't have any pending friend requests at the moment.
            </Text>

            <TouchableOpacity
                className={`mt-6 py-3 px-6 rounded-xl ${
                    isDark ? 'bg-primary-700' : 'bg-primary-500'
                }`}
                onPress={() => router.push('/friends')}
            >
                <Text className="text-white font-montserrat-medium">
                    Find Friends
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Error state component
    const renderErrorState = () => (
        <View className="flex-1 items-center justify-center py-10">
            <AlertTriangle size={60} color={isDark ? "#F87171" : "#EF4444"} />
            <Text className={`text-lg font-montserrat-semibold mt-4 ${
                isDark ? 'text-white' : 'text-gray-900'
            }`}>
                Couldn't Load Requests
            </Text>
            <Text className={`text-center mt-2 mx-6 font-montserrat ${
                isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
                {error || 'An error occurred while loading your friend requests.'}
            </Text>

            <TouchableOpacity
                className={`mt-6 py-3 px-6 rounded-xl ${
                    isDark ? 'bg-primary-700' : 'bg-primary-500'
                }`}
                onPress={() => fetchFriendRequests()}
            >
                <Text className="text-white font-montserrat-medium">
                    Try Again
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
                      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {/* Header */}
            <View className={`px-4 py-4 flex-row items-center justify-between ${
                isDark ? 'bg-gray-800' : 'bg-white'
            }`}
                  style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 3,
                  }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="p-2"
                >
                    <ArrowLeft size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                </TouchableOpacity>

                <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Friend Requests
                </Text>

                {/* Empty view for flex alignment */}
                <View style={{ width: 28 }} />
            </View>

            {/* Main content */}
            {loading && !refreshing && friendRequests.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={isDark ? "#93C5FD" : "#3B82F6"} />
                    <Text className={`mt-4 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        Loading friend requests...
                    </Text>
                </View>
            ) : (
                <>
                    {/* Stats row */}
                    <View className={`mx-3 mt-4 p-4 rounded-xl flex-row justify-between ${
                        isDark ? 'bg-gray-800' : 'bg-white'
                    }`}>
                        <View className="items-center">
                            <Text className={`text-xl font-montserrat-bold ${
                                isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                                {friendRequests.length}
                            </Text>
                            <Text className={`text-xs font-montserrat ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Pending Requests
                            </Text>
                        </View>

                        <View className="h-full w-px bg-gray-200 dark:bg-gray-700" />

                        <View className="items-center">
                            <View className="flex-row">
                                <UserPlus size={18} color={isDark ? "#93C5FD" : "#3B82F6"} />
                            </View>
                            <Text className={`text-xs font-montserrat mt-1 ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                New Connections
                            </Text>
                        </View>
                    </View>

                    {/* Friend requests list */}
                    <FlatList
                        ref={flatListRef}
                        data={friendRequests}
                        keyExtractor={(item) => item.request_id.toString()}
                        renderItem={renderRequestItem}
                        contentContainerStyle={{
                            paddingTop: 16,
                            paddingBottom: 20,
                            flexGrow: friendRequests.length === 0 ? 1 : undefined
                        }}
                        ListEmptyComponent={error ? renderErrorState : renderEmptyState}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[isDark ? "#93C5FD" : "#3B82F6"]}
                                tintColor={isDark ? "#93C5FD" : "#3B82F6"}
                            />
                        }
                        onScrollToIndexFailed={(info) => {
                            console.warn('Failed to scroll to highlighted request', info);
                            // Fallback to just scrolling by some pixels
                            setTimeout(() => {
                                flatListRef.current?.scrollToOffset({
                                    offset: info.index * 100,
                                    animated: true,
                                });
                            }, 100);
                        }}
                    />
                </>
            )}
        </SafeAreaView>
    );
}