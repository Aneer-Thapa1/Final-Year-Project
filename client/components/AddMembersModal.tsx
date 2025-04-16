import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    Image,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { MotiView } from 'moti';
import { API_BASE_URL } from '../services/api';

const AddMembersModal = ({
                             visible,
                             onClose,
                             friends,
                             onAddMembers,
                             loading,
                             fetchingFriends,
                             alreadyAddedIds = []
                         }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Reset selected members when modal closes
    useEffect(() => {
        if (!visible) {
            setSelectedMembers([]);
            setSearchQuery('');
        }
    }, [visible]);

    // Filter friends based on search query and exclude already added members
    const filteredFriends = friends
        .filter(friend =>
            !alreadyAddedIds.includes(friend.user_id) &&
            (searchQuery === '' || friend.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    const toggleSelectMember = (friend) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Check if already selected
        const isSelected = selectedMembers.some(member => member.user_id === friend.user_id);

        if (isSelected) {
            // Remove from selection
            setSelectedMembers(selectedMembers.filter(member => member.user_id !== friend.user_id));
        } else {
            // Add to selection
            setSelectedMembers([...selectedMembers, friend]);
        }
    };

    const handleAddMembers = () => {
        if (selectedMembers.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        // Extract user IDs from selected members
        const memberIds = selectedMembers.map(member => member.user_id);

        // Call the add members function
        onAddMembers(memberIds);
    };

    const getAvatarUri = (avatar) => {
        if (!avatar) {
            return null;
        }

        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar;
        }

        return `${API_BASE_URL}${avatar}`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900/95' : 'bg-gray-50/95'}`}>
                <MotiView
                    from={{ opacity: 0, translateY: 50 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 300 }}
                    className={`flex-1 m-2 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                >
                    {/* Header */}
                    <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
                        </TouchableOpacity>
                        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Add Members
                        </Text>
                        <TouchableOpacity
                            onPress={handleAddMembers}
                            disabled={selectedMembers.length === 0 || loading}
                            className={`${selectedMembers.length === 0 ? 'opacity-50' : 'opacity-100'}`}
                        >
                            <Text className={`font-semibold ${
                                selectedMembers.length > 0 ? 'text-indigo-500' : isDark ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                {loading ? 'Adding...' : 'Add'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className={`mx-4 my-3 flex-row items-center px-3 py-2 rounded-xl ${
                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                        <Feather name="search" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        <TextInput
                            className={`flex-1 ml-2 ${isDark ? 'text-white' : 'text-gray-800'}`}
                            placeholder="Search friends..."
                            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Feather name="x" size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Selected Members */}
                    {selectedMembers.length > 0 && (
                        <View className="mx-4 mb-3">
                            <Text className={`mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                Selected ({selectedMembers.length})
                            </Text>
                            <FlatList
                                horizontal
                                data={selectedMembers}
                                keyExtractor={(item) => item.user_id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        className="items-center mr-3"
                                        onPress={() => toggleSelectMember(item)}
                                    >
                                        <View className="relative">
                                            <Image
                                                source={{
                                                    uri: getAvatarUri(item.avatar) ||
                                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name)}&background=6C5CE7&color=fff`
                                                }}
                                                className="h-14 w-14 rounded-full"
                                            />
                                            <View className="absolute -top-1 -right-1 bg-indigo-500 rounded-full w-6 h-6 items-center justify-center border-2 border-white dark:border-gray-800">
                                                <Feather name="check" size={14} color="#FFFFFF" />
                                            </View>
                                        </View>
                                        <Text className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} numberOfLines={1}>
                                            {item.user_name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                showsHorizontalScrollIndicator={false}
                            />
                        </View>
                    )}

                    {/* Friend List */}
                    {fetchingFriends ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator color="#6C5CE7" size="large" />
                            <Text className={`mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                Loading friends...
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredFriends}
                            keyExtractor={(item) => item.user_id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = selectedMembers.some(member => member.user_id === item.user_id);

                                return (
                                    <TouchableOpacity
                                        className={`flex-row items-center justify-between px-4 py-3 border-b ${
                                            isDark ? 'border-gray-700' : 'border-gray-200'
                                        } ${isSelected ? isDark ? 'bg-indigo-900/20' : 'bg-indigo-50' : ''}`}
                                        onPress={() => toggleSelectMember(item)}
                                    >
                                        <View className="flex-row items-center">
                                            <View className="relative">
                                                <Image
                                                    source={{
                                                        uri: getAvatarUri(item.avatar) ||
                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user_name)}&background=6C5CE7&color=fff`
                                                    }}
                                                    className="h-10 w-10 rounded-full"
                                                />
                                                {item.isOnline && (
                                                    <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 bg-green-500" />
                                                )}
                                            </View>
                                            <Text className={`ml-3 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                {item.user_name}
                                            </Text>
                                        </View>

                                        <View className={`w-6 h-6 rounded-full border items-center justify-center ${
                                            isSelected
                                                ? 'bg-indigo-500 border-indigo-500'
                                                : isDark ? 'border-gray-600' : 'border-gray-300'
                                        }`}>
                                            {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View className="flex-1 items-center justify-center py-10">
                                    <Feather name="users" size={48} color={isDark ? "#9CA3AF" : "#6B7280"} />
                                    <Text className={`mt-4 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {searchQuery
                                            ? 'No friends match your search'
                                            : 'No friends available to add'}
                                    </Text>
                                </View>
                            }
                        />
                    )}

                    {/* Add Button - For mobile ergonomics */}
                    {selectedMembers.length > 0 && (
                        <View className="p-4">
                            <TouchableOpacity
                                className={`w-full rounded-xl py-3 items-center justify-center ${
                                    loading ? 'bg-indigo-400' : 'bg-indigo-600'
                                }`}
                                onPress={handleAddMembers}
                                disabled={loading}
                            >
                                {loading ? (
                                    <View className="flex-row items-center">
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                        <Text className="ml-2 text-white font-semibold">Adding...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-white font-semibold">
                                        Add {selectedMembers.length} {selectedMembers.length === 1 ? 'Member' : 'Members'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </MotiView>
            </SafeAreaView>
        </Modal>
    );
};

export default AddMembersModal;