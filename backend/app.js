const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config({ path: path.join(__dirname, "config", ".env") });
dotenv.config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const chatRoutes = require("./routes/chat");
const notificationRoutes = require("./routes/notifications");
const analyticsRoutes = require("./routes/analytics");
const uploadRoutes = require("./routes/uploads");
const paymentRoutes = require("./routes/payments");
const { router: pushRoutes } = require("./routes/push");
const errorMiddleware = require("./middleware/error");
const repository = require("./store/repository");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.API_RATE_LIMIT || 300), standardHeaders: "draft-7", legacyHeaders: false }));

const allowedOrigins = new Set(
  (process.env.FRONTEND_URLS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

// Keep the parser bounded and make malformed JSON a normal API error.
app.use(express.json({ limit: "1mb", strict: true, verify: (req, res, buffer) => { req.rawBody = buffer; } }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "data", "uploads"), { fallthrough: false, maxAge: "1d" }));

app.get("/api/v1/health", (req, res) => {
  const checks = { storage: repository.storage.type, node: process.version, uptimeSeconds: Math.round(process.uptime()) };
  res.status(200).json({ success: true, message: "Goodsly API is running", healthy: true, checks });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/push", pushRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);

module.exports = app;