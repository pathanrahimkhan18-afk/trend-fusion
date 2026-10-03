const User = require("../models/user.model");
const Order = require("../models/order.model");
const { AppError, successResponse } = require("../utils/response.utils");
const { deleteCloudinaryImage } = require("../config/cloudinary");

// ─── GET /api/users/profile ───────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    successResponse(res, { message: "Profile fetched", data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/profile ───────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, gender, dateOfBirth } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (gender) update.gender = gender;
    if (dateOfBirth) update.dateOfBirth = dateOfBirth;

    const user = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
      runValidators: true,
    });

    successResponse(res, { message: "Profile updated successfully", data: { user } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/avatar ────────────────────────────
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError("Please upload an image.", 400));

    const user = await User.findById(req.user._id);

    // Delete old avatar from Cloudinary
    if (user.avatar?.publicId) {
      await deleteCloudinaryImage(user.avatar.publicId);
    }

    user.avatar = {
      url: req.file.path,
      publicId: req.file.filename,
    };
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "Avatar updated", data: { avatar: user.avatar } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/change-password ──────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError("Current password is incorrect.", 401));
    }

    user.password = newPassword;
    await user.save();

    successResponse(res, { message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/addresses ─────────────────────────
exports.getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("addresses");
    successResponse(res, { data: { addresses: user.addresses } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/users/addresses ────────────────────────
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.addresses.length >= 5) {
      return next(new AppError("Maximum 5 addresses allowed.", 400));
    }

    // If new address is default, unset others
    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(req.body);
    await user.save({ validateBeforeSave: false });

    successResponse(res, {
      statusCode: 201,
      message: "Address added",
      data: { addresses: user.addresses },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/users/addresses/:id ────────────────────
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.id);

    if (!address) return next(new AppError("Address not found.", 404));

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    Object.assign(address, req.body);
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "Address updated", data: { addresses: user.addresses } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/users/addresses/:id ─────────────────
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.id
    );
    await user.save({ validateBeforeSave: false });

    successResponse(res, { message: "Address removed", data: { addresses: user.addresses } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/orders ────────────────────────────
exports.getOrderHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .populate("items.product", "name images slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: req.user._id }),
    ]);

    successResponse(res, {
      data: { orders },
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/users/orders/:id ────────────────────────
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("items.product", "name images slug").populate("payment");

    if (!order) return next(new AppError("Order not found.", 404));

    successResponse(res, { data: { order } });
  } catch (error) {
    next(error);
  }
};
