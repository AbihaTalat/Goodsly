const Stripe = require("stripe");

const providerStatus = () => ({
  stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  paypal: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
});

const createCheckout = async ({ provider, amount, currency = "usd", metadata = {} }) => {
  if (provider === "stripe") {
    if (!process.env.STRIPE_SECRET_KEY) throw Object.assign(new Error("Stripe is not configured"), { statusCode: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    return stripe.paymentIntents.create({ amount: Math.round(Number(amount) * 100), currency, metadata });
  }
  if (provider === "paypal") {
    if (!providerStatus().paypal) throw Object.assign(new Error("PayPal is not configured"), { statusCode: 503 });
    throw Object.assign(new Error("PayPal checkout adapter requires a server-side SDK configuration"), { statusCode: 501 });
  }
  throw Object.assign(new Error("Unsupported payment provider"), { statusCode: 400 });
};

module.exports = { providerStatus, createCheckout };
