const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "config", ".env") });
dotenv.config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const errorMiddleware = require("./middleware/error");
const repository = require("./store/repository");

const app = express();

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
app.use(express.json({ limit: "1mb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ success: true, message: "Goodsly API is running", database: repository.storage });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorMiddleware);

module.exports = app;