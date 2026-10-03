const Wishlist = require("../models/wishlist.model");
const Product = require("../models/product.model");
const { AppError, successResponse } = require("../utils/response.utils");

// ─── GET /api/wishlist ────────────────────────────────
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      "products",
      "name images price averageRating slug totalStock isActive"
    );

    if (!wishlist) {
      return successResponse(res, { data: { wishlist: { products: [] } } });
    }
    successResponse(res, { data: { wishlist } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/wishlist/:productId ────────────────────
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return next(new AppError("Product not found.", 404));

    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [productId] });
    } else {
      if (wishlist.products.includes(productId)) {
        return successResponse(res, { message: "Already in wishlist" });
      }
      wishlist.products.push(productId);
      await wishlist.save();
    }

    successResponse(res, { statusCode: 201, message: "Added to wishlist" });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/wishlist/:productId ──────────────────
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) return next(new AppError("Wishlist not found.", 404));

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== req.params.productId
    );
    await wishlist.save();

    successResponse(res, { message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/wishlist ─────────────────────────────
exports.clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate({ user: req.user._id }, { products: [] });
    successResponse(res, { message: "Wishlist cleared" });
  } catch (error) {
    next(error);
  }
};
