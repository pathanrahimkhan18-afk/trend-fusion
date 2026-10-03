const { AppError } = require("../utils/response.utils");

/**
 * Restrict access to specific roles
 * Usage: restrictTo("admin") or restrictTo("admin", "manager")
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("You must be logged in to access this resource.", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
};

module.exports = { restrictTo };
