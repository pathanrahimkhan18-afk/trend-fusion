/**
 * Standard success response
 */
const successResponse = (res, { statusCode = 200, message = "Success", data = null, meta = null }) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

/**
 * Standard error response
 */
const errorResponse = (res, { statusCode = 500, message = "Internal Server Error", errors = null }) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Build pagination meta from query results
 */
const paginateMeta = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse pagination params from request query
 */
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(
    parseInt(query.limit) || parseInt(process.env.DEFAULT_PAGE_SIZE) || 12,
    parseInt(process.env.MAX_PAGE_SIZE) || 50
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Build MongoDB sort object from query string
 * e.g., sortBy=price&sortOrder=asc → { price: 1 }
 */
const parseSort = (query, allowedFields = ["price", "createdAt", "averageRating", "totalSold"]) => {
  const { sortBy = "createdAt", sortOrder = "desc" } = query;
  const field = allowedFields.includes(sortBy) ? sortBy : "createdAt";
  const order = sortOrder === "asc" ? 1 : -1;
  return { [field]: order };
};

/**
 * Custom error class with status code
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  successResponse,
  errorResponse,
  paginateMeta,
  parsePagination,
  parseSort,
  AppError,
};
