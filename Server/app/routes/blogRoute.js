const express = require('express');
const router = express.Router();

// validateToken is used to validate user if they are authenticated or not
const validateToken = require('../middleware/authMiddleware');
const blogController = require('../controllers/blogController');
const { upload, handleUploadError } = require('../config/multerConfig');

// Route to add a new blog post with image upload (protected)
router.post('/addBlog', validateToken, upload.single('image'), handleUploadError, blogController.addBlog);

// Route to edit a blog post, supporting image update (protected)
router.put('/editBlog/:blog_id', validateToken, upload.single('image'), handleUploadError, blogController.editBlog);

// Route to get blogs for the user feed (protected)
router.get('/getBlogs', validateToken, blogController.getBlogs);

// Route to delete a blog post (protected)
router.delete('/deleteBlog/:blog_id', validateToken, blogController.deleteBlog);

// Route to get user's own blogs (protected)
router.get('/getUserBlogs', validateToken, blogController.getUserBlogs);

// Route to toggle like status on a blog (protected)
router.post('/toggleLike/:blog_id', validateToken, blogController.toggleLikeBlog);

// Route to get detailed blog information with comments (protected)
router.get('/getBlogDetails/:blog_id', validateToken, blogController.getBlogDetails);

// Route to add a comment to a blog (protected)
router.post('/addComment/:blog_id', validateToken, blogController.addComment);

// Route to get trending blogs (protected)
router.get('/trending', validateToken, blogController.getTrendingBlogs);

// Route to get all categories (protected)
router.get('/categories', validateToken, blogController.getCategories);

// Export the router
module.exports = router;