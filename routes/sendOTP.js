const express = require("express");
const dotenv = require("dotenv");
const { db } = require("../db");
const { generateOTP, sendOtp, sendAdminMail } = require("../utils");
const { createOTPUser, findOtpByEmail } = require("../utils/users");

dotenv.config();

const router = express.Router();

/**
 * @route   POST /api/otp
 * @desc    Generate and send OTP to user's email
 * @access  Public
 */
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Validate input
    if (!email) {
      return res.status(400).json({
        error: true,
        message: "Please provide a valid email address.",
      });
    }

    // ✅ Generate OTP
    const otp = generateOTP();

    // ✅ Send OTP via your preferred provider (Sweego, MailerSend, etc.)
    const sent = await sendOtp(email, otp);

    if (!sent?.transaction_id) {
      return res.status(500).json({
        error: true,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    // ✅ Check if OTP user already exists
    const existingUser = await findOtpByEmail(email);
    const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 mins

    if (existingUser) {
      // Update existing OTP entry
      await db.oTP.update({
        where: { email },
        data: {
          otp: parseInt(otp, 10),
          expiresAt: expiryTime,
        },
      });
    } else {
      // Create new OTP record
      await createOTPUser({
        email,
        otp: parseInt(otp, 10),
        expiresAt: expiryTime,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);

    return res.status(500).json({
      error: true,
      message: "Internal server error while sending OTP.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
