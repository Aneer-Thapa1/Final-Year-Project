const winston = require("winston");
const path = require("path");

// Define log file paths
const logDir = path.join(__dirname, "../../logs");
const combinedLogPath = path.join(logDir, "combined.log");
const errorLogPath = path.join(logDir, "error.log");

// Create custom format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "api-service" },
  transports: [
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ filename: errorLogPath, level: "error" }),
    new winston.transports.File({ filename: combinedLogPath }),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false
});

// If we're not in production, also log to the console with a simpler format
if (process.env.NODE_ENV !== "production") {
  logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
      })
  );
}

module.exports = logger;