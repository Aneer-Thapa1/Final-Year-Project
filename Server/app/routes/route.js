const express = require('express');
const userRoute = require('./userRoute');
const habitRoute = require('./habitRoute');
const blogRoute = require('./blogRoute');

const router = express.Router();

// routes related to users (/api/users/)
router.use('/users', userRoute)

// routes related to habit (/api/habit)
router.use('/habit', habitRoute)

// routes related to blog (/api/blog)
router.use('/blog', blogRoute)

module.exports = router;
