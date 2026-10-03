const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const { AppError, successResponse } = require("../utils/response.utils");

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// ─── GET /api/cart ────────────────────────────────────
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product",
      "name images price totalStock isActive slug"
    );

    if (!cart) {
      return successResponse(res, { data: { cart: { items: [], totalItems: 0, totalPrice: 0 } } });
    }

    // Filter out items where product no longer active
    cart.items = cart.items.filter((item) => item.product?.isActive);

    successResponse(res, { data: { cart } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/cart ───────────────────────────────────
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, size, color } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError("Product not found or unavailable.", 404));
    }
    if (product.totalStock < quantity) {
      return next(new AppError(`Only ${product.totalStock} units in stock.`, 400));
    }

    const cart = await getOrCreateCart(req.user._id);

    // Check if same product+size+color exists
    const existingIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > 10) return next(new AppError("Cannot add more than 10 of the same item.", 400));
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity, size, color, price: product.price });
    }

    await cart.save();
    await cart.populate("items.product", "name images price totalStock slug");

    successResponse(res, {
      statusCode: 201,
      message: "Item added to cart",
      data: { cart },
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/cart/:itemId ────────────────────────────
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return next(new AppError("Cart not found.", 404));

    const item = cart.items.id(req.params.itemId);
    if (!item) return next(new AppError("Cart item not found.", 404));

    // Validate stock
    const product = await Product.findById(item.product);
    if (product && product.totalStock < quantity) {
      return next(new AppError(`Only ${product.totalStock} units available.`, 400));
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product", "name images price totalStock slug");

    successResponse(res, { message: "Cart updated", data: { cart } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/cart/:itemId ─────────────────────────
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return next(new AppError("Cart not found.", 404));

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.itemId
    );
    await cart.save();

    successResponse(res, { message: "Item removed from cart", data: { cart } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/cart ─────────────────────────────────
exports.clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalItems: 0, totalPrice: 0 }
    );
    successResponse(res, { message: "Cart cleared" });
  } catch (error) {
    next(error);
  }
};
