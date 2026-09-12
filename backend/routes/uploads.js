const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticate, authorizeRoles } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) });
const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
const localUploadDirectory = path.join(__dirname, "..", "data", "uploads");
if (cloudinaryConfigured) cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });

router.post("/", authenticate, authorizeRoles("seller", "admin"), upload.single("image"), catchAsyncErrors(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "An image file is required" });
  if (!cloudinaryConfigured) {
    fs.mkdirSync(localUploadDirectory, { recursive: true });
    const extension = req.file.mimetype.split("/")[1] === "jpeg" ? "jpg" : req.file.mimetype.split("/")[1];
    const filename = `${crypto.randomUUID()}.${extension}`;
    fs.writeFileSync(path.join(localUploadDirectory, filename), req.file.buffer);
    return res.json({ success: true, provider: "local", url: `/uploads/${filename}` });
  }
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "goodsly/products", resource_type: "image" }, (error, value) => error ? reject(error) : resolve(value));
    stream.end(req.file.buffer);
  });
  res.json({ success: true, provider: "cloudinary", url: result.secure_url, publicId: result.public_id });
}));
module.exports = router;
