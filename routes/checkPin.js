const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { db } = require("../db");
const { findUserByEmail } = require("../utils/users");
const bcrypt = require("bcryptjs");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, pin } = req.body;

  if (!email || !pin) {
    return res
      .status(400)
      .json({ error: true, message: "Provide email and pin" });
  }
  try {
    const userExist = await findUserByEmail(email);
    if (!userExist) {
      return res
        .status(400)
        .json({ error: true, message: "User does not Exist" });
    }

    const isPinValid = await bcrypt.compare(pin, userExist.pin);

    if (!isPinValid) {
      return res.status(400).json({ error: true, message: "Invalid pin" });
    }

    return res.status(200).json({ success: true, message: "Pin is valid." });
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
