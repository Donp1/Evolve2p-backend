const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { isAuthenticated } = require("../middlewares");

const router = express.Router();

router.put("/", isAuthenticated, async (req, res) => {
  try {
    const { userId } = req.payload; // from JWT
    const { password, newPin } = req.body;

    // ✅ Input validation
    if (!password || !newPin) {
      return res
        .status(400)
        .json({ error: true, message: "Password and new PIN are required" });
    }

    // ✅ Ensure PIN is exactly 4 or 6 digits (depending on your app)
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({
        error: true,
        message: "PIN must be 4 or 6 numeric digits only",
      });
    }

    // ✅ Find user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    // ✅ Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid password provided" });
    }

    // ✅ Hash new PIN securely
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(newPin, salt);

    // ✅ Update user PIN
    await db.user.update({
      where: { id: userId },
      data: { pin: hashedPin },
    });

    return res.status(200).json({
      success: true,
      message: "Security PIN updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating PIN:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
});

module.exports = router;
