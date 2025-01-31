const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// User registration route
router.post('/register', userController.register);

// User login route
router.post('/login', userController.login);

// User details route
router.post('/login', userController.login);

// User details route
router.post('/changePassword', userController.changePassword);

module.exports = router;
