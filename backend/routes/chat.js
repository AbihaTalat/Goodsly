const express = require("express");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/conversations", catchAsyncErrors(async (req, res) => {
  const conversations = await repository.chat.listConversations(req.user._id);
  res.json({ success: true, conversations });
}));

router.post("/conversations", catchAsyncErrors(async (req, res) => {
  const participants = Array.isArray(req.body?.participants) ? req.body.participants : [];
  if (!participants.includes(req.user._id)) participants.push(req.user._id);
  if (participants.length < 2) throw new ErrorHandler("At least two participants are required", 400);
  const conversation = await repository.chat.createConversation(participants, req.body.orderId);
  res.status(201).json({ success: true, conversation });
}));

router.get("/conversations/:id/messages", catchAsyncErrors(async (req, res) => {
  if (!(await repository.chat.canAccess(req.params.id, req.user._id))) throw new ErrorHandler("Conversation not found", 404);
  res.json({ success: true, messages: await repository.chat.listMessages(req.params.id) });
}));

router.post("/conversations/:id/messages", catchAsyncErrors(async (req, res) => {
  if (!(await repository.chat.canAccess(req.params.id, req.user._id))) throw new ErrorHandler("Conversation not found", 404);
  const body = String(req.body?.body || "").trim();
  if (!body || body.length > 2000) throw new ErrorHandler("Message must be between 1 and 2000 characters", 400);
  res.status(201).json({ success: true, message: await repository.chat.createMessage(req.params.id, req.user._id, body) });
}));

module.exports = router;
