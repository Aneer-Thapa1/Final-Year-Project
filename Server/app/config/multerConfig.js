/**
 * File Upload Middleware Configuration
 * This module provides a robust file upload solution using Multer with:
 * - Configurable file types and size limits
 * - Secure filename generation
 * - Comprehensive error handling
 * - Detailed logging
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration options (can be moved to environment variables)
const CONFIG = {
    maxFileSize: 30 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadDir: path.join(__dirname, '..', 'uploads'),
    fileRetentionDays: 30 // How long to keep files before cleanup
};

/**
 * Ensures the uploads directory exists
 * @returns {string} Path to the uploads directory
 */
const ensureUploadsDirectory = () => {
    if (!fs.existsSync(CONFIG.uploadDir)) {
        console.log(`Creating uploads directory at: ${CONFIG.uploadDir}`);
        fs.mkdirSync(CONFIG.uploadDir, { recursive: true });
    }
    return CONFIG.uploadDir;
};

/**
 * Sanitizes a filename to prevent security issues
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
    // Remove any path components and special characters, keeping only alphanumeric, dots, hyphens and underscores
    return filename.replace(/[^\w.-]/gi, '');
};

/**
 * Generates a secure unique filename
 * @param {string} originalFilename - Original filename to preserve extension
 * @returns {string} Unique filename with original extension
 */
const generateUniqueFilename = (originalFilename) => {
    const sanitized = sanitizeFilename(path.basename(originalFilename));
    const extension = path.extname(sanitized);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');

    return `${timestamp}-${randomString}${extension}`;
};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = ensureUploadsDirectory();
        console.log(`File destination directory: ${uploadDir}`);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const filename = generateUniqueFilename(file.originalname);
        console.log(`Original filename: ${file.originalname} -> Generated: ${filename}`);
        cb(null, filename);
    }
});

// File filter with improved validation and logging
const fileFilter = (req, file, cb) => {
    console.log(`Validating file: ${file.originalname}, mimetype: ${file.mimetype}`);

    if (CONFIG.allowedFileTypes.includes(file.mimetype)) {
        console.log('✓ File type is allowed');
        cb(null, true);
    } else {
        console.log(`✗ File type rejected: ${file.mimetype}`);
        cb(new Error(
            `Invalid file type: ${file.mimetype}. Allowed types: ${CONFIG.allowedFileTypes.join(', ')}`
        ), false);
    }
};

// Create multer instance with configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: CONFIG.maxFileSize
    }
});

/**
 * Error handler middleware for Multer errors
 * Provides detailed error messages based on the type of error
 */
const handleUploadError = (err, req, res, next) => {
    if (!err) {
        return next();
    }

    console.error('File upload error:', err);

    // Handle Multer-specific errors
    if (err instanceof multer.MulterError) {
        const errorMessage = getMulterErrorMessage(err);
        return res.status(400).json({
            success: false,
            code: err.code,
            message: errorMessage
        });
    }

    // Handle custom or other errors
    return res.status(400).json({
        success: false,
        message: err.message || 'Unknown file upload error'
    });
};

/**
 * Get user-friendly error messages for Multer errors
 * @param {Error} err - Multer error object
 * @returns {string} User-friendly error message
 */
const getMulterErrorMessage = (err) => {
    switch (err.code) {
        case 'LIMIT_FILE_SIZE':
            return `File is too large. Maximum size is ${CONFIG.maxFileSize / (1024 * 1024)}MB.`;
        case 'LIMIT_UNEXPECTED_FILE':
            return 'Too many files or incorrect field name.';
        case 'LIMIT_PART_COUNT':
            return 'Too many parts in the multipart form.';
        case 'LIMIT_FILE_COUNT':
            return 'Too many files uploaded.';
        default:
            return `Upload error: ${err.message}`;
    }
};

/**
 * Cleans up old uploaded files based on retention policy
 * Can be called periodically via a cron job
 */
const cleanupOldUploads = () => {
    const uploadDir = CONFIG.uploadDir;

    if (!fs.existsSync(uploadDir)) {
        console.log('Upload directory does not exist, nothing to clean');
        return;
    }

    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - CONFIG.fileRetentionDays));
    let cleanedCount = 0;

    console.log(`Cleaning files older than ${CONFIG.fileRetentionDays} days from ${uploadDir}`);

    fs.readdirSync(uploadDir).forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(`Cleaned old file: ${file}`);
        }
    });

    console.log(`Cleanup complete. Removed ${cleanedCount} files.`);
};

module.exports = {
    upload,
    handleUploadError,
    cleanupOldUploads,
    CONFIG
};