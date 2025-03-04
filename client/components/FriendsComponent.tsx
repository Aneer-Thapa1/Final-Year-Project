import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { MotiView } from 'moti'
import { Trophy, Search, Plus, MessageCircle } from 'lucide-react-native'

const FriendsComponent = () => {
    // Friends data with direct URLs
    const friends = [
        {
            id: '1',
            name: 'Alex Johnson',
            username: '@alexj',
            points: 1250,
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&h=200',
            online: true,
        },
        {
            id: '2',
            name: 'Sarah Williams',
            username: '@sarahw',
            points: 980,
            imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=crop&w=200&h=200',
            online: false,
        },
        {
            id: '3',
            name: 'Michael Davis',
            username: '@miked',
            points: 1430,
            imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=200&h=200',
            online: true,
        },
        {
            id: '4',
            name: 'Emily Rodriguez',
            username: '@emilyr',
            points: 890,
            imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?fit=crop&w=200&h=200',
            online: false,
        },
    ]

    // Suggested friends data with direct URLs
    const suggestedFriends = [
        {
            id: '5',
            name: 'Jessica Chen',
            username: '@jessicac',
            points: 1100,
            imageUrl: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?fit=crop&w=200&h=200',
        },
        {
            id: '6',
            name: 'Ryan Wilson',
            username: '@ryanw',
            points: 1320,
            imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?fit=crop&w=200&h=200',
        },
    ]

    return (
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Search Bar */}
            <View className="bg-gray-100 rounded-full px-4 py-3 flex-row items-center mb-2">
                <Search size={18} color="#6B7280" className="mr-2" />
                <Text className="text-gray-500 font-montserrat-regular">
                    Search friends...
                </Text>
            </View>

            {/* My Friends */}
            <View>
                <Text className="text-lg font-montserrat-semibold text-gray-800 mb-3">
                    My Friends
                </Text>

                {friends.map((friend) => (
                    <View
                        key={friend.id}
                        className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center"
                    >
                        <View className="relative">
                            <Image
                                source={{ uri: friend.imageUrl }}
                                className="h-12 w-12 rounded-full"
                            />
                            {friend.online && (
                                <View className="h-3 w-3 bg-green-500 rounded-full absolute right-0 bottom-0 border-2 border-white" />
                            )}
                        </View>

                        <View className="flex-1 ml-3">
                            <Text className="font-montserrat-semibold text-gray-800">
                                {friend.name}
                            </Text>
                            <Text className="font-montserrat-regular text-gray-500 text-sm">
                                {friend.username}
                            </Text>
                        </View>

                        <View className="flex-row items-center">
                            <View className="bg-primary-50 px-3 py-1 rounded-full flex-row items-center mr-2">
                                <Trophy size={14} color="#4F46E5" className="mr-1" />
                                <Text className="font-montserrat-medium text-primary-700">
                                    {friend.points}
                                </Text>
                            </View>

                            <TouchableOpacity className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center">
                                <MessageCircle size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            {/* Suggested Friends */}
            <View>
                <Text className="text-lg font-montserrat-semibold text-gray-800 mb-3">
                    Suggested Friends
                </Text>

                {suggestedFriends.map((friend) => (
                    <View
                        key={friend.id}
                        className="bg-gray-50 rounded-xl p-4 mb-3 shadow-sm flex-row items-center"
                    >
                        <Image
                            source={{ uri: friend.imageUrl }}
                            className="h-12 w-12 rounded-full"
                        />

                        <View className="flex-1 ml-3">
                            <Text className="font-montserrat-semibold text-gray-800">
                                {friend.name}
                            </Text>
                            <Text className="font-montserrat-regular text-gray-500 text-sm">
                                {friend.username}
                            </Text>
                        </View>

                        <View className="flex-row items-center space-x-2">
                            <View className="flex-row items-center">
                                <Trophy size={14} color="#6B7280" className="mr-1" />
                                <Text className="font-montserrat-medium text-gray-700">
                                    {friend.points}
                                </Text>
                            </View>

                            <TouchableOpacity className="h-8 w-8 rounded-full bg-primary-500 items-center justify-center">
                                <Plus size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </MotiView>
    )
}

export default FriendsComponent