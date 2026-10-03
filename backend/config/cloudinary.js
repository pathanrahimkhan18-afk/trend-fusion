const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Product Image Storage ────────────────────────────
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trend-fusion/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
  },
});

// ─── Avatar Storage ───────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "trend-fusion/avatars",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face", quality: "auto" }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(file.mimetype.toLowerCase());
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"), false);
  }
};

const uploadProductImages = multer({
  storage: productStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB, max 6 images
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Helper to delete image from Cloudinary
const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

module.exports = {
  cloudinary,
  uploadProductImages,
  uploadAvatar,
  deleteCloudinaryImage,
};
