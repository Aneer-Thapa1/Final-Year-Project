const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// User registration route (/api/users/register)
router.post('/register', userController.register);

// User login route (/api/users/login)
router.post('/login', userController.login);

// User details route (/api/users/changePassword)
router.post('/changePassword',validateToken, userController.changePassword);

//forgot password route (/api/users/forgotPassword)
router.post('/forgotPassword', userController.forgotPassword);

module.exports = router;
