const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/wishlist.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/",                      ctrl.getWishlist);
router.post("/:productId",           ctrl.addToWishlist);
router.delete("/",                   ctrl.clearWishlist);
router.delete("/:productId",         ctrl.removeFromWishlist);

module.exports = router;
