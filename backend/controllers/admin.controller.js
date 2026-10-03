const User = require("../models/user.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const Payment = require("../models/payment.model");
const { AppError, successResponse, parsePagination, paginateMeta } = require("../utils/response.utils");

// ════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════

// ─── GET /api/admin/dashboard ─────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      newUsersThisMonth,
      totalProducts,
      activeProducts,
      totalOrders,
      ordersThisMonth,
      revenueResult,
      revenueLastMonth,
      ordersByStatus,
      topProducts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),

      // Revenue this month
      Order.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Revenue last month
      Order.aggregate([
        { $match: { paymentStatus: "paid", createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Orders by status
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Top 5 best-selling products
      Product.find().sort({ totalSold: -1 }).limit(5).select("name totalSold price images"),
    ]);

    const revenueThisMonth = revenueResult[0]?.total || 0;
    const revenuePrevMonth = revenueLastMonth[0]?.total || 0;
    const revenueGrowth = revenuePrevMonth
      ? (((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100).toFixed(1)
      : 100;

    const statusMap = {};
    ordersByStatus.forEach((s) => (statusMap[s._id] = s.count));

    successResponse(res, {
      data: {
        users: { total: totalUsers, newThisMonth: newUsersThisMonth },
        products: { total: totalProducts, active: activeProducts },
        orders: {
          total: totalOrders,
          thisMonth: ordersThisMonth,
          byStatus: statusMap,
        },
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenuePrevMonth,
          growthPercent: Number(revenueGrowth),
        },
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/analytics/revenue ────────────────
exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;

    const revenueByMonth = await Order.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    successResponse(res, { data: { revenueByMonth } });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
//  USER MANAGEMENT
// ════════════════════════════════════════════════════════

// ─── GET /api/admin/users ─────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.role) filter.role = req.query.role;
    if (req.query.isBlocked === "true") filter.isBlocked = true;
    if (req.query.q) {
      filter.$or = [
        { name: new RegExp(req.query.q, "i") },
        { email: new RegExp(req.query.q, "i") },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    successResponse(res, {
      data: { users },
      meta: paginateMeta({ total, page, limit }),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/users/:id ─────────────────────────
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));
    successResponse(res, { data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/users/:id/block ───────────────────
exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));
    if (user.role === "admin") return next(new AppError("Cannot block an admin.", 403));

    user.isBlocked = true;
    user.blockedReason = req.body.reason || "Violation of terms";
    user.blockedAt = new Date();
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "User blocked successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/users/:id/unblock ────────────────
exports.unblockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));

    user.isBlocked = false;
    user.blockedReason = undefined;
    user.blockedAt = undefined;
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "User unblocked successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/users/:id (soft delete) ────────
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError("User not found.", 404));
    if (user.role === "admin") return next(new AppError("Cannot delete an admin.", 403));

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ════════════════════════════════════════════════════════
//  ORDER MANAGEMENT
// ════════════════════════════════════════════════════════

// ─── GET /api/admin/orders ────────────────────────────
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.q) filter.orderNumber = new RegExp(req.query.q, "i");

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email phone")
        .populate("payment")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    successResponse(res, {
      data: { orders },
      meta: paginateMeta({ total, page, limit }),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/orders/:id ────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name images");
    if (!order) return next(new AppError("Order not found.", 404));
    successResponse(res, { data: { order } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/orders/:id/status ────────────────
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, message, trackingNumber } = req.body;

    const validStatuses = [
      "confirmed", "processing", "shipped", "out_for_delivery",
      "delivered", "cancelled", "return_requested", "returned", "refunded",
    ];
    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid order status.", 400));
    }

    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError("Order not found.", 404));

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === "delivered") order.deliveredAt = new Date();

    order.trackingHistory.push({
      status,
      message: message || `Order status updated to ${status}`,
    });

    await order.save({ validateBeforeSave: false });

    successResponse(res, { message: "Order status updated", data: { order } });
  } catch (error) {
    next(error);
  }
};
