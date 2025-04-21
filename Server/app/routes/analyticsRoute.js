const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

// Route to get habit completion heatmap data (protected)
router.get('/heatmap', validateToken, analyticsController.getHabitHeatmap);

// Route to get aggregated data for user dashboard (protected)
router.get('/dashboard', validateToken, analyticsController.getDashboardAnalytics);

// Route to get detailed analytics for a specific habit (protected)
router.get('/habit/:habitId', validateToken, analyticsController.getHabitAnalytics);

// Route to get personalized insights for the user (protected)
router.get('/insights', validateToken, analyticsController.getPersonalInsights);

// Legacy routes mapped to new controller functions
router.get('/heatmap/:habitId', validateToken, analyticsController.getHabitHeatmap);
router.get('/progress/:habitId', validateToken, analyticsController.getHabitAnalytics);
router.get('/mood', validateToken, (req, res) => {
    // Temporarily route to dashboard until mood analytics is implemented
    return res.status(501).json({
        success: false,
        message: 'Mood analytics is not implemented in the current version',
        data: null
    });
});
router.get('/milestones', validateToken, (req, res) => {
    // Temporarily route to insights until milestones is implemented
    return res.status(501).json({
        success: false,
        message: 'Milestones endpoint is not implemented in the current version',
        data: null
    });
});

// Export the router
module.exports = router;