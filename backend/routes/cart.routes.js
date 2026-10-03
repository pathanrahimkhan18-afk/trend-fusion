const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");
const { validate, cartItemSchema, updateCartSchema } = require("../utils/validators");

router.use(protect);

router.get("/",                                     ctrl.getCart);
router.post("/",       validate(cartItemSchema),    ctrl.addToCart);
router.put("/:itemId", validate(updateCartSchema),  ctrl.updateCartItem);
router.delete("/",                                  ctrl.clearCart);
router.delete("/:itemId",                           ctrl.removeFromCart);

module.exports = router;
