const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/product.controller");
const { protect } = require("../middleware/auth.middleware");

// Public
router.get("/",          ctrl.getProducts);
router.get("/slug/:slug", ctrl.getProductBySlug);
router.get("/:id",       ctrl.getProductById);

// Authenticated
router.post("/:id/reviews", protect, ctrl.addReview);

module.exports = router;
