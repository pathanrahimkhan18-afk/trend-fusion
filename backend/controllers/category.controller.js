const Category = require("../models/category.model");
const { AppError, successResponse } = require("../utils/response.utils");

// ─── GET /api/categories ──────────────────────────────
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate("parent", "name slug")
      .sort("sortOrder name");

    successResponse(res, { data: { categories } });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/categories/:slug ────────────────────────
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug }).populate("parent", "name slug");
    if (!category) return next(new AppError("Category not found.", 404));
    successResponse(res, { data: { category } });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/categories ───────────────────────
exports.createCategory = async (req, res, next) => {
  try {
    const image = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : undefined;

    const category = await Category.create({ ...req.body, ...(image && { image }) });
    successResponse(res, { statusCode: 201, message: "Category created", data: { category } });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/categories/:id ───────────────────
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) return next(new AppError("Category not found.", 404));
    successResponse(res, { message: "Category updated", data: { category } });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/categories/:id ────────────────
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return next(new AppError("Category not found.", 404));

    category.isDeleted = true;
    category.deletedAt = new Date();
    category.isActive = false;
    await category.save({ validateBeforeSave: false });

    successResponse(res, { message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};
