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
router.get('/getPublicHabits', validateToken, habitController.getPublicHabits);

// Habit management
router.put('/updateHabit/:habitId', validateToken, habitController.updateHabit);
router.patch('/toggleFavorite/:habitId', validateToken, habitController.toggleFavorite);
router.patch('/toggleActive/:habitId', validateToken, habitController.toggleActive);
router.delete('/deleteHabit/:habitId', validateToken, habitController.deleteHabit);
router.post('/copyHabit/:habitId', validateToken, habitController.copyHabit);

// Habit logging
router.post('/logCompletion/:habitId', validateToken, habitController.logHabitCompletion);
router.delete('/deleteLog/:logId', validateToken, habitController.deleteHabitLog);

// Reminder management
router.post('/addReminder/:habitId', validateToken, habitController.addReminder);
router.delete('/deleteReminder/:reminderId', validateToken, habitController.deleteReminder);

// Social features
router.post('/adoptHabit/:habitId', validateToken, habitController.adoptPublicHabit);

module.exports = router;