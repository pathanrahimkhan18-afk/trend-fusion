const { verifyToken } = require("../utils/jwt.utils");
const { AppError } = require("../utils/response.utils");
const User = require("../models/user.model");

/**
 * Protect routes — requires valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError("You are not logged in. Please log in to access this resource.", 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new AppError("Your session has expired. Please log in again.", 401));
      }
      return next(new AppError("Invalid token. Please log in again.", 401));
    }

    // Fetch fresh user from DB
    const user = await User.findById(decoded.id).select("+passwordChangedAt");

    if (!user) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    if (user.isDeleted) {
      return next(new AppError("This account has been deleted.", 401));
    }

    if (user.isBlocked) {
      return next(new AppError(`Your account has been blocked. Reason: ${user.blockedReason || "Policy violation"}`, 403));
    }

    // Check if password changed after token was issued
    if (user.passwordChangedAfter(decoded.iat)) {
      return next(new AppError("Password recently changed. Please log in again.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth — attaches user if token present, continues anyway
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (user && !user.isDeleted && !user.isBlocked) req.user = user;
  } catch {
    // silently fail — route doesn't require auth
  }
  next();
};

module.exports = { protect, optionalAuth };
