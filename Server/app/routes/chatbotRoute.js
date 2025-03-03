const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');
const chatbotController = require('../controllers/chatbotController');

// Route to send a message to the chatbot agent
router.post('/sendMessageToChatbotAgent', validateToken, chatbotController.chatWithAI);

module.exports = router;
