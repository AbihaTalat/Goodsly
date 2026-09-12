const Stripe = require("stripe");

const providerStatus = () => ({
  stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
});

const paymentError = (message, statusCode = 503) => Object.assign(new Error(message), { statusCode });
const paypalBaseUrl = () => String(process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const paypalAccessToken = async () => {
  if (!providerStatus().paypal) throw paymentError("PayPal is not configured", 503);
  const credentials = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw paymentError("PayPal is temporarily unavailable", 503);
  const payload = await response.json().catch(() => null);
  if (!payload?.access_token) throw paymentError("PayPal returned an invalid authentication response", 503);
  return payload.access_token;
};

const paypalRequest = async (method, path, body) => {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = paymentError("PayPal request could not be completed", response.status >= 400 && response.status < 500 ? 400 : 503);
    error.providerCode = payload?.name;
    throw error;
  }
  return payload;
};

const createPaypalOrder = ({ amount, currency = "USD", orderId }) => paypalRequest("POST", "/v2/checkout/orders", {
  intent: "CAPTURE",
  purchase_units: [{ reference_id: String(orderId || ""), amount: { currency_code: String(currency).toUpperCase(), value: Number(amount).toFixed(2) } }],
});
const capturePaypalOrder = (paypalOrderId) => paypalRequest("POST", `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {});
const refundPaypalCapture = (captureId, amount, currency = "USD") => paypalRequest("POST", `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, amount ? { amount: { currency_code: String(currency).toUpperCase(), value: Number(amount).toFixed(2) } } : {});

const createCheckout = async ({ provider, amount, currency = "usd", metadata = {}, orderId }) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw paymentError("A positive amount is required", 400);
  if (provider === "stripe") {
    if (!process.env.STRIPE_SECRET_KEY) throw paymentError("Stripe is not configured", 503);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripe.paymentIntents.create({ amount: Math.round(numericAmount * 100), currency: String(currency).toLowerCase(), metadata: { ...metadata, orderId: String(orderId || metadata.orderId || "") } });
  }
  if (provider === "paypal") return createPaypalOrder({ amount: numericAmount, currency, orderId: orderId || metadata.orderId });
  throw paymentError("Unsupported payment provider", 400);
};

module.exports = { providerStatus, createCheckout, createPaypalOrder, capturePaypalOrder, refundPaypalCapture, paypalRequest };
