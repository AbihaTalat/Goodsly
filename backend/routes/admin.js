const express = require("express");
const repository = require("../store/repository");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
const adminOnly = [authenticate, authorizeRoles("admin")];

router.get(
  "/summary",
  ...adminOnly,
  catchAsyncErrors(async (req, res) => {
    const summary = await repository.orders.summary();
    res.status(200).json({ success: true, summary });
  })
);

router.get(
  "/orders",
  ...adminOnly,
  catchAsyncErrors(async (req, res) => {
    const orders = await repository.orders.list();
    res.status(200).json({ success: true, orders, count: orders.length });
  })
);

module.exports = router;
