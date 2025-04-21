const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const pushTokenController = require('../controllers/pushTokenController');

// Route to register a device push token (protected)
router.post('/register', validateToken, (req, res) => {
    const { pushToken } = req.body;
    const userId = req.user;
    pushTokenController.registerToken(userId, pushToken)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Route to remove a device push token (protected)
router.delete('/remove', validateToken, (req, res) => {
    const { pushToken } = req.body;
    const userId = req.user;
    pushTokenController.removeToken(userId, pushToken)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Route to remove all push tokens for a user (protected)
router.delete('/remove-all', validateToken, (req, res) => {
    const userId = req.user;
    pushTokenController.removeAllTokens(userId)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Route to get all push tokens for a user (protected)
router.get('/tokens', validateToken, (req, res) => {
    const userId = req.user;
    pushTokenController.getUserTokens(userId)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Route to update notification preferences (protected)
router.put('/preferences', validateToken, (req, res) => {
    const { enabled } = req.body;
    const userId = req.user;
    pushTokenController.updateNotificationPreferences(userId, enabled)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Route to send a test notification (protected)
router.post('/test', validateToken, (req, res) => {
    const userId = req.user;
    const { title, body } = req.body;
    const notificationService = require('../services/notificationService');

    notificationService.sendToUser(userId, title || 'Test Notification', body || 'This is a test notification')
        .then(result => res.json({ success: true, message: 'Test notification sent', result }))
        .catch(err => res.status(500).json({ success: false, message: err.message }));
});

// Export the router
module.exports = router;