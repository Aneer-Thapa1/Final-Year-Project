const express = require('express');
const userRoute = require('./userRoute');
const habitRoute = require('./habitRoute');
const blogRoute = require('./blogRoute');
const chatbotRoute = require('./chatbotRoute');
const domainRoute = require('./domainRoute');
const friendshipRoute = require('./friendshipRoute');
const chatRoute = require('./chatRoute');
const leaderboardRoute = require('./leaderboardRoute');
const recommendationRoute = require('./recommendationRoute');

const router = express.Router();

// routes related to users (/api/users/)
router.use('/users', userRoute)

// routes related to habit (/api/habit)
router.use('/habit', habitRoute)

// routes related to blog (/api/blog)
router.use('/blog', blogRoute)

// routes related to blog (/api/blog)
router.use('/chatbot', chatbotRoute)

// routes related to blog (/api/blog)
router.use('/chat', chatRoute)

// routes related to domain (/api/domain)
router.use('/domain', domainRoute)

// routes related to friends (/api/friends)
router.use('/friends', friendshipRoute)

// routes related to leaderboard (/api/leaderboard)
router.use('/leaderboard', leaderboardRoute)

// routes related to leaderboard (/api/leaderboard)
router.use('/recommendation', recommendationRoute)

module.exports = router;
