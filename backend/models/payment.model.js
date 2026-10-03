const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

    // ─── Razorpay Fields ──────────────────────────────
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    razorpaySignature: { type: String },

    // ─── Amount ───────────────────────────────────────
    amount: { type: Number, required: true },       // in paise (INR × 100)
    currency: { type: String, default: "INR" },

    // ─── Status ───────────────────────────────────────
    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed", "refunded"],
      default: "created",
    },

    // ─── Refund ───────────────────────────────────────
    refundId: { type: String },
    refundAmount: { type: Number },
    refundedAt: { type: Date },

    // ─── Webhook ──────────────────────────────────────
    webhookPayload: { type: mongoose.Schema.Types.Mixed },
    webhookVerified: { type: Boolean, default: false },

    // ─── Method ───────────────────────────────────────
    method: { type: String },    // card, upi, netbanking, wallet
    bank: { type: String },
    wallet: { type: String },
    vpa: { type: String },       // UPI VPA
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
