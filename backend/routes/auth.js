const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const repository = require("../store/repository");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { authenticate, jwtSecret, accessTokenTtl, refreshCookieName, refreshCookieOptions } = require("../middleware/auth");
const { randomToken, hashToken, isProduction } = require("../config/env");
const logger = require("../utils/logger");
const nodemailer = require("nodemailer");

const router = express.Router();
const issueAccessToken = (user) => jwt.sign({ id: user._id, role: user.role, type: "access" }, jwtSecret(), { expiresIn: accessTokenTtl() });
const setRefreshCookie = (res, token) => res.cookie(refreshCookieName(), token, refreshCookieOptions());
const clearRefreshCookie = (res) => res.clearCookie(refreshCookieName(), { ...refreshCookieOptions(), maxAge: undefined });
const mailer = () => process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null;
const sendTokenEmail = async (to, subject, path, token) => {
  const transport = mailer();
  if (!transport) return false;
  await transport.sendMail({
    from: process.env.SMTP_FROM || "no-reply@example.com",
    to,
    subject,
    text: `Open ${String(process.env.FRONTEND_URLS || "").split(",")[0]}/#${path}?token=${encodeURIComponent(token)} to continue.`,
  });
  return true;
};

const createRefreshToken = async (userId) => {
  const raw = randomToken();
  await repository.refreshTokens.create({
    userId: String(userId),
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TTL_MS || 30 * 24 * 60 * 60 * 1000)),
  });
  return raw;
};

const responseFor = async (res, user, status = 200, extra = {}) => {
  const refresh = await createRefreshToken(user._id);
  setRefreshCookie(res, refresh);
  return res.status(status).json({ success: true, user, token: issueAccessToken(user), accessTokenExpiresIn: accessTokenTtl(), ...extra });
};

router.post("/register", catchAsyncErrors(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) throw new ErrorHandler("Name, email and password are required", 400);
  if (String(password).length < 8) throw new ErrorHandler("Password must be at least 8 characters", 400);
  const requestedRole = req.body.role;
  const role = requestedRole === "seller" ? "seller" :
    requestedRole === "admin" && !isProduction() && process.env.ALLOW_ADMIN_REGISTRATION === "true" ? "admin" : "customer";
  const passwordHash = await bcrypt.hash(String(password), 12);
  const verificationToken = randomToken();
  const user = await repository.users.create({ name: String(name), email: String(email), passwordHash, role, emailVerificationTokenHash: hashToken(verificationToken), emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  await sendTokenEmail(String(email), "Verify your Goodsly email", "/verify-email", verificationToken).catch((error) => logger.error({ err: error }, "Email verification delivery failed"));
  return responseFor(res, user, 201, !isProduction() && process.env.ALLOW_DEV_VERIFICATION_TOKEN === "true" ? { verificationToken } : {});
}));

router.post("/login", catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new ErrorHandler("Email and password are required", 400);
  const storedUser = await repository.users.findByEmail(String(email));
  if (!storedUser || !(await bcrypt.compare(String(password), storedUser.passwordHash))) throw new ErrorHandler("Invalid email or password", 401);
  return responseFor(res, repository.publicUser(storedUser));
}));

router.post("/refresh", catchAsyncErrors(async (req, res) => {
  const raw = req.cookies?.[refreshCookieName()];
  if (!raw) throw new ErrorHandler("Refresh token is required", 401);
  const hash = hashToken(raw);
  const stored = await repository.refreshTokens.findActive(hash);
  if (!stored) {
    const reused = await repository.refreshTokens.find(hash);
    if (reused?.revokedAt) await repository.refreshTokens.revokeAll(reused.userId);
    clearRefreshCookie(res);
    throw new ErrorHandler("Invalid or expired refresh token", 401);
  }
  const user = await repository.users.findById(stored.userId);
  if (!user) throw new ErrorHandler("User no longer exists", 401);
  const replacement = await createRefreshToken(user._id);
  await repository.refreshTokens.revoke(hash, hashToken(replacement));
  setRefreshCookie(res, replacement);
  res.json({ success: true, user, token: issueAccessToken(user), accessTokenExpiresIn: accessTokenTtl() });
}));

router.post("/logout", catchAsyncErrors(async (req, res) => {
  const raw = req.cookies?.[refreshCookieName()];
  if (raw) await repository.refreshTokens.revoke(hashToken(raw));
  clearRefreshCookie(res);
  res.json({ success: true });
}));

router.post("/forgot-password", catchAsyncErrors(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) throw new ErrorHandler("Email is required", 400);
  const user = await repository.users.findByEmail(email);
  let resetToken;
  if (user) {
    resetToken = randomToken();
    await repository.users.update(user._id, { passwordResetTokenHash: hashToken(resetToken), passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    // Configure SMTP to deliver this URL in production. Never expose a token there.
    await sendTokenEmail(email, "Reset your Goodsly password", "/reset-password", resetToken).catch((error) => logger.error({ err: error }, "Password reset delivery failed"));
  }
  const result = { success: true, message: "If an account exists, password reset instructions will be sent." };
  if (!isProduction() && process.env.ALLOW_DEV_RESET_TOKEN === "true" && resetToken) result.resetToken = resetToken;
  res.json(result);
}));

router.post("/reset-password", catchAsyncErrors(async (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  if (!token || password.length < 8) throw new ErrorHandler("A valid token and password of at least 8 characters are required", 400);
  const user = await repository.users.findByPasswordResetToken(hashToken(token));
  if (!user) throw new ErrorHandler("Invalid or expired password reset token", 400);
  const updated = await repository.users.update(user._id, { passwordHash: await bcrypt.hash(password, 12), passwordResetTokenHash: null, passwordResetExpiresAt: null });
  await repository.refreshTokens.revokeAll(user._id);
  res.json({ success: true, user: repository.publicUser(updated) });
}));

router.post("/verify-email", catchAsyncErrors(async (req, res) => {
  const user = await repository.users.findByVerificationToken(hashToken(String(req.body?.token || "")));
  if (!user) throw new ErrorHandler("Invalid or expired verification token", 400);
  const updated = await repository.users.update(user._id, { emailVerifiedAt: new Date(), emailVerificationTokenHash: null, emailVerificationExpiresAt: null });
  res.json({ success: true, user: repository.publicUser(updated) });
}));

router.get("/me", authenticate, (req, res) => res.status(200).json({ success: true, user: req.user }));

module.exports = router;
