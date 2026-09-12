const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  err.statusCode = err.statusCode || (err.type === "entity.parse.failed" ? 400 : 500);
  err.message = err.message || "Internal server error";

  // wrong mongodb id error
  if (err.name === "CastError") {
    const message = `Resources not found with this id.. Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate key ${Object.keys(err.keyValue || {}).join(", ") || "value"} entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt error
  if (err.name === "JsonWebTokenError") {
    err = new ErrorHandler("Invalid authentication token", 401);
  }

  // jwt expired
  if (err.name === "TokenExpiredError") {
    err = new ErrorHandler("Authentication token has expired", 401);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};