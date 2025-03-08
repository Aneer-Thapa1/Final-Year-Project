const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory at: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Log the destination directory
        console.log(`Destination directory: ${uploadsDir}`);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueName + path.extname(file.originalname);
        console.log(`Generated filename: ${filename}`);
        cb(null, filename);
    }
});

// File filter with improved logging
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    console.log(`Received file: ${file.originalname}, mimetype: ${file.mimetype}`);

    if (allowedTypes.includes(file.mimetype)) {
        console.log('File type is allowed');
        cb(null, true);
    } else {
        console.log('File type is not allowed');
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images and PDFs are allowed.`), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Error handler middleware with improved logging
const handleUploadError = (err, req, res, next) => {
    if (err) {
        console.error('Multer error:', err);

        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        }

        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
};

module.exports = {
    upload,
    handleUploadError
};