const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware'); // Middleware (not currently used in these routes)
const userController = require('../controllers/userController');

// User registration route
router.post('/register', userController.register);

// User login route
router.post('/login', userController.login);

module.exports = router;
