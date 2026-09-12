const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
