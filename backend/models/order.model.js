const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },          // snapshot at order time
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  size: { type: String },
  color: { type: String },
});

const trackingSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String },
  location: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: "India" },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      // auto-generated in pre-save
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: [(arr) => arr.length > 0, "Order must have at least one item"],
    },
    shippingAddress: { type: shippingAddressSchema, required: true },

    // ─── Pricing ──────────────────────────────────────
    subtotal: { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // ─── Order Status ─────────────────────────────────
    status: {
      type: String,
      enum: [
        "pending",        // order placed, payment pending
        "confirmed",      // payment confirmed
        "processing",     // being prepared
        "shipped",        // dispatched
        "out_for_delivery",
        "delivered",
        "cancelled",
        "return_requested",
        "returned",
        "refunded",
      ],
      default: "pending",
    },

    // ─── Payment ──────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "cod", "wallet"],
      default: "razorpay",
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // ─── Tracking ─────────────────────────────────────
    trackingHistory: [trackingSchema],
    trackingNumber: { type: String },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },

    // ─── Notes ────────────────────────────────────────
    customerNote: { type: String, maxlength: 500 },
    adminNote: { type: String },

    // ─── Cancellation ────────────────────────────────
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    cancelledBy: { type: String, enum: ["user", "admin"] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ paymentStatus: 1 });

// ─── Auto-generate Order Number ──────────────────────
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `TF-${timestamp}-${random}`;
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
