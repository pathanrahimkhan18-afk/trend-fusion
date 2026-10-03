const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, trim: true },        // XS, S, M, L, XL, XXL
    color: { type: String, trim: true },
    colorHex: { type: String },
    stock: { type: Number,  min: 0, default: 0 },
    sku: { type: String, unique: true, sparse: true },
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: { type: String, unique: true, lowercase: true },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: { type: String, maxlength: [300, "Short description too long"] },

    // ─── Pricing ──────────────────────────────────────
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      // original price for showing discount
    },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },

    // ─── Category & Brand ─────────────────────────────
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: { type: String, trim: true },
    tags: [{ type: String, lowercase: true, trim: true }],

    // ─── Images ───────────────────────────────────────
    images: {
      type: [imageSchema],
      validate: [(arr) => arr.length <= 6, "Maximum 6 images allowed"],
    },

    // ─── Variants & Stock ─────────────────────────────
    variants: [variantSchema],
    totalStock: { type: Number, default: 0, min: 0 },  // computed field

    // ─── Product Status ───────────────────────────────
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },

    // ─── Soft Delete ──────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // ─── Reviews & Ratings ────────────────────────────
    reviews: [reviewSchema],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },

    // ─── SEO ──────────────────────────────────────────
    metaTitle: { type: String, maxlength: 70 },
    metaDescription: { type: String, maxlength: 160 },

    // ─── Product Details ──────────────────────────────
    material: { type: String },
    careInstructions: { type: String },
    gender: { type: String, enum: ["men", "women", "unisex", "kids"], default: "unisex" },
    ageGroup: { type: String, enum: ["adult", "teen", "kids", "all"], default: "adult" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────
productSchema.index({ name: "text", description: "text", brand: "text", tags: "text" });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ totalSold: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ isDeleted: 1, isActive: 1 });

// ─── Auto-generate slug ───────────────────────────────
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();
  }
  // Compute total stock from variants
  if (this.variants?.length) {
    this.totalStock = this.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  // Compute discount percentage
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    this.discountPercentage = Math.round(
      ((this.compareAtPrice - this.price) / this.compareAtPrice) * 100
    );
  }
  next();
});

// ─── Method: Update Rating ────────────────────────────
productSchema.methods.updateRatingStats = function () {
  if (!this.reviews.length) {
    this.averageRating = 0;
    this.totalReviews = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.averageRating = Math.round((total / this.reviews.length) * 10) / 10;
    this.totalReviews = this.reviews.length;
  }
};

// ─── Query Middleware: Exclude Deleted ────────────────
productSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
