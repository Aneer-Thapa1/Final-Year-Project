// config/socketConfig.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Variables to store socket server and online users
let io;
const onlineUsers = new Map(); // Map userId -> socketId for better tracking

// Initialize socket server with server instance
const initializeSocket = (httpServer) => {
    // Create new socket server with CORS settings
    io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === "production"
                ? process.env.FRONTEND_URL
                : "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            credentials: true
        }
    });

    // Check if user is authenticated before connecting
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = parseInt(decoded);
            // Get user details to attach to socket
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(decoded) },
                select: { user_id: true, user_name: true }
            });

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    // Handle when user connects to socket
    io.on("connection", async (socket) => {
        const userId = socket.user.user_id;

        // Track online user
        onlineUsers.set(userId, socket.id);
        console.log(`User ${socket.user.user_name} (${userId}) connected. Total online users: ${onlineUsers.size}`);

        // Update user's last active timestamp
        await prisma.user.update({
            where: { user_id: userId },
            data: { lastActive: new Date() }
        });

        // Broadcast user's online status to friends
        broadcastUserStatus(userId, true);

        // Join user to their personal room for direct messages
        socket.join(`user:${userId}`);

        // Automatically join all rooms the user is part of
        const userRooms = await prisma.chatParticipant.findMany({
            where: { user_id: userId },
            select: { room_id: true }
        });

        userRooms.forEach(room => {
            socket.join(`room:${room.room_id}`);
            console.log(`User ${userId} joined room: ${room.room_id}`);
        });

        // When user joins a chat room manually
        socket.on('join:room', (roomId) => {
            socket.join(`room:${roomId}`);
            console.log(`User ${userId} joined room: ${roomId}`);
        });

        // When user leaves a chat room
        socket.on('leave:room', (roomId) => {
            socket.leave(`room:${roomId}`);
            console.log(`User ${userId} left room: ${roomId}`);
        });

        // When user starts typing
        socket.on('typing:start', async (data) => {
            const { roomId } = data;

            // Verify user is in the room before emitting
            const isParticipant = await prisma.chatParticipant.findUnique({
                where: {
                    user_id_room_id: {
                        user_id: userId,
                        room_id: parseInt(roomId)
                    }
                }
            });

            if (isParticipant) {
                socket.to(`room:${roomId}`).emit('user:typing', {
                    roomId: parseInt(roomId),
                    userId,
                    userName: socket.user.user_name
                });
            }
        });

        // When user stops typing
        socket.on('typing:stop', async (data) => {
            const { roomId } = data;

            socket.to(`room:${roomId}`).emit('user:stopTyping', {
                roomId: parseInt(roomId),
                userId
            });
        });

        // When user sends a direct message to another user
        socket.on('direct:message', async (data) => {
            const { recipientId, message } = data;

            // Verify users are friends before allowing direct messaging
            const areFriends = await checkFriendship(userId, recipientId);

            if (!areFriends) {
                socket.emit('error', { message: 'You must be friends to send direct messages' });
                return;
            }

            // Find or create a direct message room
            const room = await findOrCreateDirectRoom(userId, recipientId);

            // Create the message
            const newMessage = await prisma.message.create({
                data: {
                    room_id: room.room_id,
                    sender_id: userId,
                    content: message,
                    message_type: 'TEXT'
                },
                include: {
                    sender: {
                        select: {
                            user_id: true,
                            user_name: true,
                            avatar: true
                        }
                    }
                }
            });

            // Send the message to both users
            io.to(`room:${room.room_id}`).emit('message:received', newMessage);
        });

        // When user goes offline or disconnects
        socket.on("disconnect", async () => {
            onlineUsers.delete(userId);
            console.log(`User ${userId} disconnected. Total online users: ${onlineUsers.size}`);

            // Update last active time
            await prisma.user.update({
                where: { user_id: userId },
                data: { lastActive: new Date() }
            });

            // Broadcast offline status to friends
            broadcastUserStatus(userId, false);
        });
    });

    return io;
};

// Helper function to broadcast user status changes to friends
const broadcastUserStatus = async (userId, isOnline) => {
    try {
        // Get user's friends
        const friendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: userId },
                    { receiver_id: userId }
                ],
                status: 'ACCEPTED'
            }
        });

        // Extract friend IDs
        const friendIds = friendships.map(f =>
            f.sender_id === userId ? f.receiver_id : f.sender_id
        );

        // Broadcast status to all online friends
        friendIds.forEach(friendId => {
            if (onlineUsers.has(friendId)) {
                io.to(`user:${friendId}`).emit(
                    isOnline ? 'user:online' : 'user:offline',
                    {
                        userId,
                        timestamp: new Date()
                    }
                );
            }
        });
    } catch (error) {
        console.error('Error broadcasting user status:', error);
    }
};

// Helper function to check if two users are friends
const checkFriendship = async (userId1, userId2) => {
    const friendship = await prisma.friendRequest.findFirst({
        where: {
            OR: [
                { sender_id: userId1, receiver_id: userId2 },
                { sender_id: userId2, receiver_id: userId1 }
            ],
            status: 'ACCEPTED'
        }
    });

    return !!friendship;
};

// Helper function to find or create a direct message room
const findOrCreateDirectRoom = async (userId1, userId2) => {
    // First try to find an existing DM room
    const existingRoom = await prisma.chatRoom.findFirst({
        where: {
            type: 'DM',
            participants: {
                every: {
                    user_id: {
                        in: [userId1, userId2]
                    }
                }
            },
            // Make sure it's only these two users
            participants: {
                none: {
                    user_id: {
                        notIn: [userId1, userId2]
                    }
                }
            }
        }
    });

    if (existingRoom) {
        return existingRoom;
    }

    // Create a new DM room if none exists
    return await prisma.chatRoom.create({
        data: {
            type: 'DM',
            participants: {
                create: [
                    { user_id: userId1 },
                    { user_id: userId2 }
                ]
            }
        }
    });
};

// Function to access socket server from other files
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Function to check if a user is online
const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
};

// Export functions to use in other files
module.exports = {
    initializeSocket,
    getIO,
    isUserOnline
};