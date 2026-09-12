const mongoose = require("mongoose");
const dns = require("dns");

const connectDatabase = async () => {
  const url = String(process.env.DB_URL || process.env.MONGODB_URI || "")
    .trim()
    .replace(/;$/, "");

  // A database is optional: the repository starts in memory when the URL is
  // missing, masked, or unavailable.
  if (!url || !/^mongodb(?:\+srv)?:\/\//i.test(url)) {
    console.log("MongoDB URL unavailable; using the in-memory repository");
    return false;
  }

  try {
    // Some Windows DNS configurations refuse Node's SRV lookup even though
    // Atlas is reachable. Use public resolvers for the SRV record only.
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    const connection = await mongoose.connect(url, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`MongoDB connected to ${connection.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable; using the in-memory repository (${error.message})`);
    return false;
  }
};

module.exports = connectDatabase;