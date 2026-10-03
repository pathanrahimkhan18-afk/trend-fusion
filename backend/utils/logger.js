const winston = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    align(),
    logFormat
  ),
  transports: [
    // Console output (coloured in dev)
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/combined.log"),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, "../logs/exceptions.log"),
    }),
  ],
});

module.exports = logger;
