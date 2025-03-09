// src/routes/friendshipRoutes.js
const express = require('express');
const router = express.Router();
const {body, query, param} = require('express-validator');

// Use validateToken middleware for authentication like in blogRoutes
const validateToken = require('../middleware/authMiddleware');
const friendshipController = require('../controllers/friendshipController');

// Send a friend request
router.post('/request', validateToken, [body('user_id')
    .isInt()
    .withMessage('User ID must be an integer')
    .notEmpty()
    .withMessage('User ID is required')], friendshipController.sendFriendRequest);

// Respond to a friend request
router.patch('/respond', validateToken, [body('request_id')
    .isInt()
    .withMessage('Request ID must be an integer')
    .notEmpty()
    .withMessage('Request ID is required'), body('status')
    .isIn(['ACCEPTED', 'REJECTED'])
    .withMessage('Status must be either ACCEPTED or REJECTED')], friendshipController.respondToFriendRequest);

// Get all friends (protected)
router.get('/', validateToken, friendshipController.getFriends);

// Get all pending friend requests (protected)
router.get('/requests', validateToken, friendshipController.getPendingRequests);

// Search for users (protected)
router.get('/search', validateToken, [query('query')
    .isString()
    .withMessage('Search query must be a string')
    .isLength({min: 2})
    .withMessage('Search query must be at least 2 characters')], friendshipController.searchUsers);

// Remove a friend (protected)
router.delete('/:friendId', validateToken, [param('friendId')
    .isInt()
    .withMessage('Friend ID must be an integer')], friendshipController.removeFriend);

// Get friend suggestions (protected) - New endpoint for suggested friends
router.get('/suggestions', validateToken, friendshipController.getFriendSuggestions);

// Get sent friend requests (protected) - New endpoint to track outgoing requests
router.get('/sent-requests', validateToken, friendshipController.getSentRequests);

// Get mutual friends with a user (protected) - New endpoint for social features
router.get('/mutual/:userId', validateToken, [param('userId')
    .isInt()
    .withMessage('User ID must be an integer')], friendshipController.getMutualFriends);

// Get friendship statistics (protected) - New endpoint for dashboard
router.get('/stats', validateToken, friendshipController.getFriendshipStats);

// Export the router
module.exports = router;