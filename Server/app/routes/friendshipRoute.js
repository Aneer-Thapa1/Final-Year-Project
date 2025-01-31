const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware'); // importing middleware to validate token
const friendshipController = require('../controllers/friendshipController');

// Route to send a friend request
router.post('/add-friend', validateToken, friendshipController.addFriend);

// Route to accept or reject a friend request
router.post('/update-request', validateToken, friendshipController.updateFriendRequestStatus);

module.exports = router;
