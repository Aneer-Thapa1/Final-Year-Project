cosnt express = require('express');
const router = express.Router();

const validateToken - require('../middleware/authMiddleware')
const userController = require('../controllers/userController');


router.post('/users/register', userController.register)
router.post('/users/login', userController.login)
