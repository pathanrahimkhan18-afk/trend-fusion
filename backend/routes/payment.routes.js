const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");
const { paymentRateLimiter } = require("../middleware/rateLimiter");

// Webhook uses raw body — must come before protect
router.post("/webhook", ctrl.handleWebhook);

router.use(protect);

router.post("/create-order",   paymentRateLimiter, ctrl.createRazorpayOrder);
router.post("/verify",         ctrl.verifyPayment);
router.get("/:orderId",        ctrl.getPaymentByOrder);

module.exports = router;
