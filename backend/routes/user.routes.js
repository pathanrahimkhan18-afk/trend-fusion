const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../config/cloudinary");
const { validate, updateProfileSchema, addressSchema } = require("../utils/validators");

// All user routes are protected
router.use(protect);

router.get("/profile",                                    ctrl.getProfile);
router.put("/profile",  validate(updateProfileSchema),   ctrl.updateProfile);
router.put("/avatar",   uploadAvatar.single("avatar"),   ctrl.updateAvatar);
router.put("/change-password",                           ctrl.changePassword);

router.get("/addresses",           ctrl.getAddresses);
router.post("/addresses",          validate(addressSchema), ctrl.addAddress);
router.put("/addresses/:id",       ctrl.updateAddress);
router.delete("/addresses/:id",    ctrl.deleteAddress);

router.get("/orders",              ctrl.getOrderHistory);
router.get("/orders/:id",          ctrl.getOrderById);

module.exports = router;
