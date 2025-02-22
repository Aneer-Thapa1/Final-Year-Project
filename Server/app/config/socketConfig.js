// Importing required packages
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

// Variables to store socket server and count of online users
let io;
let onlineUsers = 0;

// Initialize socket server with server instance
const initializeSocket = (httpServer) => {
    // Create new socket server with CORS settings
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        }
    });

    // Check if user is authenticated before connecting
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    // Handle when user connects to socket
    io.on("connection", (socket) => {
        onlineUsers++;
        console.log(`A user connected: ${socket.id}. Total online users: ${onlineUsers}`);

        // When user joins a chat room
        socket.on('join:room', (roomId) => {
            socket.join(`room:${roomId}`);
            console.log(`User ${socket.id} joined room: ${roomId}`);
        });

        // When user leaves a chat room
        socket.on('leave:room', (roomId) => {
            socket.leave(`room:${roomId}`);
            console.log(`User ${socket.id} left room: ${roomId}`);
        });

        // When user starts typing
        socket.on('typing:start', (roomId) => {
            socket.to(`room:${roomId}`).emit('user:typing', {
                userId: socket.id
            });
        });

        // When user stops typing
        socket.on('typing:stop', (roomId) => {
            socket.to(`room:${roomId}`).emit('user:stop-typing', {
                userId: socket.id
            });
        });

        // When user disconnects
        socket.on("disconnect", () => {
            onlineUsers--;
            console.log(`A user disconnected: ${socket.id}. Total online users: ${onlineUsers}`);
        });
    });

    return io;
};

// Function to access socket server from other files
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Export functions to use in other files
module.exports = { initializeSocket, getIO };