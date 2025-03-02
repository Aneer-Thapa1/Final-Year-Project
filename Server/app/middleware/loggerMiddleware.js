// // loggerMiddleware.js
// const logger = require('../config/winstonConfig.js');
//
// // Generate a unique request ID
// const generateRequestId = () => {
//     return Math.random().toString(36).substring(2, 15) +
//         Math.random().toString(36).substring(2, 15);
// };
//
// // Middleware to log each incoming request
// const requestLogger = (req, res, next) => {
//     // Generate and attach request ID
//     req.requestId = generateRequestId();
//
//     // Capture request start time
//     req.startTime = Date.now();
//
//     // Log the incoming request
//     logger.info('Incoming Request', {
//         requestId: req.requestId,
//         method: req.method,
//         url: req.url,
//         path: req.path,
//         params: req.params,
//         query: req.query,
//         ip: req.ip,
//         userAgent: req.get('user-agent'),
//         headers: req.headers,
//     });
//
//     // Log response after it's sent
//     res.on('finish', () => {
//         const duration = Date.now() - req.startTime;
//         logger.info('Request Completed', {
//             requestId: req.requestId,
//             method: req.method,
//             url: req.url,
//             status: res.statusCode,
//             duration: `${duration}ms`,
//         });
//     });
//
//     next();
// };
//
// // Middleware to log errors
// const errorLogger = (err, req, res, next) => {
//     logger.error('Error Occurred', {
//         requestId: req.requestId,
//         error: {
//             name: err.name,
//             message: err.message,
//             stack: err.stack,
//         },
//         request: {
//             method: req.method,
//             url: req.url,
//             path: req.path,
//             params: req.params,
//             query: req.query,
//             body: req.body,
//             ip: req.ip,
//             userAgent: req.get('user-agent'),
//         },
//         timestamp: new Date().toISOString(),
//     });
//
//     // Handle different types of errors
//     if (err.name === 'ValidationError') {
//         return res.status(400).json({
//             error: 'Validation Error',
//             details: err.message,
//             requestId: req.requestId,
//         });
//     }
//
//     if (err.name === 'UnauthorizedError') {
//         return res.status(401).json({
//             error: 'Unauthorized',
//             details: err.message,
//             requestId: req.requestId,
//         });
//     }
//
//     // Default error response
//     res.status(err.status || 500).json({
//         error: process.env.NODE_ENV === 'production'
//             ? 'Internal Server Error'
//             : err.message,
//         requestId: req.requestId,
//     });
// };
//
// // Middleware to handle 404 errors
// const notFoundLogger = (req, res, next) => {
//     logger.warn('Resource Not Found', {
//         requestId: req.requestId,
//         method: req.method,
//         url: req.url,
//         ip: req.ip,
//     });
//
//     res.status(404).json({
//         error: 'Resource not found',
//         requestId: req.requestId,
//     });
// };
//
// module.exports = { requestLogger, errorLogger, notFoundLogger };