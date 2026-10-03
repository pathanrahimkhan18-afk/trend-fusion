const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

const globalRateLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  "Too many requests, please try again later."
);

const authRateLimiter = createLimiter(
  15 * 60 * 1000,
  parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  "Too many login attempts. Please try again in 15 minutes."
);

const paymentRateLimiter = createLimiter(
  60 * 60 * 1000,
  30,
  "Too many payment requests. Please try again later."
);

module.exports = { globalRateLimiter, authRateLimiter, paymentRateLimiter };
