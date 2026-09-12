const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    lastMessageAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
