const jwt = require("jsonwebtoken");

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  });
};

/**
 * Verify token and return decoded payload
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  return jwt.verify(token, secret);
};

/**
 * Build token payload from user document
 */
const buildTokenPayload = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  name: user.name,
});

/**
 * Send token in response with cookie
 */
const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });

  // HTTP-only cookie for refresh token
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Remove password from output
  user.password = undefined;

  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      user,
      accessToken,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRE || "7d",
    },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  buildTokenPayload,
  sendTokenResponse,
};
