const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, jwtSecret } = require("../middleware/auth");

const router = express.Router();
const issueToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const responseFor = (res, user, status = 200) =>
  res.status(status).json({ success: true, user, token: issueToken(user) });

router.post(
  "/register",
  catchAsyncErrors(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) throw new ErrorHandler("Name, email and password are required", 400);
    if (String(password).length < 6) throw new ErrorHandler("Password must be at least 6 characters", 400);
    const requestedRole = req.body.role;
    const role =
      requestedRole === "seller"
        ? "seller"
        : requestedRole === "admin" &&
            (process.env.ALLOW_ADMIN_REGISTRATION === "true" || process.env.NODE_ENV !== "production")
          ? "admin"
          : "customer";
    const passwordHash = await bcrypt.hash(String(password), 12);
    const user = await repository.users.create({ name: String(name), email: String(email), passwordHash, role });
    return responseFor(res, user, 201);
  })
);

router.post(
  "/login",
  catchAsyncErrors(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ErrorHandler("Email and password are required", 400);
    const storedUser = await repository.users.findByEmail(String(email));
    if (!storedUser || !(await bcrypt.compare(String(password), storedUser.passwordHash))) {
      throw new ErrorHandler("Invalid email or password", 401);
    }
    return responseFor(res, repository.publicUser(storedUser));
  })
);

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
