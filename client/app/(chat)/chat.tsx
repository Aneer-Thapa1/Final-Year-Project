import { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Image,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Plus, Users, MessageCircle, ArrowLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { router } from "expo-router";

// Import services
import {
    createGroupChat,
    useChatRooms
} from '../../services/chatServices';

// Define interfaces (these should match the service interfaces)
interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    isOnline?: boolean;
    lastActive?: string;
}

interface ChatRoom {
    room_id: number;
    type: 'DM' | 'GROUP';
    name?: string;
    avatar?: string;
    participants: {
        user_id: number;
        user: User;
    }[];
    lastMessage?: {
        content: string;
        createdAt: string;
        message_type: string;
    };
}

export default function ChatScreen() {
    const navigation = useNavigation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Use custom hook for chat rooms
    const { chatRooms, loading: isLoading, error, refetch } = useChatRooms();

    // State management
    const [friends, setFriends] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showSearch, setShowSearch] = useState(false);

    // Fetch friends
    const fetchFriends = useCallback(async () => {
        try {
            const friendsResponse = await getUserFriends();
            setFriends(friendsResponse.data || []);
        } catch (error) {
            console.error('Error fetching friends:', error);
            Alert.alert('Error', 'Could not fetch friends');
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // Filter active users
    const activeUsers = friends.filter(friend =>
        friend.isOnline || isRecentlyActive(friend.lastActive)
    );

    // Filter chat rooms based on search and active tab
    const filteredRooms = chatRooms.filter(room => {
        // Filter by search query
        if (searchQuery.trim() !== '') {
            if (room.type === 'DM') {
                const otherUser = room.participants.find(p => p.user.user_name)?.user;
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

    // Handle creating a new group chat
    const handleCreateGroupChat = async () => {
        try {
            // Navigate to group creation screen where users can select participants
            navigation.navigate('CreateGroupChat', {
                onCreateGroup: async (groupData) => {
                    try {
                        const newGroup = await createGroupChat({
                            name: groupData.name,
                            description: groupData.description,
                            participants: groupData.participants,
                            avatar: groupData.avatar,
                            is_private: false
                        });

                        // Refresh chat rooms
                        refetch();

                        // Navigate to the new group chat
                        if (newGroup.data) {
                            navigation.navigate('ChatDetail', {
                                roomId: newGroup.data.room_id
                            });
                        }
                    } catch (error) {
                        console.error('Group creation error:', error);
                        Alert.alert('Error', 'Failed to create group chat');
                    }
                }
            });
        } catch (error) {
            console.error('Navigation error:', error);
            Alert.alert('Error', 'Could not open group creation');
        }
    };

    // Render chat rooms list
    const renderChatRooms = () => {
        if (isLoading) {
            return (
                <View className="flex-1 justify-center items-center">
                    <Text className={`${isDark ? 'text-white' : 'text-black'}`}>
                        Loading chats...
                    </Text>
                </View>
            );
        }

        return (
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
                            onPress={() => navigation.navigate('ChatDetail', { roomId: item.room_id })}
                            activeOpacity={0.7}
                        >
                            {/* Chat Room Avatar */}
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
                                            {item.type === 'GROUP'
                                                ? (item.name?.[0] || 'G')
                                                : (getRoomDisplayName(item)[0] || 'U')
                                            }
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Chat Room Details */}
                            <View className="flex-1 justify-center">
                                <View className="flex-row justify-between items-center mb-1">
                                    <Text
                                        className={`font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
                                        numberOfLines={1}
                                    >
                                        {getRoomDisplayName(item)}
                                    </Text>
                                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatMessageTime(item.lastMessage?.createdAt)}
                                    </Text>
                                </View>

                                <Text
                                    className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                                    numberOfLines={1}
                                >
                                    {item.lastMessage?.content || 'No messages yet'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </MotiView>
                )}
                ListEmptyComponent={renderEmptyState()}
                contentContainerStyle={{ paddingBottom: 80 }}
            />
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View className="items-center px-6 pt-10">
            <Text className={`text-lg font-montserrat-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                No conversations found
            </Text>
            <Text className={`text-sm text-center font-montserrat mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {searchQuery
                    ? 'Try a different search term'
                    : 'Start a new chat to begin messaging'}
            </Text>

            <TouchableOpacity
                className="bg-primary-500 py-3 px-6 rounded-xl"
                onPress={() => navigation.navigate('NewChat')}
            >
                <Text className="text-white font-montserrat-semibold">
                    Start New Chat
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Helper functions
    const getRoomDisplayName = (room: ChatRoom) => {
        if (room.type === 'DM') {
            const otherUser = room.participants.find(p => p.user)?.user;
            return otherUser?.user_name || 'User';
        }
        return room.name || 'Group';
    };

    const getRoomAvatar = (room: ChatRoom) => {
        if (room.type === 'DM') {
            const otherUser = room.participants.find(p => p.user)?.user;
            return otherUser?.avatar;
        }
        return room.avatar;
    };

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
                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="mr-4"
                        >
                            <ArrowLeft
                                size={24}
                                color={isDark ? 'white' : 'black'}
                            />
                        </TouchableOpacity>
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

                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={handleCreateGroupChat}
                            >
                                <Users size={22} color={isDark ? "#9CA3AF" : "#4B5563"} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-10 h-10 rounded-full justify-center items-center"
                                onPress={() => navigation.navigate('NewChat')}
                            >
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
                        {['all', 'direct', 'groups'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`py-2 px-4 mr-2 rounded-full ${
                                    activeTab === tab
                                        ? 'bg-primary-500'
                                        : `${isDark ? 'bg-gray-700' : 'bg-gray-100'}`
                                }`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text className={`font-montserrat-medium ${
                                    activeTab === tab
                                        ? 'text-white'
                                        : `${isDark ? 'text-gray-300' : 'text-gray-600'}`
                                }`}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </MotiView>

                {/* Active Users */}
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
                                            source={{
                                                uri: item.avatar ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name)}`
                                            }}
                                            className="h-14 w-14 rounded-full"
                                        />
                                        <View className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-border-white dark:border-gray-800" />
                                    </View>
                                    <Text
                                        className={`text-xs font-montserrat mt-1 text-center ${
                                            isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}
                                        numberOfLines={1}
                                    >
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

                    {renderChatRooms()}
                </View>

                {/* Floating New Chat Button */}
                <TouchableOpacity
                    className="absolute bottom-5 right-5"
                    onPress={() => navigation.navigate('NewChat')}
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

// Helper function to determine if a user is recently active
function isRecentlyActive(lastActive?: string): boolean {
    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000;

    return now - lastActiveTime < fiveMinutes;
}

// Helper function to format message timestamp
function formatMessageTime(timestamp?: string): string {
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

export default ChatScreen;