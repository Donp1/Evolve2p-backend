const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { db } = require("../../db");
const bcrypt = require("bcryptjs");
const { generateAccessTokenAdmin } = require("../../utils");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "You must provide an email and a password.",
    });
  }

  try {
    const userExists = await db.admin.findFirst({ where: { email } });
    if (!userExists) {
      return res
        .status(403)
        .json({ error: true, message: "Invalid login credentials." });
    }

    const validPassword = await bcrypt.compare(password, userExists.password);

    if (!validPassword) {
      return res
        .status(403)
        .json({ error: true, message: "Invalid login credentials." });
    }

    const accessToken = generateAccessTokenAdmin(userExists);

    return res.status(200).json({
      accessToken,
      success: true,
      message: "Log in successfull",
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: true, message: "Internal server error" });
  }
});

module.exports = router;
