const express = require("express");

const { PrismaClient } = require("@prisma/client");
const { findUserByEmail, createUser } = require("../utils/users");
const { generateAccessToken } = require("../utils");

const prisma = new PrismaClient();

const route = express.Router();

route.post("/", async (req, res) => {
  const { email, country, phone, password, username } = req.body;
  if (!email || !country || !phone || !password || !username) {
    return res
      .status(400)
      .json({ error: true, message: "You must provide all information" });
  }

  try {
    const userExits = await findUserByEmail(email);
    if (userExits) {
      return res
        .status(400)
        .json({ error: true, message: "Email already in use." });
    }

    const newUser = await createUser(req.body);

    const accessToken = generateAccessToken(newUser);

    return res.status(201).json({
      accessToken,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({ message: error, error: true });
  }
});

module.exports = route;
