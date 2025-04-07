// Import required modules
const express = require("express");
const { createServer } = require("http");
const { httpLogger, requestLogger, errorLogger, notFoundLogger } = require("./app/middleware/loggerMiddleware");
const { upload, handleUploadError, CONFIG } = require('./app/config/multerConfig'); // File upload configuration
const { initializeSocket } = require("./app/config/socketConfig");
require("dotenv").config();
const routes = require("./app/routes/route.js");
const cors = require("cors");
const path = require('path');
const fs = require('fs');
require('./app/scheduler')
// Initialize express app
const app = express();

// Apply logging middleware first to capture all requests
app.use(httpLogger);  // Morgan HTTP request logger
app.use(requestLogger); // Custom request logger with detailed info

// Apply other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Support for form data in uploads
app.use(cors({
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    origin: "*",
}));

// Set up uploads directory
const uploadsDir = CONFIG.uploadDir || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', (req, res, next) => {
    console.log(`Static file request: ${req.url}`);
    next();
}, express.static(uploadsDir));

// Register API routes
app.use("/api", routes);

// Handle 404 errors - add after all routes
app.use(notFoundLogger);

// Error handling middleware - must be the last middleware
app.use(errorLogger);

// Handle uncaught exceptions and promise rejections
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Graceful shutdown would be implemented here in production
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Graceful shutdown would be implemented here in production
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);

// Start the server
httpServer.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

