const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8+ handles these options internally
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected successfully");
    });

    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
};

module.exports = { connectDB, disconnectDB };
