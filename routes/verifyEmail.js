const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { findOtpByEmail } = require("../utils/users");
const { getTimeDifferenceInMinutes } = require("../utils");
const { db } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.json({ error: true, message: "Provide email and otp" });
  }

  try {
    const userExit = await findOtpByEmail(email);
    if (!userExit) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid Email address" });
    }

    if (String(userExit.otp) != String(otp)) {
      return res.status(400).json({ error: true, message: "Invalid OTP Sent" });
    }

    const time = getTimeDifferenceInMinutes(userExit.expiresAt);
    if (time > 5) {
      return res.status(400).json({ error: true, message: "OTP has Expired" });
    }

    const deletedUser = await db.oTP.delete({
      where: {
        email,
      },
    });
    if (deletedUser)
      return res.status(200).json({ success: true, message: "user verified" });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
