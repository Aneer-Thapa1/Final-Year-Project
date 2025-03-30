import {fetchData, postData, updateData, deleteData, postImageData} from './api';
import React from "react";

// Enum Imports
export enum ChatRoomType {
    DM = 'DM',
    GROUP = 'GROUP'
}

export enum MessageType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    FILE = 'FILE',
    AUDIO = 'AUDIO',
    SYSTEM = 'SYSTEM'
}

// Interfaces
export interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    isOnline?: boolean;
}

export interface Message {
    message_id: number;
    room_id: number;
    sender_id: number;
    content: string;
    message_type: MessageType | string;
    createdAt: string;
    media_url?: string;
    sender?: User;
    reply_to_id?: number;
}

export interface ChatParticipant {
    user_id: number;
    room_id: number;
    isAdmin: boolean;
    user?: User;
}

export interface ChatRoom {
    room_id: number;
    type: ChatRoomType | string;
    name?: string;
    description?: string;
    avatar?: string;
    lastMessage?: Message;
    participants: ChatParticipant[];
    unreadCount?: number;
    created_by_id?: number;
    is_private?: boolean;
    displayName?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface ReadStatusResponse {
    unreadCount: number;
    user_id: number;
    room_id: number;
    timestamp: string;
}

// Chat Room Management
export const createGroupChat = async (chatData: {
    name: string;
    description?: string;
    participants: number[];
    avatar?: string;
    is_private?: boolean;
}) => {
    try {
        console.log(chatData);
        // Validate required fields
        if (!chatData.name || !chatData.participants || chatData.participants.length < 2) {
            throw new Error('Group name and at least 2 participants are required');
        }

        return await postImageData<ApiResponse<ChatRoom>>('/api/chat/rooms/group', chatData);
    } catch (error: any) {
        console.error('Error in createGroupChat:', error);
        throw error.response?.data?.error || error.message || 'Failed to create group chat';
    }
};

export const createDirectChat = async (recipientId: number) => {
    try {
        const response = await postData<ApiResponse<ChatRoom>>('/api/chat/direct', { recipientId });
        return response;
    } catch (error: any) {
        console.error('Error in createDirectChat:', error);
        throw error.response?.data?.error || 'Failed to create direct chat';
    }
};

export const getUserChatRooms = async (params?: {
    page?: number;
    limit?: number;
    type?: ChatRoomType | string;
    search?: string;
}) => {
    try {
        const queryParams = new URLSearchParams();

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, String(value));
                }
            });
        }

        const url = `/api/chat/rooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        const response = await fetchData<ApiResponse<ChatRoom[]>>(url);
        return response;
    } catch (error: any) {
        console.error('Error in getUserChatRooms:', error);
        throw error.response?.data?.error || 'Failed to fetch chat rooms';
    }
};

// Mark messages as read in a chat room
export const markMessagesAsRead = async (roomId: number) => {
    try {
        const response = await postData<ApiResponse<ReadStatusResponse>>(`/api/chat/rooms/${roomId}/read`, {});
        return response;
    } catch (error: any) {
        console.error('Error in markMessagesAsRead:', error);
        throw error.response?.data?.error || 'Failed to mark messages as read';
    }
};

export const getChatRoomDetails = async (roomId: number) => {
    try {
        return await fetchData<ApiResponse<ChatRoom>>(`/api/chat/rooms/${roomId}`);
    } catch (error: any) {
        console.error('Error in getChatRoomDetails:', error);
        throw error.response?.data?.error || 'Failed to fetch chat room details';
    }
};

export const updateChatRoom = async (roomId: number, chatData: {
    name?: string;
    description?: string;
    avatar?: string;
}) => {
    try {
        return await updateData<ApiResponse<ChatRoom>>(`/api/chat/rooms/${roomId}`, chatData);
    } catch (error: any) {
        console.error('Error in updateChatRoom:', error);
        throw error.response?.data?.error || 'Failed to update chat room';
    }
};

// Participant Management
export const addGroupChatParticipants = async (roomId: number, participantIds: number[]) => {
    try {
        return await postData<ApiResponse<ChatRoom>>(`/api/chat/rooms/${roomId}/participants/add`, {
            participants: participantIds
        });
    } catch (error: any) {
        console.error('Error in addGroupChatParticipants:', error);
        throw error.response?.data?.error || 'Failed to add participants';
    }
};

export const removeGroupChatParticipants = async (roomId: number, participantIds: number[]) => {
    try {
        return await postData<ApiResponse<ChatRoom>>(`/api/chat/rooms/${roomId}/participants/remove`, {
            participants: participantIds
        });
    } catch (error: any) {
        console.error('Error in removeGroupChatParticipants:', error);
        throw error.response?.data?.error || 'Failed to remove participants';
    }
};

export const getGroupChatParticipants = async (roomId: number) => {
    try {
        return await fetchData<ApiResponse<ChatParticipant[]>>(`/api/chat/rooms/${roomId}/participants`);
    } catch (error: any) {
        console.error('Error in getGroupChatParticipants:', error);
        throw error.response?.data?.error || 'Failed to fetch participants';
    }
};

// Message Management
export const getChatMessages = async (roomId: number, params?: {
    page?: number;
    limit?: number;
    cursor?: string;
}) => {
    try {
        const queryParams = new URLSearchParams();

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    queryParams.append(key, String(value));
                }
            });
        }

        const url = `/api/chat/rooms/${roomId}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        return await fetchData<ApiResponse<{
            messages: Message[];
            hasMore: boolean;
        }>>(url);
    } catch (error: any) {
        console.error('Error in getChatMessages:', error);
        throw error.response?.data?.error || 'Failed to fetch messages';
    }
};

