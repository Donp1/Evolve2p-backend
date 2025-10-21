const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const { db } = require("../db");
const { findUserByEmail } = require("../utils/users");

const { isAuthenticated } = require("../middlewares/index");

const router = express.Router();

router.post("/", isAuthenticated, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: true, message: "Token is required" });
  }

  if (token.length !== 6) {
    return res
      .status(400)
      .json({ error: true, message: "Token must be 6 digits" });
  }

  const { email } = req.payload;
  const user = await findUserByEmail(email);

  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  const verification = speakeasy.totp.verify({
    secret: user.secret,
    encoding: "base32",
    token,
    window: 0,
  });

  if (!verification) {
    return res.status(400).json({
      error: true,
      message:
        "The 2FA code you entered is invalid. Please check your authentication app and try again.",
    });
  }

  res.json({ success: true, message: "Token verified successfully" });
});

module.exports = router;
