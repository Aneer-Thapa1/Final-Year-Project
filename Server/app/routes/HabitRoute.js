const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const habitController = require('../controllers/habitController');

// Habit creation and retrieval
router.post('/addHabit', validateToken, habitController.addHabit);
router.get('/getHabit/:habitId', validateToken, habitController.getHabitById);
router.get('/getUserHabits', validateToken, habitController.getUserHabits);
router.get('/getHabitsByDate/:date', validateToken, habitController.getHabitsByDate);
router.get('/getHabitsByDomain/:domainId', validateToken, habitController.getHabitsByDomain);

// Habit management
router.put('/updateHabit/:habitId', validateToken, habitController.updateHabit);
router.delete('/deleteHabit/:habitId', validateToken, habitController.deleteHabit);
router.patch('/archiveHabit/:habitId', validateToken, habitController.archiveHabit);
router.patch('/restoreHabit/:habitId', validateToken, habitController.restoreHabit);
router.patch('/toggleFavorite/:habitId', validateToken, habitController.toggleFavoriteHabit);

// Habit logging and tracking
router.post('/logHabitCompletion/:habitId', validateToken, habitController.logHabitCompletion);
router.post('/skipHabit/:habitId', validateToken, habitController.skipHabit);
router.delete('/deleteLog/:logId', validateToken, habitController.deleteHabitLog);

// Streak management
router.post('/resetStreak/:habitId', validateToken, habitController.resetHabitStreak);
router.post('/setStreak/:habitId', validateToken, habitController.setHabitStreak);
router.get('/streakHistory/:habitId', validateToken, habitController.getHabitStreakHistory);

// Domain management
router.get('/domains', validateToken, habitController.getHabitDomains);
router.post('/domains', validateToken, habitController.addHabitDomain);
router.put('/domains/:domainId', validateToken, habitController.updateHabitDomain);
router.delete('/domains/:domainId', validateToken, habitController.deleteHabitDomain);

// System functions
router.post('/processHabitDailyReset', validateToken, habitController.processHabitDailyReset);

module.exports = router;