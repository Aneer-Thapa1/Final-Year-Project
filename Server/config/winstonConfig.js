const winston = require("winston");

const logger = winston.createLogger({
  // Minimum level of messages to log
  level: "info",

  // Log format
  format: winston.format.json(),

  // Default metadata to include
  defaultMeta: { service: "user-service" },
  transports: [
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ filename: "combined.log" }),
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ filename: "error.log", level: "error" }),
  ],
});

// If we're not in production, log to the `console` as well
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}
