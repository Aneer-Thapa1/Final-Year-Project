const express = require('express');
const router = express.Router();

// validateToken is used to validate user authentication
const validateToken = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Prefix all routes with /api/notifications

// Route to get user's notifications (protected)
router.get('/getNotification', validateToken, notificationController.getUserNotifications);

// Route to get unread notification count (protected)
router.get('/unread-count', validateToken, notificationController.getUnreadNotificationCount);

// Route to mark a specific notification as read (protected)
router.put('/:notification_id/read', validateToken, notificationController.markNotificationAsRead);

// Route to mark all notifications as read (protected)
router.put('/mark-all-read', validateToken, notificationController.markAllNotificationsAsRead);

// Route to delete a specific notification (protected)
router.delete('/:notification_id', validateToken, notificationController.deleteNotification);

// Export the router
module.exports = router;