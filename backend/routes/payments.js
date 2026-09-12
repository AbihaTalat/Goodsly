const express = require("express");
const Stripe = require("stripe");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const { providerStatus, createCheckout, capturePaypalOrder, refundPaypalCapture } = require("../services/payments");

const router = express.Router();
router.get("/providers", (req, res) => res.json({ success: true, providers: providerStatus() }));

const ownedOrder = async (req, orderId) => {
  const order = await repository.orders.findById(orderId);
  if (!order) throw new ErrorHandler("Order not found", 404);
  if (req.user.role !== "admin" && String(order.customerId) !== String(req.user._id)) throw new ErrorHandler("You do not have permission to pay for this order", 403);
  return order;
};

router.post("/checkout", authenticate, catchAsyncErrors(async (req, res) => {
  const { provider, currency = "usd", orderId } = req.body || {};
  if (!orderId) throw new ErrorHandler("orderId is required", 400);
  const order = await ownedOrder(req, orderId);
  if (order.payment?.status === "succeeded") throw new ErrorHandler("Order is already paid", 409);
  const payment = await createCheckout({ provider, amount: order.total, currency: order.currency || currency, orderId: order._id, metadata: { orderId: String(order._id), userId: String(req.user._id) } });
  const paymentId = payment.id || payment.orderID;
  await repository.orders.updatePayment(order._id, { provider, paymentId, status: "pending" });
  res.status(201).json({ success: true, payment: { id: paymentId, status: payment.status || "CREATED", provider, orderId: String(order._id) } });
}));

router.post("/paypal/:paypalOrderId/capture", authenticate, catchAsyncErrors(async (req, res) => {
  const orderId = req.body?.orderId;
  if (!orderId) throw new ErrorHandler("orderId is required", 400);
  const order = await ownedOrder(req, orderId);
  if (order.payment?.paymentId !== req.params.paypalOrderId) throw new ErrorHandler("Payment does not belong to this order", 403);
  const captured = await capturePaypalOrder(req.params.paypalOrderId);
  const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];
  const updated = await repository.orders.updatePayment(order._id, { status: "succeeded", paymentId: capture?.id || req.params.paypalOrderId, paidAt: new Date() });
  res.json({ success: true, payment: captured, order: updated });
}));

router.post("/paypal/:captureId/refund", authenticate, authorizeRoles("admin"), catchAsyncErrors(async (req, res) => {
  const refund = await refundPaypalCapture(req.params.captureId, req.body?.amount, req.body?.currency);
  const order = await (req.body?.orderId ? repository.orders.findById(req.body.orderId) : repository.orders.findByPaymentId(req.params.captureId));
  if (order) await repository.orders.updatePayment(order._id, { status: "refunded", refundedAt: new Date() });
  res.json({ success: true, refund });
}));

const applyStripeEvent = async (event) => {
  const object = event.data?.object || {};
  const metadata = object.metadata || {};
  const orderId = metadata.orderId || metadata.order_id;
  const paymentId = object.payment_intent || object.id;
  let status;
  if (event.type === "payment_intent.succeeded") status = "succeeded";
  if (event.type === "payment_intent.payment_failed") status = "failed";
  if (event.type === "charge.refunded") status = "refunded";
  if (!status) return null;
  const order = orderId ? await repository.orders.findById(orderId) : await repository.orders.findByPaymentId(paymentId);
  if (!order) return null;
  return repository.orders.updatePayment(order._id, {
    provider: "stripe",
    paymentId,
    status,
    ...(status === "succeeded" ? { paidAt: new Date() } : {}),
    ...(status === "refunded" ? { refundedAt: new Date() } : {}),
    ...(status === "failed" ? { failureReason: object.last_payment_error?.message || "Payment failed" } : {}),
  });
};

router.post("/webhooks/stripe", async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: "Stripe webhook is not configured" });
  const signature = req.headers["stripe-signature"];
  if (!signature || !process.env.STRIPE_SECRET_KEY) return res.status(400).json({ success: false, message: "Stripe signature is required" });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.rawBody || Buffer.from(JSON.stringify(req.body || {})), signature, process.env.STRIPE_WEBHOOK_SECRET);
    const result = await repository.paymentEvents.record({ eventId: event.id, provider: "stripe", type: event.type, orderId: event.data?.object?.metadata?.orderId, paymentId: event.data?.object?.payment_intent || event.data?.object?.id, payload: event.data?.object });
    if (result.created) {
      try {
        await applyStripeEvent(event);
      } catch (error) {
        await repository.paymentEvents.remove(event.id);
        throw error;
      }
    }
    return res.json({ received: true, duplicate: !result.created });
  } catch (error) {
    if (error.type === "StripeSignatureVerificationError") return res.status(400).json({ success: false, message: "Invalid Stripe webhook signature" });
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

router.post("/webhooks/paypal", (req, res) => {
  if (!providerStatus().paypal) return res.status(503).json({ success: false, message: "PayPal webhook is not configured" });
  return res.status(501).json({ success: false, message: "PayPal webhook verification is not configured; use capture endpoint" });
});

module.exports = router;
