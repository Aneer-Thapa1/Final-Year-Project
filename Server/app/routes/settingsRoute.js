const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const validateToken  = require('../middleware/authMiddleware');

// All routes require authentication
router.use(validateToken);

// Get user settings
router.get('/', settingsController.getUserSettings);

// Update profile information
router.put('/profile', settingsController.updateProfile);

// Update app preferences
router.put('/preferences', settingsController.updatePreferences);

// Update habit goals
router.put('/goals', settingsController.updateGoals);

// Toggle vacation mode
router.put('/vacation', settingsController.toggleVacationMode);

// Change email address
router.put('/email', settingsController.changeEmail);

// Change password
router.put('/password', settingsController.changePassword);

// Delete account
router.delete('/account', settingsController.deleteAccount);

// Check if email exists (for registration validation)
router.get('/check-email/:email', settingsController.checkEmailExists);

// Export user data
router.get('/export-data', settingsController.exportUserData);

module.exports = router;