const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const blogController = require('../controllers/commentController');

// Route to add a comment to a blog (protected)
router.post('/addComment/:blog_id', validateToken, blogController.addComment);

// Route to get all comments for a blog (public)
router.get('/:blog_id', blogController.getComments);

// Route to update a comment (protected)
router.put('/:comment_id', validateToken, blogController.updateComment);

// Route to delete a comment (protected)
router.delete('/:comment_id', validateToken, blogController.deleteComment);

// Route to toggle like on a blog (protected)
router.post('/toggleLike/:blog_id', validateToken, blogController.toggleLike);

module.exports = router;