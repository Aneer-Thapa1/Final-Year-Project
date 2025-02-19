const express = require('express');
const router = express.Router();

// validateToken is used to validated user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const blogController = require('../controllers/blogController')