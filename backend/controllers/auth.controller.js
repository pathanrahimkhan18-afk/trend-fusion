const User = require("../models/user.model");
const { sendTokenResponse, verifyToken, generateAccessToken, buildTokenPayload } = require("../utils/jwt.utils");
const { AppError, successResponse } = require("../utils/response.utils");

// ─── POST /api/auth/register ──────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email }).setOptions({ includeDeleted: true });
    if (existingUser) {
      return next(new AppError("An account with this email already exists.", 409));
    }

    const user = await User.create({ name, email, password, phone });

    sendTokenResponse(user, 201, res, "Account created successfully");
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/login ─────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Invalid email or password.", 401));
    }

    if (user.isBlocked) {
      return next(new AppError(`Account blocked: ${user.blockedReason || "contact support"}`, 403));
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res, "Logged in successfully");
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/refresh ───────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return next(new AppError("Refresh token not provided.", 401));

    let decoded;
    try {
      decoded = verifyToken(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(new AppError("Invalid or expired refresh token.", 401));
    }

    const user = await User.findById(decoded.id);
    if (!user || user.isDeleted || user.isBlocked) {
      return next(new AppError("User not found or inactive.", 401));
    }

    const accessToken = generateAccessToken(buildTokenPayload(user));

    successResponse(res, {
      message: "Token refreshed",
      data: { accessToken, tokenType: "Bearer" },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/auth/logout ────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie("refreshToken");
  successResponse(res, { message: "Logged out successfully" });
};

// ─── GET /api/auth/me ─────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, { message: "Profile fetched", data: { user } });
  } catch (error) {
    next(error);
  }
};
