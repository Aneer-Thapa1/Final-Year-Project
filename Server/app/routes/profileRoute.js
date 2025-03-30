const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

// Route to get user profile (protected)
router.get('/:userId', validateToken, profileController.getUserProfile);

// Route to update user profile (protected)
router.put('/:userId', validateToken, profileController.updateUserProfile);

// Route to get user's friends (protected)
router.get('/:userId/friends', validateToken, profileController.getUserFriends);

// Route to get user's blog posts (protected)
router.get('/:userId/blogs', validateToken, profileController.getUserBlogs);

// Route to get user's achievements (protected)
router.get('/:userId/achievements', validateToken, profileController.getUserAchievements);

// Route to get user's habits (protected - only available to own user)
router.get('/:userId/habits', validateToken, profileController.getUserHabits);

// Route to get user's statistics (protected)
router.get('/:userId/stats', validateToken, profileController.getUserStats);

// Export the router
module.exports = router;