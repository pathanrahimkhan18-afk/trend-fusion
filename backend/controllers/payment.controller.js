const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const { AppError, successResponse } = require("../utils/response.utils");
const logger = require("../utils/logger");

// ─── POST /api/payments/create-order ─────────────────
// Call this after creating an order to get Razorpay order ID
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new AppError("Order not found.", 404));

    if (order.paymentStatus === "paid") {
      return next(new AppError("This order has already been paid.", 400));
    }

    // Create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    });

    // Save payment record
    const payment = await Payment.create({
      user: req.user._id,
      order: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      status: "created",
    });

    // Link payment to order
    order.payment = payment._id;
    await order.save({ validateBeforeSave: false });

    successResponse(res, {
      statusCode: 201,
      message: "Payment order created",
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderNumber: order.orderNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payments/verify ────────────────────────
// Called by client after successful Razorpay payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError("Payment verification failed. Invalid signature.", 400));
    }

    // 2. Update payment record
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return next(new AppError("Payment record not found.", 404));

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "captured";
    await payment.save();

    // 3. Update order status
    const order = await Order.findById(payment.order);
    if (order) {
      order.status = "confirmed";
      order.paymentStatus = "paid";
      order.trackingHistory.push({
        status: "confirmed",
        message: "Payment received. Order confirmed.",
      });
      await order.save({ validateBeforeSave: false });
    }

    successResponse(res, {
      message: "Payment verified successfully",
      data: { orderId: order?._id, orderNumber: order?.orderNumber },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/payments/webhook ───────────────────────
// Razorpay webhook — server-side event handling
exports.handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body) // raw body
      .digest("hex");

    if (signature !== expectedSig) {
      logger.warn("Invalid Razorpay webhook signature");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const payload = JSON.parse(req.body.toString());
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    logger.info(`Razorpay webhook received: ${event}`);

    switch (event) {
      case "payment.captured": {
        const payment = await Payment.findOne({
          razorpayOrderId: paymentEntity.order_id,
        });
        if (payment && payment.status !== "captured") {
          payment.status = "captured";
          payment.method = paymentEntity.method;
          payment.bank = paymentEntity.bank;
          payment.wallet = paymentEntity.wallet;
          payment.vpa = paymentEntity.vpa;
          payment.webhookPayload = paymentEntity;
          payment.webhookVerified = true;
          await payment.save();

          await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: "paid",
            status: "confirmed",
            $push: {
              trackingHistory: {
                status: "confirmed",
                message: "Payment captured via webhook",
              },
            },
          });
        }
        break;
      }

      case "payment.failed": {
        const payment = await Payment.findOne({
          razorpayOrderId: paymentEntity.order_id,
        });
        if (payment) {
          payment.status = "failed";
          payment.webhookPayload = paymentEntity;
          await payment.save();

          await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: "failed",
          });
        }
        break;
      }

      case "refund.created": {
        const refundEntity = payload.payload?.refund?.entity;
        const payment = await Payment.findOne({
          razorpayPaymentId: refundEntity.payment_id,
        });
        if (payment) {
          payment.refundId = refundEntity.id;
          payment.refundAmount = refundEntity.amount / 100;
          payment.refundedAt = new Date();
          payment.status = "refunded";
          await payment.save();

          await Order.findByIdAndUpdate(payment.order, {
            paymentStatus: "refunded",
            status: "refunded",
          });
        }
        break;
      }

      default:
        logger.info(`Unhandled Razorpay event: ${event}`);
    }

    // Acknowledge webhook
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

// ─── GET /api/payments/:orderId ───────────────────────
exports.getPaymentByOrder = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      order: req.params.orderId,
      user: req.user._id,
    });
    if (!payment) return next(new AppError("Payment record not found.", 404));

    successResponse(res, { data: { payment } });
  } catch (error) {
    next(error);
  }
};
