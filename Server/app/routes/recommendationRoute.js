const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/authMiddleware');
const recommendationController = require('../controllers/recommendationController');

// Route to get habit recommendation
router.post('/getHabitRecommendation', validateToken, recommendationController.getHabitRecommendations);

// Route to get domain recommendation
router.post('/getDomainRecommendation', validateToken, recommendationController.getRecommendedHabitDomains);

module.exports = router;
