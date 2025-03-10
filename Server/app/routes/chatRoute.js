// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const { upload, handleUploadError } = require('../config/multerConfig');

// Chat Room Management Routes
// Create a new group chat
router.post('/rooms', validateToken, chatController.createChatRoom);

// Create a direct message chat or return existing one
router.post('/direct', validateToken, chatController.createDirectChat);

// Get user's chat rooms
router.get('/rooms', validateToken, chatController.getUserChatRooms);

// Get specific chat room details
router.get('/rooms/:roomId', validateToken, chatController.getChatRoomDetails);

// Update chat room details (name, description, avatar)
router.patch('/rooms/:roomId', validateToken, chatController.updateChatRoom);

// Leave a chat room
router.post('/rooms/:roomId/leave', validateToken, chatController.leaveChat);

// Message Management Routes
// Get messages from a room with pagination
router.get('/rooms/:roomId/messages', validateToken, chatController.getChatMessages);

// Send text message to a room
router.post('/rooms/:roomId/messages', validateToken, chatController.sendMessage);

// Upload and send media files to a room
router.post('/rooms/:roomId/media',
    validateToken,
    upload.single('file'),
    handleUploadError,
    chatController.uploadMedia
);

// Edit a message
router.put('/messages/:messageId', validateToken, chatController.editMessage);

// Delete a message
router.delete('/messages/:messageId', validateToken, chatController.deleteMessage);

// Mark messages as read
router.post('/rooms/:roomId/read', validateToken, chatController.markMessagesAsRead);

// Participant Management Routes
// Update room participants (add/remove)
router.patch('/rooms/:roomId/participants', validateToken, chatController.updateChatParticipants);

// Update participant role (admin status)
router.patch('/rooms/:roomId/participants/:participantId', validateToken, chatController.updateParticipantRole);

// Typing Status
// Update typing status
router.post('/rooms/:roomId/typing', validateToken, chatController.updateTypingStatus);

// Socket Setup
// Setup user's socket connections
router.get('/socket/setup', validateToken, chatController.setupUserSocket);

module.exports = router;