// src/store/slices/chatSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
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

interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
    lastActive?: string;
    isOnline?: boolean;
}

interface Message {
    message_id: number;
    room_id: number;
    sender_id: number;
    content: string;
    message_type: MessageType;
    createdAt: string;
    media_url?: string;
    sender?: User;
}

interface ChatParticipant {
    user_id: number;
    room_id: number;
    isAdmin: boolean;
    user?: User;
}

interface ChatRoom {
    room_id: number;
    type: ChatRoomType;
    name?: string;
    avatar?: string;
    lastMessage?: Message;
    participants: ChatParticipant[];
    unreadCount?: number;
}

interface TypingUser {
    userId: number;
    userName: string;
}

interface ChatState {
    chatRooms: ChatRoom[];
    activeRoomId: number | null;
    messages: Record<number, Message[]>;
    typingUsers: Record<number, TypingUser[]>;
    unreadCounts: Record<number, number>;
    loading: boolean;
    sending: boolean;
    error: string | null;
    socket: Socket | null;
}

// Socket singleton
let socketInstance: Socket | null = null;

// Connect to socket
export const connectSocket = createAsyncThunk(
    'chat/connectSocket',
    async (_, { getState, dispatch }) => {
        try {
            const token = await AsyncStorage.getItem('token');

            if (!token) throw new Error('No auth token available');
            if (socketInstance?.connected) return socketInstance;

            // Create socket connection
            socketInstance = io('https://6b0b-2400-74e0-10-31cd-3949-6835-45bb-d9a8.ngrok-free.app', {
                auth: { token },
                transports: ['websocket']
            });

            // Set up event listeners
            socketInstance.on('message:received', (message: Message) => {
                dispatch(addMessage({ roomId: message.room_id, message }));
            });

            socketInstance.on('user:typing', (data: { roomId: number; userId: number; userName: string }) => {
                dispatch(addTypingUser(data));
            });

            socketInstance.on('user:stopTyping', (data: { roomId: number; userId: number }) => {
                dispatch(removeTypingUser(data));
            });

            return socketInstance;
        } catch (error: any) {
            throw error;
        }
    }
);

// Async thunks
export const fetchChatRooms = createAsyncThunk(
    'chat/fetchChatRooms',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/api/chat/rooms');
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch chat rooms');
        }
    }
);

export const fetchChatMessages = createAsyncThunk(
    'chat/fetchChatMessages',
    async (roomId: number, { rejectWithValue, getState }) => {
        try {
            const response = await api.get(`/api/chat/rooms/${roomId}/messages`);

            // Join room via socket
            const state = getState() as { chat: ChatState };
            if (state.chat.socket?.connected) {
                state.chat.socket.emit('join:room', roomId);
            }

            return { roomId, messages: response.data.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
        }
    }
);

export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ roomId, content, messageType = 'TEXT' }:
           { roomId: number; content: string; messageType?: MessageType },
           { rejectWithValue }
    ) => {
        try {
            const response = await api.post(`/api/chat/rooms/${roomId}/messages`, {
                content,
                message_type: messageType
            });

            return { roomId, message: response.data.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to send message');
        }
    }
);

export const createDirectChat = createAsyncThunk(
    'chat/createDirectChat',
    async (recipientId: number, { rejectWithValue }) => {
        try {
            const response = await api.post('/api/chat/direct', { recipientId });
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create direct chat');
        }
    }
);

export const markMessagesAsRead = createAsyncThunk(
    'chat/markMessagesAsRead',
    async (roomId: number, { rejectWithValue }) => {
        try {
            await api.post(`/api/chat/rooms/${roomId}/read`);
            return roomId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to mark messages as read');
        }
    }
);

export const emitTyping = createAsyncThunk(
    'chat/emitTyping',
    async (roomId: number, { getState }) => {
        const state = getState() as { chat: ChatState };
        if (state.chat.socket?.connected) {
            state.chat.socket.emit('typing:start', { roomId });
        }
        return null;
    }
);

export const emitStopTyping = createAsyncThunk(
    'chat/emitStopTyping',
    async (roomId: number, { getState }) => {
        const state = getState() as { chat: ChatState };
        if (state.chat.socket?.connected) {
            state.chat.socket.emit('typing:stop', { roomId });
        }
        return null;
    }
);

// Initial state
const initialState: ChatState = {
    chatRooms: [],
    activeRoomId: null,
    messages: {},
    typingUsers: {},
    unreadCounts: {},
    loading: false,
    sending: false,
    error: null,
    socket: null
};

