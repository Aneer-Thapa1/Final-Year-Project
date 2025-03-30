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
const SERVER_URL = 'https://5767-2400-74e0-10-31cd-f9ae-64a0-623b-d0c2.ngrok-free.app';

/**
 * Initialize the socket connection with the server
 * @returns The socket instance
 */
export const initializeSocket = async (): Promise<Socket | null> => {
    try {
        console.log('🔄 Initializing socket connection...');

        // Clear any existing socket
        if (socket) {
            console.log('🔌 Disconnecting existing socket');
            socket.disconnect();
            socket = null;
        }

        // Get token directly from AsyncStorage
        let token = await AsyncStorage.getItem('token');
console.log(token);
        if (!token) {
            console.log('❌ No token found in AsyncStorage');
            return null;
        }

        // Check if token is a JSON string and parse it
        try {
            const parsedToken = JSON.parse(token);
            if (typeof parsedToken === 'object') {
                console.log('📦 Token is stored as an object');
                // Try common token properties
                if (parsedToken.token) token = parsedToken.token;
                else if (parsedToken.accessToken) token = parsedToken.accessToken;
                else if (parsedToken.access_token) token = parsedToken.access_token;
                else if (parsedToken.jwt) token = parsedToken.jwt;
                else {
                    console.log('⚠️ Token object structure unknown:', Object.keys(parsedToken));
                    // If we can't figure out the token format, try using the stringified version
                    token = JSON.stringify(parsedToken);
                }
            }
        } catch (e) {
            // If not valid JSON, use as is
            console.log('📝 Token is stored as a string');
        }

        console.log(`🔑 Using token: ${typeof token === 'string' ? token.substring(0, 15) + '...' : 'not a string'}`);

        // Create a new socket connection with all options
        socket = io(SERVER_URL, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
            forceNew: true,
            autoConnect: true
        });

        console.log('🔄 Socket connection attempt initialized');

        // Set up core event listeners with better debug info
        socket.on('connect', () => {
            console.log('✅ Socket CONNECTED successfully. Socket ID:', socket?.id);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket CONNECTION ERROR:', error.message);

            // If token is invalid but we have a valid token string, the token might be
            // rejected due to a mismatch in JWT secret or algorithm
            if (error.message === 'Invalid token' && typeof token === 'string') {
                console.log('🔐 JWT token is being rejected by the server. You might need to refresh your auth.');

                // Optional: Force logout or clear token if consistently rejected
                // AsyncStorage.removeItem('token');
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket DISCONNECTED. Reason:', reason);
        });

        // Set up full event listeners
        setupSocketListeners(socket);

        return socket;
    } catch (error) {
        console.error('💥 Socket initialization error:', error);
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
        socket = null;
        console.log('🔌 Socket manually disconnected');
    }
};

/**
 * Join a chat room
 * @param roomId The ID of the room to join
 */
export const joinRoom = (roomId: number | string): void => {
    if (socket?.connected) {
        console.log(`🚪 Joining room: ${roomId}`);
        socket.emit('join:room', roomId);
    } else {
        console.log(`⚠️ Cannot join room ${roomId}: socket not connected`);

        // Try to reconnect
        initializeSocket().then(newSocket => {
            if (newSocket?.connected) {
                console.log(`🔄 Reconnected socket. Now joining room: ${roomId}`);
                newSocket.emit('join:room', roomId);
            }
        });
    }
};

/**
 * Leave a chat room
 * @param roomId The ID of the room to leave
 */
export const leaveRoom = (roomId: number | string): void => {
    if (socket?.connected) {
        console.log(`🚪 Leaving room: ${roomId}`);
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
    socket.on('error', (error) => {
        console.error('❌ Socket ERROR:', error);
    });

    // Message events
    socket.on('message:received', (message: MessageData) => {
        console.log('📩 Message received:', message.content.substring(0, 20) + (message.content.length > 20 ? '...' : ''));
        store.dispatch(addMessage({
            roomId: message.room_id,
            message
        }));
    });

    // Typing events
    socket.on('user:typing', (data: TypingData) => {
        console.log('⌨️ User typing:', data.userName);
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
        console.log('🟢 User online:', data.userId);
        store.dispatch(setUserOnline(data));
    });

    socket.on('user:offline', (data: UserStatusData) => {
        console.log('🔴 User offline:', data.userId);
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