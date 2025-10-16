const express = require("express");
const dotenv = require("dotenv");
const { db } = require("../../db");
const { isAdmin } = require("../../middlewares");
const { sendAdminMail } = require("../../utils");

dotenv.config();

const router = express.Router();

router.post("/", isAdmin, async (req, res) => {
  try {
    const { email, title, subject, message } = req.body;

    if (!email || !subject || !title || !message) {
      return res.status(400).json({
        error: true,
        message: "All fields (email, subject, title, message) are required.",
      });
    }

    const existingUser = await db.user.findUnique({ where: { email } });

    if (!existingUser) {
      return res.status(404).json({
        error: true,
        message: `No user found with email: ${email}`,
      });
    }

    const sent = await sendAdminMail(email, subject, title, message);

    console.log("📧 Email send response:", sent);

    if (!sent?.transaction_id) {
      return res.status(500).json({
        error: true,
        message: "Failed to send email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully.",
    });
  } catch (error) {
    console.error("❌ Error sending Mail:", error.message);

    return res.status(500).json({
      error: true,
      message: error.message || "Internal server error while sending Message.",
    });
  }
});

module.exports = router;
