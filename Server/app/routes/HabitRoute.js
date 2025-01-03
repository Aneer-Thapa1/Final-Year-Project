const express = require('express');
const router = express.Router();

const validateToken = require('../middleware/authMiddleware');
const habitController = require('../controllers/habitController')


