const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, required: true, enum: ["stripe", "paypal"] },
    type: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    paymentId: String,
    payload: { type: mongoose.Schema.Types.Mixed, select: false },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PaymentEvent || mongoose.model("PaymentEvent", paymentEventSchema);
