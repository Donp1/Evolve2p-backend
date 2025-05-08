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
  const { email } = req.payload;
  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: "Evolve2p: " + email,
    });
    const { base32: secretBase32, otpauth_url: otpauthUrl } = secret;

    const qrDataURL = qrcode.toDataURL(otpauthUrl, async (err, dataURL) => {
      if (err) {
        console.error("Error generating QR code:", err);
        return res
          .status(500)
          .json({ error: true, message: "Failed to generate QR code" });
      }

      const updateUser = await db.user.update({
        where: { email },
        data: {
          secret: secretBase32,
        },
      });

      if (!updateUser) {
        return res
          .status(500)
          .json({ error: true, message: "Failed to update user" });
      }

      return res.json({ success: true, qrCode: dataURL, secret: secretBase32 });
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
