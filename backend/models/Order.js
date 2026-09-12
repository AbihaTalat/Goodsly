const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        quantity: { type: Number, min: 1, required: true },
        price: { type: Number, min: 0, required: true },
        subtotal: { type: Number, min: 0, required: true },
      },
    ],
    total: { type: Number, min: 0, required: true },
    currency: { type: String, default: "usd", uppercase: true, trim: true },
    payment: {
      provider: { type: String, enum: ["stripe", "paypal"] },
      paymentId: String,
      status: {
        type: String,
        enum: ["unpaid", "pending", "succeeded", "failed", "refunded"],
        default: "unpaid",
      },
      failureReason: String,
      paidAt: Date,
      refundedAt: Date,
    },
    shippingAddress: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
