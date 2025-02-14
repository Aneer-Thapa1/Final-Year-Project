const express = require('express');
const userRoute = require('./userRoute');
const habitRoute = require('./habitRoute');

const router = express.Router();

// routes related to users (/api/users/)
router.use('/users', userRoute)

// routes related to habit (/api/habit)
router.use('/habit', habitRoute)

module.exports = router;
