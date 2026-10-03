const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [10, "Cannot add more than 10 of the same item"],
      default: 1,
    },
    size: { type: String, trim: true },
    color: { type: String, trim: true },
    price: { type: Number, required: true }, // price at time of adding
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: [cartItemSchema],
    // Computed totals (updated on every save)
    totalItems: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    appliedCoupon: { type: String },
    discountAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Pre-save: Compute Totals ─────────────────────────
cartSchema.pre("save", function (next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  next();
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
