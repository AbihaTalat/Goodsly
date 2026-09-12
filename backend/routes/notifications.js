const express = require("express");
const repository = require("../store/repository");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.get("/", catchAsyncErrors(async (req, res) => res.json({ success: true, notifications: await repository.notifications.list(req.user._id, req.query.unread === "true") })));
router.patch("/:id/read", catchAsyncErrors(async (req, res) => res.json({ success: true, notification: await repository.notifications.markRead(req.params.id, req.user._id) })));

module.exports = router;
