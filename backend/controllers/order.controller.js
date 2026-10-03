const crypto = require("crypto");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Payment = require("../models/payment.model");
const razorpay = require("../config/razorpay");
const { AppError, successResponse, parsePagination, paginateMeta } = require("../utils/response.utils");

// ─── POST /api/orders ─────────────────────────────────
// ✅ FIX: createOrder ab sirf order + razorpay order banata hai
//         Cart clear aur stock deduct NAHI karta — ye verifyPayment karega
exports.createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, customerNote } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    if (!cart || !cart.items.length) {
      return next(new AppError("Your cart is empty.", 400));
    }

    // Validate stock and build order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return next(new AppError(`Product "${item.product?.name || "unknown"}" is no longer available.`, 400));
      }
      if (product.totalStock < item.quantity) {
        return next(new AppError(`Insufficient stock for "${product.name}". Only ${product.totalStock} available.`, 400));
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || "",
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      });
    }

    // Compute pricing
    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
     const shippingCharge =subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + shippingCharge + tax;

    // ✅ COD flow — direct confirm kar do
    if (paymentMethod === "cod") {
      const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country || "India",
        },
        subtotal,
        shippingCharge,
        tax,
        totalAmount,
        paymentMethod: "cod",
        customerNote,
        status: "confirmed",
        paymentStatus: "pending",
        trackingHistory: [{ status: "confirmed", message: "Order placed successfully (COD)" }],
      });

      // COD me stock deduct aur cart clear immediately karo
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { totalStock: -item.quantity, totalSold: item.quantity },
        });
      }
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { items: [], totalItems: 0, totalPrice: 0 }
      );

      await order.populate("items.product", "name images");
      return successResponse(res, {
        statusCode: 201,
        message: "Order placed successfully",
        data: { order },
      });
    }

    // ✅ Online payment flow — sirf order create karo, cart/stock mat chhuao
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // paise me
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country || "India",
      },
      subtotal,
      shippingCharge,
      tax,
      totalAmount,
      paymentMethod: paymentMethod || "razorpay",
      customerNote,
      status: "pending",        // ✅ pending rakho jab tak payment verify na ho
      paymentStatus: "pending",
      razorpayOrderId: razorpayOrder.id,
      trackingHistory: [{ status: "pending", message: "Order initiated, awaiting payment" }],
    });

    // ✅ Cart aur stock is point pe NAHI chhuate — verifyPayment karega

    successResponse(res, {
      statusCode: 201,
      message: "Order created. Proceed to payment.",
      data: {
        order,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/orders/verify-payment ──────────────────
// ✅ NEW: Ye function payment verify karne ke baad cart clear + stock deduct karta hai
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return next(new AppError("Payment details incomplete.", 400));
    }

    // Signature verify karo — tamper protection
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError("Payment verification failed. Invalid signature.", 400));
    }

    // Order fetch karo
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new AppError("Order not found.", 404));

    if (order.paymentStatus === "paid") {
      return next(new AppError("Payment already verified.", 400));
    }

    // ✅ Ab stock deduct karo — payment confirm hone ke baad
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { totalStock: -item.quantity, totalSold: item.quantity },
      });
    }

    // ✅ Ab cart clear karo — payment confirm hone ke baad
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalItems: 0, totalPrice: 0 }
    );

    // Order status update karo
    order.paymentStatus = "paid";
    order.status = "confirmed";
    order.paidAt = new Date();
    order.trackingHistory.push({
      status: "confirmed",
      message: "Payment received successfully",
    });
    await order.save({ validateBeforeSave: false });

    // Payment record save karo
    await Payment.create({
      order: order._id,
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: order.totalAmount,
      status: "paid",
    });

    await order.populate("items.product", "name images");

    successResponse(res, {
      message: "Payment verified successfully",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/orders/:id ──────────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate("items.product", "name images slug")
      .populate("payment");

    if (!order) return next(new AppError("Order not found.", 404));

    successResponse(res, { data: { order } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/orders/:id/cancel ──────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return next(new AppError("Order not found.", 404));

    const cancellableStatuses = ["pending", "confirmed", "processing"];
    if (!cancellableStatuses.includes(order.status)) {
      return next(new AppError(`Order cannot be cancelled at this stage (${order.status}).`, 400));
    }

    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || "Cancelled by customer";
    order.cancelledBy = "user";
    order.trackingHistory.push({
      status: "cancelled",
      message: `Order cancelled: ${order.cancellationReason}`,
    });

    // ✅ Stock sirf tab restore karo jab payment ho chuki ho (paid orders me hi stock deducted tha)
    if (order.paymentStatus === "paid" || order.paymentMethod === "cod") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { totalStock: item.quantity, totalSold: -item.quantity },
        });
      }
    }

    // Razorpay refund if payment was made online
    if (order.paymentStatus === "paid" && order.paymentMethod !== "cod") {
      const payment = await Payment.findOne({ order: order._id });
      if (payment?.razorpayPaymentId) {
        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: Math.round(order.totalAmount * 100),
          notes: { reason: order.cancellationReason },
        });
        payment.status = "refunded";
        payment.refundId = refund.id;
        payment.refundAmount = order.totalAmount;
        payment.refundedAt = new Date();
        await payment.save();

        order.paymentStatus = "refunded";
      }
    }

    await order.save({ validateBeforeSave: false });

    successResponse(res, { message: "Order cancelled successfully", data: { order } });
  } catch (error) {
    next(error);
  }
};
