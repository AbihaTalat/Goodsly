const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/ErrorHandler");
const repository = require("../store/repository");

const secret = () => process.env.JWT_SECRET || "goodsly-development-secret";

const getToken = (req) => {
  const header = req.headers.authorization;
  if (header && /^Bearer\s+\S+$/i.test(header)) {
    return header.replace(/^Bearer\s+/i, "");
  }
  return req.cookies && (req.cookies.token || req.cookies.jwt);
};

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

module.exports = { authenticate, authorizeRoles, getToken, jwtSecret: secret };