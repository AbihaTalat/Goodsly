const express = require("express");
const Stripe = require("stripe");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate } = require("../middleware/auth");
const { providerStatus, createCheckout } = require("../services/payments");

const router = express.Router();
router.get("/providers", (req, res) => res.json({ success: true, providers: providerStatus() }));
router.post("/checkout", authenticate, catchAsyncErrors(async (req, res) => {
  const { provider, amount, currency, orderId } = req.body || {};
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ success: false, message: "A positive amount is required" });
  const payment = await createCheckout({ provider, amount, currency, metadata: { orderId: String(orderId || ""), userId: req.user._id } });
  res.status(201).json({ success: true, payment: { id: payment.id, status: payment.status, provider } });
}));
router.post("/webhooks/stripe", (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: "Stripe webhook is not configured" });
  const signature = req.headers["stripe-signature"];
  if (!signature || !process.env.STRIPE_SECRET_KEY) return res.status(400).json({ success: false, message: "Stripe signature is required" });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    stripe.webhooks.constructEvent(req.rawBody || Buffer.from(JSON.stringify(req.body || {})), signature, process.env.STRIPE_WEBHOOK_SECRET);
    return res.json({ received: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid Stripe webhook signature" });
  }
});
router.post("/webhooks/paypal", (req, res) => {
  if (!providerStatus().paypal) return res.status(503).json({ success: false, message: "PayPal webhook is not configured" });
  res.status(501).json({ success: false, message: "PayPal webhook verification is not configured" });
});
module.exports = router;
