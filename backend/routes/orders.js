const express = require("express");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const statuses = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);

router.post(
  "/",
  authenticate,
  authorizeRoles("customer", "seller", "admin"),
  catchAsyncErrors(async (req, res) => {
    const body = req.body || {};
    const rawItems = body.items || body.products;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new ErrorHandler("At least one order item is required", 400);
    }
    const items = rawItems.map((item) => ({
      productId: item && (item.productId || item.product || item.id),
      quantity: item && item.quantity,
    }));
    if (items.some((item) => !item.productId)) throw new ErrorHandler("Each item needs a productId", 400);
    const order = await repository.orders.create({
      customerId: req.user._id,
      items,
      shippingAddress: body.shippingAddress,
    });
    res.status(201).json({ success: true, order });
  })
);

router.get(
  "/",
  authenticate,
  catchAsyncErrors(async (req, res) => {
    const orders = await repository.orders.list(req.user.role === "customer" ? req.user._id : undefined);
    res.status(200).json({ success: true, orders, count: orders.length });
  })
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("admin", "seller"),
  catchAsyncErrors(async (req, res) => {
    const status = String(req.body && req.body.status || "").toLowerCase();
    if (!statuses.has(status)) throw new ErrorHandler("Invalid order status", 400);
    const order = await repository.orders.updateStatus(req.params.id, status);
    if (!order) throw new ErrorHandler("Order not found", 404);
    res.status(200).json({ success: true, order });
  })
);

module.exports = router;
