const express = require('express');
const router = express.Router();

// validateToken is used to validated user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const habitController = require('../controllers/habitController')

// route to add a new habit by a user (/api/habit/addHabit)
router.post('/addHabit', validateToken, habitController.addHabit);

//router to get all the habits of a user (/api/habit/getHabit)
router.get('/getHabit', validateToken, habitController.getUserHabits);

// router to get single habit details (/api/habit/getSingleHabit/:habit_id)
router.get('/getSingleHabit/:habit_id', validateToken, habitController.getSingleHabit);

// router to get stats of a habit (/api/habit/getHabitStats/:habit_id/stats)
router.get('/getHabitStats/:habit_id/stats', validateToken, habitController.getHabitStats);

// router to log completion of a habit (/api/habit/logHabitCompletion/:habit_id)
router.post('/logHabitCompletion/:habit_id', validateToken, habitController.logHabitCompletion);

// router to update a habit (/api/habit/updateHabit/:habit_id)
router.put('/updateHabit/:habit_id', validateToken, habitController.updateHabit);

// router to delete habit of a user (/api/habit/deleteHabit/:habit_id)
router.delete('/deleteHabit/:habit_id', validateToken, habitController.deleteHabit);

// router to get upcoming habits (/api/habit/getUpcomingHabits)
router.get('/getUpcomingHabits', validateToken, habitController.getUpcomingHabits);

// router to get habits by domain (/api/habit/getHabitsByDomain/:domain_id)
router.get('/getHabitsByDomain/:domain_id', validateToken, habitController.getHabitsByDomain);

// router to update habit reminders (/api/habit/updateHabitReminders/:habit_id)
router.put('/updateHabitReminders/:habit_id', validateToken, habitController.updateHabitReminders);

// router to get habit history (/api/habit/getHabitHistory/:habit_id)
router.get('/getHabitHistory/:habit_id', validateToken, habitController.getHabitHistory);

module.exports = router;