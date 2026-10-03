const Joi = require("joi");

// ─── Auth Validators ──────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.min": "Name must be at least 2 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain uppercase, lowercase, number and special character",
      "string.min": "Password must be at least 8 characters",
    }),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({
    "string.pattern.base": "Please provide a valid Indian phone number",
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── User Validators ──────────────────────────────────
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/),
  gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say"),
  dateOfBirth: Joi.date().max("now"),
});

const addressSchema = Joi.object({
  label: Joi.string().valid("Home", "Work", "Other").default("Home"),
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  postalCode: Joi.string().required(),
  country: Joi.string().default("India"),
  isDefault: Joi.boolean().default(false),
});

// ─── Product Validators ───────────────────────────────
const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(5000).required(),
  shortDescription: Joi.string().max(300),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(0),
  category: Joi.string().hex().length(24).required(),
  brand: Joi.string().max(100),
  tags: Joi.array().items(Joi.string()),
  // variants: Joi.array()
  //   .items(
  //     Joi.object({
  //       size: Joi.string(),
  //       color: Joi.string(),
  //       colorHex: Joi.string(),
  //       stock: Joi.number().min(0).required(),
  //       sku: Joi.string(),
  //     })
  //   )
  //   .min(1)
  //   .required(),
  variants: Joi.array()
  .items(
    Joi.object({
      size: Joi.string(),
      color: Joi.string(),
      colorHex: Joi.string(),
      stock: Joi.number().min(0).default(0),
      sku: Joi.string(),
    })
  )
  .optional(),
  material: Joi.string(),
  careInstructions: Joi.string(),
  gender: Joi.string().valid("men", "women", "unisex", "kids"),
  isFeatured: Joi.boolean(),
  isNewArrival: Joi.boolean(),
  'sizes[]': Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
});

const updateProductSchema = createProductSchema.fork(
  ["name", "description", "price", "category", "variants"],
  (schema) => schema.optional()
);

// ─── Category Validators ──────────────────────────────
const categorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(500),
  parent: Joi.string().hex().length(24).allow(null, ""),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean(),
});

// ─── Cart Validators ──────────────────────────────────
const cartItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  size: Joi.string(),
  color: Joi.string(),
});

const updateCartSchema = Joi.object({
  quantity: Joi.number().integer().min(1).max(10).required(),
});

// ─── Order Validators ─────────────────────────────────
const createOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default("India"),
  }).required(),
  paymentMethod: Joi.string().valid("razorpay", "cod").default("razorpay"),
  customerNote: Joi.string().max(500),
  useCartItems: Joi.boolean().default(true),
});

// ─── Validate helper ─────────────────────────────────
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join("."),
      message: d.message,
    }));
    return res.status(422).json({ success: false, message: "Validation failed", errors });
  }

  req.body = value;
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  addressSchema,
  createProductSchema,
  updateProductSchema,
  categorySchema,
  cartItemSchema,
  updateCartSchema,
  createOrderSchema,
};
