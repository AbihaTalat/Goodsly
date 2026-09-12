const mongoose = require("mongoose");
const dns = require("dns");
const logger = require("../utils/logger");
let lastDatabaseError = null;
let configured = false;

const connectDatabase = async () => {
  const url = String(process.env.DB_URL || process.env.MONGODB_URI || "")
    .trim()
    .replace(/;$/, "");

  // A database is optional: the repository starts in memory when the URL is
  // missing, masked, or unavailable.
  if (!url || !/^mongodb(?:\+srv)?:\/\//i.test(url)) {
    logger.warn("MongoDB URL unavailable; using the in-memory repository");
    return false;
  }
  configured = true;

  try {
    // Some Windows DNS configurations refuse Node's SRV lookup even though
    // Atlas is reachable. Use public resolvers for the SRV record only.
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    const connection = await mongoose.connect(url, {
      serverSelectionTimeoutMS: 8000,
    });
    logger.info({ host: connection.connection.host }, "MongoDB connected");
    return true;
  } catch (error) {
    lastDatabaseError = error;
    logger.warn({ err: error }, "MongoDB unavailable; using the in-memory repository");
    if (String(process.env.NODE_ENV).toLowerCase() === "production") throw error;
    return false;
  }
};

const status = () => ({ configured, connected: mongoose.connection.readyState === 1, state: mongoose.connection.readyState, error: lastDatabaseError ? "unavailable" : undefined });
connectDatabase.status = status;
module.exports = connectDatabase;