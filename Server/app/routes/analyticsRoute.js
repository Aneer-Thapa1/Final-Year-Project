const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');


// Route to get GitHub-style contribution heatmap for a user (protected)
router.get('/contribution-heatmap/:userId', validateToken, analyticsController.getContributionHeatmap);

// Route to get detailed habit progress analytics (protected)
router.get('/habit-progress/:habitId', validateToken, analyticsController.getHabitProgressAnalytics);

// Route to get mood analysis data for habit completions (protected)
router.get('/mood-analytics/:userId', validateToken, analyticsController.getMoodAnalytics);

// Route to get aggregated data for user dashboard (protected)
router.get('/dashboard-analytics/:userId', validateToken, analyticsController.getDashboardAnalytics);

// Export the router
module.exports = router;