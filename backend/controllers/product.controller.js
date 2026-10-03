const Product = require("../models/product.model");
const { AppError, successResponse, parsePagination, paginateMeta, parseSort } = require("../utils/response.utils");
const { deleteCloudinaryImage } = require("../config/cloudinary");

exports.getProducts = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ["price", "createdAt", "averageRating", "totalSold"]);
    const filter = { isActive: true };
    if (req.query.q) filter.$text = { $search: req.query.q };
    if (req.query.category) {
      const Category = require("../models/category.model");
      const cat = await Category.findOne({ name: req.query.category });
      filter.category = cat ? cat._id : null;
    }
    if (req.query.brand) filter.brand = new RegExp(req.query.brand, "i");
    if (req.query.gender) filter.gender = req.query.gender;
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }
    if (req.query.rating) filter.averageRating = { $gte: Number(req.query.rating) };
    if (req.query.featured === "true") filter.isFeatured = true;
    if (req.query.newArrival === "true") filter.isNewArrival = true;
    if (req.query.bestSeller === "true") filter.isBestSeller = true;
    if (req.query.inStock === "true") filter.totalStock = { $gt: 0 };

    const [products, total] = await Promise.all([
      Product.find(filter).populate("category", "name slug").sort(sort).skip(skip).limit(limit).select("-reviews"),
      Product.countDocuments(filter),
    ]);
    successResponse(res, { data: { products }, meta: paginateMeta({ total, page, limit }) });
  } catch (error) {
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate("category", "name slug")
      .populate("reviews.user", "name avatar");
    if (!product) return next(new AppError("Product not found.", 404));
    successResponse(res, { data: { product } });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("reviews.user", "name avatar");
    if (!product) return next(new AppError("Product not found.", 404));
    successResponse(res, { data: { product } });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    // Grab sizes[] BEFORE validator strips unknown fields from req.body
    // req.rawSizes is set by multer (before validate middleware runs)
    const rawSizes = req.rawSizes || req.body["sizes[]"] || [];

    // Only include images if Cloudinary actually processed them (path + filename present)
    const images = (req.files || [])
      .filter(file => file.path && file.filename)
      .map((file, index) => ({
        url: file.path,
        publicId: file.filename,
        alt: req.body.name || "",
        isPrimary: index === 0,
      }));

    const productData = { ...req.body, images };

    // Parse variants from JSON string if sent that way
    if (typeof productData.variants === "string") {
      try { productData.variants = JSON.parse(productData.variants); } catch (_) { productData.variants = []; }
    }

    // Auto-generate variants from sizes[] if none provided
    if (!productData.variants || productData.variants.length === 0) {
      let sizes = rawSizes;
      if (typeof sizes === 'string') sizes = [sizes];
      else if (!Array.isArray(sizes)) sizes = [];
      sizes = sizes.map(s => s.trim()).filter(Boolean);
      const prefix = (productData.name || "SKU").replace(/\s+/g, "-").substring(0, 5).toUpperCase();
      const ts = Date.now();
      if (sizes.length > 0) {
        productData.variants = sizes.map((size, i) => ({
          size,
          color: "Default",
          colorHex: "#000000",
          stock: 10,
          sku: `${prefix}-${size}-${ts}-${i}`,
        }));
      } else {
        productData.variants = [{
          size: "One Size",
          color: "Default",
          colorHex: "#000000",
          stock: 10,
          sku: `${prefix}-OS-${ts}`,
        }];
      }
    }

    // Parse tags
    if (typeof productData.tags === "string") {
      try { productData.tags = JSON.parse(productData.tags); } catch (_) { productData.tags = []; }
    }

    // Remove raw form fields not in schema
    delete productData["sizes[]"];

    const product = await Product.create(productData);
    await product.populate("category", "name slug");
    successResponse(res, { statusCode: 201, message: "Product created successfully", data: { product } });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).setOptions({ includeDeleted: false });
    if (!product) return next(new AppError("Product not found.", 404));

    // Only add new images if Cloudinary processed them
    if (req.files && req.files.length) {
      const newImages = req.files
        .filter(file => file.path && file.filename)
        .map((file, i) => ({
          url: file.path,
          publicId: file.filename,
          alt: req.body.name || "",
          isPrimary: i === 0 && !product.images.length,
        }));
      product.images.push(...newImages);
    }

    const updateFields = { ...req.body };
    if (typeof updateFields.variants === "string") {
      try { updateFields.variants = JSON.parse(updateFields.variants); } catch (_) { delete updateFields.variants; }
    }

    // Remove form-only fields
    delete updateFields["sizes[]"];

    Object.assign(product, updateFields);
    await product.save();
    await product.populate("category", "name slug");
    successResponse(res, { message: "Product updated", data: { product } });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError("Product not found.", 404));
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.isActive = false;
    await product.save({ validateBeforeSave: false });
    successResponse(res, { message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteProductImage = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError("Product not found.", 404));
    const image = product.images.id(req.params.imageId);
    if (!image) return next(new AppError("Image not found.", 404));
    try { await deleteCloudinaryImage(image.publicId); } catch (_) {}
    product.images = product.images.filter(img => img._id.toString() !== req.params.imageId);
    await product.save({ validateBeforeSave: false });
    successResponse(res, { message: "Image deleted", data: { images: product.images } });
  } catch (error) {
    next(error);
  }
};

exports.addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return next(new AppError("Product not found.", 404));
    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return next(new AppError("You have already reviewed this product.", 400));
    product.reviews.push({ user: req.user._id, rating, comment });
    product.updateRatingStats();
    await product.save({ validateBeforeSave: false });
    successResponse(res, {
      statusCode: 201,
      message: "Review added",
      data: { averageRating: product.averageRating, totalReviews: product.totalReviews },
    });
  } catch (error) {
    next(error);
  }
};
