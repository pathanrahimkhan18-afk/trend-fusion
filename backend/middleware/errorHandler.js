const logger = require("../utils/logger");

const handleCastError = (err) => ({
  statusCode: 400,
  message: `Invalid ${err.path}: ${err.value}`,
});

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return { statusCode: 409, message: `${field} already exists. Please use a different value.` };
};

const handleValidationError = (err) => ({
  statusCode: 422,
  message: Object.values(err.errors).map((e) => e.message).join(". "),
});

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose errors
  if (err.name === "CastError") ({ statusCode, message } = handleCastError(err));
  if (err.code === 11000) ({ statusCode, message } = handleDuplicateKey(err));
  if (err.name === "ValidationError") ({ statusCode, message } = handleValidationError(err));
  if (err.name === "JsonWebTokenError") { statusCode = 401; message = "Invalid token."; }
  if (err.name === "TokenExpiredError") { statusCode = 401; message = "Token expired."; }
  if (err.name === "MulterError") { statusCode = 400; message = `Upload error: ${err.message}`; }

  // Log 5xx errors
  if (statusCode >= 500) logger.error(`[${req.method}] ${req.originalUrl} — ${err.stack}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
