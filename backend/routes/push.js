const express = require("express");
const webpush = require("web-push");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

router.get("/config", (req, res) => res.json({ success: true, configured, publicKey: configured ? process.env.VAPID_PUBLIC_KEY : null }));
router.post("/subscribe", authenticate, (req, res) => {
  if (!configured) return res.status(503).json({ success: false, message: "Web Push is not configured" });
  if (!req.body?.endpoint || !req.body?.keys) return res.status(400).json({ success: false, message: "A valid push subscription is required" });
  return res.status(202).json({ success: true, message: "Subscription accepted; persistence can be connected to the notification repository" });
});
module.exports = { router, configured, webpush };
