const express = require("express");
const repository = require("../store/repository");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.get("/seller", authenticate, authorizeRoles("seller", "admin"), catchAsyncErrors(async (req, res) => {
  const analytics = await repository.analytics.seller(req.user._id);
  res.json({ success: true, analytics });
}));
module.exports = router;
