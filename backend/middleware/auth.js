const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/ErrorHandler");
const repository = require("../store/repository");
const { isProduction } = require("../config/env");

const secret = () => {
  const value = String(process.env.JWT_SECRET || "");
  if (isProduction() && (value.length < 32 || /replace|development|change-me/i.test(value))) {
    throw new Error("JWT_SECRET is not configured securely for production");
  }
  return value || "goodsly-development-secret";
};

const getToken = (req) => {
  const header = req.headers.authorization;
  if (header && /^Bearer\s+\S+$/i.test(header)) {
    return header.replace(/^Bearer\s+/i, "");
  }
  return req.cookies && (req.cookies.token || req.cookies.jwt);
};

const accessTokenTtl = () => process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "15m";
const refreshCookieName = () => process.env.REFRESH_COOKIE_NAME || "goodsly_refresh";
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  path: "/api/v1/auth",
  maxAge: Number(process.env.REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000),
});

const authenticate = async (req, res, next) => {
  const token = getToken(req);
  if (!token) return next(new ErrorHandler("Authentication required", 401));

  try {
    const decoded = jwt.verify(token, secret());
    const user = await repository.users.findById(decoded.id);
    if (!user) return next(new ErrorHandler("User no longer exists", 401));
    req.user = user;
    return next();
  } catch (error) {
    return next(new ErrorHandler("Invalid or expired authentication token", 401));
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ErrorHandler("You do not have permission to perform this action", 403));
  }
  return next();
};

module.exports = { authenticate, authorizeRoles, getToken, jwtSecret: secret, accessTokenTtl, refreshCookieName, refreshCookieOptions };