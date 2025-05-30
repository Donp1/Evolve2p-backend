const express = require("express");
const bcrypt = require("bcryptjs");

const { findUserByEmail, createUser } = require("../utils/users");
const { generateAccessToken } = require("../utils");
const { db } = require("../db");

const route = express.Router();

route.post("/", async (req, res) => {
  const { email, country, phone, password, username, emailVerified } = req.body;
  if (!email || !country || !phone || !password || !username) {
    return res
      .status(400)
      .json({ error: true, message: "You must provide all information" });
  }

  let isEmailVerified;
  if (emailVerified) {
    isEmailVerified = emailVerified;
  } else {
    isEmailVerified = false;
  }

  try {
    const userExits = await findUserByEmail(email);
    if (userExits) {
      return res
        .status(400)
        .json({ error: true, message: "Email already in use." });
    }
    const securePassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      email,
      country,
      phone,
      password: securePassword,
      username,
      emailVerified: isEmailVerified,
    });

    if (newUser) {
      const accessToken = generateAccessToken(newUser);

      return res.status(201).json({
        accessToken,
        success: true,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error, error: true });
  }
});

module.exports = route;
