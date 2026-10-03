const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/admin.controller");
const productCtrl = require("../controllers/product.controller");
const categoryCtrl = require("../controllers/category.controller");
const { protect } = require("../middleware/auth.middleware");
const { restrictTo } = require("../middleware/role.middleware");
const { uploadProductImages, uploadAvatar } = require("../config/cloudinary");
const { validate, createProductSchema, updateProductSchema, categorySchema } = require("../utils/validators");

// All admin routes require auth + admin role
router.use(protect, restrictTo("admin"));

// ─── Dashboard ────────────────────────────────────────
router.get("/dashboard",             adminCtrl.getDashboardStats);
router.get("/analytics/revenue",     adminCtrl.getRevenueAnalytics);

// ─── User Management ──────────────────────────────────
router.get("/users",                 adminCtrl.getAllUsers);
router.get("/users/:id",             adminCtrl.getUserById);
router.put("/users/:id/block",       adminCtrl.blockUser);
router.put("/users/:id/unblock",     adminCtrl.unblockUser);
router.delete("/users/:id",          adminCtrl.deleteUser);

// ─── Product Management ───────────────────────────────
// captureSizes must run AFTER multer (req.body exists) but BEFORE validate (which strips sizes[])
const captureSizes = (req, res, next) => {
  req.rawSizes = req.body["sizes[]"] || [];
  next();
};

router.post(
  "/products",
  uploadProductImages.array("images", 6),
  captureSizes,
  validate(createProductSchema),
  productCtrl.createProduct
);
router.put(
  "/products/:id",
  uploadProductImages.array("images", 6),
  productCtrl.updateProduct
);
router.delete("/products/:id",              productCtrl.deleteProduct);
router.delete("/products/:id/images/:imageId", productCtrl.deleteProductImage);

// ─── Category Management ──────────────────────────────
router.post("/categories",   uploadAvatar.single("image"), validate(categorySchema), categoryCtrl.createCategory);
router.put("/categories/:id",  categoryCtrl.updateCategory);
router.delete("/categories/:id", categoryCtrl.deleteCategory);

// ─── Order Management ─────────────────────────────────
router.get("/orders",                adminCtrl.getAllOrders);
router.get("/orders/:id",   adminCtrl.getOrderById);
router.put("/orders/:id/status",     adminCtrl.updateOrderStatus);

module.exports = router;
