// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../store';
import {
    addMessage,
    addTypingUser,
    removeTypingUser,
    setUserOnline,
    setUserOffline
} from './chatSlice';

// Types
interface TypingData {
    roomId: number | string;
    userId: string;
    userName: string;
}

interface UserStatusData {
    userId: string;
    timestamp: string;
}

interface MessageData {
    room_id: number | string;
    message_id: string;
    content: string;
    sender_id: string;
    createdAt: string;
    message_type: 'TEXT' | 'IMAGE' | 'FILE';
    sender?: {
        user_id: string;
        user_name: string;
        avatar?: string;
    };
}

// Singleton socket instance
let socket: Socket | null = null;

/**
 * Initialize the socket connection with the server
 * @param token JWT token for authentication
 * @returns The socket instance
 */
export const initializeSocket = async (): Promise<Socket | null> => {
    try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
            console.log('No token found, cannot initialize socket');
            return null;
        }

        // If socket exists and is connected, return it
        if (socket?.connected) {
            return socket;
        }

        // If socket exists but is disconnected, reconnect
        if (socket) {
            socket.connect();
            return socket;
        }

        // Create new socket connection
        socket = io('https://6b0b-2400-74e0-10-31cd-3949-6835-45bb-d9a8.ngrok-free.app', {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        // Setup event listeners
        setupSocketListeners(socket);

        return socket;
    } catch (error) {
        console.error('Socket initialization error:', error);
        return null;
    }
};

/**
 * Get the current socket instance
 * @returns The socket instance or null if not initialized
 */
export const getSocket = (): Socket | null => {
    return socket;
};

/**
 * Disconnect the socket connection
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
    }
};

/**
 * Join a chat room
 * @param roomId The ID of the room to join
 */
export const joinRoom = (roomId: number | string): void => {
    if (socket?.connected) {
        socket.emit('join:room', roomId);
    }
};

/**
 * Leave a chat room
 * @param roomId The ID of the room to leave
 */
export const leaveRoom = (roomId: number | string): void => {
    if (socket?.connected) {
        socket.emit('leave:room', roomId);
    }
};

/**
 * Notify the server that the user is typing
 * @param roomId The ID of the room where the user is typing
 */
export const emitTyping = (roomId: number | string): void => {
    if (socket?.connected) {
        socket.emit('typing:start', { roomId });
    }
};

/**
 * Notify the server that the user has stopped typing
 * @param roomId The ID of the room where the user was typing
 */
export const emitStopTyping = (roomId: number | string): void => {
    if (socket?.connected) {
        socket.emit('typing:stop', { roomId });
    }
};

/**
 * Send a direct message to another user
 * @param recipientId The ID of the recipient
 * @param message The message content
 * @returns boolean indicating success
 */
export const sendDirectMessage = (recipientId: string, message: string): boolean => {
    if (socket?.connected) {
        socket.emit('direct:message', { recipientId, message });
        return true;
    }
    return false;
};

/**
 * Setup socket event listeners
 * @param socket The socket instance
 */
const setupSocketListeners = (socket: Socket): void => {
    // Connection events
    socket.on('connect', () => {
        console.log('Socket connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // Message events
    socket.on('message:received', (message: MessageData) => {
        store.dispatch(addMessage({
            roomId: message.room_id,
            message
        }));
    });

    // Typing events
    socket.on('user:typing', (data: TypingData) => {
        store.dispatch(addTypingUser({
            roomId: data.roomId,
            userId: data.userId,
            userName: data.userName
        }));
    });

    socket.on('user:stopTyping', (data: { roomId: number | string; userId: string }) => {
        store.dispatch(removeTypingUser({
            roomId: data.roomId,
            userId: data.userId
        }));
    });

    // User status events
    socket.on('user:online', (data: UserStatusData) => {
        store.dispatch(setUserOnline(data));
    });

    socket.on('user:offline', (data: UserStatusData) => {
        store.dispatch(setUserOffline(data));
    });
};

// Export socket service functions
const socketService = {
    initializeSocket,
    getSocket,
    disconnectSocket,
    joinRoom,
    leaveRoom,
    emitTyping,
    emitStopTyping,
    sendDirectMessage
};

export default socketService;