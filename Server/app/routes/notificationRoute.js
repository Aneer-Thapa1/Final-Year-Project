const express = require('express');
const router = express.Router();

// validateToken is used to validate user authentication
const validateToken = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Get user's notifications
router.get('/', validateToken, notificationController.getUserNotifications);

// Get unread notification count
router.get('/unread-count', validateToken, notificationController.getUnreadNotificationCount);

// Get notification stats
router.get('/stats', validateToken, notificationController.getNotificationStats);

// Mark multiple notifications as read
router.patch('/read', validateToken, notificationController.markNotificationsAsRead);

// Mark a single notification as read
router.patch('/:notification_id/read', validateToken, notificationController.markNotificationAsRead);

// Legacy route - mark all as read
router.put('/mark-all-read', validateToken, (req, res) => {
    req.body = { all: true };
    notificationController.markNotificationsAsRead(req, res);
});

// Delete multiple notifications
router.delete('/', validateToken, notificationController.deleteNotifications);

// Delete a single notification
router.delete('/:notification_id', validateToken, notificationController.deleteNotification);

// Create a notification (internal use)
router.post('/', validateToken, notificationController.createNotification);

module.exports = router;