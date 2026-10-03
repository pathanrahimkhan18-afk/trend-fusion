// ════════════════════════════════════════════════════════
//  routes/auth.routes.js
// ════════════════════════════════════════════════════════
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { authRateLimiter } = require("../middleware/rateLimiter");
const { validate, registerSchema, loginSchema } = require("../utils/validators");

router.post("/register", authRateLimiter, validate(registerSchema), ctrl.register);
router.post("/login",    authRateLimiter, validate(loginSchema),    ctrl.login);
router.post("/refresh",  ctrl.refreshToken);
router.post("/logout",   protect, ctrl.logout);
router.get("/me",        protect, ctrl.getMe);

module.exports = router;
