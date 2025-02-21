// routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');
const chatController = require('../controllers/chatController');
const { upload, handleUploadError } = require('../config/multer');

// Chat Room Routes
// route to create a new chat room (/api/chat/createRoom)
router.post('/createRoom', validateToken, chatController.createChatRoom);

// route to get user's chat rooms (/api/chat/getRooms)
router.get('/getRooms', validateToken, chatController.getUserChatRooms);

// Message Routes
// route to get messages from a room (/api/chat/getMessages/:roomId)
router.get('/getMessages/:roomId', validateToken, chatController.getChatMessages);

// route to send message with attachments (/api/chat/sendMessage/:roomId)
router.post('/sendMessage/:roomId',
    validateToken,
    upload.array('files', 5),
    handleUploadError,
    chatController.sendMessage
);

// Participant Routes
// route to update room participants (/api/chat/updateParticipants/:roomId)
router.put('/updateParticipants/:roomId', validateToken, chatController.updateChatParticipants);

// Message Management Routes
// route to delete a message (/api/chat/deleteMessage/:messageId)
router.delete('/deleteMessage/:messageId', validateToken, chatController.deleteMessage);

// route to mark messages as read (/api/chat/markRead/:roomId)
router.post('/markRead/:roomId', validateToken, chatController.markMessagesAsRead);

// Message Reaction Routes
// route to add reaction to message (/api/chat/addReaction/:messageId)
router.post('/addReaction/:messageId', validateToken, chatController.addMessageReaction);

// route to remove reaction from message (/api/chat/removeReaction/:messageId/:emoji)
router.delete('/removeReaction/:messageId/:emoji', validateToken, chatController.removeMessageReaction);

module.exports = router;