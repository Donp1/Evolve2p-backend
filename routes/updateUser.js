const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const bcrypt = require("bcryptjs");

const { isAuthenticated } = require("../middlewares");
const { findUserByEmail } = require("../utils/users");
const { db } = require("../db");

const router = express.Router();

router.put("/", isAuthenticated, async (req, res) => {
  const data = req.body;
  const email = req?.payload?.email;

  if (!email) {
    return res
      .status(400)
      .json({ error: true, message: "Email is required", email });
  }

  if (Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ error: true, message: "Update data is required" });
  }

  try {
    const userExits = await findUserByEmail(email);
    if (!userExits)
      return res
        .status(400)
        .json({ error: true, message: "Invalid email address provided" });

    const updateUser = await db.user.update({
      where: {
        email,
      },
      data: data,
    });
    if (updateUser) {
      return res
        .status(200)
        .json({ success: true, message: "Updated user data" });
    }
  } catch (error) {
    return res.status(500).json({ error: true, message: error });
  }
});

module.exports = router;
