// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const { upload, handleUploadError } = require('../config/multerConfig');

// Chat Room Management Routes
// Create a new group chat
router.post('/rooms/group', validateToken, chatController.createGroupChat);

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

// Group Chat Specific Routes
// Get group chat participants
router.get('/rooms/:roomId/participants', validateToken, chatController.getGroupChatParticipants);

// Add participants to a group chat
router.post('/rooms/:roomId/participants/add', validateToken, chatController.addGroupChatParticipants);

// Remove participants from a group chat
router.post('/rooms/:roomId/participants/remove', validateToken, chatController.removeGroupChatParticipants);

// Search potential participants to add to a group
router.get('/rooms/:roomId/participants/search', validateToken, chatController.searchPotentialParticipants);

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

// Blocked Contacts Management
// Get blocked contacts
router.get('/blocked-contacts', validateToken, chatController.getBlockedContacts);

// Block a user
router.post('/block-user/:userId', validateToken, chatController.blockUser);

// Unblock a user
router.delete('/unblock-user/:userId', validateToken, chatController.unblockUser);

// Get potential chat recipients (friends not in a chat)
router.get('/potential-recipients', validateToken, chatController.getPotentialChatRecipients);

// Typing Status
// Update typing status
router.post('/rooms/:roomId/typing', validateToken, chatController.updateTypingStatus);

// Socket Setup
// Setup user's socket connections
router.get('/socket/setup', validateToken, chatController.setupUserSocket);

module.exports = router;