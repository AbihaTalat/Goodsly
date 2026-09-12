const crypto = require("crypto");

const isProduction = () => String(process.env.NODE_ENV || "development").toLowerCase() === "production";

const validateConfiguration = () => {
  const problems = [];
  const secret = String(process.env.JWT_SECRET || "");
  if (isProduction()) {
    if (secret.length < 32 || /replace|development|change-me|goodsly/i.test(secret)) {
      problems.push("JWT_SECRET must be a strong, unique value of at least 32 characters in production");
    }
    const dbUrl = String(process.env.DB_URL || process.env.MONGODB_URI || "").trim();
    if (!/^mongodb(?:\+srv)?:\/\//i.test(dbUrl)) problems.push("DB_URL must be a MongoDB connection string in production");
    if (!String(process.env.FRONTEND_URLS || "").trim()) problems.push("FRONTEND_URLS is required in production");
  }
  return problems;
};

const requireProductionConfiguration = () => {
  const problems = validateConfiguration();
  if (problems.length && isProduction()) throw new Error(`Invalid production configuration: ${problems.join("; ")}`);
  return problems;
};

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

module.exports = { isProduction, validateConfiguration, requireProductionConfiguration, randomToken, hashToken };
