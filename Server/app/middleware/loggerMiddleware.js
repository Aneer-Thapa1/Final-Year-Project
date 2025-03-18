// loggerMiddleware.js
const logger = require('../config/winstonConfig');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Generate a unique request ID
const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

// Create a Morgan token for request ID
morgan.token('request-id', (req) => req.requestId);

// Create a Morgan token for response time
morgan.token('response-time-ms', (req, res) => {
    if (!req.startTime) return '';
    return Date.now() - req.startTime;
});

// Create custom Morgan format
const morganFormat = ':request-id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Setup Morgan with Winston
const httpLogger = morgan(morganFormat, {
    stream: {
        write: (message) => logger.http(message.trim())
    }
});

// Middleware to assign request ID and start time
const requestLogger = (req, res, next) => {
    // Generate and attach request ID
    req.requestId = generateRequestId();

    // Capture request start time
    req.startTime = Date.now();

    // Log request details
    logger.info('Incoming Request', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Log response after it's sent
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        logger.info('Request Completed', {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
};

// Middleware to log errors
const errorLogger = (err, req, res, next) => {
    // Ensure request ID exists
    req.requestId = req.requestId || generateRequestId();

    logger.error('Error Occurred', {
        requestId: req.requestId,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
        request: {
            method: req.method,
            url: req.url,
            path: req.path,
            params: req.params,
            query: req.query,
            body: req.body,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        },
        timestamp: new Date().toISOString(),
    });

    // Handle different types of errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: err.message,
            requestId: req.requestId,
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            details: err.message,
            requestId: req.requestId,
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message,
        requestId: req.requestId,
    });
};

// Middleware to handle 404 errors
const notFoundLogger = (req, res) => {
    // Ensure request ID exists
    req.requestId = req.requestId || generateRequestId();

    logger.warn('Resource Not Found', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
    });

    res.status(404).json({
        success: false,
        error: 'Resource not found',
        requestId: req.requestId,
    });
};

module.exports = {
    httpLogger,
    requestLogger,
    errorLogger,
    notFoundLogger
};