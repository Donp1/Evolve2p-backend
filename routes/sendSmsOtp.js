const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { isAuthenticated } = require("../middlewares/index");
const { db } = require("../db");
const { findUserByEmail } = require("../utils/users");
const twilio = require("twilio");
const { generateOTP } = require("../utils");

const router = express.Router();

const accountSid = process.env.twilio_account_sid;
const authToken = process.env.twilio_auth_token;
const client = twilio(accountSid, authToken);

router.post("/", async (req, res) => {
  try {
    const otp = generateOTP();
    const message = await client.messages.create({
      body: `Your Evolve2P verification code is: ${otp}
This code is valid for 10 minutes. Do not share it with anyone.
— Evolve2P Security Team
`,
      from: "+18592498814",
      to: "+2348147143376",
    });

    console.log(message);
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
