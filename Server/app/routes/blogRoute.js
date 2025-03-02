const express = require('express');
const router = express.Router();

// validateToken is used to validated user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const blogController = require('../controllers/blogController');

// Route to add a new blog post (protected)
router.post('/addBlog', validateToken, blogController.addBlog);

// Route to get blogs for the user feed (protected)
router.get('/getBlogs', validateToken, blogController.getBlogs);

// Route to edit an existing blog post (protected)
router.put('/editBlog/:blog_id', validateToken, blogController.editBlog);

// Route to delete a blog post (protected)
router.delete('/deleteBlog/:blog_id', validateToken, blogController.deleteBlog);

// Route to get user's own blogs (protected)
router.get('/getUserBlogs', validateToken, blogController.getUserBlogs);

// Export the router
module.exports = router;