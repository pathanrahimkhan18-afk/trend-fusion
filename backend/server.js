require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDB } = require("./config/db");
const { globalRateLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// ─── Route Imports ────────────────────────────────────
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const cartRoutes = require("./routes/cart.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// ─── Connect Database ─────────────────────────────────
connectDB();

// ─── Security Middleware ──────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true)
  },
  credentials: true
}))
app.use(globalRateLimiter);

// ─── Body Parsing ─────────────────────────────────────
// Webhook route needs raw body for signature verification
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Request Logging ──────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ─── Health Check ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Trend Fusion API is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve Frontend Static Files ─────────────────────
app.use(express.static(path.join(__dirname, "../frontend")));

// ─── API Routes ───────────────────────────────────────
const API = "/api";
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/cart`, cartRoutes);
app.use(`${API}/wishlist`, wishlistRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/admin`, adminRoutes);

// ─── 404 Handler ──────────────────────────────────────
app.use("*", (req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    return res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Trend Fusion server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// ─── Graceful Shutdown ────────────────────────────────
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
