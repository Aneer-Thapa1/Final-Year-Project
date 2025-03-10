
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { fetchChatRooms, connectSocket } from '../../store/slices/chatSlice';
import { fetchFriends } from '../../store/slices/friendshipSlice';
import { MotiView } from 'moti';
import { Search, Plus, Users, MessageCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

export default function ChatScreen() {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const { chatRooms, loading } = useSelector((state: RootState) => state.chat);
    const { friends } = useSelector((state: RootState) => state.friendship);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showSearch, setShowSearch] = useState(false);
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const activeUsers = friends.filter(friend =>
        friend.isOnline || isRecentlyActive(friend.lastActive)
    );

    useEffect(() => {
        // Connect to socket and fetch chat rooms when screen loads
        dispatch(connectSocket());
        dispatch(fetchChatRooms());
        dispatch(fetchFriends());
    }, [dispatch]);

    const filteredRooms = chatRooms.filter(room => {
        // Filter by search query
        if (searchQuery.trim() !== '') {
            if (room.type === 'DM') {
                const otherUser = room.participants.find(p => p.user_id !== 1)?.user; // Replace 1 with your user ID
                return otherUser?.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
            } else {
                return room.name?.toLowerCase().includes(searchQuery.toLowerCase());
            }
        }

        // Filter by tab
        if (activeTab === 'direct') {
            return room.type === 'DM';
        } else if (activeTab === 'groups') {
            return room.type === 'GROUP';
        }

        return true; // 'all' tab
    });

    const handleChatPress = (roomId: number) => {
        router.push({
            pathname: '/chat/[id]',
            params: { id: roomId.toString() }
        });
    };

    const handleNewChat = () => {
        router.push('/new-chat');
    };

    const handleNewGroup = () => {
        router.push('/new-group');
    };

    function getRoomDisplayName(room: any) {
        if (room.type === 'DM') {
            const otherUser = room.participants.find(p => p.user_id !== 1)?.user; // Replace 1 with your user ID
            return otherUser?.user_name || 'User';
        }
        return room.name || 'Group';
    }

    function getRoomAvatar(room: any) {
        if (room.type === 'DM') {
            const otherUser = room.participants.find(p => p.user_id !== 1)?.user; // Replace 1 with your user ID
            return otherUser?.avatar;
        }
        return room.avatar;
    }

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <View className="flex-1">
                {/* Header */}
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                    className={`${isDark ? 'bg-gray-800' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                >
                    <View className="flex-row items-center justify-between px-4 py-3">
                        <Text className={`text-2xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Chats
                        </Text>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={() => setShowSearch(!showSearch)}
                            >
                                <Search size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>

                            <TouchableOpacity className="w-10 h-10 rounded-full justify-center items-center" onPress={handleNewGroup}>
                                <Users size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>

                            <TouchableOpacity className="w-10 h-10 rounded-full justify-center items-center" onPress={handleNewChat}>
                                <MessageCircle size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search bar */}
                    {showSearch && (
                        <MotiView
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 50 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'timing', duration: 300 }}
                            className="mx-4 mb-3 flex-row items-center px-3 rounded-xl
                      bg-primary-500/10"
                        >
                            <Search size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            <TextInput
                                className={`flex-1 py-3 px-2 font-montserrat ${isDark ? 'text-white' : 'text-gray-800'}`}
                                placeholder="Search chats..."
                                placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </MotiView>
                    )}

                    {/* Tabs */}
                    <View className="flex-row px-4 mb-2">
                        <TouchableOpacity
                            className={`py-2 px-4 mr-2 rounded-full ${activeTab === 'all' ?
                                `bg-primary-500` :
                                `${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}`}
                            onPress={() => setActiveTab('all')}
                        >
                            <Text className={`font-montserrat-medium ${activeTab === 'all' ?
                                'text-white' :
                                `${isDark ? 'text-gray-300' : 'text-gray-600'}`}`}>
                                All
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`py-2 px-4 mr-2 rounded-full ${activeTab === 'direct' ?
                                `bg-primary-500` :
                                `${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}`}
                            onPress={() => setActiveTab('direct')}
                        >
                            <Text className={`font-montserrat-medium ${activeTab === 'direct' ?
                                'text-white' :
                                `${isDark ? 'text-gray-300' : 'text-gray-600'}`}`}>
                                Direct
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`py-2 px-4 rounded-full ${activeTab === 'groups' ?
                                `bg-primary-500` :
                                `${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}`}
                            onPress={() => setActiveTab('groups')}
                        >
                            <Text className={`font-montserrat-medium ${activeTab === 'groups' ?
                                'text-white' :
                                `${isDark ? 'text-gray-300' : 'text-gray-600'}`}`}>
                                Groups
                            </Text>
                        </TouchableOpacity>
                    </View>
                </MotiView>

                {/* Online Users */}
                {activeUsers.length > 0 && !searchQuery && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        delay={300}
                        className="mt-4"
                    >
                        <Text className={`text-base font-montserrat-semibold px-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Active Now
                        </Text>
                        <FlatList
                            horizontal
                            data={activeUsers}
                            keyExtractor={item => item.user_id.toString()}
                            renderItem={({ item }) => (
                                <MotiView
                                    from={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', delay: 200 }}
                                    className="items-center mr-4 w-16"
                                >
                                    <View className="relative">
                                        <Image
                                            source={{ uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name)}` }}
                                            className="h-14 w-14 rounded-full"
                                        />
                                        <View className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                                    </View>
                                    <Text className={`text-xs font-montserrat mt-1 text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={1}>
                                        {item.user_name}
                                    </Text>
                                </MotiView>
                            )}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        />
                    </MotiView>
                )}

                {/* Chat Rooms */}
                <View className="flex-1 mt-4">
                    <Text className={`text-base font-montserrat-semibold px-4 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Messages
                    </Text>
                    <FlatList
                        data={filteredRooms}
                        keyExtractor={item => item.room_id.toString()}
                        renderItem={({ item, index }) => (
                            <MotiView
                                from={{ opacity: 0, translateY: 20 }}
                                animate={{ opacity: 1, translateY: 0 }}
                                transition={{ type: 'timing', delay: 100 + index * 50, duration: 300 }}
                            >
                                <TouchableOpacity
                                    className={`flex-row px-4 py-3 mx-3 mb-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                                    onPress={() => handleChatPress(item.room_id)}
                                    activeOpacity={0.7}
                                >
                                    <View className="relative mr-3">
                                        {getRoomAvatar(item) ? (
                                            <Image
                                                source={{ uri: getRoomAvatar(item) }}
                                                className="h-14 w-14 rounded-full"
                                            />
                                        ) : (
                                            <View className={`h-14 w-14 rounded-full items-center justify-center ${
                                                item.type === 'GROUP' ? 'bg-amber-500' : 'bg-primary-500'
                                            }`}>
                                                <Text className="text-white text-xl font-montserrat-bold">
                                                    {item.type === 'GROUP' ?
                                                        (item.name?.[0] || 'G') :
                                                        (getRoomDisplayName(item)[0] || 'U')}
                                                </Text>
                                            </View>
                                        )}
                                        {item.type === 'DM' && isUserActive(item) && (
                                            <View className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                                        )}
                                    </View>

                                    <View className="flex-1 justify-center">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                                                {getRoomDisplayName(item)}
                                            </Text>
                                            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {formatMessageTime(item.lastMessage?.createdAt)}
                                            </Text>
                                        </View>

                                        <View className="flex-row justify-between items-center">
                                            <Text
                                                className={`text-sm font-montserrat flex-1 
                                  ${isDark ? 'text-gray-400' : 'text-gray-600'}
                                  ${getUnreadCount(item.room_id) > 0 ? 'font-montserrat-medium' : ''}`}
                                                numberOfLines={1}
                                            >
                                                {getLastMessagePreview(item.lastMessage)}
                                            </Text>
                                            {getUnreadCount(item.room_id) > 0 && (
                                                <View className="h-6 min-w-6 rounded-full bg-primary-500 items-center justify-center px-1.5 ml-2">
                                                    <Text className="text-xs text-white font-montserrat-bold">
                                                        {getUnreadCount(item.room_id)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </MotiView>
                        )}
                        contentContainerStyle={{ paddingBottom: 80 }}
                        ListEmptyComponent={
                            <View className="items-center px-6 pt-10">
                                <Text className={`text-lg font-montserrat-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    No conversations found
                                </Text>
                                <Text className={`text-sm text-center font-montserrat mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {searchQuery ? 'Try a different search term' : 'Start a new chat to begin messaging'}
                                </Text>

                                <TouchableOpacity
                                    className="bg-primary-500 py-3 px-6 rounded-xl"
                                    onPress={handleNewChat}
                                >
                                    <Text className="text-white font-montserrat-semibold">Start New Chat</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                </View>

                {/* Floating New Chat Button */}
                <TouchableOpacity
                    className="absolute bottom-5 right-5"
                    onPress={handleNewChat}
                    activeOpacity={0.9}
                >
                    <View className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center shadow-lg">
                        <Plus size={24} color="#ffffff" />
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Helper functions
function formatMessageTime(timestamp: string | undefined) {
    if (!timestamp) return '';

    const messageTime = new Date(timestamp);
    const now = new Date();

    // Today, show time only
    if (messageTime.toDateString() === now.toDateString()) {
        return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageTime.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    // Within a week, show day name
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    if (messageTime > weekAgo) {
        return messageTime.toLocaleDateString([], { weekday: 'short' });
    }

    // Otherwise show date
    return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getLastMessagePreview(lastMessage: any) {
    if (!lastMessage) return 'No messages yet';

    if (lastMessage.message_type === 'TEXT') {
        return lastMessage.content;
    } else if (lastMessage.message_type === 'IMAGE') {
        return '📷 Photo';
    } else if (lastMessage.message_type === 'VIDEO') {
        return '🎥 Video';
    } else if (lastMessage.message_type === 'AUDIO') {
        return '🎵 Audio';
    } else if (lastMessage.message_type === 'FILE') {
        return '📎 File';
    } else if (lastMessage.message_type === 'SYSTEM') {
        return lastMessage.content;
    }

    return 'New message';
}

function getUnreadCount(roomId: number) {
    // This should be replaced with actual unread counts from your Redux store
    return Math.floor(Math.random() * 5); // Mocked for display
}

function isUserActive(room: any) {
    if (room.type !== 'DM') return false;

    const otherUser = room.participants.find((p: any) => p.user_id !== 1)?.user;
    return otherUser?.isOnline || isRecentlyActive(otherUser?.lastActive);
}

function isRecentlyActive(lastActive: string | undefined) {
    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;

    return now - lastActiveTime < fiveMinutes;
}