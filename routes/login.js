const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bcrypt = require("bcryptjs");

const { findUserByEmail } = require("../utils/users");
const { generateAccessToken, sendPushNotification } = require("../utils");

const route = express.Router();

route.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "You must provide an email and a password.",
    });
  }
  try {
    const existingUser = await findUserByEmail(email);

    if (!existingUser) {
      return res
        .status(403)
        .json({ error: true, message: "Invalid login credentials." });
    }
    const validPassword = await bcrypt.compare(password, existingUser.password);
    if (!validPassword) {
      return res
        .status(403)
        .json({ error: true, message: "Invalid login credentials." });
    }

    const accessToken = generateAccessToken(existingUser);

    if (existingUser.pushToken) {
      await sendPushNotification(
        existingUser.pushToken,
        "Login Alert",
        "New login to your account detected."
      );
    }

    return res.status(200).json({
      accessToken,
      success: true,
    });
  } catch (err) {
    return res.status(500).json({ error: true, message: err });
  }
});

module.exports = route;