// Slice
const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveRoom: (state, action: PayloadAction<number | null>) => {
            state.activeRoomId = action.payload;
            if (action.payload) {
                state.unreadCounts[action.payload] = 0;
            }
        },

        addMessage: (state, action: PayloadAction<{ roomId: number; message: Message }>) => {
            const { roomId, message } = action.payload;

            // Initialize messages array if needed
            if (!state.messages[roomId]) {
                state.messages[roomId] = [];
            }

            // Add message if not duplicate
            if (!state.messages[roomId].some(msg => msg.message_id === message.message_id)) {
                state.messages[roomId].push(message);
            }

            // Update unread count if not active room
            if (roomId !== state.activeRoomId) {
                state.unreadCounts[roomId] = (state.unreadCounts[roomId] || 0) + 1;
            }

            // Update lastMessage and move room to top
            const roomIndex = state.chatRooms.findIndex(room => room.room_id === roomId);
            if (roomIndex !== -1) {
                state.chatRooms[roomIndex].lastMessage = message;
                const room = state.chatRooms[roomIndex];
                state.chatRooms.splice(roomIndex, 1);
                state.chatRooms.unshift(room);
            }
        },

        addTypingUser: (state, action: PayloadAction<{ roomId: number; userId: number; userName: string }>) => {
            const { roomId, userId, userName } = action.payload;

            if (!state.typingUsers[roomId]) {
                state.typingUsers[roomId] = [];
            }

            if (!state.typingUsers[roomId].some(user => user.userId === userId)) {
                state.typingUsers[roomId].push({ userId, userName });
            }
        },

        removeTypingUser: (state, action: PayloadAction<{ roomId: number; userId: number }>) => {
            const { roomId, userId } = action.payload;

            if (state.typingUsers[roomId]) {
                state.typingUsers[roomId] = state.typingUsers[roomId].filter(
                    user => user.userId !== userId
                );
            }
        },

        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Connect socket
            .addCase(connectSocket.fulfilled, (state, action) => {
                state.socket = action.payload;
            })

            // Fetch chat rooms
            .addCase(fetchChatRooms.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchChatRooms.fulfilled, (state, action) => {
                state.chatRooms = action.payload;
                state.loading = false;

                // Initialize unread counts
                action.payload.forEach(room => {
                    if (room.unreadCount !== undefined) {
                        state.unreadCounts[room.room_id] = room.unreadCount;
                    }
                });
            })
            .addCase(fetchChatRooms.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Fetch chat messages
            .addCase(fetchChatMessages.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchChatMessages.fulfilled, (state, action) => {
                const { roomId, messages } = action.payload;
                state.messages[roomId] = messages;
                state.loading = false;
                state.unreadCounts[roomId] = 0;
            })
            .addCase(fetchChatMessages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Send message
            .addCase(sendMessage.pending, (state) => {
                state.sending = true;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                const { roomId, message } = action.payload;

                // Add to messages array
                if (!state.messages[roomId]) {
                    state.messages[roomId] = [];
                }

                if (!state.messages[roomId].some(msg => msg.message_id === message.message_id)) {
                    state.messages[roomId].push(message);
                }

                // Update room
                const roomIndex = state.chatRooms.findIndex(room => room.room_id === roomId);
                if (roomIndex !== -1) {
                    state.chatRooms[roomIndex].lastMessage = message;
                    const room = state.chatRooms[roomIndex];
                    state.chatRooms.splice(roomIndex, 1);
                    state.chatRooms.unshift(room);
                }

                state.sending = false;
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.sending = false;
                state.error = action.payload as string;
            })

            // Create direct chat
            .addCase(createDirectChat.pending, (state) => {
                state.loading = true;
            })
            .addCase(createDirectChat.fulfilled, (state, action) => {
                const existingIndex = state.chatRooms.findIndex(
                    room => room.room_id === action.payload.room_id
                );

                if (existingIndex === -1) {
                    state.chatRooms.unshift(action.payload);
                }

                state.activeRoomId = action.payload.room_id;
                state.loading = false;
            })
            .addCase(createDirectChat.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // Mark messages as read
            .addCase(markMessagesAsRead.fulfilled, (state, action) => {
                state.unreadCounts[action.payload] = 0;
            });
    }
});

export const {
    setActiveRoom,
    addMessage,
    addTypingUser,
    removeTypingUser,
    clearError
} = chatSlice.actions;

export default chatSlice.reducer;