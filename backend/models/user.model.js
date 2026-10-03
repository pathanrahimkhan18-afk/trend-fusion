const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never returned in queries
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please provide a valid Indian phone number"],
    },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    addresses: [addressSchema],
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    dateOfBirth: { type: Date },

    // ─── Account Status ──────────────────────────────
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String },
    blockedAt: { type: Date },

    // ─── Soft Delete ─────────────────────────────────
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // ─── Auth Tokens ─────────────────────────────────
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // ─── Timestamps ──────────────────────────────────
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isDeleted: 1, isBlocked: 1 });

// ─── Virtual: Full Profile ────────────────────────────
userSchema.virtual("profileComplete").get(function () {
  return !!(this.name && this.email && this.phone && this.addresses?.length);
});

// ─── Pre-save: Hash Password ──────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = Date.now();
  next();
});

// ─── Method: Compare Password ─────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: Check if password changed after token ────
userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIssuedAt < changedTimestamp;
  }
  return false;
};

// ─── Query Middleware: Exclude Deleted ────────────────
userSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
