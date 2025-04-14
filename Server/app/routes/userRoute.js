const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// User registration route (/api/users/register)
router.post('/register', userController.register);

// User login route (/api/users/login)
router.post('/login', userController.login);

// User details route (/api/users/changePassword)
router.post('/changePassword', validateToken, userController.changePassword);

//forgot password route (/api/users/forgotPassword)
router.post('/forgotPassword', userController.forgotPassword);

// Verify OTP route (/api/users/verifyOTP)
router.post('/verifyOTP', userController.verifyOTP);

// Reset password route (/api/users/resetPassword)
router.post('/resetPassword', userController.resetPassword);

//User verification route (/api/users/verifyUser)
router.get('/verifyUser', validateToken, userController.verifyUser);

module.exports = router;