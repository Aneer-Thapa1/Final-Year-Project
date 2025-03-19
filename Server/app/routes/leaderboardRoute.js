const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const leaderboardController = require('../controllers/leaderboardController');

// Route to get points-based leaderboard (weekly or monthly) (protected)
router.get('/points', validateToken, leaderboardController.getPointsLeaderboard);

// Route to get streaks leaderboard (protected)
router.get('/streaks', validateToken, leaderboardController.getStreaksLeaderboard);

// Route to get domain activity leaderboard (protected)
router.get('/domains', validateToken, leaderboardController.getDomainLeaderboard);

// Route to get real-time leaderboard updates (protected)
router.get('/realtime', validateToken, leaderboardController.getRealTimeLeaderboard);

// Export the router
module.exports = router;