const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const {
    getUserAchievements,
    getAchievementDetails,
    getAchievementsByType,
    getRecentAchievements,
    getUpcomingAchievements,
    getAchievementStats
} = require('../controllers/achievementController');

// Main achievements endpoint - gets all achievements with progress
router.get('/achievements', authMiddleware, getUserAchievements);

// Get detailed information about a specific achievement
// router.get('/:id', authMiddleware, getAchievementDetails);

// Get achievements by type (STREAK_LENGTH, TOTAL_COMPLETIONS, etc.)
router.get('/type/:type', authMiddleware, getAchievementsByType);

// Get recently unlocked achievements
router.get('/recent', authMiddleware, getRecentAchievements);

// Get achievements that are close to being unlocked
router.get('/upcoming', authMiddleware, getUpcomingAchievements);

// Get achievement statistics
router.get('/stats', authMiddleware, getAchievementStats);

// Backward compatibility for older client version
router.get('/getAchievements', authMiddleware, getUserAchievements);

module.exports = router;