export const sendMessage = async (roomId, messageData) => {
    try {
        // Ensure the message data has the required content property
        if (!messageData.content || !messageData.content.trim()) {
            throw new Error('Message content cannot be empty');
        }

        return await postData<ApiResponse<Message>>(`/api/chat/rooms/${roomId}/messages`, messageData);
    } catch (error) {
        console.error('Error in sendMessage:', error);
        throw error.response?.data?.error || error.message || 'Failed to send message';
    }
};


export const editMessage = async (messageId: number, content: string) => {
    try {
        return await updateData<ApiResponse<Message>>(`/api/chat/messages/${messageId}`, { content });
    } catch (error: any) {
        console.error('Error in editMessage:', error);
        throw error.response?.data?.error || 'Failed to edit message';
    }
};

export const deleteMessage = async (messageId: number) => {
    try {
        return await deleteData<ApiResponse<void>>(`/api/chat/messages/${messageId}`);
    } catch (error: any) {
        console.error('Error in deleteMessage:', error);
        throw error.response?.data?.error || 'Failed to delete message';
    }
};

// Typing status management
export const updateTypingStatus = async (roomId: number, isTyping: boolean) => {
    try {
        return await postData<ApiResponse<void>>(`/api/chat/rooms/${roomId}/typing`, { isTyping });
    } catch (error: any) {
        console.error('Error in updateTypingStatus:', error);
        throw error.response?.data?.error || 'Failed to update typing status';
    }
};

// Blocked Contacts Management
export const getBlockedContacts = async () => {
    try {
        return await fetchData<ApiResponse<User[]>>('/api/chat/blocked-contacts');
    } catch (error: any) {
        console.error('Error in getBlockedContacts:', error);
        throw error.response?.data?.error || 'Failed to fetch blocked contacts';
    }
};

export const blockUser = async (userId: number) => {
    try {
        return await postData<ApiResponse<void>>(`/api/chat/block-user/${userId}`, {});
    } catch (error: any) {
        console.error('Error in blockUser:', error);
        throw error.response?.data?.error || 'Failed to block user';
    }
};

export const unblockUser = async (userId: number) => {
    try {
        return await deleteData<ApiResponse<void>>(`/api/chat/unblock-user/${userId}`);
    } catch (error: any) {
        console.error('Error in unblockUser:', error);
        throw error.response?.data?.error || 'Failed to unblock user';
    }
};

// Potential Chat Recipients
export const getPotentialChatRecipients = async (search?: string) => {
    try {
        const url = search
            ? `/api/chat/potential-recipients?search=${encodeURIComponent(search)}`
            : '/api/chat/potential-recipients';

        return await fetchData<ApiResponse<User[]>>(url);
    } catch (error: any) {
        console.error('Error in getPotentialChatRecipients:', error);
        throw error.response?.data?.error || 'Failed to fetch potential chat recipients';
    }
};

// Custom hook for chat rooms with refetch capability
export const useChatRooms = () => {
    const [chatRooms, setChatRooms] = React.useState<ChatRoom[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    const fetchChatRooms = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getUserChatRooms();

            if (response && response.success && response.data) {
                setChatRooms(response.data || []);
            } else {
                setChatRooms([]);
                setError('Invalid response format from server');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch chat rooms');
            console.error('Error fetching chat rooms:', err);
            setChatRooms([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchChatRooms();
    }, [fetchChatRooms]);

    return {
        chatRooms,
        loading,
        error,
        refetch: fetchChatRooms
    };
};

// Helper function to determine if a user is recently active
export const isRecentlyActive = (lastActive?: string): boolean => {
    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    return now - lastActiveTime < fifteenMinutes;
};