const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/order.controller");
const { protect } = require("../middleware/auth.middleware");
const { validate, createOrderSchema } = require("../utils/validators");

router.use(protect);

router.post("/",               validate(createOrderSchema), ctrl.createOrder);
router.get("/:id",             ctrl.getOrderById);
router.post("/:id/cancel",     ctrl.cancelOrder);
router.post("/verify-payment", ctrl.verifyPayment);

module.exports = router;
