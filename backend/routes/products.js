const express = require("express");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const sellerOrAdmin = [authenticate, authorizeRoles("seller", "admin")];

const validateProduct = (body, partial = false) => {
  if (!partial && (typeof body.name !== "string" || !body.name.trim() || body.price === undefined)) {
    throw new ErrorHandler("Product name and price are required", 400);
  }
  if (partial && body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
    throw new ErrorHandler("Product name must be a non-empty string", 400);
  }
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
    throw new ErrorHandler("Product price must be a non-negative number", 400);
  }
  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) {
    throw new ErrorHandler("Product stock must be a non-negative integer", 400);
  }
};

const findId = (req) => req.params.id || req.body.id || req.query.id;
const ensureOwner = (product, user) => {
  if (!product) throw new ErrorHandler("Product not found", 404);
  if (user.role !== "admin" && product.sellerId !== user._id) {
    throw new ErrorHandler("You can only manage your own products", 403);
  }
};

router.get(
  "/",
  catchAsyncErrors(async (req, res) => {
    const products = await repository.products.list(req.query);
    res.status(200).json({ success: true, products, count: products.length });
  })
);

router.post(
  "/",
  ...sellerOrAdmin,
  catchAsyncErrors(async (req, res) => {
    validateProduct(req.body || {});
    const product = await repository.products.create(req.body, req.user._id);
    res.status(201).json({ success: true, product });
  })
);

const update = catchAsyncErrors(async (req, res) => {
  const product = await repository.products.findById(findId(req));
  ensureOwner(product, req.user);
  validateProduct(req.body || {}, true);
  const updated = await repository.products.update(product._id, req.body);
  res.status(200).json({ success: true, product: updated });
});

const remove = catchAsyncErrors(async (req, res) => {
  const product = await repository.products.findById(findId(req));
  ensureOwner(product, req.user);
  await repository.products.remove(product._id);
  res.status(200).json({ success: true, message: "Product deleted" });
});

router.patch("/", ...sellerOrAdmin, update);
router.patch("/:id", ...sellerOrAdmin, update);
router.delete("/", ...sellerOrAdmin, remove);
router.delete("/:id", ...sellerOrAdmin, remove);

module.exports = router;
